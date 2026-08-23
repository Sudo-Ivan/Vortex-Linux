const net = require("net");
const os = require("os");
const path = require("path");

function lootIpcPath(id) {
  if (process.platform === "win32") {
    return `\\\\?\\pipe\\loot-ipc-${id}`;
  }
  return path.join(os.tmpdir(), `loot-ipc-${id}.sock`);
}

const { Loot, SetErrorLanguageEN, SetLogLevel } = require("./build/Release/node-loot");

process.on("uncaughtException", (error) => {
  console.error(error.message);
  process.exit(1);
});

const CHUNK_SIZE = 32 * 1024;

let currentLogLevel = 2;

const client = net.connect(lootIpcPath(process.argv[2]), () => {
  let instance;
  let dataBuffer = "";

  function send(args) {
    const message = JSON.stringify(args) + "\uFFFF";
    for (let i = 0; i < message.length; i += CHUNK_SIZE) {
      client.write(message.slice(i, i + CHUNK_SIZE));
    }
  }

  function handleEvent(event) {
    let result;
    try {
      if (event.type === "init") {
        SetErrorLanguageEN();
        instance = new Loot(...event.args, logCallback);
      } else if (event.type === "setLogLevel") {
        currentLogLevel = event.args[0];
        SetLogLevel(event.args[0]);
      } else if (event.type === "terminate") {
        send({});
        process.exit(0);
      } else {
        if (event.type === "loadPlugins") {
          SetLogLevel(4);
          result = instance[event.type](...event.args);
          SetLogLevel(currentLogLevel);
        } else {
          result = instance[event.type](...event.args);
        }
      }
      send({ result });
    } catch (error) {
      send({ error: error.message, extraArgs: JSON.stringify(error) });
    }
  }

  function logCallback(level, message) {
    if (level >= currentLogLevel) {
      send({ log: { level, message } });
    }
  }

  client.on("data", (buffer) => {
    dataBuffer += buffer.toString();
    const messages = dataBuffer.split("\uFFFF");
    if (!dataBuffer.endsWith("\uFFFF")) {
      dataBuffer = messages.pop();
    } else {
      dataBuffer = "";
    }
    for (const msg of messages) {
      if (msg.length > 0) {
        handleEvent(JSON.parse(msg));
      }
    }
  });

  send({ result: null });
});
