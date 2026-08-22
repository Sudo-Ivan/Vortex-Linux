import { execFile } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export function getDotNetRootCandidates(home: string): string[] {
  const candidates = [
    process.env.DOTNET_ROOT,
    "/usr/share/dotnet",
    "/usr/lib/dotnet",
    path.join(home, ".dotnet"),
  ];

  return candidates.filter((candidate): candidate is string => !!candidate);
}

export function hasMinimumRuntime(listOutput: string, minimumMajor: number): boolean {
  for (const line of listOutput.split("\n")) {
    const match = line.match(/^Microsoft\.NETCore\.App (\d+)\./);
    if (match !== null && parseInt(match[1], 10) >= minimumMajor) {
      return true;
    }
  }
  return false;
}

export async function listRuntimesViaCli(home: string): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("dotnet", ["--list-runtimes"]);
    return stdout;
  } catch {
    for (const root of getDotNetRootCandidates(home)) {
      const dotnetPath = path.join(root, "dotnet");
      if (!fs.existsSync(dotnetPath)) {
        continue;
      }

      try {
        const { stdout } = await execFileAsync(dotnetPath, ["--list-runtimes"], {
          env: { ...process.env, DOTNET_ROOT: root },
        });
        return stdout;
      } catch {
        continue;
      }
    }
  }

  return undefined;
}

export function resolveDotNetProbeEnv(home: string): NodeJS.ProcessEnv {
  for (const root of getDotNetRootCandidates(home)) {
    if (fs.existsSync(path.join(root, "dotnet"))) {
      return { ...process.env, DOTNET_ROOT: root };
    }
  }
  return process.env;
}

export function getLinuxDotNetInstallHint(): string {
  return (
    "Install the .NET 9 runtime using your package manager or from " +
    "https://dotnet.microsoft.com/download/dotnet/9.0" +
    "[br][/br][br][/br]" +
    "Arch / CachyOS: sudo pacman -S dotnet-runtime-9.0" +
    "[br][/br]" +
    "Debian / Ubuntu: sudo apt install dotnet-runtime-9.0" +
    "[br][/br]" +
    "Fedora: sudo dnf install dotnet-runtime-9.0"
  );
}
