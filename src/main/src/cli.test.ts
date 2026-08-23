import { describe, expect, it } from "vitest";

import { injectLinuxNxmDownloadFlag } from "./cli";

describe("injectLinuxNxmDownloadFlag", () => {
  it("inserts -d before nxm urls on linux", () => {
    const previousPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux" });

    try {
      const argv = injectLinuxNxmDownloadFlag([
        "electron",
        "nxm://www.nexusmods.com/skyrimspecialedition/mods/1",
      ]);
      expect(argv).toEqual([
        "electron",
        "-d",
        "nxm://www.nexusmods.com/skyrimspecialedition/mods/1",
      ]);
    } finally {
      Object.defineProperty(process, "platform", { value: previousPlatform });
    }
  });

  it("does not duplicate -d when already present", () => {
    const previousPlatform = process.platform;
    Object.defineProperty(process, "platform", { value: "linux" });

    try {
      const argv = injectLinuxNxmDownloadFlag([
        "electron",
        "-d",
        "nxm://www.nexusmods.com/skyrimspecialedition/mods/1",
      ]);
      expect(argv).toEqual([
        "electron",
        "-d",
        "nxm://www.nexusmods.com/skyrimspecialedition/mods/1",
      ]);
    } finally {
      Object.defineProperty(process, "platform", { value: previousPlatform });
    }
  });
});
