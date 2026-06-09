const crypto = require("node:crypto");
const { readDb, writeDb, publicState, currentUser, readBody, send, filterText, validateImages } = require("../_helpers");

module.exports = async function handler(req, res) {
  const user = currentUser(req);
  if (!user) return send(res, 401, { error: "Login required." });
  const { boardId, title, body, announcement, images } = await readBody(req);
  const board = publicState(user).boards.find((item) => item.id === boardId);
  if (!board || board.locked) return send(res, 403, { error: "Board is locked." });

  const db = readDb();
  const thread = {
    id: crypto.randomUUID(),
    boardId,
    title: filterText(String(title || "").slice(0, 140)),
    body: filterText(String(body || "").slice(0, 5000)),
    images: validateImages(images),
    author: user.username,
    announcement: Boolean(announcement && user.isAdmin),
    locked: false,
    createdAt: new Date().toISOString(),
    replies: []
  };
  db.threads.unshift(thread);
  writeDb(db);
  send(res, 200, { ok: true, thread });
};
