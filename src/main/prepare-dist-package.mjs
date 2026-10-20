import { execSync } from "node:child_process";
import { createWriteStream, existsSync } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const MAIN_DIR = resolve(import.meta.dirname);
const MAIN_PACKAGE_PATH = resolve(MAIN_DIR, "package.json");
const DIST_DIR = resolve(MAIN_DIR, "build");
const DIST_PACKAGE_PATH = resolve(DIST_DIR, "package.json");
const ELECTRON_BUILDER_CONFIG_PATH = resolve(MAIN_DIR, "electron-builder.config.json");
const LINUX_DOTNET_RUNTIME_DIR = "./temp/dotnet-runtime";

// Runtimes bundled into the installer; also declared as winget dependencies by winget-release.yml.
const RUNTIME_DEPS_FILE = "runtime-dependencies.json";

const LOCALES_RESOURCE = {
  from: "../../../locales",
  to: "locales",
};

const WIN_EXTRA_RESOURCES = [
  "./temp/VC_redist.x64.exe",
  "./temp/windowsdesktop-runtime-win-x64.exe",
  "./nsis/**/*",
  LOCALES_RESOURCE,
];

const LINUX_EXTRA_RESOURCES = [
  LOCALES_RESOURCE,
  {
    from: LINUX_DOTNET_RUNTIME_DIR,
    to: "dotnet",
  },
  {
    from: "./build/icons",
    to: "icons",
  },
];

// Walks up because MAIN_DIR is the pnpm-deployed copy (src/main/dist), not src/main.
function findUp(fileName, from) {
  let dir = from;
  for (;;) {
    const candidate = resolve(dir, fileName);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Could not find ${fileName} above ${from}`);
    dir = parent;
  }
}

async function resolveDepVersions(deps, nodeModulesDir) {
  if (!deps) return deps;
  const resolved = { ...deps };
  for (const [name, version] of Object.entries(deps)) {
    if (version === "catalog:" || version.startsWith("workspace:")) {
      try {
        const pkgJson = JSON.parse(
          await readFile(resolve(nodeModulesDir, name, "package.json"), "utf8"),
        );
        resolved[name] = pkgJson.version;
      } catch {
        // leave as-is if not found in node_modules
      }
    }
  }
  return resolved;
}

async function downloadFile(url, dest) {
  await mkdir(resolve(dest, ".."), { recursive: true });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.statusText}`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
}

async function prepareWin() {
  // assert that loot runtime assets exist; fail the build if they don't.
  const lootRelease = resolve(DIST_DIR, "assets", "loot", "build", "Release");
  for (const file of ["node-loot.node", "libloot.dll"]) {
    await access(resolve(lootRelease, file)).catch(() => {
      throw new Error(`missing loot runtime asset: ${resolve(lootRelease, file)}`);
    });
  }

  const tempDir = resolve(MAIN_DIR, "temp");
  const runtimeDeps = JSON.parse(await readFile(findUp(RUNTIME_DEPS_FILE, MAIN_DIR), "utf8"));
  for (const { file, url } of runtimeDeps) {
    await downloadFile(url, resolve(tempDir, file));
  }
}

async function prepareLinux() {
  const installDir = resolve(MAIN_DIR, "temp/dotnet-runtime");
  const dotnetBin = resolve(installDir, "dotnet");
  if (existsSync(dotnetBin)) {
    return;
  }
  await mkdir(installDir, { recursive: true });
  execSync(
    `curl -fsSL https://dot.net/v1/dotnet-install.sh | bash /dev/stdin --runtime dotnet --channel 9.0 --install-dir "${installDir}"`,
    { stdio: "inherit", shell: true },
  );
}

async function patchElectronBuilderConfig() {
  const raw = await readFile(ELECTRON_BUILDER_CONFIG_PATH, "utf8");
  const config = JSON.parse(raw);

  if (process.platform === "win32") {
    config.extraResources = WIN_EXTRA_RESOURCES;
  } else {
    config.extraResources = LINUX_EXTRA_RESOURCES;
  }

  await writeFile(ELECTRON_BUILDER_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf8");
}

async function main() {
  const json = await readFile(MAIN_PACKAGE_PATH, "utf8");
  const mainPkg = JSON.parse(json);

  mainPkg["name"] = "Vortex";
  mainPkg["main"] = mainPkg.main.replace(/^build\//, "");

  // NOTE(erri120): this is the minimal amount of bullshit required to get the piece of shit software called "electron-builder" to work with PNPM.
  const nodeModulesDir = resolve(MAIN_DIR, "node_modules");
  mainPkg.dependencies = await resolveDepVersions(mainPkg.dependencies, nodeModulesDir);
  mainPkg.devDependencies = await resolveDepVersions(mainPkg.devDependencies, nodeModulesDir);
  mainPkg.optionalDependencies = await resolveDepVersions(
    mainPkg.optionalDependencies,
    nodeModulesDir,
  );

  await writeFile(DIST_PACKAGE_PATH, JSON.stringify(mainPkg, null, 2) + "\n", "utf8");

  await patchElectronBuilderConfig();

  if (process.platform === "win32") {
    await prepareWin();
  } else if (process.platform === "linux") {
    await prepareLinux();
    const { fixFomodNativeLinuxDist } = await import("./fix-fomod-native-linux.mjs");
    fixFomodNativeLinuxDist(MAIN_DIR);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
