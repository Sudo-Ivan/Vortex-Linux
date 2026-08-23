import { describe, expect, it } from "vitest";

import {
  buildAppDataLocalGamePath,
  buildMyGamesPath,
  getWineDocumentsPath,
  inferProtonPathsFromGamePath,
  inferSteamAppsPathFromGamePath,
  myGamesFolderCaseVariants,
  pickWineUserName,
} from "./protonGamePaths";

describe("protonGamePaths", () => {
  it("infers steamapps root from a common game install path", () => {
    const gamePath = "/home/user/.steam/steam/steamapps/common/Skyrim Special Edition";
    expect(inferSteamAppsPathFromGamePath(gamePath)).toBe("/home/user/.steam/steam/steamapps");
  });

  it("builds proton compatdata paths from a steam game path", () => {
    const gamePath = "/steam/steamapps/common/Skyrim";
    const inferred = inferProtonPathsFromGamePath(gamePath, 72850);
    expect(inferred.usesProton).toBe(true);
    expect(inferred.winePrefixPath).toBe("/steam/steamapps/compatdata/72850/pfx");
  });

  it("returns host documents and my games paths inside a prefix", () => {
    const prefix = "/compatdata/123/pfx";
    const documents = getWineDocumentsPath(prefix);
    expect(buildMyGamesPath(documents, "Skyrim")).toBe(
      "/compatdata/123/pfx/drive_c/users/steamuser/Documents/My Games/Skyrim",
    );
    expect(buildAppDataLocalGamePath(prefix, "Skyrim")).toBe(
      "/compatdata/123/pfx/drive_c/users/steamuser/AppData/Local/Skyrim",
    );
  });

  it("generates common case variants for game folder names", () => {
    expect(myGamesFolderCaseVariants("skyrim")).toEqual(
      expect.arrayContaining(["skyrim", "Skyrim", "SKYRIM"]),
    );
  });

  it("prefers steamuser when present in a prefix", () => {
    expect(pickWineUserName(["Public", "steamuser", "heroic"])).toBe("steamuser");
  });

  it("falls back to the first non-system wine user", () => {
    expect(pickWineUserName(["Public", "heroic", "Default"])).toBe("heroic");
  });
});
