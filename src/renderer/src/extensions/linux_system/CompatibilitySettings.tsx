import type {
  CompatibilityDiscoveryResult,
  CompatibilityRunner,
  WinePrefixOption,
} from "@vortex/shared/ipc";
import { buildPrefixId, parsePrefixId, parseRunnerId } from "@vortex/shared/linux";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { setGameCompatibility } from "@/extensions/gamemode_management/actions/settings";
import { currentGameDiscovery } from "@/extensions/gamemode_management/selectors";
import type { IDiscoveryResult } from "@/extensions/gamemode_management/types/IDiscoveryResult";
import { getGame } from "@/extensions/gamemode_management/util/getGame";
import type { IState } from "@/types/IState";
import { Button } from "@/ui/components/button/Button";
import { Typography } from "@/ui/components/typography/Typography";
import { activeGameId } from "@/util/selectors";

interface ICompatibilitySettingsProps {
  gameId: string;
  discovery: IDiscoveryResult | undefined;
  options: CompatibilityDiscoveryResult | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectRunner: (runner: CompatibilityRunner | undefined) => void;
  onSelectPrefix: (prefix: WinePrefixOption | undefined) => void;
  onBrowsePrefix: () => void;
}

export function CompatibilitySettingsView({
  discovery,
  options,
  isLoading,
  onRefresh,
  onSelectRunner,
  onSelectPrefix,
  onBrowsePrefix,
}: ICompatibilitySettingsProps): JSX.Element {
  const selectedRunnerId = discovery?.compatibilityRunnerId;
  const selectedPrefixId =
    discovery?.winePrefixId ??
    (discovery?.winePrefixPath !== undefined
      ? buildPrefixId("custom", discovery.winePrefixPath)
      : undefined);

  return (
    <div className="flex flex-col gap-y-4">
      <Typography as="h3" brand="neutral">
        Linux compatibility layer
      </Typography>

      <Typography as="p" brand="neutral-translucent">
        Choose the Proton or Wine runner and Wine prefix used for save paths, plugin data, and
        launching Windows tools for this game.
      </Typography>

      <div className="flex flex-wrap gap-2">
        <Button
          brand="neutral"
          data-testid="compatibility-refresh"
          disabled={isLoading}
          isLoading={isLoading}
          onClick={onRefresh}
        >
          Detect runners and prefixes
        </Button>
      </div>

      {discovery?.heroicAppName !== undefined && (
        <Typography as="p" brand="neutral-translucent" data-testid="compatibility-heroic-match">
          Heroic game detected: {discovery.heroicAppName}
        </Typography>
      )}

      <label className="flex flex-col gap-y-1">
        <Typography as="span" brand="neutral">
          Compatibility runner
        </Typography>
        <select
          className="rounded border border-stroke-weak bg-surface-base px-3 py-2 text-sm"
          data-testid="compatibility-runner-select"
          value={selectedRunnerId ?? ""}
          onChange={(event) => {
            const runner = options?.runners.find((entry) => entry.id === event.target.value);
            onSelectRunner(runner);
          }}
        >
          <option value="">Automatic</option>
          {(options?.runners ?? []).map((runner) => (
            <option key={runner.id} value={runner.id}>
              {runner.name} ({runner.type})
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-y-1">
        <Typography as="span" brand="neutral">
          Wine prefix
        </Typography>
        <select
          className="rounded border border-stroke-weak bg-surface-base px-3 py-2 text-sm"
          data-testid="compatibility-prefix-select"
          value={selectedPrefixId ?? ""}
          onChange={(event) => {
            const prefix = options?.prefixes.find((entry) => entry.id === event.target.value);
            onSelectPrefix(prefix);
          }}
        >
          <option value="">Automatic</option>
          {(options?.prefixes ?? []).map((prefix) => (
            <option key={prefix.id} value={prefix.id}>
              {prefix.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-2">
        <Button brand="neutral" data-testid="compatibility-browse-prefix" onClick={onBrowsePrefix}>
          Browse for prefix
        </Button>
      </div>

      {discovery?.winePrefixPath !== undefined && (
        <Typography as="p" brand="neutral-translucent" data-testid="compatibility-prefix-path">
          Active prefix: {discovery.winePrefixPath}
        </Typography>
      )}
    </div>
  );
}

const CompatibilitySettings: React.FC = () => {
  const dispatch = useDispatch();
  const gameId = useSelector((state: IState) => activeGameId(state));
  const discovery = useSelector((state: IState) => currentGameDiscovery(state));
  const game = gameId !== undefined ? getGame(gameId) : undefined;
  const [options, setOptions] = React.useState<CompatibilityDiscoveryResult | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    if (gameId === undefined || discovery?.path === undefined) {
      setOptions(undefined);
      return;
    }

    setIsLoading(true);
    try {
      const nextOptions = await window.api.linux.discoverCompatibility({
        gamePath: discovery.path,
        steamAppId: game?.details?.steamAppId,
        heroicAppName: discovery.heroicAppName,
      });
      setOptions(nextOptions);
    } finally {
      setIsLoading(false);
    }
  }, [discovery?.heroicAppName, discovery?.path, game?.details?.steamAppId, gameId]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateCompatibility = React.useCallback(
    (patch: Partial<IDiscoveryResult>) => {
      if (gameId === undefined) {
        return;
      }
      dispatch(setGameCompatibility(gameId, patch));
    },
    [dispatch, gameId],
  );

  const selectRunner = React.useCallback(
    (runner: CompatibilityRunner | undefined) => {
      if (runner === undefined) {
        updateCompatibility({
          compatibilityRunnerId: undefined,
          compatibilityRunnerType: undefined,
          protonPath: undefined,
          usesProton: undefined,
        });
        return;
      }

      updateCompatibility({
        compatibilityRunnerId: runner.id,
        compatibilityRunnerType: runner.type,
        protonPath: runner.type === "proton" ? runner.path : undefined,
        usesProton: runner.type === "proton",
      });
    },
    [updateCompatibility],
  );

  const selectPrefix = React.useCallback(
    (prefix: WinePrefixOption | undefined) => {
      if (prefix === undefined) {
        updateCompatibility({
          winePrefixId: undefined,
          winePrefixPath: undefined,
          compatDataPath: undefined,
        });
        return;
      }

      const runnerType = discovery?.compatibilityRunnerType;
      updateCompatibility({
        winePrefixId: prefix.id,
        winePrefixPath: prefix.path,
        compatDataPath: runnerType === "proton" ? prefix.path : discovery?.compatDataPath,
      });
    },
    [discovery?.compatDataPath, discovery?.compatibilityRunnerType, updateCompatibility],
  );

  const browsePrefix = React.useCallback(async () => {
    const selected = await window.api.dialog.showOpen({
      properties: ["openDirectory"],
      defaultPath: discovery?.winePrefixPath,
    });
    const prefixPath = selected.filePaths?.[0];
    if (prefixPath === undefined) {
      return;
    }

    const prefixId = buildPrefixId("custom", prefixPath);
    const runnerType = discovery?.compatibilityRunnerType;
    updateCompatibility({
      winePrefixId: prefixId,
      winePrefixPath: prefixPath,
      compatDataPath: runnerType === "proton" ? prefixPath : discovery?.compatDataPath,
    });
    setOptions((current) => {
      if (current === undefined) {
        return current;
      }
      if (current.prefixes.some((prefix) => prefix.id === prefixId)) {
        return current;
      }
      return {
        ...current,
        prefixes: [
          ...current.prefixes,
          {
            id: prefixId,
            label: `Custom ${prefixPath}`,
            path: prefixPath,
            source: "custom",
          },
        ],
      };
    });
  }, [
    discovery?.compatDataPath,
    discovery?.compatibilityRunnerType,
    discovery?.winePrefixPath,
    updateCompatibility,
  ]);

  if (gameId === undefined || discovery?.path === undefined) {
    return (
      <Typography as="p" brand="neutral-translucent">
        Select a discovered game to configure its compatibility layer.
      </Typography>
    );
  }

  return (
    <CompatibilitySettingsView
      discovery={discovery}
      gameId={gameId}
      isLoading={isLoading}
      options={options}
      onBrowsePrefix={() => {
        void browsePrefix();
      }}
      onRefresh={() => {
        void refresh();
      }}
      onSelectPrefix={selectPrefix}
      onSelectRunner={selectRunner}
    />
  );
};

export default CompatibilitySettings;

export function compatibilitySettingsFromDiscovery(discovery: IDiscoveryResult | undefined): {
  runnerPath?: string;
  runnerType?: "proton" | "wine";
  winePrefixPath?: string;
  compatDataPath?: string;
} {
  const runner = parseRunnerId(discovery?.compatibilityRunnerId);
  const prefix = parsePrefixId(discovery?.winePrefixId);
  const winePrefixPath = prefix?.path ?? discovery?.winePrefixPath;
  const runnerType = discovery?.compatibilityRunnerType ?? runner?.type;
  const runnerPath = runner?.path ?? discovery?.protonPath;

  return {
    runnerPath,
    runnerType,
    winePrefixPath,
    compatDataPath:
      discovery?.compatDataPath ?? (runnerType === "proton" ? winePrefixPath : undefined),
  };
}
