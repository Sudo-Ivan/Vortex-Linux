import type { ConnectionStrategy } from "@nexusmods/fomod-installer-ipc";
import {
  NamedPipeTransport,
  RegularProcessLauncher,
  SandboxProcessLauncher,
  SecurityLevel,
  TCPTransport,
} from "@nexusmods/fomod-installer-ipc";

import { LinuxSandboxProcessLauncher } from "../linux/LinuxSandboxProcessLauncher";

/**
 * Helper function to create connection strategies from launcher options
 */
export const createConnectionStrategies = (options?: {
  securityLevel?: SecurityLevel;
  allowFallback?: boolean;
  containerName?: string;
}): ConnectionStrategy[] => {
  const strategies: ConnectionStrategy[] = [];

  const securityLevel = options?.securityLevel || SecurityLevel.Sandbox;
  const allowFallback = options?.allowFallback !== false;
  const containerName = options?.containerName || "fomod_installer";

  if (securityLevel === SecurityLevel.Sandbox) {
    if (process.platform === "win32") {
      const namedPipeTransport = new NamedPipeTransport();
      const sandboxLauncher = new SandboxProcessLauncher({
        containerName,
        transport: namedPipeTransport,
      });

      strategies.push({
        transport: namedPipeTransport,
        launcher: sandboxLauncher,
      });
    } else if (process.platform === "linux") {
      strategies.push({
        transport: new TCPTransport(),
        launcher: new LinuxSandboxProcessLauncher(),
      });
    }
  }

  if (
    (securityLevel === SecurityLevel.Sandbox && allowFallback) ||
    securityLevel === SecurityLevel.Regular
  ) {
    if (process.platform === "win32") {
      strategies.push({
        transport: new NamedPipeTransport(),
        launcher: new RegularProcessLauncher(),
      });
    }
  }

  if (
    (securityLevel === SecurityLevel.Sandbox && allowFallback) ||
    (securityLevel === SecurityLevel.Regular && allowFallback)
  ) {
    strategies.push({
      transport: new TCPTransport(),
      launcher: new RegularProcessLauncher(),
    });
  }

  return strategies;
};
