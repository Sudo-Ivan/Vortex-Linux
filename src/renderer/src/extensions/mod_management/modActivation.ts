import * as path from "path";

import turbowalk from "turbowalk";

import { log } from "../../logging";
import type { IExtensionApi } from "../../types/IExtensionContext";
import { collectCaseMismatchWarnings, resolveCaseAwarePath } from "../../util/caseAwarePath";
import { UserCanceled } from "../../util/CustomErrors";
import * as fs from "../../util/fs";
import getNormalizeFunc, { type Normalize } from "../../util/getNormalizeFunc";
import { truthy } from "../../util/util";
import { MERGED_PATH } from "./modMerging";
import type { IDeployedFile, IDeploymentMethod } from "./types/IDeploymentMethod";
import type { IMod } from "./types/IMod";
import type BlacklistSet from "./util/BlacklistSet";
import renderModName from "./util/modName";

async function ensureWritable(api: IExtensionApi, modPath: string): Promise<void> {
  await fs.ensureDirWritableAsync(modPath, () =>
    api
      .showDialog(
        "question",
        "Access Denied",
        {
          text:
            "The mod folder for this game is not writable to your user account.\n" +
            "If you have admin rights on this system, Vortex can change the permissions " +
            "to allow it write access.",
        },
        [{ label: "Cancel" }, { label: "Allow access" }],
      )
      .then((result) =>
        result.action === "Cancel" ? Promise.reject(new UserCanceled()) : Promise.resolve(),
      ),
  );
}

async function gatherDeployRelativePaths(
  installationPath: string,
  mods: IMod[],
): Promise<string[]> {
  const relativePaths: string[] = [];
  for (const mod of mods) {
    const modPath = path.join(installationPath, mod.installationPath);
    try {
      await turbowalk(
        modPath,
        (entries) => {
          for (const entry of entries) {
            if (!entry.isDirectory) {
              relativePaths.push(
                path.join(mod.installationPath, path.relative(modPath, entry.filePath)),
              );
            }
          }
        },
        { skipHidden: false },
      );
    } catch {
      continue;
    }
  }
  return relativePaths;
}

async function confirmCaseMismatchesBeforeDeploy(
  api: IExtensionApi,
  destinationPath: string,
  relativePaths: string[],
): Promise<void> {
  if (process.platform === "win32") {
    return;
  }

  const warnings = await collectCaseMismatchWarnings(destinationPath, relativePaths.slice(0, 250));
  if (warnings.length === 0) {
    return;
  }

  const result = await api.showDialog(
    "question",
    "Case sensitivity warning",
    {
      text:
        "Some mod files use different path casing than what already exists in the game folder. " +
        "This can break mods on Linux.\n\n" +
        warnings.slice(0, 5).join("\n"),
    },
    [{ label: "Cancel deploy" }, { label: "Deploy anyway" }],
  );

  if (result.action === "Cancel deploy") {
    throw new UserCanceled();
  }
}

async function warnAboutCaseMismatches(
  api: IExtensionApi,
  destinationPath: string,
  relativePaths: string[],
): Promise<void> {
  if (process.platform === "win32") {
    return;
  }

  const warnings = await collectCaseMismatchWarnings(destinationPath, relativePaths.slice(0, 250));
  if (warnings.length === 0) {
    return;
  }

  api.sendNotification({
    id: "linux-case-sensitivity-warning",
    type: "warning",
    message:
      "Some deployed mod files may not work on a case-sensitive filesystem. " +
      warnings.slice(0, 2).join(" "),
  });
}

/**
 * activate a list of mod
 *
 * @export
 * @param {string} installationPath the path where mods are installed
 * @param {string} destinationPath the game mod path
 * @param {IMod[]} mods list of mods to activate (sorted from lowest to highest
 * priority)
 * @param {IDeploymentMethod} method the activator to use
 * @returns {Promise<void>}
 */
async function deployMods(
  api: IExtensionApi,
  gameId: string,
  installationPath: string,
  destinationPath: string,
  mods: IMod[],
  method: IDeploymentMethod,
  lastActivation: IDeployedFile[],
  typeId: string,
  skipFiles: BlacklistSet,
  subDir: (mod: IMod) => string,
  progressCB?: (name: string, progress: number) => void,
): Promise<IDeployedFile[]> {
  if (!truthy(destinationPath)) {
    return Promise.resolve([] as IDeployedFile[]);
  }

  log("info", "deploying", {
    gameId,
    typeId,
    installationPath,
    destinationPath,
  });

  try {
    await ensureWritable(api, destinationPath);
    const relativePaths = await gatherDeployRelativePaths(installationPath, mods);
    await confirmCaseMismatchesBeforeDeploy(api, destinationPath, relativePaths);
    const normalize: Normalize = await getNormalizeFunc(destinationPath);
    await method.prepare(destinationPath, true, lastActivation, normalize);

    for (let idx = 0; idx < mods.length; idx++) {
      const mod = mods[idx];
      if (progressCB !== undefined) {
        progressCB(renderModName(mod), Math.round((idx * 50) / mods.length));
      }
      const modPath = path.join(installationPath, mod.installationPath);
      if (mod.fileOverrides !== undefined) {
        for (const file of mod.fileOverrides) {
          const relPath = path.relative(destinationPath, file);
          const caseAwareRel =
            process.platform === "win32"
              ? relPath
              : ((await resolveCaseAwarePath(destinationPath, relPath)) ?? relPath);
          const relPathWithSource = path.join(mod.installationPath, caseAwareRel);
          const normRelPathWithSource = normalize(relPathWithSource);
          skipFiles.add(normRelPathWithSource);
        }
      }
      await method.activate(modPath, mod.installationPath, subDir(mod), skipFiles);
    }

    const mergePath = truthy(typeId) ? MERGED_PATH + "." + typeId : MERGED_PATH;

    await method.activate(
      path.join(installationPath, mergePath),
      mergePath,
      subDir(null),
      new Set<string>(),
    );

    await warnAboutCaseMismatches(api, destinationPath, relativePaths);
  } catch (err) {
    if (method.cancel !== undefined) {
      method.cancel(gameId, destinationPath, installationPath);
    }
    throw err;
  }

  const cb =
    progressCB === undefined
      ? undefined
      : (files: number, total: number) =>
          progressCB(`${files}/${total} files`, 50 + (files * 50) / total);
  return method.finalize(gameId, destinationPath, installationPath, cb);
}

export default deployMods;
