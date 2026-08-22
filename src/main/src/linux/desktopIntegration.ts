import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { log } from "../logging";

const PACKAGE_DESKTOP_ID = "com.nexusmods.vortex.desktop";
const PACKAGE_WRAPPER_FILE_NAME = "com.nexusmods.vortex.wrapper.sh";
const ICON_THEME_NAME = "com.nexusmods.vortex";
const ICON_SIZES = [48, 64, 128, 256, 512];

function applicationsDirectory(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME;
  const dataHome =
    xdgDataHome != null && xdgDataHome.length > 0
      ? xdgDataHome
      : path.join(os.homedir(), ".local", "share");
  return path.join(dataHome, "applications");
}

function iconsDirectory(): string {
  const xdgDataHome = process.env.XDG_DATA_HOME;
  const dataHome =
    xdgDataHome != null && xdgDataHome.length > 0
      ? xdgDataHome
      : path.join(os.homedir(), ".local", "share");
  return path.join(dataHome, "icons");
}

function escapeShellScriptArgument(input: string): string {
  return input.replace(/(["\\$`])/g, "\\$1");
}

function writeFileIfChanged(filePath: string, content: string, mode?: number): boolean {
  let changed = true;

  try {
    changed = readFileSync(filePath, { encoding: "utf8" }) !== content;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }

  if (changed) {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, { encoding: "utf8" });
  }

  if (mode !== undefined) {
    chmodSync(filePath, mode);
  }

  return changed;
}

function generateWrapperScript(executablePath: string): string {
  const escapedExecutable = escapeShellScriptArgument(executablePath);
  return (
    "#!/bin/sh\n" +
    "unset LD_LIBRARY_PATH\n" +
    "unset LD_PRELOAD\n" +
    'if [ -n "$1" ]; then\n' +
    `  exec "${escapedExecutable}" --download "$@"\n` +
    "else\n" +
    `  exec "${escapedExecutable}"\n` +
    "fi\n"
  );
}

function escapeDesktopFilePath(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/ /g, "\\s")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\r/g, "\\r");
}

function escapeDesktopExecFilePath(input: string): string {
  const originalPath = input;
  const escapedExec = input
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");
  const escapedString = escapeDesktopFilePath(escapedExec);
  if (escapedString === originalPath) {
    return originalPath;
  }
  return `"${escapedString}"`;
}

function generateDesktopEntry(wrapperPath: string): string {
  const escapedWrapperExec = escapeDesktopExecFilePath(wrapperPath);
  const escapedWrapperTryExec = escapeDesktopFilePath(wrapperPath);

  return (
    "[Desktop Entry]\n" +
    "Type=Application\n" +
    "Name=Vortex\n" +
    "GenericName=Mod Manager\n" +
    "Comment=Mod manager for PC games from Nexus Mods\n" +
    `Exec=${escapedWrapperExec} %u\n` +
    `TryExec=${escapedWrapperTryExec}\n` +
    `Icon=${ICON_THEME_NAME}\n` +
    "Terminal=false\n" +
    "Categories=Game;Utility;\n" +
    "MimeType=x-scheme-handler/nxm;\n" +
    "StartupWMClass=Vortex\n" +
    "StartupNotify=true\n" +
    "Keywords=mod;mods;modding;nexus;games;skyrim;fallout;\n"
  );
}

export function resolveLinuxIconPath(): string | undefined {
  const candidates = [
    path.join(process.resourcesPath, "icons", "256x256.png"),
    path.join(process.resourcesPath, "icons", "512x512.png"),
    path.join(process.resourcesPath, "app.asar.unpacked", "assets", "images", "vortex.png"),
    path.join(process.resourcesPath, "build", "icons", "256x256.png"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function installIcons(iconSourcePath: string): boolean {
  let changed = false;
  const iconsRoot = iconsDirectory();

  for (const size of ICON_SIZES) {
    const iconDir = path.join(iconsRoot, "hicolor", `${size}x${size}`, "apps");
    const iconPath = path.join(iconDir, `${ICON_THEME_NAME}.png`);
    mkdirSync(iconDir, { recursive: true });

    try {
      if (!existsSync(iconPath)) {
        copyFileSync(iconSourcePath, iconPath);
        changed = true;
        continue;
      }

      const existing = readFileSync(iconPath);
      const source = readFileSync(iconSourcePath);
      if (!existing.equals(source)) {
        copyFileSync(iconSourcePath, iconPath);
        changed = true;
      }
    } catch (err) {
      log("warn", "failed to install linux desktop icon", {
        iconPath,
        error: (err as Error).message,
      });
    }
  }

  return changed;
}

function isEnoent(error: Error | undefined): boolean {
  return error !== undefined && "code" in error && error.code === "ENOENT";
}

function refreshDesktopDatabase(applicationsDir: string): void {
  const result = spawnSync("update-desktop-database", [applicationsDir], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (isEnoent(result.error)) {
    return;
  }

  if (result.status !== 0) {
    log("debug", "update-desktop-database returned non-zero", {
      status: result.status,
      stderr: result.stderr?.trim(),
    });
  }
}

export function shouldInstallLinuxDesktopIntegration(): boolean {
  return (
    process.platform === "linux" &&
    process.env.NODE_ENV === "production" &&
    process.env.IS_FLATPAK !== "true"
  );
}

export function ensureLinuxDesktopIntegration(executablePath: string): void {
  if (!shouldInstallLinuxDesktopIntegration()) {
    return;
  }

  const applicationsDir = applicationsDirectory();
  const wrapperPath = path.join(applicationsDir, PACKAGE_WRAPPER_FILE_NAME);
  const desktopFilePath = path.join(applicationsDir, PACKAGE_DESKTOP_ID);

  const wrapperChanged = writeFileIfChanged(
    wrapperPath,
    generateWrapperScript(executablePath),
    0o755,
  );
  const desktopChanged = writeFileIfChanged(
    desktopFilePath,
    generateDesktopEntry(wrapperPath),
    0o644,
  );

  const iconSourcePath = resolveLinuxIconPath();
  const iconsChanged = iconSourcePath !== undefined ? installIcons(iconSourcePath) : false;

  if (wrapperChanged || desktopChanged || iconsChanged) {
    refreshDesktopDatabase(applicationsDir);
    log("info", "installed linux desktop integration", {
      desktopFilePath,
      wrapperPath,
      iconSourcePath,
    });
  }
}
