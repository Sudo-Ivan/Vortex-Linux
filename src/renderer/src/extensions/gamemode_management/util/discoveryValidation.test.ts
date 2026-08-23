import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { verifyRequiredFiles } from "../../../util/caseAwarePath";

describe("discovery required file validation", () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir !== undefined) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("accepts required files when on-disk casing differs on Linux", async () => {
    if (process.platform === "win32") {
      return;
    }

    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "vortex-game-path-"));
    await fs.mkdir(path.join(tempDir, "bin", "x64"), { recursive: true });
    await fs.writeFile(path.join(tempDir, "bin", "x64", "Cyberpunk2077.exe"), "");

    await expect(
      verifyRequiredFiles(tempDir, ["bin/x64/Cyberpunk2077.exe"]),
    ).resolves.toBeUndefined();
  });
});
