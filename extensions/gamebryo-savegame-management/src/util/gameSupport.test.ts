import * as path from "path";

import { describe, expect, it } from "vitest";

function documentsPathForSaves(
  discovery: { winePrefixPath?: string } | undefined,
  fallbackDocuments: string,
): string {
  if (discovery?.winePrefixPath !== undefined) {
    return path.join(discovery.winePrefixPath, "drive_c", "users", "steamuser", "Documents");
  }
  return fallbackDocuments;
}

describe("documentsPathForSaves", () => {
  it("uses the wine prefix documents directory for proton games", () => {
    expect(
      documentsPathForSaves({ winePrefixPath: "/compatdata/123/pfx" }, "/home/user/Documents"),
    ).toBe("/compatdata/123/pfx/drive_c/users/steamuser/Documents");
  });

  it("falls back to host documents for native games", () => {
    expect(documentsPathForSaves(undefined, "/home/user/Documents")).toBe("/home/user/Documents");
  });
});
