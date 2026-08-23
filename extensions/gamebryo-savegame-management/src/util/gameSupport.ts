import * as path from "path";

import { fs, selectors, types, util } from "@nexusmods/vortex-api";
import Promise from "bluebird";

import {
  getCachedMyGamesRoot,
  invalidateResolvedMyGamesPath,
  resolveMyGamesRoot,
  syncMyGamesPath,
} from "./linuxGamePaths";

interface IGameSupport {
  mygamesPath: string;
  iniName: string;
  prefIniName?: string;
  saveFiles: (input: string) => string[];
}

function scriptExtenderFiles(input: string, seext: string): string[] {
  const ext = path.extname(input);
  return [path.basename(input, ext) + "." + seext];
}

const gameSupport = util.makeOverlayableDictionary<string, IGameSupport>(
  {
    skyrim: {
      mygamesPath: "Skyrim",
      iniName: "Skyrim.ini",
      prefIniName: "SkyrimPrefs.ini",
      saveFiles: (input: string): string[] => {
        return [].concat([input], scriptExtenderFiles(input, "skse"));
      },
    },
    enderal: {
      mygamesPath: "Enderal",
      iniName: "Enderal.ini",
      prefIniName: "EnderalPrefs.ini",
      saveFiles: (input: string): string[] =>
        [].concat([input], scriptExtenderFiles(input, "skse")),
    },
    skyrimse: {
      mygamesPath: "Skyrim Special Edition",
      iniName: "Skyrim.ini",
      prefIniName: "SkyrimPrefs.ini",
      saveFiles: (input: string): string[] => {
        return [].concat([input], scriptExtenderFiles(input, "skse"));
      },
    },
    skyrimvr: {
      mygamesPath: "Skyrim VR",
      iniName: "SkyrimVR.ini",
      prefIniName: "SkyrimPrefs.ini",
      saveFiles: (input: string): string[] => {
        return [].concat([input], scriptExtenderFiles(input, "skse"));
      },
    },
    fallout3: {
      mygamesPath: "Fallout3",
      iniName: "Fallout.ini",
      prefIniName: "FalloutPrefs.ini",
      saveFiles: (input: string): string[] => {
        return [].concat([input], scriptExtenderFiles(input, "fose"));
      },
    },
    fallout4: {
      mygamesPath: "Fallout4",
      iniName: "Fallout4Custom.ini",
      prefIniName: "Fallout4Prefs.ini",
      saveFiles: (input: string): string[] => {
        return [].concat([input], scriptExtenderFiles(input, "f4se"));
      },
    },
    fallout4vr: {
      mygamesPath: "Fallout4VR",
      iniName: "Fallout4Custom.ini",
      saveFiles: (input: string): string[] => {
        return [].concat([input], scriptExtenderFiles(input, "f4se"));
      },
    },
    falloutnv: {
      mygamesPath: "FalloutNV",
      iniName: "Fallout.ini",
      prefIniName: "FalloutPrefs.ini",
      saveFiles: (input: string): string[] => {
        return [].concat([input], scriptExtenderFiles(input, "nvse"));
      },
    },
    oblivion: {
      mygamesPath: "Oblivion",
      iniName: "Oblivion.ini",
      saveFiles: (input: string): string[] => {
        return [].concat([input], scriptExtenderFiles(input, "obse"));
      },
    },
    enderalspecialedition: {
      mygamesPath: "Enderal Special Edition",
      iniName: "Enderal.ini",
      prefIniName: "EnderalPrefs.ini",
      saveFiles: (input: string): string[] =>
        [].concat([input], scriptExtenderFiles(input, "skse")),
    },
  },
  {
    xbox: {
      skyrimse: {
        mygamesPath: "Skyrim Special Edition MS",
      },
      fallout4: {
        mygamesPath: "Fallout4 MS",
      },
    },
    gog: {
      skyrimse: {
        mygamesPath: "Skyrim Special Edition GOG",
      },
      enderalspecialedition: {
        mygamesPath: "Enderal Special Edition GOG",
      },
    },
    epic: {
      skyrimse: {
        mygamesPath: "Skyrim Special Edition EPIC",
      },
      fallout4: {
        mygamesPath: "Fallout4 EPIC",
      },
    },
    enderalseOverlay: {
      enderalspecialedition: {
        mygamesPath: "Skyrim Special Edition",
        iniName: "Skyrim.ini",
        prefIniName: "SkyrimPrefs.ini",
      },
    },
  },
  (gameId: string) => {
    const discovery = discoveryForGame(gameId);
    if (
      discovery?.path !== undefined &&
      gameId === "enderalspecialedition" &&
      discovery.path.includes("skyrim")
    ) {
      return "enderalseOverlay";
    } else {
      return discovery?.store;
    }
  },
);

let discoveryForGame: (gameId: string) => types.IDiscoveryResult = () => undefined;
let getGameDetails: (gameId: string) => types.IGame | undefined = () => undefined;
let resolveFsApi:
  | {
      statAsync: (p: string) => Promise<unknown>;
      readdirAsync: (p: string) => Promise<string[]>;
    }
  | undefined;

export function initGameSupport(api: types.IExtensionApi) {
  discoveryForGame = (gameId: string) => selectors.discoveryByGame(api.store.getState(), gameId);
  getGameDetails = (gameId: string) => util.getGame(gameId);
  resolveFsApi = {
    statAsync: (targetPath: string) => fs.statAsync(targetPath),
    readdirAsync: (targetPath: string) => fs.readdirAsync(targetPath),
  };
}

export function gameSupported(gameMode: string): boolean {
  return gameSupport[gameMode] !== undefined;
}

export function mygamesPath(gameMode: string): string {
  const discovery = discoveryForGame(gameMode);
  return syncMyGamesPath(gameMode, gameSupport.get(gameMode, "mygamesPath"), discovery);
}

export function ensureMyGamesPathResolved(gameMode: string): Promise<string> {
  const discovery = discoveryForGame(gameMode);
  const game = getGameDetails(gameMode);
  const cached = getCachedMyGamesRoot(gameMode);
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }
  if (resolveFsApi === undefined) {
    return Promise.resolve(mygamesPath(gameMode));
  }
  return resolveMyGamesRoot(
    gameMode,
    gameSupport.get(gameMode, "mygamesPath"),
    discovery,
    discovery?.path,
    game?.details?.steamAppId,
    resolveFsApi,
  );
}

export function onDiscoveryChanged(): void {
  invalidateResolvedMyGamesPath();
}

export function iniPath(gameMode: string): string {
  return path.join(mygamesPath(gameMode), gameSupport.get(gameMode, "iniName"));
}

export function prefIniPath(gameMode: string): string {
  const prefIniName = gameSupport.get(gameMode, "prefIniName");
  if (prefIniName === undefined) {
    return undefined;
  }
  return path.join(mygamesPath(gameMode), prefIniName);
}

export function saveFiles(gameMode: string, savePath: string): string[] {
  return gameSupport.get(gameMode, "saveFiles")(savePath);
}
