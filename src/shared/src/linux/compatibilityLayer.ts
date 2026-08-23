export type CompatibilityRunnerType = "proton" | "wine";

export type WinePrefixSource = "steam" | "heroic" | "custom";

export interface ICompatibilityRunner {
  id: string;
  name: string;
  type: CompatibilityRunnerType;
  path: string;
}

export interface IWinePrefixOption {
  id: string;
  label: string;
  path: string;
  source: WinePrefixSource;
}

export interface IHeroicWineVersion {
  bin?: string;
  name?: string;
  type?: string;
}

export interface IHeroicGameSettings {
  winePrefix?: string;
  wineVersion?: IHeroicWineVersion;
  installPath?: string;
}

export interface IHeroicGameConfigFile {
  [appName: string]: IHeroicGameSettings;
}

export interface IHeroicInstalledEntry {
  appName?: string;
  install_path?: string;
}

export interface IHeroicInstalledFile {
  installed?: IHeroicInstalledEntry[];
}

export interface IHeroicDefaultSettings {
  winePrefix?: string;
  defaultWinePrefix?: string;
  defaultWinePrefixDir?: string;
  wineVersion?: IHeroicWineVersion;
}

export interface IHeroicConfigFile {
  defaultSettings?: IHeroicDefaultSettings;
  defaultWinePrefix?: string;
  defaultWinePrefixDir?: string;
  winePrefix?: string;
  wineVersion?: IHeroicWineVersion;
}

export interface IHeroicGameMatch {
  appName: string;
  installPath: string;
  winePrefix?: string;
  runnerPath?: string;
  runnerName?: string;
  runnerType?: CompatibilityRunnerType;
  store: "gog" | "epic" | "legendary" | "nile" | "sideload";
}

export function getHeroicConfigDirs(home: string): string[] {
  return [`${home}/.config/heroic`, `${home}/.var/app/com.heroicgameslauncher.hgl/config/heroic`];
}

export function expandHomePath(input: string, home: string): string {
  if (input.length === 0) {
    return input;
  }
  if (input === "~") {
    return home;
  }
  if (input.startsWith("~/")) {
    return `${home}/${input.slice(2)}`;
  }
  return input;
}

export function buildRunnerId(type: CompatibilityRunnerType, runnerPath: string): string {
  return `${type}:${runnerPath}`;
}

function isCompatibilityRunnerType(value: string): value is CompatibilityRunnerType {
  return value === "proton" || value === "wine";
}

function isWinePrefixSource(value: string): value is WinePrefixSource {
  return value === "steam" || value === "heroic" || value === "custom";
}

export function parseRunnerId(
  runnerId: string | undefined,
): { type: CompatibilityRunnerType; path: string } | undefined {
  if (runnerId === undefined || runnerId.length === 0) {
    return undefined;
  }
  const separator = runnerId.indexOf(":");
  if (separator <= 0) {
    return undefined;
  }
  const type = runnerId.slice(0, separator);
  if (!isCompatibilityRunnerType(type)) {
    return undefined;
  }
  const runnerPath = runnerId.slice(separator + 1);
  if (runnerPath.length === 0) {
    return undefined;
  }
  return { type, path: runnerPath };
}

export function heroicRunnerType(
  wineVersion: IHeroicWineVersion | undefined,
): CompatibilityRunnerType {
  const type = wineVersion?.type?.toLowerCase();
  if (type === "wine" || type === "toolkit" || type === "crossover") {
    return "wine";
  }
  return "proton";
}

export function heroicGameSettingsFromConfig(
  config: IHeroicGameConfigFile | undefined,
  appName: string,
): IHeroicGameSettings | undefined {
  if (config === undefined) {
    return undefined;
  }
  return config[appName];
}

export function heroicDefaultWinePrefix(
  config: IHeroicConfigFile | undefined,
  home: string,
): string | undefined {
  if (config === undefined) {
    return undefined;
  }
  const defaults = config.defaultSettings;
  const candidates = [
    defaults?.winePrefix,
    defaults?.defaultWinePrefix,
    config.winePrefix,
    config.defaultWinePrefix,
  ];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate.length > 0) {
      return expandHomePath(candidate, home);
    }
  }
  return undefined;
}

export function heroicDefaultRunner(
  config: IHeroicConfigFile | undefined,
): IHeroicWineVersion | undefined {
  if (config === undefined) {
    return undefined;
  }
  return config.defaultSettings?.wineVersion ?? config.wineVersion;
}

export function resolveHeroicGameCompatibility(
  gameSettings: IHeroicGameSettings | undefined,
  defaults: IHeroicConfigFile | undefined,
  home: string,
): {
  winePrefix?: string;
  runnerPath?: string;
  runnerName?: string;
  runnerType?: CompatibilityRunnerType;
} {
  const wineVersion = gameSettings?.wineVersion ?? heroicDefaultRunner(defaults);
  const winePrefixRaw = gameSettings?.winePrefix ?? heroicDefaultWinePrefix(defaults, home);
  const winePrefix =
    winePrefixRaw !== undefined && winePrefixRaw.length > 0
      ? expandHomePath(winePrefixRaw, home)
      : undefined;
  const runnerPath = wineVersion?.bin;
  const runnerType = wineVersion !== undefined ? heroicRunnerType(wineVersion) : undefined;
  return {
    winePrefix,
    runnerPath,
    runnerName: wineVersion?.name,
    runnerType,
  };
}

export function buildPrefixId(source: WinePrefixSource, prefixPath: string): string {
  return `${source}:${prefixPath}`;
}

export function parsePrefixId(
  prefixId: string | undefined,
): { source: WinePrefixSource; path: string } | undefined {
  if (prefixId === undefined || prefixId.length === 0) {
    return undefined;
  }
  const separator = prefixId.indexOf(":");
  if (separator <= 0) {
    return undefined;
  }
  const source = prefixId.slice(0, separator);
  if (!isWinePrefixSource(source)) {
    return undefined;
  }
  const prefixPath = prefixId.slice(separator + 1);
  if (prefixPath.length === 0) {
    return undefined;
  }
  return { source, path: prefixPath };
}

export function isProtonRunnerName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes("proton") || lower.startsWith("ge-");
}
