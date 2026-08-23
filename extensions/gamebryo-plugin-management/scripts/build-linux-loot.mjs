#!/usr/bin/env node

import { execSync } from "node:child_process";
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import * as path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const extensionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorPrebuild = path.join(
  extensionRoot,
  "vendor",
  "linux-loot",
  "prebuilds",
  `linux-${process.arch}`,
);
const lootModule = path.join(extensionRoot, "node_modules", "loot");
const buildDir = path.join(extensionRoot, ".build");
const liblootVersion = "0.24.5";
const liblootTar = path.join(buildDir, `libloot-${liblootVersion}-Linux.tar.xz`);
const liblootExtract = path.join(buildDir, `libloot-${liblootVersion}-Linux`);

function run(cmd, cwd = extensionRoot) {
  execSync(cmd, { cwd, stdio: "inherit", env: process.env });
}

async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok || response.body === null) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
}

if (process.platform !== "linux") {
  console.log("Linux LOOT build script is only for Linux hosts");
  process.exit(0);
}

mkdirSync(vendorPrebuild, { recursive: true });
mkdirSync(buildDir, { recursive: true });

if (!existsSync(lootModule)) {
  console.error("loot module not installed, run pnpm install in gamebryo-plugin-management first");
  process.exit(1);
}

if (!existsSync(liblootExtract)) {
  if (!existsSync(liblootTar)) {
    const url = `https://github.com/loot/libloot/releases/download/${liblootVersion}/libloot-${liblootVersion}-Linux.tar.xz`;
    console.log("Downloading", url);
    await download(url, liblootTar);
  }
  mkdirSync(liblootExtract, { recursive: true });
  run(`tar -xf "${liblootTar}" -C "${liblootExtract}"`);
}

const liblootSo = execSync(`find "${liblootExtract}" -name 'libloot.so' -print -quit`, {
  encoding: "utf8",
}).trim();

if (!liblootSo) {
  console.error("libloot.so not found in extracted tarball");
  process.exit(1);
}

console.log("Using libloot.so from", liblootSo);
const lootApiDir = path.join(lootModule, "loot_api");
mkdirSync(lootApiDir, { recursive: true });
copyFileSync(liblootSo, path.join(lootApiDir, "libloot.so"));

const bindingPath = path.join(lootModule, "binding.gyp");
let binding = readFileSync(bindingPath, "utf8");
if (!binding.includes("OS=='linux'")) {
  binding = binding.replace(
    `"libraries": [
                "-l../loot_api/libloot"
            ],`,
    `"libraries": [],`,
  );
  binding = binding.replace(
    `"conditions": [
              ["OS=='win'", {`,
    `"conditions": [
              ["OS=='linux'", {
                "libraries": [
                  "-L<(module_root_dir)/loot_api",
                  "-lloot"
                ]
              }],
              ["OS=='win'", {`,
  );
  writeFileSync(bindingPath, binding);
}

console.log("Building node-loot native addon...");
run("npm run rebuild", lootModule);

const nodeAddon = path.join(lootModule, "build", "Release", "node-loot.node");
if (!existsSync(nodeAddon)) {
  console.error("node-loot.node was not produced");
  process.exit(1);
}

copyFileSync(nodeAddon, path.join(vendorPrebuild, "node-loot.node"));
copyFileSync(liblootSo, path.join(vendorPrebuild, "libloot.so"));
const versionedSo = liblootSo.includes(".so.") ? liblootSo : `${liblootSo}.0.24.5`;
if (existsSync(versionedSo)) {
  copyFileSync(versionedSo, path.join(vendorPrebuild, "libloot.so.0"));
  copyFileSync(versionedSo, path.join(vendorPrebuild, path.basename(versionedSo)));
}

console.log("Linux LOOT prebuilds written to", vendorPrebuild);
