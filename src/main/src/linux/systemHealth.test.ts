import { existsSync, readFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execFileAsync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("node:util", () => ({
  promisify: () => execFileAsync,
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("../getVortexPath", () => ({
  getVortexPath: vi.fn(() => "/opt/vortex/resources/app"),
}));

vi.mock("./desktopIntegration", () => ({
  ensureLinuxDesktopIntegration: vi.fn(),
  shouldInstallLinuxDesktopIntegration: vi.fn(() => true),
}));

import {
  ensureLinuxDesktopIntegration,
  shouldInstallLinuxDesktopIntegration,
} from "./desktopIntegration";
import {
  collectLinuxSystemHealth,
  createSystemHealthContext,
  expectedDesktopId,
  findLinuxSteamPath,
  getBundledDotNetRoot,
  getDotNetRootCandidates,
  hasMinimumDotNetRuntime,
  readDesktopEntryMimeTypes,
  repairLinuxDesktopIntegration,
} from "./systemHealth";

describe("systemHealth helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReset();
    execFileAsync.mockReset();
  });

  it("selects the development desktop id in development builds", () => {
    const context = createSystemHealthContext({
      isDevelopment: true,
      env: {},
      homedir: "/home/alice",
      execPath: "/tmp/vortex",
    });

    expect(expectedDesktopId(context)).toBe("com.nexusmods.vortex.dev.desktop");
  });

  it("selects the packaged desktop id for production builds", () => {
    const context = createSystemHealthContext({
      isDevelopment: false,
      env: {},
      homedir: "/home/alice",
      execPath: "/opt/Vortex/vortex",
    });

    expect(expectedDesktopId(context)).toBe("com.nexusmods.vortex.desktop");
  });

  it("detects bundled dotnet root from environment", () => {
    expect(
      getBundledDotNetRoot({
        VORTEX_BUNDLED_DOTNET: "1",
        DOTNET_ROOT: "/opt/vortex/dotnet",
      }),
    ).toBe("/opt/vortex/dotnet");
    expect(getBundledDotNetRoot({})).toBeUndefined();
  });

  it("orders dotnet root candidates with bundled runtime first", () => {
    const candidates = getDotNetRootCandidates("/home/alice", {
      VORTEX_BUNDLED_DOTNET: "1",
      DOTNET_ROOT: "/opt/vortex/dotnet",
    });

    expect(candidates[0]).toBe("/opt/vortex/dotnet");
    expect(candidates).toContain("/usr/share/dotnet");
    expect(candidates).toContain(path.join("/home/alice", ".dotnet"));
  });

  it("accepts dotnet 9 or newer runtimes", () => {
    const output =
      "Microsoft.NETCore.App 8.0.1 [/usr/share/dotnet/shared/Microsoft.NETCore.App]\n" +
      "Microsoft.NETCore.App 9.0.2 [/usr/share/dotnet/shared/Microsoft.NETCore.App]\n";

    expect(hasMinimumDotNetRuntime(output, 9)).toBe(true);
    expect(hasMinimumDotNetRuntime("Microsoft.NETCore.App 8.0.1 []\n", 9)).toBe(false);
  });

  it("finds the first valid steam installation path", () => {
    vi.mocked(existsSync).mockImplementation((target) =>
      String(target).endsWith(path.join("Steam", "config", "libraryfolders.vdf")),
    );

    const steamPath = findLinuxSteamPath("/home/alice");
    expect(steamPath).toBe(path.join("/home/alice", ".local", "share", "Steam"));
  });

  it("parses desktop entry mime types", () => {
    const desktopPath = path.join(os.tmpdir(), "vortex-health-test.desktop");
    const content =
      "[Desktop Entry]\n" +
      "Type=Application\n" +
      "MimeType=x-scheme-handler/nxm;application/x-test;\n";

    vi.mocked(readFileSync).mockReturnValue(content);

    expect(readDesktopEntryMimeTypes(desktopPath)).toEqual([
      "x-scheme-handler/nxm",
      "application/x-test",
    ]);
  });
});

describe("collectLinuxSystemHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(existsSync).mockReturnValue(false);
    execFileAsync.mockReset();
  });

  it("reports healthy desktop, dotnet, steam, and nxm checks", async () => {
    const home = "/home/alice";
    const applicationsDir = path.join(home, ".local", "share", "applications");
    const desktopPath = path.join(applicationsDir, "com.nexusmods.vortex.desktop");
    const iconPath = path.join(
      home,
      ".local",
      "share",
      "icons",
      "hicolor",
      "256x256",
      "apps",
      "com.nexusmods.vortex.png",
    );
    const steamPath = path.join(home, ".local", "share", "Steam");

    vi.mocked(existsSync).mockImplementation((target) => {
      const value = String(target);
      return (
        value === desktopPath ||
        value === iconPath ||
        value === path.join(steamPath, "config", "libraryfolders.vdf")
      );
    });

    execFileAsync.mockImplementation((command: string, args?: string[]) => {
      if (command === "dotnet" && args?.[0] === "--list-runtimes") {
        return Promise.resolve({ stdout: "Microsoft.NETCore.App 9.0.2 []\n", stderr: "" });
      }
      if (command === "xdg-settings" && args?.[0] === "get") {
        return Promise.resolve({ stdout: "com.nexusmods.vortex.desktop\n", stderr: "" });
      }
      if (command === "xdg-settings" && args?.[0] === "--version") {
        return Promise.resolve({ stdout: "1.1.3\n", stderr: "" });
      }
      return Promise.reject(new Error(`unexpected command ${command} ${args?.join(" ")}`));
    });

    const report = await collectLinuxSystemHealth(
      createSystemHealthContext({
        env: { NODE_ENV: "production" },
        homedir: home,
        execPath: "/opt/Vortex/vortex",
        isDevelopment: false,
      }),
    );

    expect(report.checks.find((check) => check.id === "desktop_entry")?.status).toBe("ok");
    expect(report.checks.find((check) => check.id === "desktop_icons")?.status).toBe("ok");
    expect(report.checks.find((check) => check.id === "dotnet_runtime")?.status).toBe("ok");
    expect(report.checks.find((check) => check.id === "steam")?.status).toBe("ok");
    expect(report.checks.find((check) => check.id === "nxm_handler")?.status).toBe("ok");
    expect(report.checks.find((check) => check.id === "xdg_utils")?.status).toBe("ok");
  });

  it("reports missing dotnet runtime as an error", async () => {
    execFileAsync.mockRejectedValue(new Error("dotnet missing"));

    const report = await collectLinuxSystemHealth(
      createSystemHealthContext({
        env: {},
        homedir: "/home/alice",
        execPath: "/opt/Vortex/vortex",
        isDevelopment: false,
      }),
    );

    expect(report.checks.find((check) => check.id === "dotnet_runtime")).toEqual(
      expect.objectContaining({
        status: "error",
        summary: ".NET 9 runtime was not found",
      }),
    );
  });

  it("reports a foreign nxm handler as a warning", async () => {
    execFileAsync.mockImplementation((command: string, args?: string[]) => {
      if (command === "xdg-settings" && args?.[0] === "get") {
        return Promise.resolve({ stdout: "other-mod-manager.desktop\n", stderr: "" });
      }
      if (command === "xdg-settings" && args?.[0] === "--version") {
        return Promise.resolve({ stdout: "1.1.3\n", stderr: "" });
      }
      if (command === "dotnet") {
        return Promise.resolve({ stdout: "Microsoft.NETCore.App 9.0.2 []\n", stderr: "" });
      }
      return Promise.reject(new Error(`unexpected command ${command}`));
    });

    const report = await collectLinuxSystemHealth(
      createSystemHealthContext({
        env: {},
        homedir: "/home/alice",
        execPath: "/opt/Vortex/vortex",
        isDevelopment: false,
      }),
    );

    expect(report.checks.find((check) => check.id === "nxm_handler")).toEqual(
      expect.objectContaining({
        status: "warning",
        summary: "Another application is the default handler for nxm:// links",
      }),
    );
  });
});

describe("repairLinuxDesktopIntegration", () => {
  const originalPlatform = process.platform;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(process.env, originalEnv);
    Object.defineProperty(process, "platform", { value: "linux" });
  });

  afterEach(() => {
    Object.defineProperty(process, "platform", { value: originalPlatform });
    Object.assign(process.env, originalEnv);
  });

  it("installs desktop integration for packaged production builds", () => {
    vi.mocked(shouldInstallLinuxDesktopIntegration).mockReturnValue(true);

    const result = repairLinuxDesktopIntegration("/opt/Vortex/vortex");

    expect(result).toEqual({ repaired: true });
    expect(ensureLinuxDesktopIntegration).toHaveBeenCalledWith("/opt/Vortex/vortex");
  });

  it("refuses repair for flatpak builds", () => {
    process.env.IS_FLATPAK = "true";

    const result = repairLinuxDesktopIntegration("/opt/Vortex/vortex");

    expect(result.repaired).toBe(false);
    expect(ensureLinuxDesktopIntegration).not.toHaveBeenCalled();
  });
});
