import { fireEvent, render, screen } from "@testing-library/react";
import type { LinuxSystemHealthReport } from "@vortex/shared/ipc";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { SettingsLinuxView } from "./SettingsLinux";

const sampleReport: LinuxSystemHealthReport = {
  platform: "linux",
  isFlatpak: false,
  isDevelopment: false,
  checks: [
    {
      id: "desktop_entry",
      status: "ok",
      summary: "Desktop entry is installed",
      detail: "/home/alice/.local/share/applications/com.nexusmods.vortex.desktop",
      repairable: true,
    },
    {
      id: "dotnet_runtime",
      status: "error",
      summary: ".NET 9 runtime was not found",
      detail: "Install dotnet-runtime-9.0",
    },
    {
      id: "steam",
      status: "info",
      summary: "Steam installation was not detected",
    },
  ],
};

describe("SettingsLinuxView", () => {
  it("renders health checks and refresh control", () => {
    render(
      <SettingsLinuxView
        gogScanRoots={[]}
        isLoading={false}
        isRepairing={false}
        repairMessage={undefined}
        report={sampleReport}
        onAddScanRoot={vi.fn()}
        onRefresh={vi.fn()}
        onRemoveScanRoot={vi.fn()}
        onRepairDesktopIntegration={vi.fn()}
      />,
    );

    expect(screen.getByTestId("linux-health-desktop_entry")).toBeTruthy();
    expect(screen.getByTestId("linux-health-dotnet_runtime")).toBeTruthy();
    expect(screen.getByTestId("linux-health-steam")).toBeTruthy();
    expect(screen.getByTestId("linux-health-refresh")).toBeTruthy();
    expect(screen.getByTestId("linux-health-repair")).toBeTruthy();
  });

  it("calls refresh when the refresh button is clicked", () => {
    const onRefresh = vi.fn();

    render(
      <SettingsLinuxView
        gogScanRoots={[]}
        isLoading={false}
        isRepairing={false}
        repairMessage={undefined}
        report={sampleReport}
        onAddScanRoot={vi.fn()}
        onRefresh={onRefresh}
        onRemoveScanRoot={vi.fn()}
        onRepairDesktopIntegration={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("linux-health-refresh"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("hides repair when flatpak manages desktop integration", () => {
    render(
      <SettingsLinuxView
        gogScanRoots={[]}
        isLoading={false}
        isRepairing={false}
        repairMessage={undefined}
        report={{ ...sampleReport, isFlatpak: true }}
        onAddScanRoot={vi.fn()}
        onRefresh={vi.fn()}
        onRemoveScanRoot={vi.fn()}
        onRepairDesktopIntegration={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("linux-health-repair")).toBeNull();
  });
});
