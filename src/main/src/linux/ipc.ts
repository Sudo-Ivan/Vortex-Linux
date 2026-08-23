import { betterIpcMain } from "../ipc";
import { isInstallerSandboxSupported } from "./installerSandbox";
import { collectLinuxSystemHealth, repairLinuxDesktopIntegration } from "./systemHealth";

export function initLinuxIpc(): void {
  if (process.platform !== "linux") {
    return;
  }

  betterIpcMain.handle("linux:get-system-health", () => collectLinuxSystemHealth());

  betterIpcMain.handle("linux:repair-desktop-integration", () => {
    return repairLinuxDesktopIntegration(process.execPath);
  });

  betterIpcMain.handle("linux:supports-installer-sandbox", () => isInstallerSandboxSupported());
}
