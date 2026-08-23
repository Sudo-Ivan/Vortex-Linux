import { describe, expect, it } from "vitest";

import { NEXUS_BASE_URL } from "./constants";
import { resolveEndpointsFromSettings } from "./nexusFork";

describe("resolveEndpointsFromSettings", () => {
  it("uses defaults when settings are empty", () => {
    const endpoints = resolveEndpointsFromSettings({});
    expect(endpoints.websiteUrl).toBe(NEXUS_BASE_URL.replace(/\/+$/, ""));
    expect(endpoints.apiBaseUrl.length).toBeGreaterThan(0);
  });

  it("strips trailing slashes from custom endpoints", () => {
    const endpoints = resolveEndpointsFromSettings({
      websiteUrl: "https://mods.example.com/",
      apiBaseUrl: "https://api.example.com/v1/",
    });
    expect(endpoints.websiteUrl).toBe("https://mods.example.com");
    expect(endpoints.apiBaseUrl).toBe("https://api.example.com/v1");
  });
});
