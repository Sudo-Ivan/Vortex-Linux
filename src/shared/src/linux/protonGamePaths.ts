export interface IProtonPathInference {
  usesProton: boolean;
  compatDataPath?: string;
  winePrefixPath?: string;
  steamAppsPath?: string;
}

function joinPosix(...parts: string[]): string {
  return parts
    .filter((part) => part.length > 0)
    .join("/")
    .replace(/\/+/g, "/");
}

export function getWineDocumentsPath(winePrefixPath: string): string {
  return joinPosix(winePrefixPath, "drive_c/users/steamuser/Documents");
}

export function getWineAppDataLocalPath(winePrefixPath: string): string {
  return joinPosix(winePrefixPath, "drive_c/users/steamuser/AppData/Local");
}

export function getWineAppDataRoamingPath(winePrefixPath: string): string {
  return joinPosix(winePrefixPath, "drive_c/users/steamuser/AppData/Roaming");
}

export function buildMyGamesPath(documentsPath: string, gameFolderName: string): string {
  return joinPosix(documentsPath, "My Games", gameFolderName);
}

export function buildAppDataLocalGamePath(winePrefixPath: string, appDataFolder: string): string {
  return joinPosix(getWineAppDataLocalPath(winePrefixPath), appDataFolder);
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
