import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

import { getVortexPath } from "../getVortexPath";

const execFileAsync = promisify(execFile);

let cachedAbi: number | undefined;
let cachedBinaryPath: string | undefined;

export function getInstallerSandboxBinaryPath(): string | undefined {
  if (cachedBinaryPath !== undefined) {
    return cachedBinaryPath;
  }

  const candidates = [
    path.join(getVortexPath("assets"), "installer-sandbox"),
    path.join(getVortexPath("application"), "assets", "installer-sandbox"),
    path.join(getVortexPath("package_unpacked"), "assets", "installer-sandbox"),
  ];

  cachedBinaryPath = candidates.find((candidate) => fs.existsSync(candidate));
  return cachedBinaryPath;
}

export async function probeInstallerSandboxAbi(): Promise<number | undefined> {
  if (process.platform !== "linux") {
    return undefined;
  }

  if (cachedAbi !== undefined) {
    return cachedAbi;
  }

  const binaryPath = getInstallerSandboxBinaryPath();
  if (binaryPath === undefined) {
    return undefined;
  }

  try {
    const { stdout } = await execFileAsync(binaryPath, ["--probe"], {
      timeout: 5000,
    });
    const abi = Number.parseInt(stdout.trim(), 10);
    if (Number.isFinite(abi) && abi > 0) {
      cachedAbi = abi;
      return abi;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export async function isInstallerSandboxSupported(): Promise<boolean> {
  return (await probeInstallerSandboxAbi()) !== undefined;
}

export interface IInstallerSandboxPaths {
  readWrite: string[];
  readOnly: string[];
  allowTcp: boolean;
}

export function normalizeSandboxPath(targetPath: string): string | undefined {
  if (targetPath.length === 0) {
    return undefined;
  }
  return path.resolve(targetPath);
}

export function uniqueSandboxPaths(paths: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of paths) {
    const normalized = normalizeSandboxPath(entry);
    if (normalized === undefined || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

export function buildDefaultReadOnlyPaths(exePath: string, cwd?: string): string[] {
  const paths = [
    path.dirname(exePath),
    cwd,
    "/lib",
    "/lib64",
    "/usr/lib",
    "/usr/share/dotnet",
    path.join(os.homedir(), ".dotnet"),
  ];

  const dotnetRoot = process.env.DOTNET_ROOT;
  if (dotnetRoot !== undefined) {
    paths.push(dotnetRoot);
  }

  return uniqueSandboxPaths(
    paths.filter((entry): entry is string => typeof entry === "string" && entry.length > 0),
  );
}

export function buildInstallerSandboxArgv(
  binaryPath: string,
  paths: IInstallerSandboxPaths,
  command: string,
  args: string[],
): { command: string; args: string[] } {
  const argv = [binaryPath];
  for (const entry of uniqueSandboxPaths(paths.readWrite)) {
    argv.push("--allow-rw", entry);
  }
  for (const entry of uniqueSandboxPaths(paths.readOnly)) {
    argv.push("--allow-ro", entry);
  }
  if (paths.allowTcp) {
    argv.push("--allow-tcp");
  }
  argv.push("--", command, ...args);
  return { command: binaryPath, args: argv.slice(1) };
}
