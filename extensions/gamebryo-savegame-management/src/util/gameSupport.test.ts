import * as path from "path";

import { describe, expect, it } from "vitest";

import { documentsPathForSaves } from "./linuxGamePaths";

describe("documentsPathForSaves", () => {
  it("uses the wine prefix documents directory for proton games", () => {
    const prefix = "/compatdata/123/pfx";
    expect(documentsPathForSaves({ winePrefixPath: prefix })).toBe(
      path.join(prefix, "drive_c", "users", "steamuser", "Documents"),
    );
  });
});
