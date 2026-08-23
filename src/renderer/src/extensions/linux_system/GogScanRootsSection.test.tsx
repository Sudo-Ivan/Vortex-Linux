import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { GogScanRootsSection } from "./GogScanRootsSection";

describe("GogScanRootsSection", () => {
  it("renders configured scan roots", () => {
    render(
      <GogScanRootsSection
        roots={["/mnt/games"]}
        onAddScanRoot={vi.fn()}
        onRemoveScanRoot={vi.fn()}
      />,
    );
    expect(screen.getByTestId("linux-gog-scan-root-/mnt/games")).toBeTruthy();
  });

  it("calls add handler when adding a scan root", () => {
    const onAddScanRoot = vi.fn();
    render(
      <GogScanRootsSection roots={[]} onAddScanRoot={onAddScanRoot} onRemoveScanRoot={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId("linux-gog-scan-add"));
    expect(onAddScanRoot).toHaveBeenCalledTimes(1);
  });
});
