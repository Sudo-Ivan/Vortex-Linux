import * as path from "path";

import { getErrorCode } from "@vortex/shared";
import Zip from "node-7z";
import { dir as tmpDir } from "tmp";

import { log } from "../../../logging";
import type { IExtensionApi } from "../../../types/IExtensionContext";
import type { IState } from "../../../types/IState";
import { ProcessCanceled, UserCanceled } from "../../../util/CustomErrors";
import * as fs from "../../../util/fs";
import * as selectors from "../../../util/selectors";
import { getGame } from "../../gamemode_management/util/getGame";
import { setModAttribute } from "../../mod_management/actions/mods";
import type { IMod } from "../../mod_management/types/IMod";
import renderModName from "../../mod_management/util/modName";
import { BUNDLED_PATH, INI_TWEAKS_PATH, MOD_TYPE, PATCHES_PATH } from "../constants";
import type { ICollection, ICollectionSourceInfo } from "../types/ICollection";
import { createCollectionFromProfile } from "./createCollectionFromProfile";
import { modToCollection } from "./modToCollection";
import { sanitizeExpression } from "./transformCollection";

export interface IOfflineExportOptions {
  outputPath: string;
  profileId?: string;
  collectionModId?: string;
  includeStateSnapshot?: boolean;
  onProgress?: (percent: number, text: string) => void;
}

export interface IProfileStateSnapshot {
  profileId: string;
  gameId: string;
  exportedAt: string;
  offline: true;
  modState: Record<string, { enabled: boolean }>;
  loadOrder?: unknown;
  installerChoices?: Record<string, unknown>;
}

async function zipDirectory(zipPath: string, sourcePath: string): Promise<void> {
  const zipper = new Zip();
  const files = await fs.readdirAsync(sourcePath);
  await zipper.add(
    zipPath,
    files.map((fileName) => path.join(sourcePath, fileName)),
  );
}

function withTmpDir(cb: (tmpPath: string) => Promise<void>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    tmpDir((err, tmpPath, cleanup) => {
      if (err !== null) {
        reject(err);
        return;
      }
      cb(tmpPath)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          try {
            cleanup();
          } catch (cleanupErr) {
            log("warn", "Failed to clean up temp export directory", { cleanupErr });
          }
        });
    });
  });
}

function buildStateSnapshot(state: IState, profileId: string): IProfileStateSnapshot {
  const profile = state.persistent.profiles[profileId];
  const modState: Record<string, { enabled: boolean }> = {};
  for (const [modId, entry] of Object.entries(profile.modState ?? {})) {
    modState[modId] = { enabled: entry?.enabled === true };
  }
  const gameId = profile.gameId;
  const mods = state.persistent.mods[gameId] ?? {};
  const installerChoices: Record<string, unknown> = {};
  for (const [modId, entry] of Object.entries(modState)) {
    if (entry.enabled && mods[modId]?.attributes?.installerChoices !== undefined) {
      installerChoices[modId] = mods[modId].attributes.installerChoices;
    }
  }
  return {
    profileId,
    gameId,
    exportedAt: new Date().toISOString(),
    offline: true,
    modState,
    installerChoices,
  };
}

async function ensureBundleSources(
  api: IExtensionApi,
  gameId: string,
  collectionMod: IMod,
): Promise<void> {
  const mods = api.getState().persistent.mods[gameId] ?? {};
  const downloads = api.getState().persistent.downloads.files;
  const sources: Record<string, ICollectionSourceInfo> = {
    ...(collectionMod.attributes?.collection?.source ?? {}),
  };
  const installMode: Record<string, string> = {
    ...(collectionMod.attributes?.collection?.installMode ?? {}),
  };

  for (const rule of collectionMod.rules ?? []) {
    const modId = rule.reference.id;
    if (modId === undefined || mods[modId] === undefined) {
      continue;
    }
    const mod = mods[modId];
    const download = downloads[mod.archiveId ?? ""];
    const archiveName = download?.localPath
      ? path.basename(download.localPath)
      : `${sanitizeExpression(renderModName(mod))}.7z`;
    sources[modId] = {
      type: "bundle",
      fileExpression: archiveName,
      fileSize: download?.size ?? mod.attributes?.fileSize,
      md5: mod.attributes?.fileMD5,
      updatePolicy: "exact",
    };
    if (installMode[modId] === undefined) {
      installMode[modId] = "fresh";
    }
  }

  api.store.dispatch(
    setModAttribute(gameId, collectionMod.id, "collection", {
      ...(collectionMod.attributes?.collection ?? {}),
      source: sources,
      installMode,
    }),
  );
}

export async function exportOfflineModpack(
  api: IExtensionApi,
  options: IOfflineExportOptions,
): Promise<string> {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  const profileId = options.profileId ?? selectors.activeProfile(state)?.id;
  if (gameId === undefined || profileId === undefined) {
    throw new ProcessCanceled("No active game or profile");
  }

  const progress = options.onProgress ?? (() => undefined);

  let collectionModId = options.collectionModId;
  if (collectionModId === undefined) {
    const created = await createCollectionFromProfile(api, profileId, `Offline Modpack`, {
      allMods: true,
      skipDialog: true,
    });
    collectionModId = created.id;
  }

  const collectionMod = api.getState().persistent.mods[gameId]?.[collectionModId];
  if (collectionMod === undefined || collectionMod.type !== MOD_TYPE) {
    throw new ProcessCanceled("Collection mod not found for export");
  }

  await ensureBundleSources(api, gameId, collectionMod);
  const refreshedCollection = api.getState().persistent.mods[gameId][collectionModId];

  const stagingPath = selectors.installPath(state);
  const mods = api.getState().persistent.mods[gameId];

  const onError = (message: string) => {
    throw new Error(message);
  };

  const manifest: ICollection = await modToCollection(
    api,
    gameId,
    stagingPath,
    refreshedCollection,
    mods,
    (percent, text) => progress(percent ?? 0, text ?? ""),
    onError,
  );

  manifest.info = {
    ...manifest.info,
    name: manifest.info.name || "Offline Modpack",
    description: manifest.info.description || "Exported offline modpack from Vortex-Linux",
    installInstructions:
      manifest.info.installInstructions ||
      "Import this archive in Vortex to install all bundled mods without Nexus.",
  };

  await withTmpDir(async (tmpPath) => {
    await fs.ensureDirWritableAsync(tmpPath, () => Promise.resolve());
    await fs.writeFileAsync(
      path.join(tmpPath, "collection.json"),
      JSON.stringify(manifest, undefined, 2),
    );

    const collectionPath = path.join(stagingPath, refreshedCollection.installationPath);
    await fs.copyAsync(path.join(collectionPath, BUNDLED_PATH), path.join(tmpPath, BUNDLED_PATH));
    await fs.copyAsync(path.join(collectionPath, PATCHES_PATH), path.join(tmpPath, PATCHES_PATH));

    try {
      await fs.copyAsync(
        path.join(collectionPath, INI_TWEAKS_PATH),
        path.join(tmpPath, INI_TWEAKS_PATH),
      );
    } catch (err) {
      if (getErrorCode(err) !== "ENOENT") {
        throw err;
      }
    }

    if (options.includeStateSnapshot === true) {
      const snapshot = buildStateSnapshot(api.getState(), profileId);
      await fs.writeFileAsync(
        path.join(tmpPath, "state-snapshot.json"),
        JSON.stringify(snapshot, undefined, 2),
      );
    }

    await fs.removeAsync(options.outputPath).catch((err) => {
      if (getErrorCode(err) !== "ENOENT") {
        throw err;
      }
    });
    await zipDirectory(options.outputPath, tmpPath);
    progress(100, "Export complete");
  });

  return options.outputPath;
}

export async function exportOfflineModpackInteractive(api: IExtensionApi): Promise<void> {
  const gameId = selectors.activeGameId(api.getState());
  const savePath = await api.selectFile({
    filters: [{ extensions: ["7z"], name: "Modpack archive" }],
    defaultPath: `modpack-${gameId ?? "export"}.7z`,
  });

  if (savePath === undefined) {
    throw new UserCanceled();
  }

  await exportOfflineModpack(api, {
    outputPath: savePath,
    includeStateSnapshot: true,
    onProgress: (percent, text) => {
      api.sendNotification({
        id: "offline-modpack-export",
        type: "activity",
        message: text,
        progress: percent,
      });
    },
  });

  api.sendNotification({
    id: "offline-modpack-export",
    type: "success",
    message: "Offline modpack exported",
    displayMS: 5000,
  });
}

export async function importOfflineModpackInteractive(api: IExtensionApi): Promise<void> {
  const archivePath = await api.selectFile({
    filters: [{ extensions: ["7z", "zip"], name: "Modpack archive" }],
  });
  if (archivePath === undefined) {
    throw new UserCanceled();
  }

  await new Promise<void>((resolve, reject) => {
    api.events.emit("import-downloads", [archivePath], (dlIds: string[]) => {
      if (dlIds.length === 0) {
        reject(new ProcessCanceled("Failed to import modpack archive"));
        return;
      }
      api.events.emit("start-install-download", dlIds[0], false, (err) => {
        if (err !== null && err !== undefined) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

export async function exportCollectionBackupInteractive(
  api: IExtensionApi,
  collectionModId: string,
): Promise<void> {
  const state = api.getState();
  const gameId = selectors.activeGameId(state);
  const mod = state.persistent.mods[gameId]?.[collectionModId];
  if (mod?.type !== MOD_TYPE) {
    throw new ProcessCanceled("Not a collection mod");
  }

  const savePath = await api.selectFile({
    filters: [{ extensions: ["7z"], name: "Collection backup" }],
    defaultPath: `${sanitizeExpression(renderModName(mod))}-backup.7z`,
  });
  if (savePath === undefined) {
    throw new UserCanceled();
  }

  await exportOfflineModpack(api, {
    outputPath: savePath,
    collectionModId,
    includeStateSnapshot: true,
    onProgress: (percent, text) => {
      api.sendNotification({
        id: "offline-modpack-export",
        type: "activity",
        message: text,
        progress: percent,
      });
    },
  });

  api.sendNotification({
    id: "offline-modpack-export",
    type: "success",
    message: "Collection backup exported",
    displayMS: 5000,
  });
}
