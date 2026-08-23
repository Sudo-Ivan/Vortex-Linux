import * as path from "path";

import { fs, log, types } from "@nexusmods/vortex-api";
import {
  buildPrefixId,
  buildRunnerId,
  expandHomePath,
  getHeroicConfigDirs,
  heroicGameSettingsFromConfig,
  type IHeroicConfigFile,
  type IHeroicGameConfigFile,
  resolveHeroicGameCompatibility,
} from "@vortex/shared/linux";
import Bluebird from "bluebird";

const STORE_ID = "gog";

interface IGogInfoFile {
  gameId?: string;
  rootGameId?: string;
  name?: string;
  playTasks?: Array<{
    category?: string;
    isPrimary?: boolean;
    path?: string;
    type?: string;
  }>;
}

interface IHeroicInstalledFile {
  installed?: Array<{
    appName?: string;
    install_path?: string;
  }>;
}

interface IHeroicConfigFileLocal {
  defaultInstallPath?: string;
}

interface IHeroicGameStoreEntry extends types.IGameStoreEntry {
  heroicAppName?: string;
  winePrefixPath?: string;
  protonPath?: string;
  compatibilityRunnerId?: string;
  compatibilityRunnerType?: "proton" | "wine";
  winePrefixId?: string;
}

function getDefaultScanRoots(home: string): string[] {
  return [
    path.join(home, "GOG Games"),
    path.join(home, "Games"),
    path.join(home, "Games", "Heroic"),
  ];
}

export function collectGogScanRoots(home: string, customRoots: string[] = []): string[] {
  const roots = [...getDefaultScanRoots(home)];
  for (const root of customRoots) {
    if (root.length > 0 && !roots.includes(root)) {
      roots.push(root);
    }
  }
  return roots;
}

async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  try {
    const data = await fs.readFileAsync(filePath, { encoding: "utf8" });
    return JSON.parse(data) as T;
  } catch (err) {
    if (err?.code !== "ENOENT") {
      log("debug", "gamestore-gog: failed to read json file", { filePath, error: err.message });
    }
    return undefined;
  }
}

async function findGogInfoFiles(root: string, depth: number): Promise<string[]> {
  if (depth <= 0) {
    return [];
  }

  let entries: string[];
  try {
    entries = await fs.readdirAsync(root);
  } catch {
    return [];
  }

  const infoFiles: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry);
    if (entry.startsWith("goggame-") && entry.endsWith(".info")) {
      infoFiles.push(fullPath);
      continue;
    }

    if (depth > 1) {
      try {
        const stat = await fs.statAsync(fullPath);
        if (stat.isDirectory()) {
          const nested = await findGogInfoFiles(fullPath, depth - 1);
          infoFiles.push(...nested);
        }
      } catch {
        continue;
      }
    }
  }

  return infoFiles;
}

async function resolveGamePath(infoPath: string): Promise<string> {
  const infoDir = path.dirname(infoPath);
  const gameSubDir = path.join(infoDir, "game");
  try {
    const stat = await fs.statAsync(gameSubDir);
    return stat.isDirectory() ? gameSubDir : infoDir;
  } catch {
    return infoDir;
  }
}

async function entryFromInfoFile(infoPath: string): Promise<types.IGameStoreEntry | undefined> {
  const info = await readJsonFile<IGogInfoFile>(infoPath);
  if (info === undefined) {
    return undefined;
  }

  const appId = info.gameId ?? info.rootGameId;
  if (appId === undefined || info.name === undefined) {
    return undefined;
  }

  const gamePath = await resolveGamePath(infoPath);
  return {
    appid: appId,
    gamePath,
    name: info.name,
    gameStoreId: STORE_ID,
  };
}

async function heroicEntryFromInstalledGame(
  home: string,
  configDir: string,
  heroicConfig: IHeroicConfigFile | undefined,
  game: { appName: string; install_path: string },
  parsed?: types.IGameStoreEntry,
): Promise<IHeroicGameStoreEntry> {
  const gameConfig = await readJsonFile<IHeroicGameConfigFile>(
    path.join(configDir, "GamesConfig", `${game.appName}.json`),
  );
  const settings = heroicGameSettingsFromConfig(gameConfig, game.appName);
  const compatibility = resolveHeroicGameCompatibility(settings, heroicConfig, home);
  const runnerType = compatibility.runnerType;
  const runnerPath =
    compatibility.runnerPath !== undefined && runnerType === "proton"
      ? path.dirname(compatibility.runnerPath)
      : compatibility.runnerPath;
  const winePrefixPath = compatibility.winePrefix;

  const baseEntry: IHeroicGameStoreEntry =
    parsed !== undefined
      ? { ...parsed }
      : {
          appid: game.appName,
          gamePath: expandHomePath(game.install_path, home),
          name: path.basename(game.install_path),
          gameStoreId: STORE_ID,
        };

  return {
    ...baseEntry,
    heroicAppName: game.appName,
    winePrefixPath,
    protonPath: runnerType === "proton" ? runnerPath : undefined,
    compatibilityRunnerType: runnerType,
    compatibilityRunnerId:
      runnerPath !== undefined && runnerType !== undefined
        ? buildRunnerId(runnerType, runnerPath)
        : undefined,
    winePrefixId:
      winePrefixPath !== undefined ? buildPrefixId("heroic", winePrefixPath) : undefined,
  };
}

async function entriesFromHeroic(home: string): Promise<types.IGameStoreEntry[]> {
  const entries: types.IGameStoreEntry[] = [];
  const installedFiles = [
    "gog_store/installed.json",
    "legendary_store/installed.json",
    "epic_store/installed.json",
    "nile_store/installed.json",
    "sideload_apps/installed.json",
  ];

  for (const configDir of getHeroicConfigDirs(home)) {
    const heroicConfig = await readJsonFile<IHeroicConfigFile>(path.join(configDir, "config.json"));

    for (const installedRelative of installedFiles) {
      const installed = await readJsonFile<IHeroicInstalledFile>(
        path.join(configDir, installedRelative),
      );
      if (installed?.installed === undefined) {
        continue;
      }

      for (const game of installed.installed) {
        if (game.appName === undefined || game.install_path === undefined) {
          continue;
        }

        const infoFiles = await findGogInfoFiles(game.install_path, 2);
        if (infoFiles.length > 0) {
          const parsed = await entryFromInfoFile(infoFiles[0]);
          if (parsed !== undefined) {
            entries.push(
              await heroicEntryFromInstalledGame(
                home,
                configDir,
                heroicConfig,
                {
                  appName: game.appName,
                  install_path: game.install_path,
                },
                parsed,
              ),
            );
            continue;
          }
        }

        entries.push(
          await heroicEntryFromInstalledGame(home, configDir, heroicConfig, {
            appName: game.appName,
            install_path: game.install_path,
          }),
        );
      }
    }
  }

  return entries;
}

async function entriesFromScanRoots(scanRoots: string[]): Promise<types.IGameStoreEntry[]> {
  const entries: types.IGameStoreEntry[] = [];

  for (const root of scanRoots) {
    const infoFiles = await findGogInfoFiles(root, 4);
    for (const infoPath of infoFiles) {
      const entry = await entryFromInfoFile(infoPath);
      if (entry !== undefined) {
        entries.push(entry);
      }
    }
  }

  return entries;
}

async function getHeroicDefaultInstallPath(home: string): Promise<string | undefined> {
  for (const configDir of getHeroicConfigDirs(home)) {
    const config = await readJsonFile<IHeroicConfigFileLocal>(path.join(configDir, "config.json"));
    if (config?.defaultInstallPath !== undefined) {
      return config.defaultInstallPath;
    }
  }
  return undefined;
}

export function resolveLaunchPathWithinGame(
  gameRoot: string,
  launchPath: string,
): string | undefined {
  if (launchPath.length === 0) {
    return undefined;
  }

  if (path.isAbsolute(launchPath)) {
    return undefined;
  }

  const resolvedRoot = path.resolve(gameRoot);
  const resolvedLaunch = path.resolve(resolvedRoot, launchPath);
  const rootPrefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;

  if (resolvedLaunch !== resolvedRoot && !resolvedLaunch.startsWith(rootPrefix)) {
    return undefined;
  }

  return resolvedLaunch;
}

function dedupeEntries(entries: types.IGameStoreEntry[]): types.IGameStoreEntry[] {
  const byAppId = new Map<string, types.IGameStoreEntry>();
  for (const entry of entries) {
    const existing = byAppId.get(entry.appid);
    if (existing === undefined || existing.gamePath.length < entry.gamePath.length) {
      byAppId.set(entry.appid, entry);
    }
  }
  return Array.from(byAppId.values());
}

export async function discoverLinuxGogGames(
  home: string,
  customRoots: string[] = [],
): Promise<types.IGameStoreEntry[]> {
  const scanRoots = collectGogScanRoots(home, customRoots);
  const heroicDefaultPath = await getHeroicDefaultInstallPath(home);
  if (heroicDefaultPath !== undefined && !scanRoots.includes(heroicDefaultPath)) {
    scanRoots.push(heroicDefaultPath);
  }

  const [heroicEntries, scannedEntries] = await Bluebird.all([
    entriesFromHeroic(home),
    entriesFromScanRoots(scanRoots),
  ]);

  return dedupeEntries([...heroicEntries, ...scannedEntries]);
}

export async function resolveLinuxLaunchPath(gamePath: string): Promise<string | undefined> {
  const infoFiles = await findGogInfoFiles(gamePath, 2);
  if (infoFiles.length === 0) {
    return undefined;
  }

  const info = await readJsonFile<IGogInfoFile>(infoFiles[0]);
  if (info?.playTasks === undefined) {
    return undefined;
  }

  const primaryTask =
    info.playTasks.find((task) => task.isPrimary === true) ??
    info.playTasks.find((task) => task.category === "game" && task.type === "FileTask");

  if (primaryTask?.path === undefined) {
    return undefined;
  }

  const resolvedGamePath = await resolveGamePath(infoFiles[0]);
  return resolveLaunchPathWithinGame(resolvedGamePath, primaryTask.path);
}
