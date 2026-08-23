import * as path from "path";

import { describe, expect, it } from "vitest";

import { buildProtonEnvironment } from "./proton";

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
});
