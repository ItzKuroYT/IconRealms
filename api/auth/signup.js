const { readDb, writeDb, hashPassword, setSession, readBody, send, avatar } = require("../_helpers");

module.exports = async function handler(req, res) {
  const { username, email, password } = await readBody(req);
  if (!username || !email || !password || password.length < 8) {
    return send(res, 400, { error: "Username, email, and an 8+ character password are required." });
  }

  const db = readDb();
  const account = db.accounts.find((item) => item.username.toLowerCase() === username.toLowerCase());
  if (!account || !account.inGameRegistered) {
    return send(res, 403, { error: "Register in-game first with /register <email> <password>." });
  }
  if (account.banned) return send(res, 403, { error: "This account is banned." });

  account.email = email;
  account.passwordHash = hashPassword(password);
  account.avatar = avatar(username, 128);
  account.webSignupCompleted = true;
  writeDb(db);
  setSession(res, account.username);
  send(res, 200, { ok: true });
};
