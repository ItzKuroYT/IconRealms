const { readDb, writeDb, currentUser, readBody, send, avatar } = require("../_helpers");

module.exports = async function handler(req, res) {
  const user = currentUser(req);
  if (!user?.isAdmin) return send(res, 403, { error: "Admin required." });
  const body = await readBody(req);
  const db = readDb();

  if (req.method === "DELETE") {
    db.staff = db.staff.filter((item) => item.username.toLowerCase() !== String(body.username || "").toLowerCase());
  } else {
    const staffer = {
      username: body.username,
      rank: body.rank,
      bio: body.bio || "",
      friends: body.friends || [],
      avatar: body.avatar || avatar(body.username, 128)
    };
    const existing = db.staff.find((item) => item.username.toLowerCase() === staffer.username.toLowerCase());
    if (existing) Object.assign(existing, staffer);
    else db.staff.push(staffer);
  }
  writeDb(db);
  send(res, 200, { ok: true, staff: db.staff });
};
