import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

import {
  ensureLinuxDesktopIntegration,
  shouldInstallLinuxDesktopIntegration,
} from "./desktopIntegration";

const execFileAsync = promisify(execFile);

const PACKAGE_DESKTOP_ID = "com.nexusmods.vortex.desktop";
const DEV_DESKTOP_ID = "com.nexusmods.vortex.dev.desktop";
const ICON_THEME_NAME = "com.nexusmods.vortex";
const NXM_PROTOCOL = "nxm";
const MIN_DOTNET_MAJOR = 9;

export type LinuxHealthStatus = "ok" | "warning" | "error" | "info" | "skipped";

export interface ILinuxHealthCheck {
  id: string;
  status: LinuxHealthStatus;
  summary: string;
  detail?: string;
  repairable?: boolean;
}

export interface ILinuxSystemHealthReport {
  platform: "linux";
  isFlatpak: boolean;
  isDevelopment: boolean;
  checks: ILinuxHealthCheck[];
}

export interface ISystemHealthContext {
  env: NodeJS.ProcessEnv;
  homedir: string;
  execPath: string;
  isDevelopment: boolean;
}

function applicationsDirectory(homedir: string, env: NodeJS.ProcessEnv): string {
  const xdgDataHome = env.XDG_DATA_HOME;
  const dataHome =
    xdgDataHome != null && xdgDataHome.length > 0
      ? xdgDataHome
      : path.join(homedir, ".local", "share");
  return path.join(dataHome, "applications");
}

function iconsDirectory(homedir: string, env: NodeJS.ProcessEnv): string {
  const xdgDataHome = env.XDG_DATA_HOME;
  const dataHome =
    xdgDataHome != null && xdgDataHome.length > 0
      ? xdgDataHome
      : path.join(homedir, ".local", "share");
  return path.join(dataHome, "icons");
}

export function expectedDesktopId(context: ISystemHealthContext): string {
  if (context.env.IS_FLATPAK === "true") {
    return PACKAGE_DESKTOP_ID;
  }

  if (context.isDevelopment) {
    return DEV_DESKTOP_ID;
  }

  return PACKAGE_DESKTOP_ID;
}

export function getBundledDotNetRoot(env: NodeJS.ProcessEnv): string | undefined {
  if (env.VORTEX_BUNDLED_DOTNET !== "1" || env.DOTNET_ROOT === undefined) {
    return undefined;
  }
  return env.DOTNET_ROOT;
}

export function getDotNetRootCandidates(home: string, env: NodeJS.ProcessEnv): string[] {
  const candidates = [
    getBundledDotNetRoot(env),
    env.DOTNET_ROOT,
    "/usr/share/dotnet",
    "/usr/lib/dotnet",
    path.join(home, ".dotnet"),
  ];

  return candidates.filter((candidate): candidate is string => !!candidate);
}

export function hasMinimumDotNetRuntime(listOutput: string, minimumMajor: number): boolean {
  for (const line of listOutput.split("\n")) {
    const match = line.match(/^Microsoft\.NETCore\.App (\d+)\./);
    if (match !== null && match[1] !== undefined && parseInt(match[1], 10) >= minimumMajor) {
      return true;
    }
  }
  return false;
}

export async function listDotNetRuntimes(
  home: string,
  env: NodeJS.ProcessEnv,
): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("dotnet", ["--list-runtimes"]);
    return stdout;
  } catch {
    for (const root of getDotNetRootCandidates(home, env)) {
      const dotnetPath = path.join(root, "dotnet");
      if (!existsSync(dotnetPath)) {
        continue;
      }

      try {
        const { stdout } = await execFileAsync(dotnetPath, ["--list-runtimes"], {
          env: { ...env, DOTNET_ROOT: root },
        });
        return stdout;
      } catch {
        continue;
      }
    }
  }

  return undefined;
}

export function getLinuxSteamPaths(home: string): string[] {
  return [
    path.join(home, ".local", "share", "Steam"),
    path.join(home, ".steam", "debian-installation"),
    path.join(home, ".var", "app", "com.valvesoftware.Steam", "data", "Steam"),
    path.join(home, ".var", "app", "com.valvesoftware.Steam", ".local", "share", "Steam"),
    path.join(home, "snap", "steam", "common", ".local", "share", "Steam"),
    path.join(home, ".steam", "steam"),
  ];
}

export function findLinuxSteamPath(home: string): string | undefined {
  for (const steamPath of getLinuxSteamPaths(home)) {
    const libraryFoldersPath = path.join(steamPath, "config", "libraryfolders.vdf");
    if (existsSync(libraryFoldersPath)) {
      return steamPath;
    }
  }
  return undefined;
}

export async function getDefaultUrlSchemeHandler(protocol: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("xdg-settings", [
      "get",
      "default-url-scheme-handler",
      protocol,
    ]);
    const output = stdout.trim();
    return output.length > 0 ? output : undefined;
  } catch {
    return undefined;
  }
}

function checkDesktopEntry(context: ISystemHealthContext): ILinuxHealthCheck {
  if (context.env.IS_FLATPAK === "true") {
    return {
      id: "desktop_entry",
      status: "info",
      summary: "Desktop entry is managed by the Flatpak package",
    };
  }

  const desktopId = expectedDesktopId(context);
  const desktopPath = path.join(applicationsDirectory(context.homedir, context.env), desktopId);

  if (existsSync(desktopPath)) {
    return {
      id: "desktop_entry",
      status: "ok",
      summary: "Desktop entry is installed",
      detail: desktopPath,
      repairable: true,
    };
  }

  if (context.isDevelopment) {
    return {
      id: "desktop_entry",
      status: "warning",
      summary: "Development desktop entry is not installed",
      detail:
        "Enable Handle Nexus Links in Download settings or run Vortex once to create the local desktop entry.",
      repairable: true,
    };
  }

  if (!shouldInstallLinuxDesktopIntegration()) {
    return {
      id: "desktop_entry",
      status: "skipped",
      summary: "Desktop entry installation is not applicable for this build",
    };
  }

  return {
    id: "desktop_entry",
    status: "error",
    summary: "Desktop entry is missing",
    detail: desktopPath,
    repairable: true,
  };
}

function checkDesktopIcons(context: ISystemHealthContext): ILinuxHealthCheck {
  if (context.env.IS_FLATPAK === "true") {
    return {
      id: "desktop_icons",
      status: "info",
      summary: "Application icons are managed by the Flatpak package",
    };
  }

  const iconPath = path.join(
    iconsDirectory(context.homedir, context.env),
    "hicolor",
    "256x256",
    "apps",
    `${ICON_THEME_NAME}.png`,
  );

  if (existsSync(iconPath)) {
    return {
      id: "desktop_icons",
      status: "ok",
      summary: "Application icon is installed",
      detail: iconPath,
      repairable: true,
    };
  }

  return {
    id: "desktop_icons",
    status: "warning",
    summary: "Application icon is not installed",
    detail: iconPath,
    repairable: true,
  };
}

async function checkNxmHandler(context: ISystemHealthContext): Promise<ILinuxHealthCheck> {
  const expectedHandler = expectedDesktopId(context);
  const currentHandler = await getDefaultUrlSchemeHandler(NXM_PROTOCOL);

  if (currentHandler === undefined) {
    return {
      id: "nxm_handler",
      status: "warning",
      summary: "No default handler is registered for nxm:// links",
      detail: "Enable Handle Nexus Links in Settings -> Downloads to register Vortex.",
      repairable: false,
    };
  }

  if (currentHandler === expectedHandler) {
    return {
      id: "nxm_handler",
      status: "ok",
      summary: "Vortex is the default handler for nxm:// links",
      detail: currentHandler,
    };
  }

  return {
    id: "nxm_handler",
    status: "warning",
    summary: "Another application is the default handler for nxm:// links",
    detail: `Current handler: ${currentHandler}. Expected: ${expectedHandler}.`,
    repairable: false,
  };
}

async function checkDotNetRuntime(context: ISystemHealthContext): Promise<ILinuxHealthCheck> {
  const runtimeList = await listDotNetRuntimes(context.homedir, context.env);
  const bundledRoot = getBundledDotNetRoot(context.env);

  if (runtimeList !== undefined && hasMinimumDotNetRuntime(runtimeList, MIN_DOTNET_MAJOR)) {
    return {
      id: "dotnet_runtime",
      status: "ok",
      summary: `.NET ${MIN_DOTNET_MAJOR} runtime is available`,
      detail: bundledRoot !== undefined ? `Using bundled runtime at ${bundledRoot}` : undefined,
    };
  }

  if (bundledRoot !== undefined) {
    return {
      id: "dotnet_runtime",
      status: "error",
      summary: "Bundled .NET runtime could not be used",
      detail:
        "The packaged .NET runtime was found but is not working. Try reinstalling Vortex or report this as a packaging bug.",
    };
  }

  return {
    id: "dotnet_runtime",
    status: "error",
    summary: `.NET ${MIN_DOTNET_MAJOR} runtime was not found`,
    detail:
      "Install dotnet-runtime-9.0 from your package manager or https://dotnet.microsoft.com/download/dotnet/9.0",
  };
}

function checkSteamInstallation(context: ISystemHealthContext): ILinuxHealthCheck {
  const steamPath = findLinuxSteamPath(context.homedir);

  if (steamPath !== undefined) {
    return {
      id: "steam",
      status: "ok",
      summary: "Steam installation detected",
      detail: steamPath,
    };
  }

  return {
    id: "steam",
    status: "info",
    summary: "Steam installation was not detected",
    detail: "Steam is optional. Games from other stores can still be added manually.",
  };
}

async function checkXdgUtils(): Promise<ILinuxHealthCheck> {
  try {
    await execFileAsync("xdg-settings", ["--version"]);
    return {
      id: "xdg_utils",
      status: "ok",
      summary: "xdg-settings is available",
    };
  } catch {
    return {
      id: "xdg_utils",
      status: "error",
      summary: "xdg-settings is not available",
      detail: "Install the xdg-utils package so Vortex can register nxm:// links.",
    };
  }
}

export function createSystemHealthContext(
  overrides: Partial<ISystemHealthContext> = {},
): ISystemHealthContext {
  return {
    env: overrides.env ?? process.env,
    homedir: overrides.homedir ?? os.homedir(),
    execPath: overrides.execPath ?? process.execPath,
    isDevelopment:
      overrides.isDevelopment ??
      (process.defaultApp === true || process.env.NODE_ENV === "development"),
  };
}

export async function collectLinuxSystemHealth(
  context: ISystemHealthContext = createSystemHealthContext(),
): Promise<ILinuxSystemHealthReport> {
  const checks = await Promise.all([
    Promise.resolve(checkDesktopEntry(context)),
    Promise.resolve(checkDesktopIcons(context)),
    checkNxmHandler(context),
    checkDotNetRuntime(context),
    Promise.resolve(checkSteamInstallation(context)),
    checkXdgUtils(),
  ]);

  return {
    platform: "linux",
    isFlatpak: context.env.IS_FLATPAK === "true",
    isDevelopment: context.isDevelopment,
    checks,
  };
}

export function repairLinuxDesktopIntegration(execPath: string): {
  repaired: boolean;
  reason?: string;
} {
  if (process.platform !== "linux") {
    return { repaired: false, reason: "not-linux" };
  }

  if (process.env.IS_FLATPAK === "true") {
    return {
      repaired: false,
      reason: "Desktop integration is managed by the Flatpak package.",
    };
  }

  if (!shouldInstallLinuxDesktopIntegration()) {
    return {
      repaired: false,
      reason:
        "Repair is only available for packaged production builds. Enable Handle Nexus Links in Download settings for development builds.",
    };
  }

  ensureLinuxDesktopIntegration(execPath);
  return { repaired: true };
}

export function readDesktopEntryMimeTypes(desktopPath: string): string[] | undefined {
  try {
    const content = readFileSync(desktopPath, { encoding: "utf8" });
    const mimeLine = content.split("\n").find((line) => line.startsWith("MimeType="));
    if (mimeLine === undefined) {
      return undefined;
    }
    return mimeLine
      .slice("MimeType=".length)
      .split(";")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  } catch {
    return undefined;
  }
}
