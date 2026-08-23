import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import * as path from "node:path";

export const FOMOD_NATIVE_SO = "ModInstaller.Native.so";

export function findNativeSoSource(packageRoot) {
  const arch = process.arch;
  const candidates = [
    path.join(packageRoot, "build", "Release", FOMOD_NATIVE_SO),
    path.join(packageRoot, "prebuilds", `linux-${arch}`, FOMOD_NATIVE_SO),
    path.join(packageRoot, FOMOD_NATIVE_SO),
  ];
  return candidates.find((candidate) => existsSync(candidate));
}

export function listFomodNativeAddons(packageRoot) {
  const binRoot = path.join(packageRoot, "bin");
  if (!existsSync(binRoot)) {
    return [];
  }

  const addons = [];
  for (const entry of readdirSync(binRoot)) {
    const dir = path.join(binRoot, entry);
    if (!statSync(dir).isDirectory()) {
      continue;
    }

    for (const file of readdirSync(dir)) {
      if (file.endsWith(".node")) {
        addons.push(path.join(dir, file));
      }
    }
  }

  return addons;
}

export function fixFomodNativeLinuxPackage(packageRoot, options = {}) {
  if (process.platform !== "linux") {
    return [];
  }

  const soSource = findNativeSoSource(packageRoot);
  if (soSource === undefined) {
    return [];
  }

  const patchelf = options.patchelfPath ?? "patchelf";
  const results = [];

  for (const addonPath of listFomodNativeAddons(packageRoot)) {
    const soPath = path.join(path.dirname(addonPath), FOMOD_NATIVE_SO);
    copyFileSync(soSource, soPath);

    let rpathSet = false;
    try {
      execFileSync(patchelf, ["--set-rpath", "$ORIGIN", addonPath], { stdio: "pipe" });
      rpathSet = true;
    } catch {
      // patchelf may be unavailable in local dev environments
    }

    results.push({ addonPath, soPath, rpathSet });
  }

  return results;
}

export function fixFomodNativeLinuxDist(distDir) {
  const packageRoot = path.join(distDir, "node_modules", "@nexusmods", "fomod-installer-native");

  if (!existsSync(packageRoot)) {
    return [];
  }

  return fixFomodNativeLinuxPackage(packageRoot);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const distDir = process.argv[2] ?? process.cwd();
  const results = fixFomodNativeLinuxDist(distDir);
  for (const result of results) {
    console.log(
      `fixed ${result.addonPath} (rpath=${result.rpathSet ? "set" : "skipped"}, so=${result.soPath})`,
    );
  }
}
