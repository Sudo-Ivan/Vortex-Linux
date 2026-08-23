import LazyComponent from "../../controls/LazyComponent";
import type { IExtensionContext } from "../../types/IExtensionContext";
import GameStoreHelper from "../../util/GameStoreHelper";
import { activeGameId } from "../../util/selectors";
import settingsReducer from "./reducers";

function init(context: IExtensionContext): boolean {
  if (process.platform !== "linux") {
    return true;
  }

  context.registerReducer(["settings", "linux"], settingsReducer);

  context.registerSettings(
    "Vortex",
    LazyComponent(() => require("./SettingsLinux")),
    undefined,
    () => process.platform === "linux",
    85,
  );

  context.registerSettings(
    "Workarounds",
    LazyComponent(() => require("./CompatibilitySettings")),
    undefined,
    () => {
      if (process.platform !== "linux") {
        return false;
      }
      const state = context.api.getState();
      const gameId = activeGameId(state);
      return gameId !== undefined && state.settings.gameMode.discovered[gameId]?.path !== undefined;
    },
    20,
  );

  context.once(() => {
    let previousRoots = JSON.stringify(context.api.getState().settings.linux?.gogScanRoots ?? []);
    context.api.onStateChange(["settings", "linux", "gogScanRoots"], () => {
      const nextRoots = JSON.stringify(context.api.getState().settings.linux?.gogScanRoots ?? []);
      if (nextRoots !== previousRoots) {
        previousRoots = nextRoots;
        GameStoreHelper.reloadGames(context.api).catch(() => undefined);
      }
    });
  });

  return true;
}

export default init;
