import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CompatibilitySettingsView } from "./CompatibilitySettings";

describe("CompatibilitySettingsView", () => {
  it("renders detected heroic match and runner options", () => {
    render(
      <CompatibilitySettingsView
        discovery={{
          path: "/games/skyrim",
          heroicAppName: "skyrim_gog",
          compatibilityRunnerId: "proton:/steam/GE-Proton9-1",
          winePrefixPath: "/prefix/skyrim",
          winePrefixId: "heroic:/prefix/skyrim",
        }}
        gameId="skyrimse"
        isLoading={false}
        options={{
          runners: [
            {
              id: "proton:/steam/GE-Proton9-1",
              name: "GE-Proton9-1",
              type: "proton",
              path: "/steam/GE-Proton9-1",
            },
          ],
          prefixes: [
            {
              id: "heroic:/prefix/skyrim",
              label: "Heroic skyrim_gog",
              path: "/prefix/skyrim",
              source: "heroic",
            },
          ],
        }}
        onBrowsePrefix={vi.fn()}
        onRefresh={vi.fn()}
        onSelectPrefix={vi.fn()}
        onSelectRunner={vi.fn()}
      />,
    );

    expect(screen.getByTestId("compatibility-heroic-match")).toHaveTextContent("skyrim_gog");
    expect(screen.getByTestId("compatibility-runner-select")).toHaveValue(
      "proton:/steam/GE-Proton9-1",
    );
    expect(screen.getByTestId("compatibility-prefix-select")).toHaveValue("heroic:/prefix/skyrim");
  });
});
