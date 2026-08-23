import * as path from "path";

import { describe, expect, test } from "vitest";

import { collectGogScanRoots, resolveLaunchPathWithinGame } from "./linuxDiscovery";

describe("collectGogScanRoots", () => {
  test("includes defaults and custom roots without duplicates", () => {
    const roots = collectGogScanRoots("/home/user", [
      "/mnt/games",
      path.join("/home/user", "GOG Games"),
    ]);
    expect(roots).toContain(path.join("/home/user", "GOG Games"));
    expect(roots).toContain("/mnt/games");
    expect(roots.filter((root) => root === path.join("/home/user", "GOG Games"))).toHaveLength(1);
  });
});

describe("resolveLaunchPathWithinGame", () => {
  const gameRoot = "/home/user/GOG Games/TestGame/game";

  test("resolves a normal relative launch path inside the game directory", () => {
    expect(resolveLaunchPathWithinGame(gameRoot, "bin/start.sh")).toBe(
      path.resolve(gameRoot, "bin/start.sh"),
    );
  });

  test("rejects path traversal outside the game directory", () => {
    expect(resolveLaunchPathWithinGame(gameRoot, "../../../tmp/evil.sh")).toBeUndefined();
  });

  test("rejects absolute launch paths", () => {
    expect(resolveLaunchPathWithinGame(gameRoot, "/bin/sh")).toBeUndefined();
  });

  test("rejects empty launch paths", () => {
    expect(resolveLaunchPathWithinGame(gameRoot, "")).toBeUndefined();
  });
});
