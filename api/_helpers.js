const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const config = require("../config.js");

const dbPath = process.env.JSON_DB_PATH || (process.env.VERCEL ? "/tmp/iconrealms-db.json" : path.join(process.cwd(), "data", "db.json"));
const cookieName = "iconrealms_session";
const iterations = 160000;
const keyLength = 64;
const digest = "sha512";

function seedData() {
  return {
    accounts: [],
    threads: [],
    staff: config.defaultStaff.map((person) => ({ ...person, avatar: avatar(person.username, 128) })),
    dms: [],
    site: { lockedBoards: [] }
  };
}

function readDb() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  if (!fs.existsSync(dbPath)) writeDb(seedData());
  try {
    return normalize(JSON.parse(fs.readFileSync(dbPath, "utf8")));
  } catch {
    return normalize(seedData());
  }
}

function writeDb(data) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(normalize(data), null, 2));
}

function normalize(data) {
  data.accounts ||= [];
  data.threads ||= data.forums?.threads || [];
  data.staff = data.staff?.length ? data.staff : seedData().staff;
  if (data.staff.some((person) => String(person.username || "").endsWith("Placeholder"))) {
    data.staff = seedData().staff;
  }
  data.dms ||= [];
  data.site ||= {};
  data.site.lockedBoards ||= [];
  const oldStaffNames = new Set(["Eimoh", "Aplosh", "Hamilton", "Dodged", "GreenV1", "Looks", "Xelvy", "iOwnRazer", "TiredTsuki", "HenryTheAlpaca"]);
  if (data.staff.some((person) => oldStaffNames.has(person.username))) {
    data.staff = seedData().staff;
  }
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
    if (account.online && Date.now() - new Date(account.lastSeenAt).getTime() > 90000) {
      account.online = false;
    }
  });
  data.staff.forEach((person) => {
    person.avatar ||= avatar(person.username, 128);
    person.friends ||= [];
  });
  return data;
}

function publicState(user) {
  const db = readDb();
  const locked = db.site.lockedBoards;
  const users = db.accounts.map(publicProfile);
  return {
    user,
    categories: config.forumCategories,
    boards: config.forumBoards.map((board) => ({ ...board, locked: board.locked || locked.includes(board.id) })),
    threads: db.threads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    staff: db.staff,
    users,
    dms: user ? db.dms.filter((dm) => dm.participants.some((name) => sameUser(name, user.username))) : [],
    accounts: user?.isAdmin ? db.accounts.map(({ passwordHash, ...account }) => account) : []
  };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

function verifyPassword(password, encoded) {
  if (!encoded || !encoded.startsWith("pbkdf2:")) return false;
  const [, roundText, salt, expected] = encoded.split(":");
  const actual = crypto.pbkdf2Sync(password, salt, Number(roundText), keyLength, digest).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}

function sessionSecret() {
  return process.env.AUTH_SECRET || "dev-change-this-secret";
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

function makeSession(username) {
  const value = `${username}:${Date.now()}`;
  return `${Buffer.from(value).toString("base64url")}.${sign(value)}`;
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }));
}

function sessionUsername(req) {
  const token = parseCookies(req)[cookieName];
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const value = Buffer.from(payload, "base64url").toString("utf8");
  if (sign(value) !== sig) return null;
  return value.split(":")[0] || null;
}

function currentUser(req) {
  const username = sessionUsername(req);
  if (!username) return null;
  const account = readDb().accounts.find((item) => item.username.toLowerCase() === username.toLowerCase());
  if (!account || account.banned) return null;
  return publicAccount(account);
}

function publicAccount(account) {
  return {
    username: account.username,
    email: account.email,
    avatar: account.avatar,
    bio: account.bio || "",
    rank: account.rank || "Member",
    joinedAt: account.joinedAt || account.createdAt,
    following: account.following || [],
    followers: account.followers || [],
    friends: account.friends || [],
    friendRequests: account.friendRequests || [],
    online: Boolean(account.online),
    serverName: account.serverName || "",
    lastServer: account.lastServer || "",
    lastSeenAt: account.lastSeenAt || account.createdAt,
    inGameRegistered: Boolean(account.inGameRegistered),
    isAdmin: isAdmin(account.username),
    banned: Boolean(account.banned),
    createdAt: account.createdAt
  };
}

function isAdmin(username) {
  return config.administrators.some((admin) => admin.toLowerCase() === String(username || "").toLowerCase());
}

function setSession(res, username) {
  res.setHeader("Set-Cookie", `${cookieName}=${encodeURIComponent(makeSession(username))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
}

function clearSession(res) {
  res.setHeader("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function avatar(username, size) {
  return `https://mc-heads.net/avatar/${encodeURIComponent(username || "Steve")}/${size}`;
}

function publicProfile(account) {
  return {
    username: account.username,
    avatar: account.avatar || avatar(account.username, 128),
    bio: account.bio || "",
    rank: account.rank || "Member",
    joinedAt: account.joinedAt || account.createdAt,
    followers: account.followers || [],
    following: account.following || [],
    friends: account.friends || [],
    online: Boolean(account.online),
    serverName: account.serverName || "",
    lastServer: account.lastServer || "",
    lastSeenAt: account.lastSeenAt || account.createdAt
  };
}

function normalizeThread(thread) {
  thread.replies ||= [];
  thread.images ||= [];
  thread.createdAt ||= new Date().toISOString();
  thread.replies = thread.replies.map((reply) => ({
    ...reply,
    images: reply.images || [],
    createdAt: reply.createdAt || new Date().toISOString()
  }));
  return thread;
}

function sameUser(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

const blockedWords = [
  "porn", "porno", "pornography", "fuck", "fucking", "fucker", "shit", "bitch", "bitches",
  "nigger", "nigga", "n1gger", "n1gga", "faggot", "fag", "retard", "cunt", "whore",
  "slut", "dick", "cock", "pussy", "asshole", "bastard", "kike", "spic", "chink",
  "wetback", "tranny", "rape", "rapist", "cum", "semen", "blowjob", "handjob",
  "anal", "hentai", "nsfw", "sex", "sexual"
];

function filterText(value) {
  let text = String(value || "");
  for (const word of blockedWords) {
    const pattern = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");
    text = text.replace(pattern, "*".repeat(Math.min(word.length, 8)));
  }
  return text;
}

function validateImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .map((url) => String(url || "").trim())
    .filter((url) => /^https?:\/\/.+\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url))
    .slice(0, 4);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  config,
  readDb,
  writeDb,
  publicState,
  hashPassword,
  verifyPassword,
  currentUser,
  publicAccount,
  isAdmin,
  setSession,
  clearSession,
  readBody,
  send,
  avatar
  , publicProfile
  , sameUser
  , filterText
  , validateImages
};
