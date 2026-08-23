export interface IProtonPathInference {
  usesProton: boolean;
  compatDataPath?: string;
  winePrefixPath?: string;
  steamAppsPath?: string;
}

const WINE_SYSTEM_USER_DIRS = new Set(["public", "default", "default user", "all users"]);

function joinPosix(...parts: string[]): string {
  return parts
    .filter((part) => part.length > 0)
    .join("/")
    .replace(/\/+/g, "/");
}

export function pickWineUserName(userEntries: string[]): string {
  if (userEntries.includes("steamuser")) {
    return "steamuser";
  }

  const candidate = userEntries.find((entry) => !WINE_SYSTEM_USER_DIRS.has(entry.toLowerCase()));
  return candidate ?? "steamuser";
}

export function listCandidateWineUsers(userEntries: string[]): string[] {
  const ordered: string[] = [];
  const add = (user: string) => {
    if (!ordered.includes(user)) {
      ordered.push(user);
    }
  };

  add(pickWineUserName(userEntries));
  if (userEntries.includes("steamuser")) {
    add("steamuser");
  }

  for (const entry of userEntries) {
    if (!WINE_SYSTEM_USER_DIRS.has(entry.toLowerCase())) {
      add(entry);
    }
  }

  return ordered;
}

export function getWineUserDir(winePrefixPath: string, wineUser = "steamuser"): string {
  return joinPosix(winePrefixPath, "drive_c/users", wineUser);
}

export function getWineDocumentsPath(winePrefixPath: string, wineUser = "steamuser"): string {
  return joinPosix(getWineUserDir(winePrefixPath, wineUser), "Documents");
}

export function getWineAppDataLocalPath(winePrefixPath: string, wineUser = "steamuser"): string {
  return joinPosix(getWineUserDir(winePrefixPath, wineUser), "AppData/Local");
}

export function getWineAppDataRoamingPath(winePrefixPath: string, wineUser = "steamuser"): string {
  return joinPosix(getWineUserDir(winePrefixPath, wineUser), "AppData/Roaming");
}

export function resolveWineAppDataLocalGamePath(
  winePrefixPath: string,
  appDataFolder: string,
  userEntries: string[] | undefined,
  pathExists: (target: string) => boolean,
): string | undefined {
  const users =
    userEntries !== undefined && userEntries.length > 0
      ? listCandidateWineUsers(userEntries)
      : ["steamuser"];

  for (const user of users) {
    const candidate = buildAppDataLocalGamePath(winePrefixPath, appDataFolder, user);
    if (pathExists(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function buildMyGamesPath(documentsPath: string, gameFolderName: string): string {
  return joinPosix(documentsPath, "My Games", gameFolderName);
}

export function buildAppDataLocalGamePath(
  winePrefixPath: string,
  appDataFolder: string,
  wineUser = "steamuser",
): string {
  return joinPosix(getWineAppDataLocalPath(winePrefixPath, wineUser), appDataFolder);
}

export function inferSteamAppsPathFromGamePath(gamePath: string): string | undefined {
  const normalized = gamePath.replace(/\\/g, "/");
  const markerPosix = "/steamapps/common/";
  const idx = normalized.toLowerCase().indexOf(markerPosix);
  if (idx === -1) {
    return undefined;
  }
  return normalized.slice(0, idx + "/steamapps".length);
}

export function inferProtonPathsFromGamePath(
  gamePath: string,
  steamAppId: string | number | undefined,
): IProtonPathInference {
  if (steamAppId === undefined || steamAppId === null || steamAppId === "") {
    return { usesProton: false };
  }

  const steamAppsPath = inferSteamAppsPathFromGamePath(gamePath);
  if (steamAppsPath === undefined) {
    return { usesProton: false };
  }

  const compatDataPath = joinPosix(steamAppsPath, "compatdata", String(steamAppId));
  const winePrefixPath = joinPosix(compatDataPath, "pfx");
  return {
    usesProton: true,
    compatDataPath,
    winePrefixPath,
    steamAppsPath,
  };
}

export function myGamesFolderCaseVariants(expectedName: string): string[] {
  const variants = new Set<string>();
  variants.add(expectedName);
  variants.add(expectedName.toLowerCase());
  variants.add(expectedName.toUpperCase());
  if (!expectedName.includes(" ")) {
    variants.add(expectedName.charAt(0).toUpperCase() + expectedName.slice(1).toLowerCase());
  }
  return Array.from(variants);
}
