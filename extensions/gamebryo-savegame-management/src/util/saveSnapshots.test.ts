import { describe, expect, it } from "vitest";

import {
  formatSnapshotId,
  SAVE_SNAPSHOT_VERSION,
  snapshotDirectory,
  snapshotsRoot,
} from "./saveSnapshotPaths";

describe("saveSnapshots", () => {
  it("builds stable snapshot directory paths", () => {
    const createdAt = new Date("2026-08-22T12:34:56.789Z");
    expect(snapshotsRoot("/data", "skyrimse", "profile-1")).toBe(
      "/data/save-snapshots/skyrimse/profile-1",
    );
    const snapshotId = formatSnapshotId(createdAt);
    expect(snapshotDirectory("/data", "skyrimse", "profile-1", snapshotId)).toBe(
      "/data/save-snapshots/skyrimse/profile-1/2026-08-22T12-34-56-789Z",
    );
    expect(SAVE_SNAPSHOT_VERSION).toBe(1);
  });
});
