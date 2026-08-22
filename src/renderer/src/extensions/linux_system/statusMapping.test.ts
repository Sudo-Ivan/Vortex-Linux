import { describe, expect, it } from "vitest";

import { canRepairDesktopIntegration, healthStatusToSeverity } from "./statusMapping";

describe("healthStatusToSeverity", () => {
  it("maps health statuses to alert severities", () => {
    expect(healthStatusToSeverity("ok")).toBe("success");
    expect(healthStatusToSeverity("warning")).toBe("warning");
    expect(healthStatusToSeverity("error")).toBe("danger");
    expect(healthStatusToSeverity("info")).toBe("info");
    expect(healthStatusToSeverity("skipped")).toBe("info");
  });
});

describe("canRepairDesktopIntegration", () => {
  it("returns true when a repairable desktop check is present", () => {
    expect(
      canRepairDesktopIntegration([{ id: "desktop_entry", repairable: true }, { id: "steam" }]),
    ).toBe(true);
  });

  it("returns false when no repairable desktop checks are present", () => {
    expect(
      canRepairDesktopIntegration([{ id: "desktop_entry", repairable: false }, { id: "steam" }]),
    ).toBe(false);
  });
});
