import type { LinuxHealthCheck, LinuxSystemHealthReport } from "@vortex/shared/ipc";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { useMainContext } from "@/contexts";
import type { IState } from "@/types/IState";
import { Alert } from "@/ui/components/alert/Alert";
import { Button } from "@/ui/components/button/Button";
import { Typography } from "@/ui/components/typography/Typography";

import { addGogScanRoot, removeGogScanRoot } from "./actions";
import { GogScanRootsSection } from "./GogScanRootsSection";
import { getGogScanRoots } from "./selectors";
import { canRepairDesktopIntegration, healthStatusToSeverity } from "./statusMapping";

interface ISettingsLinuxProps {
  report: LinuxSystemHealthReport | undefined;
  isLoading: boolean;
  isRepairing: boolean;
  repairMessage: string | undefined;
  gogScanRoots: string[];
  onRefresh: () => void;
  onRepairDesktopIntegration: () => void;
  onAddScanRoot: () => void;
  onRemoveScanRoot: (root: string) => void;
}

function HealthCheckRow({ check }: { check: LinuxHealthCheck }) {
  return (
    <Alert data-testid={`linux-health-${check.id}`} severity={healthStatusToSeverity(check.status)}>
      <div className="flex flex-col gap-y-1">
        <Typography as="span" brand="neutral">
          {check.summary}
        </Typography>
        {check.detail !== undefined && (
          <Typography as="span" brand="neutral-translucent" className="text-sm">
            {check.detail}
          </Typography>
        )}
      </div>
    </Alert>
  );
}

export function SettingsLinuxView({
  report,
  isLoading,
  isRepairing,
  repairMessage,
  gogScanRoots,
  onRefresh,
  onRepairDesktopIntegration,
  onAddScanRoot,
  onRemoveScanRoot,
}: ISettingsLinuxProps): JSX.Element {
  const showRepair =
    report !== undefined && canRepairDesktopIntegration(report.checks) && !report.isFlatpak;

  return (
    <form>
      <div className="flex flex-col gap-y-4">
        <Typography as="h3" brand="neutral">
          Linux system health
        </Typography>

        <div className="flex flex-wrap items-center gap-3">
          <Typography as="p" brand="neutral-translucent">
            Verify desktop integration, nxm:// link handling, .NET runtime availability, and Steam
            discovery on this system.
          </Typography>

          <div className="flex flex-wrap gap-2">
            <Button
              brand="neutral"
              data-testid="linux-health-refresh"
              disabled={isLoading || isRepairing}
              isLoading={isLoading}
              onClick={onRefresh}
            >
              Refresh checks
            </Button>

            {showRepair && (
              <Button
                brand="info"
                data-testid="linux-health-repair"
                disabled={isLoading || isRepairing}
                isLoading={isRepairing}
                onClick={onRepairDesktopIntegration}
              >
                Repair desktop integration
              </Button>
            )}
          </div>
        </div>

        {repairMessage !== undefined && (
          <Alert data-testid="linux-health-repair-message" severity="info">
            {repairMessage}
          </Alert>
        )}

        {report === undefined && !isLoading && (
          <Alert data-testid="linux-health-empty" severity="warning">
            System health checks have not been loaded yet.
          </Alert>
        )}

        {report?.checks.map((check) => (
          <HealthCheckRow key={check.id} check={check} />
        ))}

        <GogScanRootsSection
          roots={gogScanRoots}
          onAddScanRoot={onAddScanRoot}
          onRemoveScanRoot={onRemoveScanRoot}
        />
      </div>
    </form>
  );
}

const SettingsLinux: React.FC = () => {
  const { api } = useMainContext();
  const dispatch = useDispatch();
  const gogScanRoots = useSelector((state: IState) => getGogScanRoots(state));
  const [report, setReport] = React.useState<LinuxSystemHealthReport | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRepairing, setIsRepairing] = React.useState(false);
  const [repairMessage, setRepairMessage] = React.useState<string | undefined>(undefined);

  const refresh = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const nextReport = await window.api.linux.getSystemHealth();
      setReport(nextReport);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const repairDesktopIntegration = React.useCallback(async () => {
    setIsRepairing(true);
    setRepairMessage(undefined);
    try {
      const result = await window.api.linux.repairDesktopIntegration();
      if (result.repaired) {
        setRepairMessage("Desktop integration files were refreshed.");
      } else {
        setRepairMessage(result.reason ?? "Desktop integration could not be repaired.");
      }
      await refresh();
    } finally {
      setIsRepairing(false);
    }
  }, [refresh]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const addScanRoot = React.useCallback(async () => {
    const selected = await api.selectDir({});
    if (selected !== undefined) {
      dispatch(addGogScanRoot(selected));
    }
  }, [api, dispatch]);

  const removeScanRoot = React.useCallback(
    (root: string) => {
      dispatch(removeGogScanRoot(root));
    },
    [dispatch],
  );

  return (
    <SettingsLinuxView
      gogScanRoots={gogScanRoots}
      isLoading={isLoading}
      isRepairing={isRepairing}
      repairMessage={repairMessage}
      report={report}
      onRefresh={() => {
        void refresh();
      }}
      onRepairDesktopIntegration={() => {
        void repairDesktopIntegration();
      }}
      onAddScanRoot={() => {
        void addScanRoot();
      }}
      onRemoveScanRoot={removeScanRoot}
    />
  );
};

export default SettingsLinux;
