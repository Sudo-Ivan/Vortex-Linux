<p align="center">
  <img src=".github/assets/github_readme_title.png" alt="Vortex Mod Manager title banner"/>
</p>

<p align="center">
<strong>Vortex-Linux</strong> — Linux fork by
<a href="https://github.com/Sudo-Ivan">Sudo-Ivan</a>
<br/>
Upstream:
<a href="https://github.com/Nexus-Mods/Vortex">Nexus-Mods/Vortex</a>
</p>

<p align="center">
<a href="https://github.com/Sudo-Ivan/Vortex-Linux/releases"><img src="https://img.shields.io/github/v/release/Sudo-Ivan/Vortex-Linux?include_prereleases&style=for-the-badge&label=Linux%20releases" alt="Linux releases"></a>
<a href="https://github.com/Sudo-Ivan/Vortex-Linux/actions/workflows/package-linux.yml"><img src="https://img.shields.io/github/actions/workflow/status/Sudo-Ivan/Vortex-Linux/package-linux.yml?style=for-the-badge&label=Package%20Linux" alt="Package Linux"></a>
<a href="https://github.com/Nexus-Mods/Vortex"><img src="https://img.shields.io/badge/upstream-Nexus--Mods%2FVortex-orange?style=for-the-badge" alt="Upstream Vortex"></a>
</p>

<p align="center">
<a href="https://discord.gg/nexusmods"><img src="https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord"></a>
<a href="https://twitter.com/nexussites"><img src="https://img.shields.io/badge/twitter-000000?style=for-the-badge&logo=x&logoColor=white" alt="X (formally Twitter)"></a>
<a href="https://www.youtube.com/c/NexusModsYT"><img src="https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="YouTube"></a>
<a href="https://www.reddit.com/r/nexusmods/"><img src="https://img.shields.io/badge/Reddit-FF4500?style=for-the-badge&logo=reddit&logoColor=white" alt="Reddit"></a>
</p>

## This is a fork

**[Sudo-Ivan/Vortex-Linux](https://github.com/Sudo-Ivan/Vortex-Linux)** is an unofficial Linux-oriented fork of [Nexus-Mods/Vortex](https://github.com/Nexus-Mods/Vortex).

- Linux packaging and CI live here
- Issues for Linux builds, Flatpak, AppImage, and fork CI belong **in this repo**
- Upstream Windows releases and general Vortex product support remain with Nexus Mods

This fork is not affiliated with or endorsed by Nexus Mods / Black Tree Gaming Ltd.

## What this fork changes

Ship-and-run focus: build, start, and distribute Vortex on Linux while keeping deltas easy to merge from upstream.

| Area | Change |
| --- | --- |
| Packaging | `pnpm run package:linux` builds **zip** + **AppImage** |
| electron-builder | Linux targets, artifact names, publish to this fork |
| Dist prepare | Platform-safe `extraResources` (Windows redistributables not required on Linux) |
| CI | `.github/workflows/package-linux.yml` + `.github/actions/package-linux/` |
| Flatpak | Prebuilt assemble from `linux-unpacked` (not broken offline yarn source build) |
| Fork CI | Bundled-actions rebuild falls back to `GITHUB_TOKEN` when Nexus App secrets are absent |
| GitLab | Stale `build:all` / `lint:ci` scripts mapped to `build` / `lint` |
| Docs | Linux install, packaging, and upstream-sync notes |

### Explicit non-goals (for now)

- Full Windows feature parity (LOOT/BSA natives, GOG/Origin/Xbox store discovery, UAC elevation)
- Publishing to Nexus R2 or Nexus-Mods/Vortex releases
- Flathub submission (local/CI `.flatpak` bundles only)

Upstream already includes Linux path helpers, Steam/Proton support, and Ubuntu CI build/test. This fork concentrates on **shipping** Linux artifacts.

## Introduction

Vortex is the current mod manager from Nexus Mods. It is designed to make modding your game as simple as possible for new users, while still providing enough control for more experienced veterans of the modding scene.

Our approach with Vortex aims to take complex tasks such as sorting your load order or managing your mod files and automate as much of the process as possible with the goal of having you achieve a stable modded game with minimal effort. We want to help you spend less time modding and more time playing your games.

## Features

- **Multi-game Support** - with mod support for over 250 different games and counting, Vortex is the most versatile mod manager available. This includes games such as [Skyrim](https://www.nexusmods.com/skyrimspecialedition), [Fallout 3](https://www.nexusmods.com/fallout3), [Fallout 4](https://www.nexusmods.com/fallout4), [Fallout: New Vegas](https://www.nexusmods.com/newvegas/), [Cyberpunk 2077](https://www.nexusmods.com/cyberpunk2077/), [Baldur's Gate 3](https://www.nexusmods.com/baldursgate3/), [Starfield](https://www.nexusmods.com/starfield/), [Stardew Valley](https://www.nexusmods.com/stardewvalley/), [Bannerlord](https://www.nexusmods.com/mountandblade2bannerlord), [Witcher 3](https://www.nexusmods.com/witcher3), [Elden Ring](https://www.nexusmods.com/eldenring), [The Sims 4](https://www.nexusmods.com/thesims4), [Monster Hunter: World](https://www.nexusmods.com/monsterhunterworld), [Oblivion](https://www.nexusmods.com/oblivion), [Palworld](https://www.nexusmods.com/palworld), [Blade & Sorcery](https://www.nexusmods.com/bladeandsorcery), [Valheim](https://www.nexusmods.com/valheim), [Hogwarts Legacy](https://www.nexusmods.com/hogwartslegacy/), [7 Days to Die](https://www.nexusmods.com/7daystodie/).

- **Close integration with Nexus Mods** - Vortex is designed to seamlessly interact with Nexus Mods, allowing you to easily find, install, and play mods from our site, learn about new files and catch the latest news.

- **Modding made easy** - The built-in auto-sorting system manages your load order and helps you to resolve mod conflicts with powerful, yet easy to use plugin management features.

- **Mod Profiles** - Easily set up, switch between, and manage independent mod profiles, enabling you to use exactly the combination of mods that you want for a particular playthrough.

- **Modern, Easy-to-use UI** - Featuring a fully customisable interface, Vortex allows you to quickly and easily access tools and manage your games, plugins, downloads and save games.

- **Extensions and Plugins** - Vortex is released under a GPL-3.0 License, giving our community the ability to write extensions and frameworks which can then interact with Vortex, continually adding to its functionality.

## Getting started on Linux

### Download

When available, use [GitHub Releases](https://github.com/Sudo-Ivan/Vortex-Linux/releases) for zip / AppImage / Flatpak from this fork.

Or run the **Package Linux** workflow: [Actions → Package Linux](https://github.com/Sudo-Ivan/Vortex-Linux/actions/workflows/package-linux.yml).

### Build from source

```bash
pnpm install
pnpm run build
pnpm run start
```

Package zip + AppImage:

```bash
pnpm run package:linux
```

Flatpak from that build:

```bash
python3 flatpak/scripts/flatpak_bundle_prebuilt.py \
  --prebuilt dist/linux-unpacked \
  --version <version> \
  --output dist/vortex-<version>.flatpak
```

More detail: [CONTRIBUTE.md](CONTRIBUTE.md), [docs/packaging/flatpak.md](docs/packaging/flatpak.md), distro guides under `docs/install-instructions/`.

### Upstream Windows builds

Official Windows installers remain at [Nexus Mods](https://www.nexusmods.com/site/mods/1?tab=files) and [upstream GitHub releases](https://github.com/Nexus-Mods/Vortex/releases/latest).

## Upstream sync

This fork is meant to stay close to Nexus-Mods/Vortex:

```bash
git remote add upstream https://github.com/Nexus-Mods/Vortex.git
git fetch upstream
git merge upstream/master
```

After a merge, re-check fork-owned paths:

- `.github/workflows/package-linux.yml`
- `.github/actions/package-linux/`
- `.github/workflows/actions-check.yml` (GITHUB_TOKEN fallback)
- `package:linux` in root `package.json` and `src/main/package.json`
- `src/main/electron-builder.config.json` (Linux targets / publish)
- `src/main/prepare-dist-package.mjs` (platform `extraResources`)
- `flatpak/com.nexusmods.vortex.prebuilt.yaml`
- `flatpak/scripts/flatpak_bundle_prebuilt.py`
- `.gitlab-ci.yml` script names
- README / Flatpak docs for this fork

## Resources

- [This fork](https://github.com/Sudo-Ivan/Vortex-Linux) — Linux packages, Flatpak, fork CI, Linux issues
- [Upstream Vortex](https://github.com/Nexus-Mods/Vortex) — source history and Windows releases
- [Download Vortex (Windows)](https://www.nexusmods.com/site/mods/1?tab=files) from Nexus Mods
- [Vortex Forum](https://forums.nexusmods.com/index.php?/forum/4306-vortex-support/) or [Discord](https://discord.gg/nexusmods)
- [Vortex Wiki](https://github.com/Nexus-Mods/Vortex/wiki)

## Contributing

- **Linux packaging / Flatpak / this fork's CI:** open issues and PRs on [Sudo-Ivan/Vortex-Linux](https://github.com/Sudo-Ivan/Vortex-Linux/issues)
- **General Vortex bugs and features:** prefer upstream [Nexus-Mods/Vortex](https://github.com/Nexus-Mods/Vortex/issues) when the issue is not Linux-packaging specific

Setup and local development: [CONTRIBUTE.md](CONTRIBUTE.md).

## License

This project is licensed under the [GPL-3.0](https://github.com/Nexus-Mods/Vortex/blob/master/LICENSE.md) license.
