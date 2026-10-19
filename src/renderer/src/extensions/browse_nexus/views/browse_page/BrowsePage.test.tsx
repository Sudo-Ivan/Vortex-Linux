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

vi.mock("../../hooks/use_collection_search/useCollectionSearch.hook", () => ({
  useCollectionSearch: () => ({ allCollectionsTotal: 126 }),
}));

vi.mock("../../components/browse_collections/BrowseCollections", () => ({
  BrowseCollections: () => <div>Collections panel</div>,
}));

import type { IExtensionApi } from "@/types/IExtensionContext";

import { BrowsePage } from "./BrowsePage";

const api = {} as IExtensionApi;

describe("BrowsePage", () => {
  beforeEach(() => {
    mocks.game = { name: "Skyrim Special Edition" };
  });

  it("names the page and the game it browses", () => {
    render(<BrowsePage active api={api} />);

    expect(screen.getByText("Browse")).toBeTruthy();
    expect(screen.getByText("Discover and install mods for Skyrim Special Edition.")).toBeTruthy();
  });

  it("heads the page with the mods pictogram", () => {
    const { container } = render(<BrowsePage active api={api} />);

    expect(container.querySelector('use[href="assets/pictograms/mod.svg"]')).toBeTruthy();
  });

  it("drops the game from the subtitle when there isn't one", () => {
    mocks.game = undefined;

    render(<BrowsePage active api={api} />);

    expect(screen.getByText("Discover and install mods.")).toBeTruthy();
  });

  it("switches between mods and collections from the header, with their counts", () => {
    render(<BrowsePage active api={api} />);

    expect(screen.getByRole("tab", { name: /Mods.*1,480/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Collections.*126/ })).toBeTruthy();
    expect(screen.queryByText("Collections panel")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Collections/ }));

    expect(screen.getByText("Collections panel")).toBeTruthy();
    expect(screen.queryAllByText(/^Mod row:/)).toHaveLength(0);
  });

  it("offers the mods' sorts under the header", () => {
    render(<BrowsePage active api={api} />);

    expect(screen.getByRole("button", { name: "Most popular" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Recent uploads" })).toBeTruthy();
  });

  it("shows the results count, search, filter, view options and more", () => {
    render(<BrowsePage active api={api} />);

    expect(screen.getByText("121,867 results")).toBeTruthy();
    expect(screen.getByTestId("search-input")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Filter" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "View options" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "More" })).toBeTruthy();
  });

  it("keeps what's typed in the search", () => {
    render(<BrowsePage active api={api} />);

    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "Testing" } });

    expect((screen.getByTestId("search-input") as HTMLInputElement).value).toBe("Testing");
  });

  it("lists a block per mod", () => {
    render(<BrowsePage active api={api} />);

    expect(screen.getAllByText(/^Mod row:/)).toHaveLength(6);
  });

  it("shows the selected mod's details", () => {
    render(<BrowsePage active api={api} />);

    expect(
      screen.getByText("HorsePower - Modernized Horse Riding (Total Riding Overhaul)"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /1-click install \(3\)/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /View mod page/ })).toBeTruthy();
    expect(screen.getByText("Adult")).toBeTruthy();
    expect(screen.getByText("Arknir27")).toBeTruthy();
    expect(
      screen.getByText("Stats: endorsements, unique downloads, total downloads, file size"),
    ).toBeTruthy();
  });

  it("switches to the Files and Comments tabs", () => {
    render(<BrowsePage active api={api} />);

    fireEvent.click(screen.getByRole("tab", { name: /Files/ }));
    expect(screen.getByText("The mod's files will go here")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Comments/ }));
    expect(screen.getByText("The mod's comments will go here")).toBeTruthy();
  });
});
