import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ game: undefined as { name: string } | undefined }));

vi.mock("react-redux", () => ({
  useSelector: () => mocks.game,
}));

// Fills in `{{…}}`, which the shared stub leaves alone, so the subtitle shows the game's name.
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTranslation: () => {
    const t = (key: string, options?: Record<string, string>) =>
      key.replace(/{{(\w+)}}/g, (_, name: string) => options?.[name] ?? "");
    return Object.assign([t, undefined, true], { t, i18n: undefined, ready: true });
  },
}));

import { BrowseModsPage } from "./BrowseModsPage";

describe("BrowseModsPage", () => {
  beforeEach(() => {
    mocks.game = { name: "Skyrim Special Edition" };
  });

  it("names the page and the game it browses", () => {
    render(<BrowseModsPage active />);

    expect(screen.getByText("Browse")).toBeTruthy();
    expect(screen.getByText("Discover and install mods for Skyrim Special Edition.")).toBeTruthy();
  });

  it("heads the page with the mods pictogram", () => {
    const { container } = render(<BrowseModsPage active />);

    expect(container.querySelector('use[href="assets/pictograms/mod.svg"]')).toBeTruthy();
  });

  it("drops the game from the subtitle when there isn't one", () => {
    mocks.game = undefined;

    render(<BrowseModsPage active />);

    expect(screen.getByText("Discover and install mods.")).toBeTruthy();
  });

  it("shows the results count, search, filter, view options and more", () => {
    render(<BrowseModsPage active />);

    expect(screen.getByText("121,867 results")).toBeTruthy();
    expect(screen.getByTestId("search-input")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filter" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "View options" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "More" })).toBeTruthy();
  });

  it("keeps what's typed in the search", () => {
    render(<BrowseModsPage active />);

    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "Testing" } });

    expect((screen.getByTestId("search-input") as HTMLInputElement).value).toBe("Testing");
  });

  it("lists a block per mod", () => {
    render(<BrowseModsPage active />);

    expect(screen.getAllByText(/^Mod row:/)).toHaveLength(6);
  });

  it("shows the selected mod's details", () => {
    render(<BrowseModsPage active />);

    expect(
      screen.getByText("HorsePower - Modernized Horse Riding (Total Riding Overhaul)"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /1-click install \(3\)/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /View mod page/ })).toBeTruthy();
    expect(screen.getByText("Adult")).toBeTruthy();
    expect(
      screen.getByText("Stats: endorsements, unique downloads, total downloads, file size"),
    ).toBeTruthy();
  });

  it("switches to the Files and Comments tabs", () => {
    render(<BrowseModsPage active />);

    fireEvent.click(screen.getByRole("tab", { name: /Files/ }));
    expect(screen.getByText("The mod's files will go here")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Comments/ }));
    expect(screen.getByText("The mod's comments will go here")).toBeTruthy();
  });
});
