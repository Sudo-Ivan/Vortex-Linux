import * as path from "path";

import type { IExtensionApi } from "../../../types/IExtensionContext";
import type { IState } from "../../../types/IState";
import { installPathForGame } from "../../mod_management/selectors";
import type { IMod } from "../../mod_management/types/IMod";
import type { ICollection } from "../types/ICollection";
import { readCollection } from "./readCollection";

export function isOfflineCollectionMod(state: IState, collection: IMod | undefined): boolean {
  if (collection?.archiveId === undefined) {
    return false;
  }
  const modInfo = state.persistent.downloads.files[collection.archiveId]?.modInfo;
  const nexusIds = modInfo?.nexus?.ids ?? modInfo?.ids;
  return (
    nexusIds?.revisionId === undefined &&
    nexusIds?.collectionSlug === undefined &&
    nexusIds?.collectionId === undefined
  );
}

export async function readLocalCollectionManifest(
  api: IExtensionApi,
  gameId: string,
  collection: IMod,
): Promise<ICollection | undefined> {
  if (collection.installationPath === undefined) {
    return undefined;
  }
  const stagingPath = installPathForGame(api.getState(), gameId);
  const manifestPath = path.join(stagingPath, collection.installationPath, "collection.json");
  try {
    return await readCollection(api, manifestPath);
  } catch {
    return undefined;
  }
}
