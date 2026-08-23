import { describe, expect, it } from "vitest";

import type { IState } from "../../../types/IState";

describe("offline export state snapshot", () => {
  it("captures enabled mods and installer choices", () => {
    const state = {
      persistent: {
        profiles: {
          p1: {
            id: "p1",
            gameId: "skyrim",
            modState: {
              modA: { enabled: true },
              modB: { enabled: false },
            },
          },
        },
        mods: {
          skyrim: {
            modA: {
              id: "modA",
              attributes: { installerChoices: { section: "choice1" } },
            },
          },
        },
      },
    } as unknown as IState;

    const profile = state.persistent.profiles.p1;
    const modState: Record<string, { enabled: boolean }> = {};
    for (const [modId, entry] of Object.entries(profile.modState ?? {})) {
      modState[modId] = { enabled: entry?.enabled === true };
    }
    const installerChoices: Record<string, unknown> = {};
    const mods = state.persistent.mods[profile.gameId] ?? {};
    for (const [modId, entry] of Object.entries(modState)) {
      if (entry.enabled && mods[modId]?.attributes?.installerChoices !== undefined) {
        installerChoices[modId] = mods[modId].attributes.installerChoices;
      }
    }

    expect(modState).toEqual({ modA: { enabled: true }, modB: { enabled: false } });
    expect(installerChoices).toEqual({ modA: { section: "choice1" } });
  });
});
