import { autoResolveDependenciesEnabled } from "@/extensions/nexus_integration/nexusFork";
import { isLoggedIn } from "@/extensions/nexus_integration/selectors";
import type { IExtensionApi } from "@/types/IExtensionContext";
import { log } from "@/logging";

import {
  fileRequirementsCheckResult,
  hiddenFileRequirements,
  isFileRequirementsUserEnabled,
  isModRequirementsEnabled,
} from "../selectors";
import {
  switchActiveVersions,
  type ISwitchTarget,
} from "./fileRequirements/fileRequirementActions";
import { switchTargets } from "./fileRequirements/fileRequirementReport";
import { healthCheckContent } from "../views/content/registry";
import type { IBulkInstallItem } from "../views/content/types";

function collectInstallAllItems(api: IExtensionApi): IBulkInstallItem[] {
  const state = api.getState();
  const seen = new Set<string>();
  const out: IBulkInstallItem[] = [];

  for (const content of Object.values(healthCheckContent)) {
    for (const item of content?.collectInstallAll?.(state, api) ?? []) {
      if (!seen.has(item.key)) {
        seen.add(item.key);
        out.push(item);
      }
    }
  }

  return out;
}

function collectVersionSwitches(api: IExtensionApi): ISwitchTarget[] {
  const state = api.getState();
  const result = fileRequirementsCheckResult(state);
  if (!result) {
    return [];
  }

  const hiddenMap = hiddenFileRequirements(state);
  const switches: ISwitchTarget[] = [];

  for (const source of Object.values(result)) {
    const hidden = new Set(hiddenMap[source.sourceFileUID] ?? []);
    const visible = source.requirements.filter((req) => !hidden.has(req.requirementDefId));
    switches.push(...switchTargets(visible));
  }

  return switches;
}

/**
 * After health checks finish, install missing dependencies when the fork setting is on.
 * Local fixes (version switches) run first, then downloads are queued one at a time.
 */
export async function runAutoResolveDependencies(api: IExtensionApi): Promise<void> {
  const state = api.getState();
  if (!autoResolveDependenciesEnabled(state) || !isLoggedIn(state)) {
    return;
  }

  if (!isModRequirementsEnabled(state) && !isFileRequirementsUserEnabled(state)) {
    return;
  }

  const switches = collectVersionSwitches(api);
  if (switches.length > 0) {
    switchActiveVersions(api, switches);
  }

  const items = collectInstallAllItems(api);
  if (items.length === 0) {
    return;
  }

  log("info", "auto-resolving mod dependencies", { count: items.length });

  for (const item of items) {
    item.install();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
