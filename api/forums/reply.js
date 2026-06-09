const crypto = require("node:crypto");
const { readDb, writeDb, currentUser, readBody, send, filterText, validateImages } = require("../_helpers");

module.exports = async function handler(req, res) {
  const user = currentUser(req);
  if (!user) return send(res, 401, { error: "Login required." });
  const { threadId, body, images } = await readBody(req);
  const db = readDb();
  const thread = db.threads.find((item) => item.id === threadId);
  if (!thread || thread.locked) return send(res, 403, { error: "Thread is locked." });
  thread.replies ||= [];
  thread.replies.push({
    id: crypto.randomUUID(),
    body: filterText(String(body || "").slice(0, 3000)),
    images: validateImages(images),
    author: user.username,
    createdAt: new Date().toISOString()
  });
  writeDb(db);
  send(res, 200, { ok: true });
};
