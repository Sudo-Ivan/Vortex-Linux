import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../getVortexPath", () => ({
  getVortexPath: vi.fn((key: string) => {
    if (key === "assets") {
      return "/opt/vortex/assets";
    }
    return `/opt/vortex/${key}`;
  }),
}));

import {
  buildDefaultReadOnlyPaths,
  buildInstallerSandboxArgv,
  uniqueSandboxPaths,
} from "./installerSandbox";

describe("installerSandbox", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates sandbox paths", () => {
    expect(uniqueSandboxPaths(["/tmp/a", "/tmp/a"])).toEqual([path.resolve("/tmp/a")]);
  });

  it("builds default read-only paths for an executable", () => {
    const paths = buildDefaultReadOnlyPaths("/opt/vortex/fomod/ModInstallerIPC.exe", "/tmp/work");
    expect(paths).toContain(path.resolve("/opt/vortex/fomod"));
    expect(paths).toContain(path.resolve("/tmp/work"));
    expect(paths).toContain(path.resolve("/usr/lib"));
  });

  it("builds argv for the sandbox helper", () => {
    const built = buildInstallerSandboxArgv(
      "/opt/vortex/assets/installer-sandbox",
      {
        readWrite: ["/tmp/work"],
        readOnly: ["/usr/lib"],
        allowTcp: true,
      },
      "mono",
      ["/opt/fomod/ModInstallerIPC.exe", "--help"],
    );

    expect(built.command).toBe("/opt/vortex/assets/installer-sandbox");
    expect(built.args).toEqual([
      "--allow-rw",
      path.resolve("/tmp/work"),
      "--allow-ro",
      path.resolve("/usr/lib"),
      "--allow-tcp",
      "--",
      "mono",
      "/opt/fomod/ModInstallerIPC.exe",
      "--help",
    ]);
  });

  it("includes the user dotnet directory in default read-only paths", () => {
    const home = os.homedir();
    expect(buildDefaultReadOnlyPaths("/opt/fomod/ModInstallerIPC.exe")).toContain(
      path.join(home, ".dotnet"),
    );
  });
});
