const { readDb, writeDb, currentUser, readBody, send } = require("../_helpers");

module.exports = async function handler(req, res) {
  const user = currentUser(req);
  if (!user?.isAdmin) return send(res, 403, { error: "Admin required." });
  const { boardId, locked } = await readBody(req);
  const db = readDb();
  db.site.lockedBoards ||= [];
  if (locked && !db.site.lockedBoards.includes(boardId)) db.site.lockedBoards.push(boardId);
  if (!locked) db.site.lockedBoards = db.site.lockedBoards.filter((id) => id !== boardId);
  writeDb(db);
  send(res, 200, { ok: true });
};
