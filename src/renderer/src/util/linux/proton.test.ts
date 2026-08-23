import * as path from "path";

import { describe, expect, it } from "vitest";

import { buildProtonEnvironment, compatibilityContextFromDiscovery } from "./proton";

describe("buildProtonEnvironment", () => {
  it("adds steam overlay libraries to LD_PRELOAD", () => {
    const env = buildProtonEnvironment("/compatdata/1", "/steam");
    expect(env.LD_PRELOAD).toContain(path.join("/steam", "ubuntu12_64", "gameoverlayrenderer.so"));
    expect(env.WINEPREFIX).toContain("pfx");
  });

  it("preserves an existing LD_PRELOAD value", () => {
    const env = buildProtonEnvironment("/compatdata/1", "/steam", {
      LD_PRELOAD: "/custom.so",
    });
    expect(env.LD_PRELOAD).toContain("/custom.so");
    expect(env.LD_PRELOAD).toContain("gameoverlayrenderer.so");
  });

  it("uses an explicit wine prefix override", () => {
    const env = buildProtonEnvironment("/compatdata/1", "/steam", undefined, "/custom/pfx");
    expect(env.WINEPREFIX).toBe("/custom/pfx");
  });
});

describe("compatibilityContextFromDiscovery", () => {
  it("builds a launch context from discovery settings", () => {
    expect(
      compatibilityContextFromDiscovery({
        compatibilityRunnerId: "proton:/steam/GE-Proton9-1",
        compatibilityRunnerType: "proton",
        winePrefixPath: "/prefix/game",
        compatDataPath: "/prefix/game",
      }),
    ).toEqual({
      runnerType: "proton",
      runnerPath: "/steam/GE-Proton9-1",
      winePrefixPath: "/prefix/game",
      compatDataPath: "/prefix/game",
      steamPath: undefined,
    });
  });
});
