const net = require("node:net");
const { config, send } = require("../_helpers");

module.exports = async function handler(req, res) {
  try {
    const result = await pingMinecraft(config.brand.serverAddress, 25565, 3500);
    send(res, 200, {
      host: config.brand.serverAddress,
      online: true,
      players: result.players,
      version: result.version
    });
  } catch {
    send(res, 200, {
      host: config.brand.serverAddress,
      online: false,
      players: { online: 0, max: 0 },
      version: null
    });
  }
};

function pingMinecraft(host, port, timeout) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0);
    let finished = false;

    const fail = () => {
      if (finished) return;
      finished = true;
      socket.destroy();
      reject(new Error("offline"));
    };

    socket.setTimeout(timeout, fail);
    socket.on("error", fail);
    socket.on("connect", () => {
      const hostBuffer = Buffer.from(host, "utf8");
      const handshake = concat([
        writeVarInt(0),
        writeVarInt(763),
        writeVarInt(hostBuffer.length),
        hostBuffer,
        Buffer.from([(port >> 8) & 255, port & 255]),
        writeVarInt(1)
      ]);
      socket.write(packet(handshake));
      socket.write(packet(Buffer.from([0])));
    });
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const parsed = parseStatus(buffer);
        if (!parsed) return;
        finished = true;
        socket.end();
        resolve(parsed);
      } catch {
        fail();
      }
    });
  });
}

function parseStatus(buffer) {
  let offset = 0;
  const length = readVarInt(buffer, offset);
  if (!length) return null;
  offset = length.offset;
  if (buffer.length < offset + length.value) return null;
  const packetId = readVarInt(buffer, offset);
  offset = packetId.offset;
  const jsonLength = readVarInt(buffer, offset);
  offset = jsonLength.offset;
  const json = buffer.slice(offset, offset + jsonLength.value).toString("utf8");
  const data = JSON.parse(json);
  return {
    players: data.players || { online: 0, max: 0 },
    version: data.version || null
  };
}

function packet(payload) {
  return concat([writeVarInt(payload.length), payload]);
}

function concat(parts) {
  return Buffer.concat(parts);
}

function writeVarInt(value) {
  const bytes = [];
  do {
    let temp = value & 0b01111111;
    value >>>= 7;
    if (value !== 0) temp |= 0b10000000;
    bytes.push(temp);
  } while (value !== 0);
  return Buffer.from(bytes);
}

function readVarInt(buffer, offset) {
  let value = 0;
  let position = 0;
  let current;
  do {
    if (offset >= buffer.length) return null;
    current = buffer[offset++];
    value |= (current & 0b01111111) << (7 * position);
    position++;
    if (position > 5) throw new Error("VarInt too large");
  } while ((current & 0b10000000) !== 0);
  return { value, offset };
}
