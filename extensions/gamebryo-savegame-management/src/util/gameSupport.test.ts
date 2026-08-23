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
    const prefix = "/compatdata/123/pfx";
    expect(documentsPathForSaves({ winePrefixPath: prefix }, "/home/user/Documents")).toBe(
      path.join(prefix, "drive_c", "users", "steamuser", "Documents"),
    );
  });

  it("falls back to host documents for native games", () => {
    expect(documentsPathForSaves(undefined, "/home/user/Documents")).toBe("/home/user/Documents");
  });
});
