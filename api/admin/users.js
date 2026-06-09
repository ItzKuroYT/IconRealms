const { readDb, writeDb, currentUser, readBody, send } = require("../_helpers");

module.exports = async function handler(req, res) {
  const user = currentUser(req);
  if (!user?.isAdmin) return send(res, 403, { error: "Admin required." });
  const { username, banned } = await readBody(req);
  const db = readDb();
  const account = db.accounts.find((item) => item.username.toLowerCase() === String(username || "").toLowerCase());
  if (!account) return send(res, 404, { error: "User not found." });
  account.banned = Boolean(banned);
  writeDb(db);
  send(res, 200, { ok: true });
};
