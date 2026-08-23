# Linux LOOT prebuilds

Place built artifacts from [Nexus-Mods/node-loot](https://github.com/Nexus-Mods/node-loot) (Linux branch / PR #20) here:

```
prebuilds/linux-x64/node-loot.node
prebuilds/linux-x64/libloot.so
```

Build libloot 0.27.x and node-loot on Linux, then copy the `.node` addon and `libloot.so` into this directory before running `pnpm run build` in `gamebryo-plugin-management`.

The extension patches IPC to use Unix domain sockets under `$TMPDIR` instead of Windows named pipes.
