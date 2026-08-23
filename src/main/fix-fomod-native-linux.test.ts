import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FOMOD_NATIVE_SO,
  findNativeSoSource,
  fixFomodNativeLinuxPackage,
  listFomodNativeAddons,
} from "./fix-fomod-native-linux.mjs";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

describe("fixFomodNativeLinuxPackage", () => {
  let tempDir: string;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("finds native shared library sources", () => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "fomod-fix-"));
    const packageRoot = path.join(tempDir, "pkg");
    const releaseDir = path.join(packageRoot, "build", "Release");
    mkdirSync(releaseDir, { recursive: true });
    writeFileSync(path.join(releaseDir, FOMOD_NATIVE_SO), "so");

    expect(findNativeSoSource(packageRoot)).toBe(path.join(releaseDir, FOMOD_NATIVE_SO));
  });

  it("lists addon binaries under bin", () => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "fomod-fix-"));
    const packageRoot = path.join(tempDir, "pkg");
    const addonDir = path.join(packageRoot, "bin", "linux-x64-148");
    mkdirSync(addonDir, { recursive: true });
    const addonPath = path.join(addonDir, "fomod-installer-native.node");
    writeFileSync(addonPath, "node");

    expect(listFomodNativeAddons(packageRoot)).toEqual([addonPath]);
  });

  it("copies the shared library beside each addon and sets rpath", () => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "fomod-fix-"));
    const packageRoot = path.join(tempDir, "pkg");
    const releaseDir = path.join(packageRoot, "build", "Release");
    const addonDir = path.join(packageRoot, "bin", "linux-x64-148");
    mkdirSync(releaseDir, { recursive: true });
    mkdirSync(addonDir, { recursive: true });
    const soSource = path.join(releaseDir, FOMOD_NATIVE_SO);
    const addonPath = path.join(addonDir, "fomod-installer-native.node");
    writeFileSync(soSource, "shared-object");
    writeFileSync(addonPath, "addon");

    const originalPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux" });

    try {
      const results = fixFomodNativeLinuxPackage(packageRoot);
      expect(results).toHaveLength(1);
      expect(results[0]?.soPath).toBe(path.join(addonDir, FOMOD_NATIVE_SO));
      expect(results[0]?.rpathSet).toBe(true);
      expect(vi.mocked(execFileSync)).toHaveBeenCalledWith(
        "patchelf",
        ["--set-rpath", "$ORIGIN", addonPath],
        { stdio: "pipe" },
      );
    } finally {
      Object.defineProperty(process, "platform", { value: originalPlatform });
    }
  });
});
