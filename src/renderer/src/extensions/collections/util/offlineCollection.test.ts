import { describe, expect, it } from "vitest";

import type { IState } from "../../../types/IState";
import type { IMod } from "../../mod_management/types/IMod";
import { MOD_TYPE } from "../constants";
import { isOfflineCollectionMod } from "./offlineCollection";

function makeState(collection: Partial<IMod>, downloadMeta?: Record<string, unknown>): IState {
  const mod: IMod = {
    id: "col1",
    state: "installed",
    type: MOD_TYPE,
    archiveId: "dl1",
    installationPath: "collection",
    rules: [],
    attributes: {},
    ...collection,
  };
  return {
    persistent: {
      mods: { skyrim: { col1: mod } },
      downloads: {
        files: {
          dl1: {
            localPath: "collection.7z",
            modInfo: downloadMeta,
          },
        },
      },
      profiles: {},
    },
    session: {},
    settings: {},
  } as unknown as IState;
}

describe("isOfflineCollectionMod", () => {
  it("returns true when no Nexus ids are present", () => {
    const state = makeState({});
    expect(isOfflineCollectionMod(state, state.persistent.mods.skyrim.col1)).toBe(true);
  });

  it("returns false when revision id is present", () => {
    const state = makeState(
      {},
      {
        nexus: {
          ids: {
            revisionId: 42,
            collectionSlug: "slug",
          },
        },
      },
    );
    expect(isOfflineCollectionMod(state, state.persistent.mods.skyrim.col1)).toBe(false);
  });

  it("returns false when collection is undefined", () => {
    const state = makeState({});
    expect(isOfflineCollectionMod(state, undefined)).toBe(false);
  });
});
