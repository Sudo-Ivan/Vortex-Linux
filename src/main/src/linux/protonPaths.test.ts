import * as path from "node:path";

import { Base, OS } from "@nexusmods/adaptor-api";
import { QualifiedPath } from "@nexusmods/adaptor-api/fs";
import { describe, expect, it } from "vitest";

import {
  getWineDocumentsPath,
  isValidProtonContext,
  linuxPathToWineZPath,
  resolveProtonWindowsBases,
} from "./protonPaths";

function nativeToQualifiedPath(nativePath: string, os: OS): QualifiedPath {
  if (os === OS.Windows) {
    const forward = nativePath.replace(/\\/g, "/");
    const match = /^([A-Za-z]):\/?(.*)$/.exec(forward);
    if (match?.[1] && match[2] !== undefined) {
      const drive = match[1].toUpperCase();
      const tail = match[2];
      const inner = tail.length > 0 ? `/${drive}/${tail}` : `/${drive}`;
      return QualifiedPath.parse(`windows://${inner}`);
    }
    return QualifiedPath.parse(`windows://${forward}`);
  }
  return QualifiedPath.parse(`linux://${nativePath}`);
}

describe("linuxPathToWineZPath", () => {
  it("maps absolute linux paths to the Wine Z drive", () => {
    expect(linuxPathToWineZPath("/home/user/game")).toBe("Z:\\home\\user\\game");
  });
});

describe("resolveProtonWindowsBases", () => {
  it("resolves documents and my games inside the proton prefix", () => {
    const bases = resolveProtonWindowsBases(nativeToQualifiedPath);
    expect(bases.get(Base.Documents)?.value).toBe("windows:///C/users/steamuser/Documents");
    expect(bases.get(Base.MyGames)?.value).toBe("windows:///C/users/steamuser/Documents/My Games");
  });
});

describe("getWineDocumentsPath", () => {
  it("returns the steamuser documents directory inside the prefix", () => {
    const prefix = "/compatdata/123/pfx";
    expect(getWineDocumentsPath(prefix)).toBe(
      path.join(prefix, "drive_c", "users", "steamuser", "Documents"),
    );
  });
});

describe("isValidProtonContext", () => {
  it("accepts a populated proton context", () => {
    expect(
      isValidProtonContext({
        usesProton: true,
        winePrefixPath: "/compatdata/123/pfx",
      }),
    ).toBe(true);
  });
});
