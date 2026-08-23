import type { IState } from "../../types/IState";

export function getGogScanRoots(state: IState): string[] {
  return state.settings.linux?.gogScanRoots ?? [];
}
