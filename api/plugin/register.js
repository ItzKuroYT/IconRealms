const { readDb, writeDb, hashPassword, readBody, send, avatar } = require("../_helpers");

module.exports = async function handler(req, res) {
  if (!process.env.PLUGIN_SHARED_SECRET || req.headers["x-icon-register-secret"] !== process.env.PLUGIN_SHARED_SECRET) {
    return send(res, 401, { error: "Plugin secret rejected." });
  }

  const { username, uuid, email, password, rank } = await readBody(req);
  if (!username || !email || !password) {
    return send(res, 400, { error: "Missing username, email, or password." });
  }

  const db = readDb();
  let account = db.accounts.find((item) => item.username.toLowerCase() === username.toLowerCase());
  if (!account) {
    account = { username, createdAt: new Date().toISOString() };
    db.accounts.push(account);
  }
  account.uuid = uuid;
  account.email = email;
  account.passwordHash = hashPassword(password);
  account.avatar = avatar(username, 128);
  account.inGameRegistered = true;
  account.webSignupCompleted = false;
  account.banned = false;
  account.joinedAt ||= account.createdAt || new Date().toISOString();
  account.rank = rank || account.rank || "Member";
  account.lastSeenAt = new Date().toISOString();
  writeDb(db);
  send(res, 200, { ok: true, username });
};
