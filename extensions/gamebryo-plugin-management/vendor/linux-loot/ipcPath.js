const os = require("node:os");
const path = require("node:path");

function lootIpcPath(id) {
  if (process.platform === "win32") {
    return `\\\\?\\pipe\\loot-ipc-${id}`;
  }
  return path.join(os.tmpdir(), `loot-ipc-${id}.sock`);
}

module.exports = { lootIpcPath };
