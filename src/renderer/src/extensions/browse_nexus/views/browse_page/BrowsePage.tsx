import { mdiDotsHorizontal, mdiDownload, mdiFilterVariant, mdiOpenInNew } from "@mdi/js";
import type { TFunction } from "i18next";
import React, { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import type { IExtensionApi } from "@/types/IExtensionContext";
import { Author } from "@/ui/components/author/Author";
import { Button } from "@/ui/components/button/Button";
import { useDisplayOptionsAction } from "@/ui/components/display_options/useDisplayOptionsAction.hook";
import { Image } from "@/ui/components/image/Image";
import { Pill } from "@/ui/components/pill/Pill";
import { TabBar } from "@/ui/components/tabs/TabBar";
import { TabButton } from "@/ui/components/tabs/TabButton";
import { TabPanel } from "@/ui/components/tabs/TabPanel";
import { TabProvider } from "@/ui/components/tabs/Tabs.context";
import { Toolbar } from "@/ui/components/toolbar/Toolbar";
import { ToolbarGroup } from "@/ui/components/toolbar/ToolbarGroup";
import { Typography } from "@/ui/components/typography/Typography";
import { TypographyLink } from "@/ui/components/typography/TypographyLink";
import { joinClasses } from "@/ui/utils/joinClasses";
import { Page } from "@/views/components/Page/Page";
import { PageHeader } from "@/views/components/Page/PageHeader";
import { PageScroll } from "@/views/components/Page/PageScroll";

import { Search } from "../../../gamemode_management/components/search/Search";
import { currentGame } from "../../../gamemode_management/selectors";
import { BrowseCollections } from "../../components/browse_collections/BrowseCollections";
import { useCollectionSearch } from "../../hooks/use_collection_search/useCollectionSearch.hook";

/** The design's mods, by name, standing in for a game's mods until there's an API. */
const STATIC_MODS = [
  "HorsePower - Modernized Horse Riding (Total Riding Overhaul)",
  "Missives - Voice and Quest Expansion",
  "Azurite III CS",
  "Drain Magic VFX Edit",
  "Precision - Attack Collision Fixes",
  "The Green Den - A Lush Drunken Huntsman Overhaul",
];

const placeholderClass =
  "flex items-center justify-center rounded-sm border border-dashed border-stroke-moderate p-4 text-center";

/** What the page is for, naming the game when there is one. */
const pageSubtitle = (t: TFunction, gameName: string | undefined) => {
  if (!gameName) {
    return t("Discover and install mods.");
  }

  return t("Discover and install mods for {{game}}.", { game: gameName });
};

interface IBrowsePageProps {
  active?: boolean;
  api: IExtensionApi;
}

/**
 * Browsing a game's mods and collections, a tab each in the header (LAZ-1346). The
 * collections are the live browser; the mods are a static wireframe, its parts with no
 * component yet placeholders that say what they will be.
 */
export const BrowsePage = ({ active, api }: IBrowsePageProps) => {
  const { t } = useTranslation();
  const subtitle = pageSubtitle(t, useSelector(currentGame)?.name);
  const scrollRef = useRef<HTMLDivElement>(null);
  const collections = useCollectionSearch(api);
  const [section, setSection] = useState("mods");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("details");

  const displayOptions = useDisplayOptionsAction({
    label: t("View options"),
    canReset: false,
    children: <div className="p-3">{t("View options will go here")}</div>,
    onReset: () => undefined,
  });

  const filter = {
    id: "filter",
    label: t("Filter"),
    iconPath: mdiFilterVariant,
    onClick: () => undefined,
  };

  return (
    <Page isFullWidth active={active} pageId="browse-mods" scrollable={false}>
      <TabProvider tab={section} tabListId="browse-sections" onSetSelectedTab={setSection}>
        <PageHeader isFullWidth pictogramName="mod" subtitle={subtitle} title={t("Browse")}>
          <TabBar>
            <TabButton count={1480} name={t("Mods")} panelId="mods" />

            <TabButton
              count={collections.allCollectionsTotal}
              name={t("Collections")}
              panelId="collections"
            />
          </TabBar>
        </PageHeader>

        <PageScroll isFullWidth ref={scrollRef}>
          <TabPanel id="mods">
            <div className="flex items-center justify-between gap-x-3 border-b border-stroke-weak px-6 py-2">
              <div className="flex items-center gap-x-2">
                <Pill as="button">{t("Most popular")}</Pill>

                <Pill as="button">{t("Recent uploads")}</Pill>
              </div>

              <div className="flex shrink-0 items-center gap-x-3">
                <Typography
                  appearance="moderate"
                  brand="neutral-translucent"
                  typographyType="body-sm"
                >
                  {t("121,867 results")}
                </Typography>

                <Search placeholder={t("Search mods...")} value={search} onChange={setSearch} />

                <Toolbar>
                  <ToolbarGroup actions={[filter, displayOptions]} />
                </Toolbar>

                <Button
                  appearance="weak"
                  aria-label={t("More")}
                  brand="neutral"
                  leftIconPath={mdiDotsHorizontal}
                />
              </div>
            </div>

            <div className="grid gap-6 p-6 xl:grid-cols-2">
              <div className="flex flex-col gap-y-3">
                {STATIC_MODS.map((name) => (
                  <div className={joinClasses([placeholderClass, "h-36"])} key={name}>
                    {t("Mod row: {{name}}", { name })}
                  </div>
                ))}
              </div>

              <div className="flex min-w-0 flex-col gap-y-4 self-start rounded-md border border-stroke-weak bg-surface-mid p-4">
                <TabProvider
                  tab={tab}
                  tabListId="browse-mod-details-tabs"
                  tabType="secondary"
                  onSetSelectedTab={setTab}
                >
                  <TabBar>
                    <TabButton name={t("Details")} panelId="details" />

                    <TabButton name={t("Files")} panelId="files" />

                    <TabButton name={t("Comments")} panelId="comments" />
                  </TabBar>

                  <TabPanel id="details">
                    <div className="flex flex-col gap-y-4 pt-4">
                      <Image
                        alt=""
                        className="aspect-video w-full rounded-sm"
                        fit="cover"
                        imageType="mod"
                      />

                      <div className={placeholderClass}>{t("Image thumbnails will go here")}</div>

                      <div className="flex items-center gap-x-4">
                        <Typography as="div" typographyType="body-sm">
                          <Author name="Arknir27" />
                        </Typography>

                        <Typography appearance="subdued" typographyType="body-sm">
                          {t("Updated 42 mins ago")}
                        </Typography>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Pill brand="danger">{t("Adult")}</Pill>

                        <Pill>{t("Quests and Adventures")}</Pill>

                        <Pill>{t("+10 more")}</Pill>
                      </div>

                      <Typography className="font-semibold" typographyType="heading-xs">
                        {STATIC_MODS[0]}
                      </Typography>

                      <Typography appearance="subdued">
                        {t(
                          "The horse overhaul you've been waiting for! Yes, that one. HorsePower overhauls pretty much everything missing about horse riding in Skyrim.",
                        )}
                      </Typography>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button leftIconPath={mdiDownload} size="sm">
                          {t("1-click install (3)")}
                        </Button>

                        <Button
                          appearance="moderate"
                          brand="neutral"
                          leftIconPath={mdiOpenInNew}
                          size="sm"
                        >
                          {t("View mod page")}
                        </Button>
                      </div>

                      <Typography appearance="subdued" typographyType="body-sm">
                        {t("2 required mods will also be installed.")}{" "}
                        <TypographyLink typographyType="inherit" onClick={() => undefined}>
                          {t("View mods")}
                        </TypographyLink>
                      </Typography>

                      <div className={placeholderClass}>
                        {t("Stats: endorsements, unique downloads, total downloads, file size")}
                      </div>
                    </div>
                  </TabPanel>

                  <TabPanel id="files">
                    <div className={joinClasses([placeholderClass, "mt-4"])}>
                      {t("The mod's files will go here")}
                    </div>
                  </TabPanel>

                  <TabPanel id="comments">
                    <div className={joinClasses([placeholderClass, "mt-4"])}>
                      {t("The mod's comments will go here")}
                    </div>
                  </TabPanel>
                </TabProvider>
              </div>
            </div>
          </TabPanel>

          <TabPanel id="collections">
            <BrowseCollections api={api} scrollRef={scrollRef} search={collections} />
          </TabPanel>
        </PageScroll>
      </TabProvider>
    </Page>
  );
};

export default BrowsePage;
