import type { LinuxHealthStatus } from "@vortex/shared/ipc";

import type { AlertSeverity } from "@/ui/components/alert/Alert";

export function healthStatusToSeverity(status: LinuxHealthStatus): AlertSeverity {
  switch (status) {
    case "ok":
      return "success";
    case "warning":
      return "warning";
    case "error":
      return "danger";
    case "info":
    case "skipped":
    default:
      return "info";
  }
}

export function canRepairDesktopIntegration(
  checks: Array<{ id: string; repairable?: boolean }>,
): boolean {
  return checks.some(
    (check) =>
      check.repairable === true && (check.id === "desktop_entry" || check.id === "desktop_icons"),
  );
}
