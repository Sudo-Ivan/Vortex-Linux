/**
 * Browse Nexus Extension
 * Provides browsing functionality for Nexus Mods collections and mods
 */

import { mdiMagnify, mdiViewGridOutline } from "@mdi/js";

import type { IExtensionContext } from "../../types/IExtensionContext";
import { activeGameId } from "../../util/selectors";
import BrowseModsPage from "./views/browse_mods_page/BrowseModsPage";
import BrowseNexusPage from "./views/BrowseNexusPage";

function init(context: IExtensionContext): boolean {
  // A static wireframe of browsing mods, above Mods; no hotkey, as B is Browse Nexus Mods'
  context.registerMainPage("search", "Browse", BrowseModsPage, {
    priority: 0,
    group: "per-game",
    visible: () => activeGameId(context.api.store.getState()) !== undefined,
    mdi: mdiViewGridOutline,
    newLayout: true,
  });

  // Register the Browse page
  context.registerMainPage("search", "Browse Nexus Mods", BrowseNexusPage, {
    priority: 20,
    hotkey: "B",
    group: "per-game",
    visible: () => activeGameId(context.api.store.getState()) !== undefined,
    props: () => ({
      api: context.api,
    }),
    mdi: mdiMagnify,
  });

  return true;
}

export default init;
