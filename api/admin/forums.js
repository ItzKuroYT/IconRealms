const { readDb, writeDb, currentUser, readBody, send, filterText, validateImages } = require("../_helpers");
const crypto = require("node:crypto");

module.exports = async function handler(req, res) {
  const user = currentUser(req);
  if (!user?.isAdmin) return send(res, 403, { error: "Admin required." });
  const { threadId, action, boardId, title, body, announcement, images } = await readBody(req);
  const db = readDb();

  if (req.method === "POST") {
    if (!boardId || !title || !body) return send(res, 400, { error: "Board, title, and body are required." });
    const thread = {
      id: crypto.randomUUID(),
      boardId,
      title: filterText(String(title || "").slice(0, 140)),
      body: filterText(String(body || "").slice(0, 5000)),
      images: validateImages(images),
      author: user.username,
      announcement: Boolean(announcement || boardId === "announcements"),
      locked: false,
      createdAt: new Date().toISOString(),
      replies: []
    };
    db.threads.unshift(thread);
    writeDb(db);
    return send(res, 200, { ok: true, thread });
  }

  if (req.method === "DELETE" || action === "delete") {
    db.threads = db.threads.filter((item) => item.id !== threadId);
    writeDb(db);
    return send(res, 200, { ok: true });
  }

  const thread = db.threads.find((item) => item.id === threadId);
  if (!thread) return send(res, 404, { error: "Thread not found." });
  if (action === "lock") thread.locked = !thread.locked;
  if (action === "announce") thread.announcement = true;
  writeDb(db);
  send(res, 200, { ok: true });
};
