import * as path from "path";

import { types, util } from "@nexusmods/vortex-api";
import { inferProtonPathsFromGamePath, myGamesFolderCaseVariants } from "@vortex/shared/linux";

type Discovery = types.IDiscoveryResult & { winePrefixPath?: string };

const resolvedMyGamesRoot: { [gameId: string]: string } = {};

export function invalidateResolvedMyGamesPath(gameId?: string): void {
  if (gameId === undefined) {
    Object.keys(resolvedMyGamesRoot).forEach((key) => delete resolvedMyGamesRoot[key]);
    return;
  }
  delete resolvedMyGamesRoot[gameId];
}

export function getCachedMyGamesRoot(gameId: string): string | undefined {
  return resolvedMyGamesRoot[gameId];
}

export function documentsPathForSaves(discovery: Discovery | undefined): string {
  if (discovery?.winePrefixPath !== undefined) {
    return path.join(discovery.winePrefixPath, "drive_c", "users", "steamuser", "Documents");
  }
  return util.getVortexPath("documents");
}

export function syncMyGamesPath(
  gameMode: string,
  gameFolderName: string,
  discovery: Discovery | undefined,
): string {
  const cached = resolvedMyGamesRoot[gameMode];
  if (cached !== undefined) {
    return cached;
  }
  return path.join(documentsPathForSaves(discovery), "My Games", gameFolderName);
}

async function pathExists(
  targetPath: string,
  statAsync: (p: string) => Promise<unknown>,
): Promise<boolean> {
  try {
    await statAsync(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveExistingChildDir(
  parentDir: string,
  childName: string,
  readdirAsync: (p: string) => Promise<string[]>,
  statAsync: (p: string) => Promise<unknown>,
): Promise<string | undefined> {
  for (const variant of myGamesFolderCaseVariants(childName)) {
    if (await pathExists(path.join(parentDir, variant), statAsync)) {
      return variant;
    }
  }

  try {
    const entries = await readdirAsync(parentDir);
    const match = entries.find((entry) => entry.toLowerCase() === childName.toLowerCase());
    return match;
  } catch {
    return undefined;
  }
}

export async function resolveMyGamesRoot(
  gameMode: string,
  gameFolderName: string,
  discovery: Discovery | undefined,
  gamePath: string | undefined,
  steamAppId: string | number | undefined,
  fsApi: {
    statAsync: (p: string) => Promise<unknown>;
    readdirAsync: (p: string) => Promise<string[]>;
  },
): Promise<string> {
  let winePrefixPath = discovery?.winePrefixPath;
  if (winePrefixPath === undefined && gamePath !== undefined && steamAppId !== undefined) {
    const inferred = inferProtonPathsFromGamePath(gamePath, steamAppId);
    if (inferred.winePrefixPath !== undefined) {
      const prefixExists = await pathExists(inferred.winePrefixPath, fsApi.statAsync);
      if (prefixExists) {
        winePrefixPath = inferred.winePrefixPath;
      }
    }
  }

  const discoveryWithPrefix =
    winePrefixPath !== undefined ? { ...discovery, winePrefixPath } : discovery;
  const documentsPath = documentsPathForSaves(discoveryWithPrefix);
  const myGamesParent = path.join(documentsPath, "My Games");

  const resolvedFolder = await resolveExistingChildDir(
    myGamesParent,
    gameFolderName,
    fsApi.readdirAsync,
    fsApi.statAsync,
  );

  const resolved = path.join(myGamesParent, resolvedFolder ?? gameFolderName);
  resolvedMyGamesRoot[gameMode] = resolved;
  return resolved;
}
