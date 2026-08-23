import * as os from "node:os";
import * as path from "node:path";

export interface IInstallerSandboxPaths {
  readWrite: string[];
  readOnly: string[];
  allowTcp: boolean;
}

export function uniqueSandboxPaths(paths: Iterable<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of paths) {
    if (entry.length === 0) {
      continue;
    }
    const normalized = path.resolve(entry);
    if (seen.has(normalized)) {
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
