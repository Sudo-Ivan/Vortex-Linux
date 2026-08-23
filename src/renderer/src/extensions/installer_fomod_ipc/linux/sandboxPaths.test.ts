import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { buildDefaultReadOnlyPaths, buildInstallerSandboxArgv } from "./sandboxPaths";

describe("sandboxPaths", () => {
  it("builds sandbox argv with tcp enabled", () => {
    const built = buildInstallerSandboxArgv(
      "/opt/vortex/assets/installer-sandbox",
      {
        readWrite: ["/tmp/work"],
        readOnly: ["/usr/lib"],
        allowTcp: true,
      },
      "dotnet",
      ["ModInstallerIPC.dll"],
    );

    expect(built.args).toContain("--allow-tcp");
    expect(built.args.at(-2)).toBe("dotnet");
    expect(built.args.at(-1)).toBe("ModInstallerIPC.dll");
  });

  it("includes runtime library paths", () => {
    const exePath = "/opt/fomod/ModInstallerIPC.exe";
    const workPath = "/tmp/work";
    const paths = buildDefaultReadOnlyPaths(exePath, workPath);
    expect(paths).toEqual(
      expect.arrayContaining(
        [path.dirname(exePath), workPath, "/lib", "/lib64", "/usr/lib"].map((entry) =>
          path.resolve(entry),
        ),
      ),
    );
  });
});
