import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";

import type { IProcessLauncher, ProcessLaunchOptions } from "@nexusmods/fomod-installer-ipc";
import { SecurityLevel } from "@nexusmods/fomod-installer-ipc";

import getVortexPath from "../../../util/getVortexPath";
import { log } from "../../../util/log";
import { buildDefaultReadOnlyPaths, buildInstallerSandboxArgv } from "./sandboxPaths";

export class LinuxSandboxProcessLauncher implements IProcessLauncher {
  private readonly readWritePaths = new Set<string>();
  private readonly readOnlyPaths = new Set<string>();
  private launched = false;

  getSecurityLevel(): SecurityLevel {
    return SecurityLevel.Sandbox;
  }

  addAllowedPaths(paths: string[]): void {
    if (this.launched) {
      throw new Error("Cannot add sandbox paths after the installer process has launched");
    }
    for (const entry of paths) {
      if (entry.length > 0) {
        this.readWritePaths.add(path.resolve(entry));
      }
    }
  }

  async grantAdditionalAccess(paths: string[]): Promise<void> {
    this.addAllowedPaths(paths);
  }

  async launch(
    exePath: string,
    args: string[],
    options: ProcessLaunchOptions,
  ): Promise<ChildProcess> {
    const sandboxBinary = this.getSandboxBinaryPath();
    if (sandboxBinary === undefined) {
      throw new Error("Linux installer sandbox helper was not found");
    }

    let command = exePath;
    let commandArgs = args;
    if (process.platform !== "win32" && exePath.toLowerCase().endsWith(".exe")) {
      command = "mono";
      commandArgs = [exePath, ...args];
    }

    for (const entry of buildDefaultReadOnlyPaths(exePath, options.cwd)) {
      this.readOnlyPaths.add(entry);
    }
    if (options.cwd !== undefined && options.cwd.length > 0) {
      this.readWritePaths.add(path.resolve(options.cwd));
    }

    const built = buildInstallerSandboxArgv(
      sandboxBinary,
      {
        readWrite: Array.from(this.readWritePaths),
        readOnly: Array.from(this.readOnlyPaths),
        allowTcp: true,
      },
      command,
      commandArgs,
    );

    const spawnOptions: SpawnOptions = {
      ...options,
      stdio: ["pipe", "pipe", "pipe"],
    };

    log("info", "[PROCESS] Launching process with Linux installer sandbox", {
      exePath,
      sandboxBinary,
      cwd: options.cwd,
      readWritePaths: Array.from(this.readWritePaths),
    });

    this.launched = true;
    const child = spawn(built.command, built.args, spawnOptions);
    log("info", "[PROCESS] Process launched successfully (Linux sandbox)", {
      pid: child.pid,
    });
    return child;
  }

  async cleanup(): Promise<void> {
    this.launched = false;
    this.readWritePaths.clear();
    this.readOnlyPaths.clear();
  }

  private getSandboxBinaryPath(): string | undefined {
    const candidates = [
      path.join(getVortexPath("assets"), "installer-sandbox"),
      path.join(getVortexPath("package_unpacked"), "assets", "installer-sandbox"),
    ];
    return candidates.find((candidate) => existsSync(candidate));
  }
}
