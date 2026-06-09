const { readDb, writeDb, currentUser, readBody, send, filterText } = require("../_helpers");

module.exports = async function handler(req, res) {
  const user = currentUser(req);
  if (!user) return send(res, 401, { error: "Login required." });
  const { bio } = await readBody(req);
  const db = readDb();
  const account = db.accounts.find((item) => item.username.toLowerCase() === user.username.toLowerCase());
  if (!account) return send(res, 404, { error: "User not found." });
  account.bio = filterText(String(bio || "").slice(0, 600));
  writeDb(db);
  send(res, 200, { ok: true, bio: account.bio });
};
