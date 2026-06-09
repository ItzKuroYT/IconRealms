const config = window.IconRealmsConfig;
const page = document.body.dataset.page;
let state = {
  user: null,
  categories: config.forumCategories,
  boards: config.forumBoards,
  threads: [],
  staff: config.defaultStaff.map(withAvatar),
  accounts: [],
  users: [],
  dms: [],
  serverStatus: { online: false, host: config.brand.serverAddress }
};

document.addEventListener("DOMContentLoaded", start);

async function start() {
  document.documentElement.dataset.theme = localStorage.getItem("theme") || "dark";
  await loadState();
  renderLayout();
  renderPage();
  bindGlobalActions();
}

async function loadState() {
  try {
    const res = await fetch("/api/state", { credentials: "include" });
    if (res.ok) state = await res.json();
  } catch {
    state.threads = [];
  }
}

function renderLayout() {
  const app = document.getElementById("app");
  app.innerHTML = `
    <header class="site-header">
      <nav class="topbar">
        <div class="nav">
          ${config.nav.map(([label, href]) => `<a class="${active(label)}" href="${href}">${label}</a>`).join("")}
        </div>
        <div class="actions">
          <button class="icon-button" id="themeToggle" type="button" title="Toggle light and dark mode">Mode</button>
          <form class="search" id="searchForm">
            <span>Search</span>
            <input id="searchInput" placeholder="Search">
          </form>
          <a class="account-button" href="${state.user ? "profile.html" : "login.html"}">${state.user ? escapeHtml(state.user.username) : "Login"}</a>
        </div>
      </nav>
      <a class="logo-link" href="index.html">
        <img id="mainLogo" src="${config.brand.logo}" alt="${config.brand.name}">
        <span class="logo-fallback">${config.brand.name}</span>
      </a>
    </header>
    <main class="page">
      <section class="direct-bar site-direct">${directTrail()}</section>
      <div id="pageContent"></div>
    </main>
    <footer class="footer">
      <div class="footer-top">
        <img class="footer-logo" src="${config.brand.logo}" alt="${config.brand.name}">
        <div class="footer-links">
          <a href="index.html">Home</a>
          <a href="forums.html">Forums</a>
          <a href="staff.html">Staff</a>
          <a href="privacy.html">Privacy Policy</a>
        </div>
      </div>
      <p>Copyright 2026 ${config.brand.name}</p>
      <small>We are not affiliated with Mojang, AB.</small>
    </footer>
  `;

  setBanner();
  const logo = document.getElementById("mainLogo");
  const fallback = document.querySelector(".logo-fallback");
  logo.addEventListener("error", () => {
    logo.style.display = "none";
    fallback.style.display = "block";
  });
  document.querySelector(".footer-logo").addEventListener("error", (event) => {
    event.currentTarget.style.display = "none";
  });
}

function bindGlobalActions() {
  document.getElementById("themeToggle").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setBanner();
  });
  document.getElementById("searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const q = document.getElementById("searchInput").value.trim();
    location.href = q ? `forums.html?search=${encodeURIComponent(q)}` : "forums.html";
  });
}

function setBanner() {
  const isLight = document.documentElement.dataset.theme === "light";
  const banner = isLight ? config.brand.lightBanner : config.brand.darkBanner;
  document.querySelector(".site-header").style.setProperty("--banner", `url("${banner}")`);
}

function renderPage() {
  const views = { home, login, signup, forums, news, gamemodes, community, staff, profile, admin, privacy };
  document.getElementById("pageContent").innerHTML = (views[page] || home)();
  bindPageActions();
  loadServerStatus();
}

function home() {
  const latest = latestAnnouncement();
  return `
    <section class="notice">${escapeHtml(config.home.welcome)}</section>
    <section class="layout">
      <div class="stack">
        <article class="welcome">
          <div>
            <p class="kicker">Placeholder</p>
            <h1>${escapeHtml(config.home.headline)}</h1>
            <p>${escapeHtml(config.home.intro)}</p>
          </div>
        </article>
        ${latest ? newsCard(latest) : ""}
      </div>
      <aside class="stack">
        ${serverBox("Checking...")}
        ${discordFrame()}
      </aside>
    </section>
  `;
}

function login() {
  return `
    <section class="notice">Welcome back to IconRealms</section>
    <article class="panel form-card">
      <h1>Login to IconRealms</h1>
      <form class="form-body" id="loginForm">
        <label><span>Minecraft Username</span><input name="username" autocomplete="username" required></label>
        <label><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
        <button class="btn">Submit</button>
        <p class="message" id="formMessage"></p>
      </form>
    </article>
    <p class="form-note">Need an account? Use <strong>/register email password</strong> in-game, then <a href="signup.html">finish signup here</a>.</p>
  `;
}

function signup() {
  return `
    <section class="notice">Register in-game first with /register &lt;email&gt; &lt;password&gt;</section>
    <article class="panel form-card">
      <h1>Create IconRealms Account</h1>
      <form class="form-body" id="signupForm">
        <label><span>Minecraft Username</span><input name="username" autocomplete="username" required></label>
        <label><span>Email</span><input name="email" type="email" autocomplete="email" required></label>
        <label><span>Password</span><input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
        <button class="btn">Sign Up</button>
        <p class="message" id="formMessage"></p>
      </form>
    </article>
    <p class="form-note">Already linked? <a href="login.html">Login here</a>.</p>
  `;
}

function forums() {
  const params = new URLSearchParams(location.search);
  const threadId = params.get("thread");
  const boardId = params.get("board");
  if (threadId) return threadView(threadId);
  if (boardId) return boardView(boardId);

  const query = (params.get("search") || "").toLowerCase();
  const threads = state.threads.filter((thread) => !query || `${thread.title} ${thread.body}`.toLowerCase().includes(query));
  return `
    <section class="panel breadcrumb">Home / Forums</section>
    ${state.categories.map((category) => `
      <section class="panel forum-section">
        <h2>${escapeHtml(category.name)}</h2>
        ${state.boards.filter((board) => board.categoryId === category.id).map((board) => boardRow(board, threads)).join("")}
      </section>
    `).join("")}
  `;
}

function boardView(boardId) {
  const board = state.boards.find((item) => item.id === boardId);
  const threads = state.threads.filter((thread) => thread.boardId === boardId);
  return `
    <section class="section-head">
      <p class="kicker">Forum Board</p>
      <h1>${escapeHtml(board?.name || "Forum")}</h1>
      <p>${escapeHtml(board?.description || "")}${board?.locked ? " This board is locked." : ""}</p>
    </section>
    ${state.user && !board?.locked ? `
      <section class="panel forum-section">
        <form class="composer" id="threadForm">
          <input name="title" placeholder="Thread title" required>
          <textarea name="body" placeholder="Start a discussion" required></textarea>
          <input name="images" placeholder="Image URLs, comma separated">
          <input type="hidden" name="boardId" value="${escapeHtml(boardId)}">
          <button class="btn">Post Thread</button>
        </form>
      </section>
    ` : ""}
    <section class="panel forum-section">
      ${threads.length ? threads.map(threadRow).join("") : `<div class="composer"><p>No threads yet.</p></div>`}
    </section>
  `;
}

function threadView(threadId) {
  const thread = state.threads.find((item) => item.id === threadId);
  if (!thread) return `<section class="panel composer"><h1>Thread not found</h1><a class="btn" href="forums.html">Back to forums</a></section>`;
  const board = state.boards.find((item) => item.id === thread.boardId);
  return `
    <article class="panel profile-card">
      <a href="profile.html?user=${encodeURIComponent(thread.author)}"><img class="avatar" src="${avatar(thread.author, 128)}" alt=""></a>
      <div>
        <p class="kicker"><a href="profile.html?user=${encodeURIComponent(thread.author)}">${escapeHtml(thread.author)}</a></p>
        <h1>${escapeHtml(thread.title)}</h1>
        <div class="rich-text">${renderRichText(thread.body)}</div>
        ${imageGrid(thread.images)}
        ${state.user && (state.user.isAdmin || sameUser(state.user.username, thread.author)) ? `<button class="btn danger" data-delete-thread="${thread.id}">Delete Post</button>` : ""}
      </div>
    </article>
    <div class="stack" style="width:min(900px,100%);margin:22px auto">
      ${(thread.replies || []).map((reply) => `<article class="panel composer"><strong><a href="profile.html?user=${encodeURIComponent(reply.author)}">${escapeHtml(reply.author)}</a></strong><div class="rich-text">${renderRichText(reply.body)}</div>${imageGrid(reply.images)}</article>`).join("")}
    </div>
    ${state.user && !thread.locked ? `
      <section class="panel forum-section" style="width:min(900px,100%)">
        <form class="composer" id="replyForm">
          <textarea name="body" placeholder="Write a reply" required></textarea>
          <input name="images" placeholder="Image URLs, comma separated">
          <input type="hidden" name="threadId" value="${escapeHtml(thread.id)}">
          <button class="btn">Reply</button>
        </form>
      </section>
    ` : ""}
  `;
}

function news() {
  const posts = announcementPosts();
  return `
    <section class="section-head"><p class="kicker">Updates</p><h1>News</h1></section>
    <div class="stack" style="width:min(1040px,100%);margin:0 auto">${posts.map(newsCard).join("") || `<article class="panel composer"><p>No news yet.</p></article>`}</div>
  `;
}

function gamemodes() {
  return `
    <section class="section-head"><p class="kicker">Play</p><h1>Gamemodes</h1></section>
    <section class="grid-cards">
      ${config.gamemodes.map((mode) => `<article class="panel mode-card"><p class="kicker">${escapeHtml(mode.tag)}</p><h2>${escapeHtml(mode.name)}</h2><p>${escapeHtml(mode.description)}</p></article>`).join("")}
    </section>
  `;
}

function community() {
  return `
    <section class="section-head"><p class="kicker">Community</p><h1>Join the conversation</h1></section>
    <section class="community-layout">
      <article class="welcome" style="grid-template-columns:1fr">
        <div>
          <h2>Discord, forums, and server updates.</h2>
          <p>Chat with players, share media, make suggestions, and keep up with what is happening on IconRealms.</p>
          <div class="chips"><a class="chip" href="forums.html">Forums</a><a class="chip" href="news.html">News</a><a class="chip" href="staff.html">Staff</a></div>
        </div>
      </article>
      ${discordFrame()}
    </section>
  `;
}

function staff() {
  const username = new URLSearchParams(location.search).get("user");
  if (username) return staffProfile(username);
  return `
    <section class="section-head"><p class="kicker">Team</p><h1>IconRealms Staff</h1></section>
    <section class="staff-board">
      ${config.staffRanks.map(([rank, color]) => {
        const people = state.staff.filter((person) => person.rank === rank);
        if (!people.length) return "";
        return `<div><h2 class="rank-title" style="color:${color}">${rank}</h2><div class="staff-grid">${people.map((person) => staffCard(person, color)).join("")}</div></div>`;
      }).join("")}
    </section>
  `;
}

function staffProfile(username) {
  const person = state.staff.find((item) => item.username.toLowerCase() === username.toLowerCase());
  if (!person) return `<section class="panel composer"><h1>Staff member not found</h1></section>`;
  const rank = config.staffRanks.find(([name]) => name === person.rank);
  return `
    <article class="panel profile-card">
      <img src="${skinBody(person.username)}" alt="">
      <div>
        <p class="kicker">${escapeHtml(person.rank)}</p>
        <h1>${escapeHtml(person.username)}</h1>
        <p>${escapeHtml(person.bio || "")}</p>
        <h2>Friends</h2>
        <div class="chips">${person.friends?.length ? person.friends.map((friend) => `<a class="chip" href="staff.html?user=${encodeURIComponent(friend)}">${escapeHtml(friend)}</a>`).join("") : `<span class="chip">No friends listed yet</span>`}</div>
        <p style="margin-top:18px"><span class="rank-pill" style="display:inline-block;background:${rank?.[1] || "#5865f2"}">${escapeHtml(person.rank)}</span></p>
      </div>
    </article>
  `;
}

function profile() {
  const requested = new URLSearchParams(location.search).get("user");
  const profileUser = requested
    ? state.users.find((user) => sameUser(user.username, requested))
    : state.user;
  if (!profileUser) {
    if (!state.user) return `<section class="panel composer"><h1>Login Required</h1><p>You need to log in before viewing profiles.</p><a class="btn" href="login.html">Login</a></section>`;
    return `<section class="panel composer"><h1>User not found</h1></section>`;
  }
  const isSelf = state.user && sameUser(state.user.username, profileUser.username);
  const isFriend = state.user && (state.user.friends || []).some((name) => sameUser(name, profileUser.username));
  const follows = state.user && (state.user.following || []).some((name) => sameUser(name, profileUser.username));
  const hasRequest = state.user && (state.user.friendRequests || []).some((name) => sameUser(name, profileUser.username));
  const profileDms = state.dms.filter((dm) => dm.participants.some((name) => sameUser(name, profileUser.username)));
  return `
    <article class="panel profile-card">
      <img src="${profileUser.avatar || avatar(profileUser.username, 128)}" alt="">
      <div>
        <p class="kicker">${escapeHtml(statusLine(profileUser))}</p>
        <h1>${escapeHtml(profileUser.username)}</h1>
        <h2 class="player-rank">${escapeHtml(profileUser.rank || "Member")}</h2>
        <p>${escapeHtml(profileUser.bio || "No bio yet.")}</p>
        <p>Joined ${escapeHtml(formatLongDate(profileUser.joinedAt || profileUser.createdAt))}</p>
        <div class="chips">
          <span class="chip">${(profileUser.followers || []).length} followers</span>
          <span class="chip">${(profileUser.friends || []).length} friends</span>
          ${isSelf ? `<button class="btn secondary" id="logoutBtn">Logout</button>` : ""}
          ${state.user && !isSelf ? `<button class="btn secondary" data-social-action="${follows ? "unfollow" : "follow"}" data-username="${escapeHtml(profileUser.username)}">${follows ? "Unfollow" : "Follow"}</button>` : ""}
          ${state.user && !isSelf && !isFriend ? `<button class="btn secondary" data-social-action="friend-request" data-username="${escapeHtml(profileUser.username)}">Add Friend</button>` : ""}
          ${state.user && hasRequest ? `<button class="btn secondary" data-social-action="accept-friend" data-username="${escapeHtml(profileUser.username)}">Accept Friend</button>` : ""}
          ${state.user && !isSelf && isFriend ? `<button class="btn secondary" data-social-action="remove-friend" data-username="${escapeHtml(profileUser.username)}">Remove Friend</button>` : ""}
        </div>
      </div>
    </article>
    ${isSelf ? `
      <section class="panel forum-section" style="width:min(900px,100%)">
        <form class="composer" id="bioForm">
          <textarea name="bio" placeholder="Customize your bio">${escapeHtml(profileUser.bio || "")}</textarea>
          <button class="btn">Save Bio</button>
        </form>
      </section>
    ` : ""}
    ${state.user && !isSelf && isFriend ? `
      <section class="panel forum-section" style="width:min(900px,100%)">
        <h2>Direct Message</h2>
        <form class="composer" id="dmForm">
          <input type="hidden" name="username" value="${escapeHtml(profileUser.username)}">
          <textarea name="message" placeholder="Message ${escapeHtml(profileUser.username)}" required></textarea>
          <button class="btn">Send DM</button>
        </form>
        <div class="composer">${profileDms.flatMap((dm) => dm.messages || []).map((message) => `<p><strong>${escapeHtml(message.from)}:</strong> ${escapeHtml(message.body)}</p>`).join("") || `<p>No messages yet.</p>`}</div>
      </section>
    ` : ""}
  `;
}

function admin() {
  if (!state.user?.isAdmin) return `<section class="panel composer"><h1>Admin Login Required</h1><p>Admins are controlled in config.js.</p><a class="btn" href="login.html">Login</a></section>`;
  return `
    <section class="section-head"><p class="kicker">Administrator</p><h1>Console</h1></section>
    <section class="admin-grid">
      <article class="panel admin-card">
        <h2>Staff Page</h2>
        <form id="staffForm">
          <input name="username" placeholder="Username" required>
          <select name="rank">${config.staffRanks.map(([rank]) => `<option value="${rank}">${escapeHtml(rank)}</option>`).join("")}</select>
          <input name="bio" placeholder="Bio">
          <input name="friends" placeholder="Friends, comma separated">
          <button class="btn">Add / Update Staff</button>
        </form>
        <div class="admin-list">${state.staff.map((person) => `<button class="btn secondary" data-remove-staff="${escapeHtml(person.username)}">Remove ${escapeHtml(person.username)}</button>`).join("")}</div>
      </article>
      <article class="panel admin-card">
        <h2>Forums</h2>
        <form id="adminThreadForm">
          <select name="boardId">${state.boards.map((board) => `<option value="${board.id}">${escapeHtml(board.name)}</option>`).join("")}</select>
          <input name="title" placeholder="Post title" required>
          <textarea name="body" placeholder="Post body" required></textarea>
          <input name="images" placeholder="Image URLs, comma separated">
          <label class="inline-check"><input type="checkbox" name="announcement" value="true"> Announcement</label>
          <button class="btn">Add Forum Post</button>
        </form>
        <div class="admin-list">${state.boards.map((board) => `<button class="btn secondary" data-board="${board.id}" data-locked="${!board.locked}">${board.locked ? "Unlock" : "Lock"} ${escapeHtml(board.name)}</button>`).join("")}</div>
        <div class="admin-list">${state.threads.map((thread) => `<div class="admin-row"><strong>${escapeHtml(thread.title)}</strong><button class="btn secondary" data-thread-action="lock" data-thread="${thread.id}">${thread.locked ? "Unlock" : "Lock"}</button><button class="btn secondary" data-thread-action="announce" data-thread="${thread.id}">Announce</button><button class="btn danger" data-thread-action="delete" data-thread="${thread.id}">Delete</button></div>`).join("")}</div>
      </article>
      <article class="panel admin-card">
        <h2>Users</h2>
        <form id="banForm"><input name="username" placeholder="Username" required><button class="btn danger">Ban User</button></form>
        <div class="admin-list">${state.accounts.map((account) => `<button class="btn secondary" data-ban="${escapeHtml(account.username)}" data-banned="${!account.banned}">${account.banned ? "Unban" : "Ban"} ${escapeHtml(account.username)}</button>`).join("")}</div>
      </article>
    </section>
  `;
}

function privacy() {
  return `
    <article class="welcome" style="width:min(1040px,100%);margin:0 auto;grid-template-columns:1fr">
      <div>
        <p class="kicker">Privacy</p>
        <h1>Privacy Policy</h1>
        <p>IconRealms stores Minecraft usernames, emails, UUIDs, hashed passwords, forum posts, staff records, and moderation status for account linking, website login, forums, and administration.</p>
      </div>
    </article>
  `;
}

function bindPageActions() {
  bindForm("loginForm", "/api/auth/login", () => location.href = "profile.html");
  bindForm("signupForm", "/api/auth/signup", () => location.href = "profile.html");
  bindForm("threadForm", "/api/forums/threads", () => location.reload(), (form) => ({
    boardId: form.boardId.value,
    title: form.title.value,
    body: form.body.value,
    images: splitImages(form.images?.value)
  }));
  bindForm("replyForm", "/api/forums/reply", () => location.reload(), (form) => ({
    threadId: form.threadId.value,
    body: form.body.value,
    images: splitImages(form.images?.value)
  }));
  bindForm("staffForm", "/api/admin/staff", () => location.reload(), (form) => ({
    username: form.username.value,
    rank: form.rank.value,
    bio: form.bio.value,
    friends: form.friends.value.split(",").map((item) => item.trim()).filter(Boolean)
  }));
  bindForm("adminThreadForm", "/api/admin/forums", () => location.reload(), (form) => ({
    boardId: form.boardId.value,
    title: form.title.value,
    body: form.body.value,
    images: splitImages(form.images?.value),
    announcement: form.announcement.checked
  }));
  bindForm("bioForm", "/api/user/profile", () => location.reload(), (form) => ({
    bio: form.bio.value
  }));
  bindForm("banForm", "/api/admin/users", () => location.reload(), (form) => ({ username: form.username.value, banned: true }));

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await api("/api/auth/logout", {});
    location.href = "index.html";
  });
  document.querySelectorAll("[data-remove-staff]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/admin/staff", { username: button.dataset.removeStaff }, "DELETE");
    location.reload();
  }));
  document.querySelectorAll("[data-board]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/admin/boards", { boardId: button.dataset.board, locked: button.dataset.locked === "true" }, "PATCH");
    location.reload();
  }));
  document.querySelectorAll("[data-thread-action]").forEach((button) => button.addEventListener("click", async () => {
    const method = button.dataset.threadAction === "delete" ? "DELETE" : "PATCH";
    await api("/api/admin/forums", { threadId: button.dataset.thread, action: button.dataset.threadAction }, method);
    location.reload();
  }));
  document.querySelectorAll("[data-ban]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/admin/users", { username: button.dataset.ban, banned: button.dataset.banned === "true" }, "PATCH");
    location.reload();
  }));
  document.querySelectorAll("[data-delete-thread]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/forums/delete", { threadId: button.dataset.deleteThread }, "DELETE");
    location.href = "forums.html";
  }));
  document.querySelectorAll("[data-social-action]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/user/social", { action: button.dataset.socialAction, username: button.dataset.username });
    location.reload();
  }));
  bindForm("dmForm", "/api/user/social", () => location.reload(), (form) => ({
    action: "dm",
    username: form.username.value,
    message: form.message.value
  }));
}

function bindForm(id, url, success, serialize) {
  const form = document.getElementById(id);
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = serialize ? serialize(form) : Object.fromEntries(new FormData(form).entries());
    const result = await api(url, body);
    if (result.ok) return success(result);
    const message = document.getElementById("formMessage");
    if (message) message.textContent = result.error || "Something went wrong.";
  });
}

async function api(url, body, method = "POST") {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, ...json };
}

function boardRow(board, threads) {
  const latest = threads.find((thread) => thread.boardId === board.id);
  return `
    <a class="board-row" href="forums.html?board=${board.id}">
      <span class="forum-icon">Chat</span>
      <div><strong>${escapeHtml(board.name)}</strong><br><small>${escapeHtml(board.description)}${board.locked ? " / Locked" : ""}</small></div>
      ${latest ? latestBlock(latest) : `<small>0 Threads</small>`}
    </a>
  `;
}

function threadRow(thread) {
  return `
    <a class="thread-row" href="forums.html?thread=${thread.id}">
      <img class="avatar" src="${avatar(thread.author, 48)}" alt="">
      <div><strong>${escapeHtml(thread.title)}</strong><br><small>${escapeHtml(thread.author)} / ${date(thread.createdAt)}</small></div>
      <small>${thread.replies?.length || 0} replies</small>
    </a>
  `;
}

function latestBlock(thread) {
  return `<div class="latest"><img class="avatar" src="${avatar(thread.author, 44)}" alt=""><strong>${escapeHtml(thread.title)}</strong><small>${escapeHtml(thread.author)} / ${date(thread.createdAt)}</small></div>`;
}

function newsCard(thread) {
  return `
    <article class="panel news-card">
      <div class="news-art"></div>
      <div class="news-body">
        <span class="badge">Latest</span>
        <h2>${escapeHtml(thread.title)}</h2>
        <div class="rich-text">${renderRichText(thread.body)}</div>
        ${imageGrid(thread.images)}
        <div class="byline"><img class="avatar" src="${avatar(thread.author, 40)}" alt=""><strong><a href="profile.html?user=${encodeURIComponent(thread.author)}">${escapeHtml(thread.author)}</a></strong><small>${date(thread.createdAt)}</small></div>
      </div>
    </article>
  `;
}

function announcementPosts() {
  return state.threads
    .filter((thread) => thread.boardId === "announcements" || thread.announcement)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function latestAnnouncement() {
  return announcementPosts()[0] || null;
}

function staffCard(person, color) {
  return `<a class="panel staff-card" href="staff.html?user=${encodeURIComponent(person.username)}"><img src="${person.avatar || avatar(person.username, 96)}" alt=""><strong>${escapeHtml(person.username)}</strong><span class="rank-pill" style="background:${color}">${escapeHtml(person.rank)}</span></a>`;
}

function serverBox(status = config.brand.minecraftVersion) {
  return `<div class="server-box"><strong>${escapeHtml(config.brand.serverAddress)}</strong><span data-server-status>${escapeHtml(status)}</span></div>`;
}

function discordFrame() {
  return `<iframe class="discord-frame" src="https://discord.com/widget?id=${config.discord.guildId}&theme=${config.discord.theme}" width="350" height="500" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts" title="IconRealms Discord"></iframe>`;
}

function directTrail() {
  const params = new URLSearchParams(location.search);
  const labels = {
    home: "Home",
    login: "Login",
    signup: "Signup",
    forums: "Forums",
    news: "News",
    gamemodes: "Gamemodes",
    community: "Community",
    staff: "Staff",
    profile: "Profile",
    admin: "Admin",
    privacy: "Privacy"
  };
  const parts = [`<a href="index.html">Home</a>`];
  if (page !== "home") parts.push(`<span>/</span><a href="${page}.html">${labels[page] || page}</a>`);
  if (page === "forums" && params.get("board")) {
    const board = state.boards.find((item) => item.id === params.get("board"));
    parts.push(`<span>/</span><strong>${escapeHtml(board?.name || "Board")}</strong>`);
  }
  if (page === "forums" && params.get("thread")) {
    const thread = state.threads.find((item) => item.id === params.get("thread"));
    const board = state.boards.find((item) => item.id === thread?.boardId);
    if (board) parts.push(`<span>/</span><a href="forums.html?board=${board.id}">${escapeHtml(board.name)}</a>`);
    if (thread) parts.push(`<span>/</span><strong>${escapeHtml(thread.title)}</strong>`);
  }
  if ((page === "staff" || page === "profile") && params.get("user")) {
    parts.push(`<span>/</span><strong>${escapeHtml(params.get("user"))}</strong>`);
  }
  return parts.join("");
}

async function loadServerStatus() {
  const targets = document.querySelectorAll("[data-server-status]");
  if (!targets.length) return;
  try {
    const res = await fetch("/api/server/status");
    const data = await res.json();
    targets.forEach((target) => {
      target.textContent = data.online ? `Server online${data.players ? ` (${data.players.online}/${data.players.max})` : ""}` : "Server offline";
    });
  } catch {
    targets.forEach((target) => {
      target.textContent = "Server offline";
    });
  }
}

function renderRichText(value) {
  let html = escapeHtml(value || "");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");
  html = html.replace(/\[color=(#[0-9a-fA-F]{3,6}|[a-zA-Z]+)\](.+?)\[\/color\]/g, '<span style="color:$1">$2</span>');
  html = html.replace(/\n/g, "<br>");
  return html;
}

function imageGrid(images) {
  if (!images || !images.length) return "";
  return `<div class="image-grid">${images.map((src) => `<img src="${escapeHtml(src)}" alt="">`).join("")}</div>`;
}

function splitImages(value) {
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function statusLine(user) {
  if (user.online) return `Online on ${user.serverName || config.brand.serverAddress}`;
  if (user.lastSeenAt) return `Last seen ${relativeTime(user.lastSeenAt)} on ${user.lastServer || config.brand.serverAddress}`;
  return "Offline";
}

function relativeTime(value) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatLongDate(value) {
  if (!value) return "unknown";
  return new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function sameUser(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function active(label) {
  const key = label.toLowerCase();
  if (page === "home" && key === "home") return "active";
  return page === key ? "active" : "";
}

function withAvatar(person) {
  return { ...person, avatar: person.avatar || avatar(person.username, 128) };
}

function avatar(username, size) {
  return `https://mc-heads.net/avatar/${encodeURIComponent(username || "Steve")}/${size}`;
}

function skinBody(username) {
  return `https://mc-heads.net/body/${encodeURIComponent(username || "Steve")}/160`;
}

function date(value) {
  return new Date(value).toLocaleDateString();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}
