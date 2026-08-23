import { execFile } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

const sandboxBinary = path.resolve(
  import.meta.dirname,
  "../../../../tools/installer-sandbox/dist/installer-sandbox",
);

describe("installer-sandbox integration", () => {
  it.runIf(process.platform === "linux" && existsSync(sandboxBinary))(
    "blocks writes outside allowed directories",
    async () => {
      const tempDir = mkdtempSync(path.join(os.tmpdir(), "vortex-sandbox-"));
      const blockedPath = path.join(os.tmpdir(), `vortex-sandbox-blocked-${process.pid}.txt`);

      await expect(
        execFileAsync(
          sandboxBinary,
          ["--allow-rw", tempDir, "--", "sh", "-c", `echo blocked > "${blockedPath}"`],
          { timeout: 5000 },
        ),
      ).rejects.toBeDefined();

      await expect(
        execFileAsync(
          sandboxBinary,
          [
            "--allow-rw",
            tempDir,
            "--",
            "sh",
            "-c",
            `echo allowed > "${path.join(tempDir, "allowed.txt")}"`,
          ],
          { timeout: 5000 },
        ),
      ).resolves.toBeDefined();
    },
  );

  it.runIf(process.platform === "linux" && existsSync(sandboxBinary))(
    "reports the landlock abi",
    async () => {
      const { stdout } = await execFileAsync(sandboxBinary, ["--probe"], { timeout: 5000 });
      expect(Number.parseInt(stdout.trim(), 10)).toBeGreaterThan(0);
    },
  );
});
