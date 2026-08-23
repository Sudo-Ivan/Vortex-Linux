import { mdiDownload, mdiOpenInNew, mdiRefresh } from "@mdi/js";
import numeral from "numeral";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import type { IModListItem } from "@/extensions/news_dashlet/types";
import type { IExtensionApi } from "@/types/IExtensionContext";
import type { IState } from "@/types/IState";
import { Button } from "@/ui/components/button/Button";
import { Listing } from "@/ui/components/listing/Listing";
import { NoResults } from "@/ui/components/no_results/NoResults";
import { Picker } from "@/ui/components/picker/Picker";
import { Typography } from "@/ui/components/typography/Typography";
import { isPremium } from "@/extensions/nexus_integration/selectors";

type ModFeed = "latest" | "trending";

interface IModBrowsePanelProps {
  api: IExtensionApi;
  gameId: string;
  t: (input: string, options?: Record<string, unknown>) => string;
}

function extraValue(mod: IModListItem, id: string): number | undefined {
  const entry = mod.extra.find((item) => item.id === id);
  return typeof entry?.value === "number" ? entry.value : undefined;
}

function ModCard(props: { mod: IModListItem; t: IModBrowsePanelProps["t"] }) {
  const { mod, t } = props;
  const endorsements = extraValue(mod, "endorsements");
  const downloads = extraValue(mod, "downloads");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded border border-neutral-700 bg-neutral-900">
      {mod.imageUrl ? (
        <img alt="" className="h-36 w-full object-cover" src={mod.imageUrl} />
      ) : (
        <div className="h-36 w-full bg-neutral-800" />
      )}
      <div className="flex flex-1 flex-col gap-y-2 p-3">
        <Typography appearance="strong" brand="neutral" typographyType="body-md">
          {mod.name}
        </Typography>
        <Typography appearance="moderate" brand="neutral-translucent" typographyType="body-sm">
          {mod.author}
          {mod.category ? ` · ${mod.category}` : ""}
        </Typography>
        <Typography
          appearance="moderate"
          brand="neutral-translucent"
          className="line-clamp-3 flex-1"
          typographyType="body-sm"
        >
          {mod.summary}
        </Typography>
        <div className="flex flex-wrap gap-x-3 text-xs text-neutral-400">
          {endorsements !== undefined ? (
            <span>
              {t("collection:browse.mods.endorsements", {
                total: numeral(endorsements).format("0,0"),
              })}
            </span>
          ) : null}
          {downloads !== undefined ? (
            <span>
              {t("collection:browse.mods.downloads", {
                total: numeral(downloads).format("0,0"),
              })}
            </span>
          ) : null}
        </div>
        <Button
          appearance="moderate"
          brand="neutral"
          leftIconPath={mdiOpenInNew}
          onClick={() => window.api.shell.openUrl(mod.link)}
        >
          {t("collection:browse.mods.viewOnSite")}
        </Button>
      </div>
    </div>
  );
}

export function ModBrowsePanel(props: IModBrowsePanelProps) {
  const { api, gameId, t } = props;
  const [feed, setFeed] = useState<ModFeed>("latest");
  const [mods, setMods] = useState<IModListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loggedIn = useSelector((state: IState) => {
    const nexus = state.confidential?.account?.["nexus"];
    return !!(nexus?.APIKey || nexus?.OAuthCredentials);
  });
  const premium = useSelector((state: IState) => isPremium(state));

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchMods =
      feed === "latest" ? api.ext.nexusGetLatestMods : api.ext.nexusGetTrendingMods;

    Promise.resolve(fetchMods?.(gameId))
      .then((result) => {
        setMods(result?.mods ?? []);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err);
        setLoading(false);
      });
  }, [api, feed, gameId, refreshTrigger]);

  const feedOptions = [
    { label: t("collection:browse.mods.feed.latest"), value: "latest" as ModFeed },
    { label: t("collection:browse.mods.feed.trending"), value: "trending" as ModFeed },
  ];

  return (
    <div className="space-y-4 p-6">
      {!loggedIn ? (
        <div className="rounded border border-neutral-700 bg-neutral-900 p-4">
          <Typography appearance="moderate" brand="neutral" typographyType="body-sm">
            {t("collection:browse.mods.loginPrompt")}
          </Typography>
          <div className="mt-3">
            <Button
              appearance="moderate"
              brand="primary"
              onClick={() =>
                api.events.emit("request-nexus-login", (err: Error) => {
                  if (err) {
                    api.showErrorNotification("Failed to log in", err);
                  }
                })
              }
            >
              {t("collection:browse.mods.login")}
            </Button>
          </div>
        </div>
      ) : null}

      {loggedIn && !premium ? (
        <div className="rounded border border-neutral-700 bg-neutral-900 p-4">
          <Typography appearance="moderate" brand="neutral" typographyType="body-sm">
            {t("collection:browse.mods.premiumPrompt")}
          </Typography>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              appearance="moderate"
              brand="primary"
              leftIconPath={mdiDownload}
              onClick={() =>
                window.api.shell.openUrl("https://users.nexusmods.com/account/billing/premium")
              }
            >
              {t("collection:browse.mods.goPremium")}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-x-2">
        <Button
          appearance="moderate"
          brand="neutral"
          leftIconPath={mdiRefresh}
          title={t("collection:browse.refresh")}
          onClick={() => {
            setLoading(true);
            setError(null);
            setRefreshTrigger((prev) => prev + 1);
          }}
        />
        <Picker
          options={feedOptions}
          value={feed}
          onChange={(value) => setFeed(value)}
        />
        <Typography appearance="moderate" brand="neutral-translucent" typographyType="body-sm">
          {t("collection:browse.mods.resultsCount", { total: numeral(mods.length).format("0,0") })}
        </Typography>
      </div>

      <Listing
        entityCount={mods.length}
        errorMessage={error?.message}
        errorTitle={t("collection:browse.mods.noResults.title")}
        isError={error !== null}
        isLoading={loading}
        noResultsMessage={t("collection:browse.mods.noResults.message")}
        noResultsTitle={t("collection:browse.mods.noResults.title")}
        skeletonCount={12}
      >
        {mods.map((mod) => (
          <ModCard key={`${mod.link}-${mod.name}`} mod={mod} t={t} />
        ))}
      </Listing>
    </div>
  );
}
