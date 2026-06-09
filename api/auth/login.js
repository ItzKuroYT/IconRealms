const { readDb, verifyPassword, publicAccount, setSession, readBody, send } = require("../_helpers");

module.exports = async function handler(req, res) {
  const { username, password } = await readBody(req);
  const account = readDb().accounts.find((item) => item.username.toLowerCase() === String(username || "").toLowerCase());
  if (!account || account.banned || !account.inGameRegistered || !verifyPassword(password || "", account.passwordHash)) {
    return send(res, 401, { error: "Invalid login, banned account, or no in-game registration." });
  }
  setSession(res, account.username);
  send(res, 200, { ok: true, user: publicAccount(account) });
};
