import * as path from "path";

import { describe, expect, it } from "vitest";

import {
  documentsPathForSaves,
  invalidateResolvedMyGamesPath,
  syncMyGamesPath,
} from "./linuxGamePaths";

describe("linuxGamePaths", () => {
  it("uses proton documents when a wine prefix is present", () => {
    const prefix = "/compatdata/123/pfx";
    expect(documentsPathForSaves({ winePrefixPath: prefix })).toBe(
      path.join(prefix, "drive_c", "users", "steamuser", "Documents"),
    );
  });

  it("caches resolved my games roots", () => {
    invalidateResolvedMyGamesPath();
    const discovery = { winePrefixPath: "/compatdata/1/pfx" };
    const first = syncMyGamesPath("skyrimse", "Skyrim Special Edition", discovery);
    expect(first).toContain("Skyrim Special Edition");
    invalidateResolvedMyGamesPath("skyrimse");
    const second = syncMyGamesPath("skyrimse", "Skyrim Special Edition", discovery);
    expect(second).toContain("Skyrim Special Edition");
  });
});
