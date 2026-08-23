import { describe, expect, it } from "vitest";

import {
  buildPrefixId,
  buildRunnerId,
  expandHomePath,
  heroicDefaultWinePrefix,
  heroicRunnerType,
  parsePrefixId,
  parseRunnerId,
  resolveHeroicGameCompatibility,
} from "./compatibilityLayer";

describe("compatibilityLayer", () => {
  it("expands home-relative heroic paths", () => {
    expect(expandHomePath("~/Games/Heroic/Prefixes/default", "/home/user")).toBe(
      "/home/user/Games/Heroic/Prefixes/default",
    );
  });

  it("parses runner and prefix ids", () => {
    expect(
      parseRunnerId(buildRunnerId("proton", "/steam/compatibilitytools.d/GE-Proton9-1")),
    ).toEqual({
      type: "proton",
      path: "/steam/compatibilitytools.d/GE-Proton9-1",
    });
    expect(parsePrefixId(buildPrefixId("heroic", "/prefix/game"))).toEqual({
      source: "heroic",
      path: "/prefix/game",
    });
  });

  it("resolves heroic game compatibility from game settings", () => {
    const resolved = resolveHeroicGameCompatibility(
      {
        winePrefix: "~/Games/Heroic/Prefixes/skyrim",
        wineVersion: {
          bin: "/steam/compatibilitytools.d/GE-Proton9-1/proton",
          name: "GE-Proton9-1",
          type: "proton",
        },
      },
      undefined,
      "/home/user",
    );
    expect(resolved.winePrefix).toBe("/home/user/Games/Heroic/Prefixes/skyrim");
    expect(resolved.runnerType).toBe("proton");
    expect(resolved.runnerName).toBe("GE-Proton9-1");
  });

  it("falls back to heroic default wine prefix", () => {
    expect(
      heroicDefaultWinePrefix(
        {
          defaultSettings: {
            defaultWinePrefix: "~/Games/Heroic/Prefixes/default",
          },
        },
        "/home/user",
      ),
    ).toBe("/home/user/Games/Heroic/Prefixes/default");
  });

  it("maps heroic wine types", () => {
    expect(heroicRunnerType({ type: "wine" })).toBe("wine");
    expect(heroicRunnerType({ type: "proton" })).toBe("proton");
  });
});
