import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import * as path from "node:path";

import type {
  CompatibilityRunnerType,
  ICompatibilityRunner,
  IHeroicConfigFile,
  IHeroicGameConfigFile,
  IHeroicGameMatch,
  IHeroicInstalledFile,
  IWinePrefixOption,
} from "@vortex/shared/linux";
import {
  buildPrefixId,
  buildRunnerId,
  expandHomePath,
  getHeroicConfigDirs,
  heroicGameSettingsFromConfig,
  heroicRunnerType,
  isProtonRunnerName,
  resolveHeroicGameCompatibility,
} from "@vortex/shared/linux";

import { findLinuxSteamPath, getLinuxSteamPaths } from "./systemHealth";

export interface ICompatibilityDiscoveryQuery {
  gamePath?: string;
  steamAppId?: string | number;
  heroicAppName?: string;
}

export interface ICompatibilityDiscoveryResult {
  runners: ICompatibilityRunner[];
  prefixes: IWinePrefixOption[];
  heroicMatch?: IHeroicGameMatch;
  steamPath?: string;
}

function readJsonFile<T>(filePath: string): T | undefined {
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function pathExists(targetPath: string): boolean {
  try {
    statSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function listDirectoryNames(parentPath: string): string[] {
  try {
    return readdirSync(parentPath);
  } catch {
    return [];
  }
}

function runnerFromDirectory(
  runnerPath: string,
  type: CompatibilityRunnerType,
  displayName?: string,
): ICompatibilityRunner | undefined {
  if (!pathExists(runnerPath)) {
    return undefined;
  }
  const name = displayName ?? path.basename(runnerPath);
  return {
    id: buildRunnerId(type, runnerPath),
    name,
    type,
    path: runnerPath,
  };
}

function listProtonRunnersFromSteam(steamPath: string): ICompatibilityRunner[] {
  const runners: ICompatibilityRunner[] = [];
  const seen = new Set<string>();

  const addRunner = (runnerPath: string, displayName?: string) => {
    const runner = runnerFromDirectory(runnerPath, "proton", displayName);
    if (runner !== undefined && !seen.has(runner.path)) {
      seen.add(runner.path);
      runners.push(runner);
    }
  };

  const customToolsPath = path.join(steamPath, "compatibilitytools.d");
  for (const entry of listDirectoryNames(customToolsPath)) {
    addRunner(path.join(customToolsPath, entry), entry);
  }

  const commonPath = path.join(steamPath, "steamapps", "common");
  for (const entry of listDirectoryNames(commonPath)) {
    if (isProtonRunnerName(entry)) {
      addRunner(path.join(commonPath, entry), entry);
    }
  }

  return runners.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name));
}

function listWineRunnersFromHeroic(home: string): ICompatibilityRunner[] {
  const runners: ICompatibilityRunner[] = [];
  const seen = new Set<string>();

  for (const configDir of getHeroicConfigDirs(home)) {
    const toolsPath = path.join(configDir, "tools");
    for (const entry of listDirectoryNames(toolsPath)) {
      const toolPath = path.join(toolsPath, entry);
      if (!pathExists(toolPath)) {
        continue;
      }
      const lower = entry.toLowerCase();
      const type: CompatibilityRunnerType = lower.includes("proton") ? "proton" : "wine";
      const runner = runnerFromDirectory(toolPath, type, entry);
      if (runner !== undefined && !seen.has(runner.path)) {
        seen.add(runner.path);
        runners.push(runner);
      }
    }
  }

  return runners.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name));
}

function listSystemWineRunners(): ICompatibilityRunner[] {
  const candidates = ["/usr/bin/wine", "/usr/local/bin/wine"];
  const runners: ICompatibilityRunner[] = [];
  for (const candidate of candidates) {
    if (!pathExists(candidate)) {
      continue;
    }
    runners.push({
      id: buildRunnerId("wine", candidate),
      name: "System Wine",
      type: "wine",
      path: candidate,
    });
  }
  return runners;
}

export function listCompatibilityRunners(home: string): ICompatibilityRunner[] {
  const runners: ICompatibilityRunner[] = [];
  const seen = new Set<string>();

  const addRunner = (runner: ICompatibilityRunner | undefined) => {
    if (runner !== undefined && !seen.has(runner.path)) {
      seen.add(runner.path);
      runners.push(runner);
    }
  };

  const steamPath = findLinuxSteamPath(home);
  if (steamPath !== undefined) {
    for (const runner of listProtonRunnersFromSteam(steamPath)) {
      addRunner(runner);
    }
  }

  for (const runner of listWineRunnersFromHeroic(home)) {
    addRunner(runner);
  }

  for (const runner of listSystemWineRunners()) {
    addRunner(runner);
  }

  return runners.sort((lhs, rhs) => lhs.name.localeCompare(rhs.name));
}

function getSteamLibraryRoots(steamPath: string): string[] {
  const roots = new Set<string>();
  roots.add(path.join(steamPath, "steamapps"));

  const libraryFoldersPath = path.join(steamPath, "config", "libraryfolders.vdf");
  try {
    const contents = readFileSync(libraryFoldersPath, "utf8");
    const matches = contents.matchAll(/"path"\s+"([^"]+)"/g);
    for (const match of matches) {
      const libraryPath = match[1]?.replace(/\\\\/g, "\\");
      if (libraryPath !== undefined && libraryPath.length > 0) {
        roots.add(path.join(libraryPath, "steamapps"));
      }
    }
  } catch {
    // ignore missing libraryfolders.vdf
  }

  return Array.from(roots);
}

function listSteamPrefixes(steamPath: string, steamAppId?: string | number): IWinePrefixOption[] {
  const prefixes: IWinePrefixOption[] = [];
  const appId = steamAppId !== undefined ? String(steamAppId) : undefined;

  for (const steamAppsPath of getSteamLibraryRoots(steamPath)) {
    const compatRoot = path.join(steamAppsPath, "compatdata");
    if (!pathExists(compatRoot)) {
      continue;
    }

    const appIds =
      appId !== undefined
        ? [appId]
        : listDirectoryNames(compatRoot).filter((entry) => /^\d+$/.test(entry));

    for (const currentAppId of appIds) {
      const prefixPath = path.join(compatRoot, currentAppId, "pfx");
      if (!pathExists(prefixPath)) {
        continue;
      }
      prefixes.push({
        id: buildPrefixId("steam", prefixPath),
        label: `Steam compatdata ${currentAppId}`,
        path: prefixPath,
        source: "steam",
      });
    }
  }

  return prefixes;
}

function listHeroicPrefixes(home: string, heroicAppName?: string): IWinePrefixOption[] {
  const prefixes: IWinePrefixOption[] = [];
  const seen = new Set<string>();

  const addPrefix = (prefixPath: string, label: string) => {
    const expanded = expandHomePath(prefixPath, home);
    if (!pathExists(expanded) || seen.has(expanded)) {
      return;
    }
    seen.add(expanded);
    prefixes.push({
      id: buildPrefixId("heroic", expanded),
      label,
      path: expanded,
      source: "heroic",
    });
  };

  for (const configDir of getHeroicConfigDirs(home)) {
    const gamesConfigDir = path.join(configDir, "GamesConfig");
    for (const entry of listDirectoryNames(gamesConfigDir)) {
      if (!entry.endsWith(".json")) {
        continue;
      }
      const appName = entry.slice(0, -".json".length);
      if (heroicAppName !== undefined && appName !== heroicAppName) {
        continue;
      }
      const config = readJsonFile<IHeroicGameConfigFile>(path.join(gamesConfigDir, entry));
      const settings = heroicGameSettingsFromConfig(config, appName);
      if (settings?.winePrefix !== undefined) {
        addPrefix(settings.winePrefix, `Heroic ${appName}`);
      }
    }

    const heroicConfig = readJsonFile<IHeroicConfigFile>(path.join(configDir, "config.json"));
    const defaultPrefix = heroicConfig?.defaultSettings?.defaultWinePrefix;
    if (defaultPrefix !== undefined) {
      addPrefix(defaultPrefix, "Heroic default prefix");
    }
  }

  const heroicPrefixesRoot = path.join(home, "Games", "Heroic", "Prefixes");
  for (const entry of listDirectoryNames(heroicPrefixesRoot)) {
    const prefixPath = path.join(heroicPrefixesRoot, entry);
    try {
      if (statSync(prefixPath).isDirectory()) {
        addPrefix(prefixPath, `Heroic prefix ${entry}`);
      }
    } catch {
      continue;
    }
  }

  return prefixes;
}

function heroicStoreFromInstalledPath(installedPath: string): IHeroicGameMatch["store"] {
  if (installedPath.includes(`${path.sep}gog_store${path.sep}`)) {
    return "gog";
  }
  if (installedPath.includes(`${path.sep}legendary_store${path.sep}`)) {
    return "legendary";
  }
  if (installedPath.includes(`${path.sep}epic_store${path.sep}`)) {
    return "epic";
  }
  if (installedPath.includes(`${path.sep}nile_store${path.sep}`)) {
    return "nile";
  }
  return "sideload";
}

function heroicMatchFromInstalled(
  home: string,
  configDir: string,
  installedPath: string,
  installed: IHeroicInstalledFile,
): IHeroicGameMatch[] {
  const matches: IHeroicGameMatch[] = [];
  const heroicConfig = readJsonFile<IHeroicConfigFile>(path.join(configDir, "config.json"));
  const store = heroicStoreFromInstalledPath(installedPath);

  for (const game of installed.installed ?? []) {
    if (game.appName === undefined || game.install_path === undefined) {
      continue;
    }

    const gameConfig = readJsonFile<IHeroicGameConfigFile>(
      path.join(configDir, "GamesConfig", `${game.appName}.json`),
    );
    const settings = heroicGameSettingsFromConfig(gameConfig, game.appName);
    const compatibility = resolveHeroicGameCompatibility(settings, heroicConfig, home);

    matches.push({
      appName: game.appName,
      installPath: expandHomePath(game.install_path, home),
      winePrefix: compatibility.winePrefix,
      runnerPath: compatibility.runnerPath,
      runnerName: compatibility.runnerName,
      runnerType: compatibility.runnerType,
      store,
    });
  }

  return matches;
}

export function listHeroicGames(home: string): IHeroicGameMatch[] {
  const matches: IHeroicGameMatch[] = [];
  const installedFiles = [
    "gog_store/installed.json",
    "legendary_store/installed.json",
    "epic_store/installed.json",
    "nile_store/installed.json",
    "sideload_apps/installed.json",
  ];

  for (const configDir of getHeroicConfigDirs(home)) {
    for (const installedRelative of installedFiles) {
      const installedPath = path.join(configDir, installedRelative);
      const installed = readJsonFile<IHeroicInstalledFile>(installedPath);
      if (installed?.installed === undefined) {
        continue;
      }
      matches.push(...heroicMatchFromInstalled(home, configDir, installedPath, installed));
    }
  }

  return matches;
}

export function detectHeroicGameByPath(
  home: string,
  gamePath: string,
): IHeroicGameMatch | undefined {
  const normalizedGamePath = path.resolve(gamePath);
  const heroicGames = listHeroicGames(home);
  return heroicGames
    .filter((match) => {
      const installPath = path.resolve(match.installPath);
      return (
        normalizedGamePath === installPath ||
        normalizedGamePath.startsWith(`${installPath}${path.sep}`)
      );
    })
    .sort((lhs, rhs) => rhs.installPath.length - lhs.installPath.length)[0];
}

export function discoverCompatibilityOptions(
  home: string,
  query: ICompatibilityDiscoveryQuery = {},
): ICompatibilityDiscoveryResult {
  const steamPath = findLinuxSteamPath(home);
  const heroicMatch =
    query.gamePath !== undefined ? detectHeroicGameByPath(home, query.gamePath) : undefined;
  const heroicAppName = query.heroicAppName ?? heroicMatch?.appName;

  const runners = listCompatibilityRunners(home);
  const prefixes: IWinePrefixOption[] = [];

  if (steamPath !== undefined) {
    prefixes.push(...listSteamPrefixes(steamPath, query.steamAppId));
  }
  prefixes.push(...listHeroicPrefixes(home, heroicAppName));

  if (heroicMatch?.winePrefix !== undefined) {
    const heroicPrefix = expandHomePath(heroicMatch.winePrefix, home);
    if (pathExists(heroicPrefix) && !prefixes.some((prefix) => prefix.path === heroicPrefix)) {
      prefixes.unshift({
        id: buildPrefixId("heroic", heroicPrefix),
        label: `Heroic ${heroicMatch.appName}`,
        path: heroicPrefix,
        source: "heroic",
      });
    }
  }

  if (heroicMatch?.runnerPath !== undefined) {
    const runnerType = heroicMatch.runnerType ?? heroicRunnerType({ type: "proton" });
    const runnerPath =
      runnerType === "proton" ? path.dirname(heroicMatch.runnerPath) : heroicMatch.runnerPath;
    if (!runners.some((runner) => runner.path === runnerPath)) {
      runners.unshift({
        id: buildRunnerId(runnerType, runnerPath),
        name: heroicMatch.runnerName ?? path.basename(runnerPath),
        type: runnerType,
        path: runnerPath,
      });
    }
  }

  return {
    runners,
    prefixes,
    heroicMatch,
    steamPath,
  };
}

export function getLinuxSteamInstallPath(home: string): string | undefined {
  return findLinuxSteamPath(home);
}

export function getAllLinuxSteamPaths(home: string): string[] {
  return getLinuxSteamPaths(home);
}
