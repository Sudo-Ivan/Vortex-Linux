import * as path from "path";

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./fs", () => ({
  readdirAsync: vi.fn(),
  statAsync: vi.fn(),
}));

import {
  collectCaseMismatchWarnings,
  findCaseMismatchOnDisk,
  resolveCaseAwarePath,
  verifyRequiredFiles,
} from "./caseAwarePath";
import * as fs from "./fs";

describe("resolveCaseAwarePath", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("follows the on-disk casing for each path component", async () => {
    const root = path.join("/games", "Skyrim");
    const dataDir = path.join(root, "Data");

    vi.mocked(fs.readdirAsync).mockImplementation((dir: string) => {
      if (dir === root) {
        return Promise.resolve(["Data"]) as unknown as ReturnType<typeof fs.readdirAsync>;
      }
      if (dir === dataDir) {
        return Promise.resolve(["Skyrim.esm"]) as unknown as ReturnType<typeof fs.readdirAsync>;
      }
      return Promise.resolve([]) as unknown as ReturnType<typeof fs.readdirAsync>;
    });

    await expect(resolveCaseAwarePath(root, "data/skyrim.esm")).resolves.toBe(
      path.join(root, "Data", "Skyrim.esm"),
    );
  });
});

describe("verifyRequiredFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.readdirAsync).mockResolvedValue(["Data"]);
    vi.mocked(fs.statAsync).mockResolvedValue({} as never);
  });

  it("accepts case-insensitive matches", async () => {
    await expect(
      verifyRequiredFiles("/games/Skyrim", ["data/Skyrim.esm"]),
    ).resolves.toBeUndefined();
  });

  it("rejects missing files", async () => {
    vi.mocked(fs.readdirAsync).mockResolvedValue([]);
    vi.mocked(fs.statAsync).mockRejectedValue(
      Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
    );
    await expect(verifyRequiredFiles("/games/Skyrim", ["missing.exe"])).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});

describe("findCaseMismatchOnDisk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports when an existing directory differs only by case", async () => {
    vi.mocked(fs.readdirAsync).mockResolvedValue(["Textures"]);

    await expect(findCaseMismatchOnDisk("/game", "textures/foo.dds")).resolves.toBe(
      'textures/foo.dds: expected "Textures" but mod uses "textures"',
    );
  });
});

describe("collectCaseMismatchWarnings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(process, "platform", { value: "linux" });
  });

  it("deduplicates mismatch warnings", async () => {
    vi.mocked(fs.readdirAsync).mockResolvedValue(["Textures"]);

    const warnings = await collectCaseMismatchWarnings("/game", [
      "textures/a.dds",
      "textures/b.dds",
    ]);

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("Textures");
  });
});
