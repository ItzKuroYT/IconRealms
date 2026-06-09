const { readDb, writeDb, readBody, send, avatar } = require("../_helpers");

module.exports = async function handler(req, res) {
  if (!process.env.PLUGIN_SHARED_SECRET || req.headers["x-icon-register-secret"] !== process.env.PLUGIN_SHARED_SECRET) {
    return send(res, 401, { error: "Plugin secret rejected." });
  }
  const { serverName, players } = await readBody(req);
  const db = readDb();
  const now = new Date().toISOString();
  const onlineNames = new Set((players || []).map((player) => String(player.username || "").toLowerCase()));

  for (const player of players || []) {
    if (!player.username) continue;
    let account = db.accounts.find((item) => item.username.toLowerCase() === player.username.toLowerCase());
    if (!account) {
      account = {
        username: player.username,
        uuid: player.uuid,
        email: "",
        passwordHash: "",
        avatar: avatar(player.username, 128),
        inGameRegistered: false,
        createdAt: now,
        joinedAt: now
      };
      db.accounts.push(account);
    }
    account.uuid = player.uuid || account.uuid;
    account.rank = player.rank || account.rank || "Member";
    account.online = true;
    account.serverName = serverName || "server";
    account.lastServer = serverName || account.lastServer || "server";
    account.lastSeenAt = now;
  }

  for (const account of db.accounts) {
    if (account.online && account.serverName === serverName && !onlineNames.has(account.username.toLowerCase())) {
      account.online = false;
      account.lastServer = serverName || account.lastServer;
      account.lastSeenAt = now;
    }
  }

  writeDb(db);
  send(res, 200, { ok: true });
};
