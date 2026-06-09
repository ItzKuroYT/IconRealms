const crypto = require("node:crypto");
const { readDb, writeDb, currentUser, readBody, send, sameUser, filterText } = require("../_helpers");

module.exports = async function handler(req, res) {
  const user = currentUser(req);
  if (!user) return send(res, 401, { error: "Login required." });
  const { action, username, message } = await readBody(req);
  const db = readDb();
  const me = db.accounts.find((item) => sameUser(item.username, user.username));
  const target = db.accounts.find((item) => sameUser(item.username, username));
  if (!me || !target) return send(res, 404, { error: "User not found." });
  if (sameUser(me.username, target.username)) return send(res, 400, { error: "You cannot target yourself." });

  if (action === "follow") {
    addUnique(me.following, target.username);
    addUnique(target.followers, me.username);
  } else if (action === "unfollow") {
    me.following = me.following.filter((name) => !sameUser(name, target.username));
    target.followers = target.followers.filter((name) => !sameUser(name, me.username));
  } else if (action === "friend-request") {
    addUnique(target.friendRequests, me.username);
  } else if (action === "accept-friend") {
    if (!me.friendRequests.some((name) => sameUser(name, target.username))) {
      return send(res, 403, { error: "No friend request from that user." });
    }
    me.friendRequests = me.friendRequests.filter((name) => !sameUser(name, target.username));
    addUnique(me.friends, target.username);
    addUnique(target.friends, me.username);
  } else if (action === "remove-friend") {
    me.friends = me.friends.filter((name) => !sameUser(name, target.username));
    target.friends = target.friends.filter((name) => !sameUser(name, me.username));
  } else if (action === "dm") {
    if (!me.friends.some((name) => sameUser(name, target.username))) {
      return send(res, 403, { error: "You must be friends to DM." });
    }
    const participants = [me.username, target.username].sort((a, b) => a.localeCompare(b));
    let convo = db.dms.find((dm) => dm.participants.every((name, index) => sameUser(name, participants[index])));
    if (!convo) {
      convo = { id: crypto.randomUUID(), participants, messages: [] };
      db.dms.push(convo);
    }
    convo.messages.push({
      id: crypto.randomUUID(),
      from: me.username,
      body: filterText(String(message || "").slice(0, 1000)),
      createdAt: new Date().toISOString()
    });
  } else {
    return send(res, 400, { error: "Unknown action." });
  }

  writeDb(db);
  send(res, 200, { ok: true });
};

function addUnique(list, value) {
  if (!list.some((item) => sameUser(item, value))) list.push(value);
}
