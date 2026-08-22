import * as path from "path";

import { fs, log, types } from "@nexusmods/vortex-api";
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

interface IHeroicConfigFile {
  defaultInstallPath?: string;
}

function getHeroicConfigDirs(home: string): string[] {
  return [
    path.join(home, ".config", "heroic"),
    path.join(home, ".var", "app", "com.heroicgameslauncher.hgl", "config", "heroic"),
  ];
}

function getDefaultScanRoots(home: string): string[] {
  return [
    path.join(home, "GOG Games"),
    path.join(home, "Games"),
    path.join(home, "Games", "Heroic"),
  ];
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

async function entriesFromHeroic(home: string): Promise<types.IGameStoreEntry[]> {
  const entries: types.IGameStoreEntry[] = [];

  for (const configDir of getHeroicConfigDirs(home)) {
    const installed = await readJsonFile<IHeroicInstalledFile>(
      path.join(configDir, "gog_store", "installed.json"),
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
          entries.push(parsed);
          continue;
        }
      }

      entries.push({
        appid: game.appName,
        gamePath: game.install_path,
        name: path.basename(game.install_path),
        gameStoreId: STORE_ID,
      });
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
    const config = await readJsonFile<IHeroicConfigFile>(path.join(configDir, "config.json"));
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

export async function discoverLinuxGogGames(home: string): Promise<types.IGameStoreEntry[]> {
  const scanRoots = getDefaultScanRoots(home);
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
