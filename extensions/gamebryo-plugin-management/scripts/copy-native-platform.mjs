#!/usr/bin/env node

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(extensionRoot, "dist");
const vendorDir = path.join(extensionRoot, "vendor", "linux-loot");
const prebuildDir = path.join(vendorDir, "prebuilds", `linux-${process.arch}`);
const lootModule = path.join(extensionRoot, "node_modules", "loot");

mkdirSync(distDir, { recursive: true });

function patchLootIndex(indexPath) {
  let source = readFileSync(indexPath, "utf8");
  if (source.includes("function lootIpcPath")) {
    return;
  }
  const header = `const os = require('os');
const path = require('path');
function lootIpcPath(id) {
  if (process.platform === 'win32') {
    return \`\\\\\\\\?\\\\pipe\\\\loot-ipc-\${id}\`;
  }
  return path.join(os.tmpdir(), \`loot-ipc-\${id}.sock\`);
}
`;
  source =
    header +
    source.replace(
      "this.ipc.listen(`\\\\?\\pipe\\loot-ipc-${this.id}`, () => {",
      "this.ipc.listen(lootIpcPath(this.id), () => {",
    );
  writeFileSync(indexPath, source);
}

if (process.platform === "win32") {
  execSync(
    "node ../copy-native.mjs ./node_modules/loot/build/Release/node-loot.node ./node_modules/loot/loot_api/libloot.dll ./node_modules/loot/async.js",
    { cwd: extensionRoot, stdio: "inherit" },
  );
  const asyncJs = path.join(distDir, "async.js");
  let content = readFileSync(asyncJs, "utf8");
  content = content.replace("./build/Release/node-loot", "./node-loot");
  writeFileSync(asyncJs, content);
  process.exit(0);
}

const nodeAddon = path.join(prebuildDir, "node-loot.node");
const libloot = path.join(prebuildDir, "libloot.so");

if (existsSync(lootModule)) {
  copyFileSync(path.join(vendorDir, "async.js"), path.join(lootModule, "async.js"));
  patchLootIndex(path.join(lootModule, "index.js"));
}

copyFileSync(path.join(vendorDir, "async.js"), path.join(distDir, "async.js"));

if (existsSync(nodeAddon)) {
  copyFileSync(nodeAddon, path.join(distDir, "node-loot.node"));
  try {
    execSync(`patchelf --set-rpath '$ORIGIN' "${path.join(distDir, "node-loot.node")}"`, {
      stdio: "inherit",
    });
  } catch {
    console.warn("patchelf not available, node-loot.node may not resolve libloot.so from dist");
  }
  if (existsSync(lootModule)) {
    mkdirSync(path.join(lootModule, "build", "Release"), { recursive: true });
    copyFileSync(nodeAddon, path.join(lootModule, "build", "Release", "node-loot.node"));
  }
} else {
  console.warn("Linux LOOT prebuilds missing at", prebuildDir);
}

if (existsSync(libloot)) {
  copyFileSync(libloot, path.join(distDir, "libloot.so"));
  const versioned = libloot.includes(".so.")
    ? libloot
    : existsSync(path.join(prebuildDir, "libloot.so.0.24.5"))
      ? path.join(prebuildDir, "libloot.so.0.24.5")
      : undefined;
  if (versioned !== undefined && existsSync(versioned)) {
    copyFileSync(versioned, path.join(distDir, "libloot.so.0"));
    copyFileSync(versioned, path.join(distDir, path.basename(versioned)));
  }
  if (existsSync(lootModule)) {
    mkdirSync(path.join(lootModule, "loot_api"), { recursive: true });
    copyFileSync(libloot, path.join(lootModule, "loot_api", "libloot.so"));
  }
}
