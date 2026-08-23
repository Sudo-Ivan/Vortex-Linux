import * as path from "path";

export const SAVE_SNAPSHOT_VERSION = 1;
export const SAVEPACK_MANIFEST = "manifest.json";

export interface ISaveSnapshotManifest {
  version: number;
  snapshotId: string;
  gameId: string;
  profileId: string;
  profileName: string;
  createdAt: string;
  reason: string;
  plugins: string[];
  saveFiles: string[];
}

export function snapshotsRoot(userData: string, gameId: string, profileId: string): string {
  return path.join(userData, "save-snapshots", gameId, profileId);
}

export function formatSnapshotId(createdAt: Date): string {
  return createdAt.toISOString().replace(/[:.]/g, "-");
}

export function snapshotDirectory(
  userData: string,
  gameId: string,
  profileId: string,
  snapshotId: string,
): string {
  return path.join(snapshotsRoot(userData, gameId, profileId), snapshotId);
}
