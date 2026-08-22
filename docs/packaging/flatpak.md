# Flatpak Packaging

Use this page when you need to build, install, or bundle the Flatpak package for **Sudo-Ivan/Vortex-Linux**.

## Recommended: prebuilt assembly (this fork)

This fork's supported Flatpak path packages an already-built
`linux-unpacked` tree from `pnpm run package:linux` (or the Linux package CI job).
That avoids offline yarn/pnpm source generation inside Flatpak.

```bash
# After package:linux has produced dist/linux-unpacked
python3 flatpak/scripts/flatpak_bundle_prebuilt.py \
  --prebuilt dist/linux-unpacked \
  --version 2.x.y \
  --output dist/vortex-2.x.y.flatpak
```

CI: `.github/workflows/package-linux.yml` can build zip + AppImage, then assemble
the Flatpak bundle from the uploaded `linux-unpacked` artifact.

Manifest: `flatpak/com.nexusmods.vortex.prebuilt.yaml`

## Flatpak Basics (Linux Packaging)

These dependencies are only required if you are building the Flatpak package.

### Requirements

- `flatpak`
- `flatpak-builder`
- `appstream` for AppStream metadata validation via `appstreamcli`

### Example Installs (Linux)

- Ubuntu or Debian: `sudo apt install flatpak flatpak-builder appstream`
- Fedora: `sudo dnf install flatpak flatpak-builder appstream`
- Arch Linux: `sudo pacman -S flatpak flatpak-builder appstream`
- NixOS: Included in `nix develop` through [Nix flake]

> [!note]
> There is an additional Python-based dependency,
> `flatpak-node-generator`, but the scripts in `flatpak/scripts/`
> automatically install it for you when using the full-source path.
> The Flathub remote is also added automatically if missing.

## Full-source Flatpak (secondary)

> [!WARNING]
> The full-source Flatpak path (`flatpak/com.nexusmods.vortex.yaml`) still
> expects yarn-era install/build scripts and is not the release path for this
> fork. Prefer the prebuilt assembly above.

### First-Time Setup

Make sure submodules are available before a full-source Flatpak build:

```bash
git submodule update --init --recursive
```

### Quick Development Test

```bash
python3 flatpak/scripts/flatpak_build.py
python3 flatpak/scripts/flatpak_run.py
```

### Install Into A Local Repo

```bash
python3 flatpak/scripts/flatpak_install.py
```

### Create A Bundle (full-source)

```bash
python3 flatpak/scripts/flatpak_bundle.py
```

## Further Reading

- [Flatpak maintenance] for the full workflow and troubleshooting
- [Flatpak technical notes] for manifest and runtime details
- [Flatpak documentation]

[Flatpak documentation]: https://docs.flatpak.org/en/latest/
[Flatpak maintenance]: ../flatpak/maintenance.md
[Flatpak technical notes]: ../flatpak/technical.md
[Nix flake]: ../../flake.nix
