import * as path from "path";

import { fs, types, util } from "@nexusmods/vortex-api";
import Promise from "bluebird";

import { saveFiles } from "./gameSupport";
import {
  formatSnapshotId,
  ISaveSnapshotManifest,
  SAVE_SNAPSHOT_VERSION,
  SAVEPACK_MANIFEST,
  snapshotDirectory,
  snapshotsRoot,
} from "./saveSnapshotPaths";

export type { ISaveSnapshotManifest } from "./saveSnapshotPaths";
export {
  formatSnapshotId,
  SAVE_SNAPSHOT_VERSION,
  SAVEPACK_MANIFEST,
  snapshotDirectory,
  snapshotsRoot,
} from "./saveSnapshotPaths";

export function listSnapshots(
  userData: string,
  gameId: string,
  profileId: string,
): Promise<ISaveSnapshotManifest[]> {
  const root = snapshotsRoot(userData, gameId, profileId);
  return fs
    .readdirAsync(root)
    .catch(() => [])
    .then((entries) =>
      Promise.map(entries, (entry) => {
        const manifestPath = path.join(root, entry, SAVEPACK_MANIFEST);
        return fs
          .readFileAsync(manifestPath, { encoding: "utf8" })
          .then((raw) => JSON.parse(raw.toString()) as ISaveSnapshotManifest)
          .catch(() => undefined);
      }),
    )
    .then((manifests) =>
      manifests
        .filter((manifest): manifest is ISaveSnapshotManifest => manifest !== undefined)
        .sort((lhs, rhs) => rhs.createdAt.localeCompare(lhs.createdAt)),
    );
}

export function pruneSnapshots(
  userData: string,
  gameId: string,
  profileId: string,
  maxSnapshots: number,
): Promise<void> {
  return listSnapshots(userData, gameId, profileId).then((snapshots) => {
    const excess = snapshots.slice(maxSnapshots);
    return Promise.map(excess, (snapshot) =>
      fs
        .removeAsync(snapshotDirectory(userData, gameId, profileId, snapshot.snapshotId))
        .catch(() => undefined),
    ).then(() => undefined);
  });
}

export function createSaveSnapshot(
  api: types.IExtensionApi,
  profile: types.IProfile,
  sourceSavePath: string,
  reason: string,
  installedPlugins: string[],
): Promise<string | undefined> {
  const createdAt = new Date();
  const snapshotId = formatSnapshotId(createdAt);
  const userData = util.getVortexPath("userData");
  const targetDir = snapshotDirectory(userData, profile.gameId, profile.id, snapshotId);
  const savesDir = path.join(targetDir, "saves");

  return fs
    .readdirAsync(sourceSavePath)
    .catch(() => [])
    .then((entries) => {
      const copiedFiles: string[] = [];
      return fs.ensureDirAsync(savesDir).then(() =>
        Promise.map(entries, (entry) => {
          const sourceFile = path.join(sourceSavePath, entry);
          return fs
            .statAsync(sourceFile)
            .then((stat) => {
              if (!stat.isFile()) {
                return undefined;
              }
              copiedFiles.push(entry);
              return fs.copyAsync(sourceFile, path.join(savesDir, entry));
            })
            .catch(() => undefined);
        }).then(() => copiedFiles),
      );
    })
    .then((copiedFiles) => {
      if (copiedFiles.length === 0) {
        return undefined;
      }

      const manifest: ISaveSnapshotManifest = {
        version: SAVE_SNAPSHOT_VERSION,
        snapshotId,
        gameId: profile.gameId,
        profileId: profile.id,
        profileName: profile.name,
        createdAt: createdAt.toISOString(),
        reason,
        plugins: installedPlugins,
        saveFiles: copiedFiles,
      };

      return fs
        .writeFileAsync(
          path.join(targetDir, SAVEPACK_MANIFEST),
          JSON.stringify(manifest, null, 2),
          {
            encoding: "utf8",
          },
        )
        .then(() => {
          const maxSnapshots = util.getSafe(
            api.getState(),
            ["settings", "saves", "maxSnapshots"],
            10,
          );
          return pruneSnapshots(userData, profile.gameId, profile.id, maxSnapshots).then(
            () => targetDir,
          );
        });
    });
}

export function restoreSaveSnapshot(
  api: types.IExtensionApi,
  snapshotDir: string,
  destSavePath: string,
  restorePlugins: boolean,
): Promise<ISaveSnapshotManifest> {
  const manifestPath = path.join(snapshotDir, SAVEPACK_MANIFEST);
  return fs
    .readFileAsync(manifestPath, { encoding: "utf8" })
    .then((raw) => JSON.parse(raw.toString()) as ISaveSnapshotManifest)
    .then((manifest) =>
      fs.ensureDirAsync(destSavePath).then(() =>
        Promise.map(manifest.saveFiles, (fileName) => {
          const related = saveFiles(manifest.gameId, fileName);
          return Promise.map(related, (relatedFile) =>
            fs.copyAsync(
              path.join(snapshotDir, "saves", relatedFile),
              path.join(destSavePath, relatedFile),
            ),
          );
        }).then(() => {
          if (restorePlugins && manifest.plugins.length > 0) {
            api.events.emit("set-plugin-list", manifest.plugins);
          }
          return manifest;
        }),
      ),
    );
}

export function exportSavePack(
  snapshotDir: string,
  exportRoot: string,
  packName: string,
): Promise<string> {
  const target = path.join(exportRoot, `${packName}.vortex-savepack`);
  return fs.copyAsync(snapshotDir, target, { recursive: true }).then(() => target);
}

export function importSavePack(packPath: string): Promise<ISaveSnapshotManifest> {
  const manifestPath = path.join(packPath, SAVEPACK_MANIFEST);
  return fs
    .readFileAsync(manifestPath, { encoding: "utf8" })
    .then((raw) => JSON.parse(raw.toString()) as ISaveSnapshotManifest);
}
