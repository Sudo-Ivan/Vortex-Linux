import * as path from "path";

import { describe, expect, it } from "vitest";

import {
  documentsPathForSaves,
  invalidateResolvedMyGamesPath,
  resolveMyGamesRoot,
  syncMyGamesPath,
} from "./linuxGamePaths";

describe.skipIf(process.platform !== "linux")("linuxGamePaths", () => {
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

  it("resolves migrated Windows my games folder casing", async () => {
    invalidateResolvedMyGamesPath();
    const prefix = "/steam/compatdata/489830/pfx";
    const documents = path.join(prefix, "drive_c", "users", "steamuser", "Documents");
    const myGames = path.join(documents, "My Games");
    const gameFolder = path.join(myGames, "skyrim");

    const statAsync = async (target: string) => {
      if (
        target === prefix ||
        target === documents ||
        target === myGames ||
        target === gameFolder
      ) {
        return {};
      }
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    };
    const readdirAsync = async (target: string) => {
      if (target === path.join(prefix, "drive_c", "users")) {
        return ["steamuser"];
      }
      if (target === documents) {
        return ["My Games"];
      }
      if (target === myGames) {
        return ["skyrim"];
      }
      return [];
    };

    const resolved = await resolveMyGamesRoot(
      "skyrimse",
      "Skyrim",
      { winePrefixPath: prefix },
      undefined,
      undefined,
      { statAsync, readdirAsync },
    );

    expect(resolved).toBe(gameFolder);
  });
});
