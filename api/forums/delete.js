const { readDb, writeDb, currentUser, readBody, send, sameUser } = require("../_helpers");

module.exports = async function handler(req, res) {
  const user = currentUser(req);
  if (!user) return send(res, 401, { error: "Login required." });
  const { threadId } = await readBody(req);
  const db = readDb();
  const thread = db.threads.find((item) => item.id === threadId);
  if (!thread) return send(res, 404, { error: "Thread not found." });
  if (!user.isAdmin && !sameUser(thread.author, user.username)) {
    return send(res, 403, { error: "You can only delete your own posts." });
  }
  db.threads = db.threads.filter((item) => item.id !== threadId);
  writeDb(db);
  send(res, 200, { ok: true });
};
