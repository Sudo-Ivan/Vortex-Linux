import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import {
  detectHeroicGameByPath,
  discoverCompatibilityOptions,
  listCompatibilityRunners,
} from "./compatibilityDiscovery";

describe("compatibilityDiscovery", () => {
  it("detects heroic games and prefixes from installed and game config files", () => {
    const home = mkdtempSync(path.join(os.tmpdir(), "vortex-heroic-"));
    const configDir = path.join(home, ".config", "heroic");
    const installPath = path.join(home, "Games", "Heroic", "Skyrim");
    const prefixPath = path.join(home, "Games", "Heroic", "Prefixes", "Skyrim");
    const runnerDir = path.join(home, "tools", "GE-Proton9-1");

    mkdirSync(installPath, { recursive: true });
    mkdirSync(prefixPath, { recursive: true });
    mkdirSync(runnerDir, { recursive: true });
    writeFileSync(path.join(runnerDir, "proton"), "");

    mkdirSync(path.join(configDir, "gog_store"), { recursive: true });
    mkdirSync(path.join(configDir, "GamesConfig"), { recursive: true });

    writeFileSync(
      path.join(configDir, "gog_store", "installed.json"),
      JSON.stringify({
        installed: [{ appName: "skyrim_gog", install_path: installPath }],
      }),
    );

    writeFileSync(
      path.join(configDir, "GamesConfig", "skyrim_gog.json"),
      JSON.stringify({
        skyrim_gog: {
          winePrefix: prefixPath,
          wineVersion: {
            bin: path.join(runnerDir, "proton"),
            name: "GE-Proton9-1",
            type: "proton",
          },
        },
      }),
    );

    const heroicMatch = detectHeroicGameByPath(home, installPath);
    expect(heroicMatch?.appName).toBe("skyrim_gog");
    expect(heroicMatch?.winePrefix).toBe(prefixPath);

    const discovery = discoverCompatibilityOptions(home, { gamePath: installPath });
    expect(discovery.prefixes.some((prefix) => prefix.path === prefixPath)).toBe(true);
    expect(discovery.runners.some((runner) => runner.name === "GE-Proton9-1")).toBe(true);
  });

  it("lists proton-ge from steam compatibilitytools.d", () => {
    const home = mkdtempSync(path.join(os.tmpdir(), "vortex-steam-"));
    const steamPath = path.join(home, ".local", "share", "Steam");
    const gePath = path.join(steamPath, "compatibilitytools.d", "GE-Proton9-1");

    mkdirSync(path.join(steamPath, "config"), { recursive: true });
    mkdirSync(gePath, { recursive: true });
    writeFileSync(path.join(steamPath, "config", "libraryfolders.vdf"), '"libraryfolders"\n{\n}\n');
    writeFileSync(path.join(gePath, "proton"), "");

    const runners = listCompatibilityRunners(home);
    expect(runners.some((runner) => runner.name === "GE-Proton9-1")).toBe(true);
  });
});
