const crypto = require("node:crypto");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const config = require("../config.js");

const dbPath = process.env.JSON_DB_PATH || (process.env.VERCEL ? "/tmp/iconrealms-db.json" : path.join(process.cwd(), "data", "db.json"));
const cookieName = "iconrealms_session";

async function handleApi(req, res) {
  try {
    if (!applyCors(req, res)) return;
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }
    const route = routePath(req);
    if (route === "store") return redirect(res, config.brand.tebexUrl);
    if (route === "state") return send(res, 200, await publicState(await currentUser(req)));
    if (route === "server/status") return serverStatus(res);
    if (route === "auth/login") return login(req, res);
    if (route === "auth/signup") return signup(req, res);
    if (route === "auth/logout") return logout(res);
    if (route === "plugin/register") return pluginRegister(req, res);
    if (route === "plugin/heartbeat") return pluginHeartbeat(req, res);
    if (route === "forums/threads") return createThread(req, res);
    if (route === "forums/reply") return createReply(req, res);
    if (route === "forums/delete") return deleteThread(req, res);
    if (route === "admin/staff") return adminStaff(req, res);
    if (route === "admin/boards") return adminBoards(req, res);
    if (route === "admin/forums") return adminForums(req, res);
    if (route === "admin/users") return adminUsers(req, res);
    if (route === "user/profile") return saveProfile(req, res);
    if (route === "user/social") return social(req, res);
    return send(res, 404, { error: "API route not found." });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: `Server error: ${error.message || "unknown error"}` });
  }
}

function routePath(req) {
  const url = new URL(req.url, "http://localhost");
  const queryPath = url.searchParams.get("path");
  if (queryPath) return queryPath.replace(/^\/+|\/+$/g, "");
  return url.pathname.replace(/^\/api\/?/, "").replace(/^index\/?/, "").replace(/^\/+|\/+$/g, "");
}

function seedData() {
  return {
    accounts: [],
    threads: [],
    staff: config.defaultStaff.map((person) => ({ ...person, avatar: avatar(person.username, 128) })),
    dms: [],
    site: { lockedBoards: [] }
  };
}

async function readDb() {
  if (useGithubDb()) return readGithubDb();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) await writeDb(seedData());
  try {
    return normalize(JSON.parse(fs.readFileSync(dbPath, "utf8")));
  } catch {
    return normalize(seedData());
  }
}

async function writeDb(data) {
  const normalized = normalize(data);
  if (useGithubDb()) {
    await writeGithubDb(normalized);
    return;
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(normalized, null, 2));
}

let githubDbCache = { data: null, sha: null, loadedAt: 0 };

function useGithubDb() {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

async function readGithubDb() {
  if (githubDbCache.data && Date.now() - githubDbCache.loadedAt < 5000) return cloneJson(githubDbCache.data);
  const res = await fetch(githubDbUrl(), { headers: githubHeaders() });
  if (res.status === 404) {
    const data = normalize(seedData());
    githubDbCache = { data, sha: null, loadedAt: Date.now() };
    return cloneJson(data);
  }
  if (!res.ok) throw new Error(`GitHub DB read failed (${res.status})`);
  const payload = await res.json();
  const content = Buffer.from(String(payload.content || "").replace(/\n/g, ""), "base64").toString("utf8");
  const data = normalize(JSON.parse(content || "{}"));
  githubDbCache = { data, sha: payload.sha, loadedAt: Date.now() };
  return cloneJson(data);
}

async function writeGithubDb(data, retry = true) {
  if (!githubDbCache.sha) await readGithubDb();
  const body = {
    message: "Update IconRealms JSON database",
    content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64"),
    branch: githubBranch()
  };
  if (githubDbCache.sha) body.sha = githubDbCache.sha;
  const res = await fetch(githubDbUrl(), {
    method: "PUT",
    headers: githubHeaders(),
    body: JSON.stringify(body)
  });
  if (res.status === 409 && retry) {
    githubDbCache = { data: null, sha: null, loadedAt: 0 };
    return writeGithubDb(data, false);
  }
  if (!res.ok) throw new Error(`GitHub DB write failed (${res.status})`);
  const payload = await res.json();
  githubDbCache = { data: cloneJson(data), sha: payload.content?.sha || githubDbCache.sha, loadedAt: Date.now() };
}

function githubDbUrl() {
  const repo = process.env.GITHUB_REPO;
  const filePath = process.env.GITHUB_DB_PATH || "data/iconrealms-db.json";
  return `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(filePath).replace(/%2F/g, "/")}?ref=${encodeURIComponent(githubBranch())}`;
}

function githubBranch() {
  return process.env.GITHUB_BRANCH || "main";
}

function githubHeaders() {
  return {
    "accept": "application/vnd.github+json",
    "authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
    "content-type": "application/json",
    "user-agent": "IconRealms-Website"
  };
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalize(data) {
  data.accounts ||= [];
  data.threads ||= data.forums?.threads || [];
  data.staff = data.staff?.length ? data.staff : seedData().staff;
  if (data.staff.some((person) => String(person.username || "").endsWith("Placeholder"))) data.staff = seedData().staff;
  data.dms ||= [];
  data.site ||= {};
  data.site.lockedBoards ||= [];
  data.threads = data.threads
    .filter((thread) => thread.id !== "announcement-placeholder")
    .filter((thread) => thread.id !== "welcome-launch" && thread.author !== "Eimoh" && thread.title !== "New Website + Lifesteal Season Launch!")
    .map(normalizeThread);
  data.accounts.forEach((account) => {
    account.avatar ||= avatar(account.username, 128);
    account.bio ||= "";
    account.rank ||= "Member";
    account.joinedAt ||= account.createdAt || new Date().toISOString();
    account.following ||= [];
    account.followers ||= [];
    account.friends ||= [];
    account.friendRequests ||= [];
    account.online ||= false;
    account.serverName ||= "";
    account.lastServer ||= "";
    account.lastSeenAt ||= account.createdAt || new Date().toISOString();
    if (account.online && Date.now() - new Date(account.lastSeenAt).getTime() > 90000) account.online = false;
  });
  data.staff.forEach((person) => {
    person.avatar ||= avatar(person.username, 128);
    person.friends ||= [];
  });
  return data;
}

async function publicState(user) {
  const db = await readDb();
  const locked = db.site.lockedBoards;
  return {
    user,
    categories: config.forumCategories,
    boards: config.forumBoards.map((board) => ({ ...board, locked: board.locked || locked.includes(board.id) })),
    threads: db.threads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    staff: db.staff,
    users: db.accounts.map(publicProfile),
    dms: user ? db.dms.filter((dm) => dm.participants.some((name) => sameUser(name, user.username))) : [],
    accounts: user?.isAdmin ? db.accounts.map(({ passwordHash, ...account }) => account) : []
  };
}

async function login(req, res) {
  const { username, password } = await readBody(req);
  const account = (await readDb()).accounts.find((item) => sameUser(item.username, username));
  if (!account || account.banned || !account.inGameRegistered || !verifyPassword(password || "", account.passwordHash)) {
    return send(res, 401, { error: "Invalid login, banned account, or no in-game registration." });
  }
  setSession(res, account.username);
  send(res, 200, { ok: true, user: publicAccount(account) });
}

async function signup(req, res) {
  const { username, email, password } = await readBody(req);
  if (!username || !email || !password || password.length < 8) return send(res, 400, { error: "Username, email, and an 8+ character password are required." });
  const db = await readDb();
  const account = db.accounts.find((item) => sameUser(item.username, username));
  if (!account || !account.inGameRegistered) return send(res, 403, { error: "No in-game registration was found. Run /register <email> <password> in-game first. If it already said registered, use the Login page with that same password." });
  if (account.banned) return send(res, 403, { error: "This account is banned." });
  account.email = email;
  account.passwordHash = hashPassword(password);
  account.avatar = avatar(username, 128);
  account.webSignupCompleted = true;
  await writeDb(db);
  setSession(res, account.username);
  send(res, 200, { ok: true });
}

function logout(res) {
  clearSession(res);
  send(res, 200, { ok: true });
}

async function pluginRegister(req, res) {
  if (!validPlugin(req)) return send(res, 401, { error: "Plugin secret rejected." });
  const { username, uuid, email, password, rank } = await readBody(req);
  if (!username || !email || !password) return send(res, 400, { error: "Missing username, email, or password." });
  const db = await readDb();
  let account = db.accounts.find((item) => sameUser(item.username, username));
  if (!account) {
    account = { username, createdAt: new Date().toISOString() };
    db.accounts.push(account);
  }
  account.uuid = uuid;
  account.email = email;
  account.passwordHash = hashPassword(password);
  account.avatar = avatar(username, 128);
  account.inGameRegistered = true;
  account.webSignupCompleted = false;
  account.banned = false;
  account.joinedAt ||= account.createdAt || new Date().toISOString();
  account.rank = rank || account.rank || "Member";
  account.lastSeenAt = new Date().toISOString();
  await writeDb(db);
  send(res, 200, { ok: true, username });
}

async function pluginHeartbeat(req, res) {
  if (!validPlugin(req)) return send(res, 401, { error: "Plugin secret rejected." });
  const { serverName, players } = await readBody(req);
  const db = await readDb();
  const now = new Date().toISOString();
  const onlineNames = new Set((players || []).map((player) => String(player.username || "").toLowerCase()));
  for (const player of players || []) {
    if (!player.username) continue;
    let account = db.accounts.find((item) => sameUser(item.username, player.username));
    if (!account) {
      account = { username: player.username, uuid: player.uuid, email: "", passwordHash: "", avatar: avatar(player.username, 128), inGameRegistered: false, createdAt: now, joinedAt: now };
      db.accounts.push(account);
    }
    account.uuid = player.uuid || account.uuid;
    account.rank = player.rank || account.rank || "Member";
    account.online = true;
    account.serverName = serverName || "server";
    account.lastServer = serverName || account.lastServer || "server";
    account.lastSeenAt = now;
  }
  for (const account of db.accounts) {
    if (account.online && account.serverName === serverName && !onlineNames.has(account.username.toLowerCase())) {
      account.online = false;
      account.lastServer = serverName || account.lastServer;
      account.lastSeenAt = now;
    }
  }
  await writeDb(db);
  send(res, 200, { ok: true });
}

async function createThread(req, res) {
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: "Login required." });
  const { boardId, title, body, announcement, images } = await readBody(req);
  const board = (await publicState(user)).boards.find((item) => item.id === boardId);
  if (!board || board.locked) return send(res, 403, { error: "Board is locked." });
  const db = await readDb();
  const thread = makeThread({ boardId, title, body, images, author: user.username, announcement: Boolean(announcement && user.isAdmin) });
  db.threads.unshift(thread);
  await writeDb(db);
  send(res, 200, { ok: true, thread });
}

async function createReply(req, res) {
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: "Login required." });
  const { threadId, body, images } = await readBody(req);
  const db = await readDb();
  const thread = db.threads.find((item) => item.id === threadId);
  if (!thread || thread.locked) return send(res, 403, { error: "Thread is locked." });
  thread.replies ||= [];
  thread.replies.push({ id: crypto.randomUUID(), body: filterText(String(body || "").slice(0, 3000)), images: validateImages(images), author: user.username, createdAt: new Date().toISOString() });
  await writeDb(db);
  send(res, 200, { ok: true });
}

async function deleteThread(req, res) {
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: "Login required." });
  const { threadId } = await readBody(req);
  const db = await readDb();
  const thread = db.threads.find((item) => item.id === threadId);
  if (!thread) return send(res, 404, { error: "Thread not found." });
  if (!user.isAdmin && !sameUser(thread.author, user.username)) return send(res, 403, { error: "You can only delete your own posts." });
  db.threads = db.threads.filter((item) => item.id !== threadId);
  await writeDb(db);
  send(res, 200, { ok: true });
}

async function adminStaff(req, res) {
  const user = await currentUser(req);
  if (!user?.isAdmin) return send(res, 403, { error: "Admin required." });
  const body = await readBody(req);
  const db = await readDb();
  if (req.method === "DELETE") {
    db.staff = db.staff.filter((item) => !sameUser(item.username, body.username));
  } else {
    const staffer = { username: body.username, rank: body.rank, bio: body.bio || "", friends: body.friends || [], avatar: body.avatar || avatar(body.username, 128) };
    const existing = db.staff.find((item) => sameUser(item.username, staffer.username));
    if (existing) Object.assign(existing, staffer);
    else db.staff.push(staffer);
  }
  await writeDb(db);
  send(res, 200, { ok: true, staff: db.staff });
}

async function adminBoards(req, res) {
  const user = await currentUser(req);
  if (!user?.isAdmin) return send(res, 403, { error: "Admin required." });
  const { boardId, locked } = await readBody(req);
  const db = await readDb();
  db.site.lockedBoards ||= [];
  if (locked && !db.site.lockedBoards.includes(boardId)) db.site.lockedBoards.push(boardId);
  if (!locked) db.site.lockedBoards = db.site.lockedBoards.filter((id) => id !== boardId);
  await writeDb(db);
  send(res, 200, { ok: true });
}

async function adminForums(req, res) {
  const user = await currentUser(req);
  if (!user?.isAdmin) return send(res, 403, { error: "Admin required." });
  const { threadId, action, boardId, title, body, announcement, images } = await readBody(req);
  const db = await readDb();
  if (req.method === "POST") {
    if (!boardId || !title || !body) return send(res, 400, { error: "Board, title, and body are required." });
    const thread = makeThread({ boardId, title, body, images, author: user.username, announcement: Boolean(announcement || boardId === "announcements") });
    db.threads.unshift(thread);
    await writeDb(db);
    return send(res, 200, { ok: true, thread });
  }
  if (req.method === "DELETE" || action === "delete") {
    db.threads = db.threads.filter((item) => item.id !== threadId);
    await writeDb(db);
    return send(res, 200, { ok: true });
  }
  const thread = db.threads.find((item) => item.id === threadId);
  if (!thread) return send(res, 404, { error: "Thread not found." });
  if (action === "lock") thread.locked = !thread.locked;
  if (action === "announce") thread.announcement = true;
  await writeDb(db);
  send(res, 200, { ok: true });
}

async function adminUsers(req, res) {
  const user = await currentUser(req);
  if (!user?.isAdmin) return send(res, 403, { error: "Admin required." });
  const { username, banned } = await readBody(req);
  const db = await readDb();
  const account = db.accounts.find((item) => sameUser(item.username, username));
  if (!account) return send(res, 404, { error: "User not found." });
  account.banned = Boolean(banned);
  await writeDb(db);
  send(res, 200, { ok: true });
}

async function saveProfile(req, res) {
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: "Login required." });
  const { bio } = await readBody(req);
  const db = await readDb();
  const account = db.accounts.find((item) => sameUser(item.username, user.username));
  if (!account) return send(res, 404, { error: "User not found." });
  account.bio = filterText(String(bio || "").slice(0, 600));
  await writeDb(db);
  send(res, 200, { ok: true, bio: account.bio });
}

async function social(req, res) {
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: "Login required." });
  const { action, username, message } = await readBody(req);
  const db = await readDb();
  const me = db.accounts.find((item) => sameUser(item.username, user.username));
  const target = db.accounts.find((item) => sameUser(item.username, username));
  if (!me || !target) return send(res, 404, { error: "User not found." });
  if (sameUser(me.username, target.username)) return send(res, 400, { error: "You cannot target yourself." });
  if (action === "follow") { addUnique(me.following, target.username); addUnique(target.followers, me.username); }
  else if (action === "unfollow") { me.following = me.following.filter((n) => !sameUser(n, target.username)); target.followers = target.followers.filter((n) => !sameUser(n, me.username)); }
  else if (action === "friend-request") addUnique(target.friendRequests, me.username);
  else if (action === "accept-friend") {
    if (!me.friendRequests.some((n) => sameUser(n, target.username))) return send(res, 403, { error: "No friend request from that user." });
    me.friendRequests = me.friendRequests.filter((n) => !sameUser(n, target.username));
    addUnique(me.friends, target.username); addUnique(target.friends, me.username);
  } else if (action === "remove-friend") {
    me.friends = me.friends.filter((n) => !sameUser(n, target.username)); target.friends = target.friends.filter((n) => !sameUser(n, me.username));
  } else if (action === "dm") {
    if (!me.friends.some((n) => sameUser(n, target.username))) return send(res, 403, { error: "You must be friends to DM." });
    const participants = [me.username, target.username].sort((a, b) => a.localeCompare(b));
    let convo = db.dms.find((dm) => dm.participants.every((name, index) => sameUser(name, participants[index])));
    if (!convo) { convo = { id: crypto.randomUUID(), participants, messages: [] }; db.dms.push(convo); }
    convo.messages.push({ id: crypto.randomUUID(), from: me.username, body: filterText(String(message || "").slice(0, 1000)), createdAt: new Date().toISOString() });
  } else return send(res, 400, { error: "Unknown action." });
  await writeDb(db);
  send(res, 200, { ok: true });
}

async function serverStatus(res) {
  try {
    const result = await pingMinecraft(config.brand.serverAddress, 25565, 3500);
    send(res, 200, { host: config.brand.serverAddress, online: true, players: result.players, version: result.version });
  } catch {
    send(res, 200, { host: config.brand.serverAddress, online: false, players: { online: 0, max: 0 }, version: null });
  }
}

function makeThread({ boardId, title, body, images, author, announcement }) {
  return { id: crypto.randomUUID(), boardId, title: filterText(String(title || "").slice(0, 140)), body: filterText(String(body || "").slice(0, 5000)), images: validateImages(images), author, announcement, locked: false, createdAt: new Date().toISOString(), replies: [] };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 160000, 64, "sha512").toString("hex");
  return `pbkdf2:160000:${salt}:${hash}`;
}

function verifyPassword(password, encoded) {
  if (!encoded || !encoded.startsWith("pbkdf2:")) return false;
  const [, rounds, salt, expected] = encoded.split(":");
  const actual = crypto.pbkdf2Sync(password, salt, Number(rounds), 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

async function currentUser(req) {
  const username = sessionUsername(req);
  if (!username) return null;
  const account = (await readDb()).accounts.find((item) => sameUser(item.username, username));
  if (!account || account.banned) return null;
  return publicAccount(account);
}

function publicAccount(account) {
  return { ...publicProfile(account), email: account.email, inGameRegistered: Boolean(account.inGameRegistered), isAdmin: isAdmin(account.username), banned: Boolean(account.banned), createdAt: account.createdAt, friendRequests: account.friendRequests || [] };
}

function publicProfile(account) {
  return { username: account.username, avatar: account.avatar || avatar(account.username, 128), bio: account.bio || "", rank: account.rank || "Member", joinedAt: account.joinedAt || account.createdAt, followers: account.followers || [], following: account.following || [], friends: account.friends || [], online: Boolean(account.online), serverName: account.serverName || "", lastServer: account.lastServer || "", lastSeenAt: account.lastSeenAt || account.createdAt };
}

function isAdmin(username) {
  return config.administrators.some((admin) => sameUser(admin, username));
}

function setSession(res, username) {
  res.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(makeSession(username))}; Path=/; HttpOnly; ${cookiePolicy()}; Max-Age=2592000`);
}

function clearSession(res) {
  res.setHeader("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; ${cookiePolicy()}; Max-Age=0`);
}

function cookiePolicy() {
  return process.env.VERCEL || process.env.COOKIE_SAMESITE_NONE === "true" ? "SameSite=None; Secure" : "SameSite=Lax";
}

function makeSession(username) {
  const value = `${username}:${Date.now()}`;
  return `${Buffer.from(value).toString("base64url")}.${crypto.createHmac("sha256", process.env.AUTH_SECRET || "dev-change-this-secret").update(value).digest("hex")}`;
}

function sessionUsername(req) {
  const token = parseCookies(req)[cookieName];
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const value = Buffer.from(payload, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", process.env.AUTH_SECRET || "dev-change-this-secret").update(value).digest("hex");
  if (sig !== expected) return null;
  return value.split(":")[0] || null;
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }));
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true;
  if (!originAllowed(origin)) {
    send(res, 403, { error: "This website origin is not allowed to use the IconRealms API." });
    return false;
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type,x-icon-register-secret");
  res.setHeader("Vary", "Origin");
  return true;
}

function originAllowed(origin) {
  const allowed = configuredOrigins();
  if (allowed.includes(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.github\.io$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

function configuredOrigins() {
  const values = [
    process.env.ALLOWED_ORIGINS,
    process.env.SITE_ORIGIN,
    process.env.GITHUB_PAGES_ORIGIN,
    config.api?.baseUrl,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ""
  ];
  return values.flatMap((value) => String(value || "").split(",")).map((value) => value.trim().replace(/\/$/, "")).filter(Boolean);
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
}

function validPlugin(req) {
  return Boolean(process.env.PLUGIN_SHARED_SECRET && req.headers["x-icon-register-secret"] === process.env.PLUGIN_SHARED_SECRET);
}

function avatar(username, size) {
  return `https://mc-heads.net/avatar/${encodeURIComponent(username || "Steve")}/${size}`;
}

function normalizeThread(thread) {
  thread.replies ||= [];
  thread.images ||= [];
  thread.createdAt ||= new Date().toISOString();
  thread.replies = thread.replies.map((reply) => ({ ...reply, images: reply.images || [], createdAt: reply.createdAt || new Date().toISOString() }));
  return thread;
}

function sameUser(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function addUnique(list, value) {
  if (!list.some((item) => sameUser(item, value))) list.push(value);
}

const blockedWords = ["porn", "porno", "pornography", "fuck", "fucking", "fucker", "shit", "bitch", "bitches", "nigger", "nigga", "n1gger", "n1gga", "faggot", "fag", "retard", "cunt", "whore", "slut", "dick", "cock", "pussy", "asshole", "bastard", "kike", "spic", "chink", "wetback", "tranny", "rape", "rapist", "cum", "semen", "blowjob", "handjob", "anal", "hentai", "nsfw", "sex", "sexual"];

function filterText(value) {
  let text = String(value || "");
  for (const word of blockedWords) text = text.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi"), "*".repeat(Math.min(word.length, 8)));
  return text;
}

function validateImages(images) {
  if (!Array.isArray(images)) return [];
  return images.map((url) => String(url || "").trim()).filter((url) => /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url)).slice(0, 4);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pingMinecraft(host, port, timeout) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let buffer = Buffer.alloc(0);
    let finished = false;
    const fail = () => { if (!finished) { finished = true; socket.destroy(); reject(new Error("offline")); } };
    socket.setTimeout(timeout, fail);
    socket.on("error", fail);
    socket.on("connect", () => {
      const hostBuffer = Buffer.from(host, "utf8");
      const handshake = concat([writeVarInt(0), writeVarInt(763), writeVarInt(hostBuffer.length), hostBuffer, Buffer.from([(port >> 8) & 255, port & 255]), writeVarInt(1)]);
      socket.write(packet(handshake));
      socket.write(packet(Buffer.from([0])));
    });
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      try {
        const parsed = parseStatus(buffer);
        if (!parsed) return;
        finished = true;
        socket.end();
        resolve(parsed);
      } catch { fail(); }
    });
  });
}

function parseStatus(buffer) {
  let offset = 0;
  const length = readVarInt(buffer, offset);
  if (!length) return null;
  offset = length.offset;
  if (buffer.length < offset + length.value) return null;
  const packetId = readVarInt(buffer, offset);
  offset = packetId.offset;
  const jsonLength = readVarInt(buffer, offset);
  offset = jsonLength.offset;
  const json = buffer.slice(offset, offset + jsonLength.value).toString("utf8");
  const data = JSON.parse(json);
  return { players: data.players || { online: 0, max: 0 }, version: data.version || null };
}

function packet(payload) { return concat([writeVarInt(payload.length), payload]); }
function concat(parts) { return Buffer.concat(parts); }
function writeVarInt(value) {
  const bytes = [];
  do { let temp = value & 0b01111111; value >>>= 7; if (value !== 0) temp |= 0b10000000; bytes.push(temp); } while (value !== 0);
  return Buffer.from(bytes);
}
function readVarInt(buffer, offset) {
  let value = 0, position = 0, current;
  do {
    if (offset >= buffer.length) return null;
    current = buffer[offset++];
    value |= (current & 0b01111111) << (7 * position);
    position++;
    if (position > 5) throw new Error("VarInt too large");
  } while ((current & 0b10000000) !== 0);
  return { value, offset };
}

module.exports = { handleApi };
