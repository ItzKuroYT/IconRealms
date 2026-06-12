const config = window.IconRealmsConfig;
const page = document.body.dataset.page;
let activeDmUser = "";
let adTimer = 0;
let state = {
  user: null,
  categories: config.forumCategories,
  boards: config.forumBoards,
  threads: [],
  staff: config.defaultStaff.map(withAvatar),
  staffOfMonth: null,
  accounts: [],
  users: [],
  dms: [],
  servers: [],
  supporters: config.supporters,
  ads: [],
  serverStatus: { online: false, host: config.brand.serverAddress }
};

document.addEventListener("DOMContentLoaded", start);

function assetUrl(value) {
  const raw = String(value || "");
  if (!raw || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(raw)) return raw;
  return raw.replace(/^\.\//, "");
}

async function start() {
  document.documentElement.dataset.theme = localStorage.getItem("theme") || "dark";
  await loadState();
  renderLayout();
  renderPage();
  bindGlobalActions();
  scheduleAd();
}

async function loadState() {
  try {
    const res = await fetch(apiUrl("/api/state"), { credentials: "include" });
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
          ${state.user?.isAdmin ? `<a class="${page === "admin" ? "active" : ""}" href="${pageUrl("admin")}">Admin</a>` : ""}
        </div>
        <div class="actions">
          ${state.user ? `<button class="icon-button notify-button ${unreadNotifications().length ? "has-alert" : ""}" id="notificationToggle" type="button" title="Notifications">!</button>` : ""}
          <button class="icon-button settings-button" id="settingsToggle" type="button" title="Settings">⚙</button>
          <form class="search" id="searchForm">
            <span>Search</span>
            <input id="searchInput" placeholder="Search">
          </form>
          <a class="account-button" href="${state.user ? pageUrl("profile") : pageUrl("login")}">${state.user ? escapeHtml(state.user.username) : "Login"}</a>
        </div>
      </nav>
      <a class="logo-link" href="${pageUrl("home")}">
        <img id="mainLogo" src="${assetUrl(config.brand.logo)}" alt="${config.brand.name}">
        <span class="logo-fallback">${config.brand.name}</span>
      </a>
    </header>
    <main class="page">
      <section class="direct-bar site-direct">${directTrail()}</section>
      <div id="pageContent"></div>
    </main>
    <footer class="footer">
      <div class="footer-top">
        <img class="footer-logo" src="${assetUrl(config.brand.logo)}" alt="${config.brand.name}">
        <div class="footer-links">
          <a href="${pageUrl("home")}">Home</a>
          <a href="${pageUrl("forums")}">Forums</a>
          <a href="${pageUrl("staff")}">Staff</a>
          <a href="${pageUrl("privacy")}">Privacy Policy</a>
        </div>
      </div>
      <p>Copyright 2026 ${config.brand.name}</p>
      <small>We are not affiliated with Mojang, AB.</small>
    </footer>
    ${settingsPanel()}
    ${state.user ? notificationPanel() + dmDock() : ""}
    ${adShell()}
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

function settingsPanel() {
  const allowFriendRequests = state.user?.settings?.allowFriendRequests !== false;
  return `
    <aside class="floating-panel settings-panel" id="settingsPanel">
      <h2>Settings</h2>
      <div class="settings-row">
        <span>Theme</span>
        <div class="segmented">
          <button type="button" data-theme-choice="dark">Dark</button>
          <button type="button" data-theme-choice="light">Light</button>
        </div>
      </div>
      ${state.user ? `<label class="toggle-row"><input id="friendRequestToggle" type="checkbox" ${allowFriendRequests ? "checked" : ""}> <span>Allow friend requests</span></label>` : `<p>Login to manage account settings.</p>`}
    </aside>
  `;
}

function notificationPanel() {
  const notifications = allNotifications();
  return `
    <aside class="floating-panel notification-panel" id="notificationPanel">
      <h2>Notifications</h2>
      <div class="notification-list">
        ${notifications.length ? notifications.map((item) => item.type === "dm" ? `<button type="button" data-open-dm="${escapeHtml(item.user || "")}"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></button>` : `<a href="${item.href}"><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></a>`).join("") : `<p>No notifications yet.</p>`}
      </div>
    </aside>
  `;
}

function dmDock() {
  return `
    <button class="dm-launcher ${unreadDmCount() ? "has-alert" : ""}" id="dmLauncher" type="button" title="Direct messages">✉</button>
    <aside class="dm-drawer" id="dmDrawer">
      <header>
        <button class="btn secondary dm-back" id="dmBack" type="button">Back</button>
        <strong id="dmTitle">Direct Messages</strong>
        <button class="btn secondary" id="dmClose" type="button">Close</button>
      </header>
      <div class="dm-body" id="dmBody"></div>
      <form class="dm-compose" id="dmCompose">
        <textarea id="dmInput" placeholder="Message a friend"></textarea>
        <button class="btn" id="dmSend" type="button">Send</button>
      </form>
    </aside>
  `;
}

function adShell() {
  return `<aside class="ad-popup" id="adPopup" aria-live="polite"></aside>`;
}

function bindGlobalActions() {
  document.getElementById("settingsToggle")?.addEventListener("click", () => {
    document.getElementById("settingsPanel")?.classList.toggle("open");
    document.getElementById("notificationPanel")?.classList.remove("open");
  });
  document.querySelectorAll("[data-theme-choice]").forEach((button) => button.addEventListener("click", () => {
    const next = button.dataset.themeChoice;
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setBanner();
  }));
  document.getElementById("friendRequestToggle")?.addEventListener("change", async (event) => {
    await api("/api/user/settings", { allowFriendRequests: event.currentTarget.checked });
    await loadState();
    renderLayout();
    renderPage();
    bindGlobalActions();
  });
  document.getElementById("notificationToggle")?.addEventListener("click", async () => {
    document.getElementById("notificationPanel")?.classList.toggle("open");
    document.getElementById("settingsPanel")?.classList.remove("open");
    await api("/api/user/notifications", { action: "mark-read" });
    state.user.lastNotificationSeenAt = new Date().toISOString();
    document.getElementById("notificationToggle")?.classList.remove("has-alert");
  });
  document.getElementById("dmLauncher")?.addEventListener("click", async () => {
    await openDmDrawer();
  });
  document.getElementById("dmClose")?.addEventListener("click", closeDmDrawer);
  document.getElementById("dmBack")?.addEventListener("click", () => renderDmList());
  document.getElementById("dmSend")?.addEventListener("click", sendDrawerDm);
  document.getElementById("dmInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendDrawerDm();
    }
  });
  document.querySelectorAll("[data-open-dm]").forEach((button) => button.addEventListener("click", async () => {
    await openDmDrawer(button.dataset.openDm);
  }));
  document.getElementById("themeToggle")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    setBanner();
  });
  document.getElementById("searchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const q = document.getElementById("searchInput").value.trim();
    location.href = q ? `${pageUrl("forums")}?search=${encodeURIComponent(q)}` : pageUrl("forums");
  });
}

function scheduleAd() {
  clearTimeout(adTimer);
  const ad = nextAd();
  const popup = document.getElementById("adPopup");
  if (!ad || !popup) return;
  adTimer = setTimeout(() => showAd(ad), Math.max(2500, Number(ad.appearDelayMs || 4500)));
}

function nextAd() {
  const ads = (state.ads || []).filter((ad) => ad.enabled !== false);
  if (!ads.length || sessionStorage.getItem("iconrealms_ad_seen_page") === "true") return null;
  const now = Date.now();
  return ads.find((ad) => {
    const last = Number(localStorage.getItem(`iconrealms_ad_${ad.id}`) || 0);
    const interval = Math.max(60, Number(ad.intervalSeconds || 600)) * 1000;
    return now - last >= interval;
  }) || null;
}

function showAd(ad) {
  const popup = document.getElementById("adPopup");
  if (!popup) return;
  const closeDelay = Math.max(1, Number(ad.closeDelaySeconds || 1));
  popup.className = `ad-popup open ${escapeAttribute(ad.placement || "bottom-right")}`;
  popup.innerHTML = `
    <div class="ad-card">
      <div class="ad-top">
        <span>Sponsored</span>
        <button class="ad-close" id="adCloseBtn" type="button" disabled>Skip in ${closeDelay}s</button>
      </div>
      ${adMedia(ad)}
      ${ad.text ? `<p>${escapeHtml(ad.text)}</p>` : ""}
      ${ad.linkUrl ? `<a class="btn secondary ad-link" href="${escapeAttribute(ad.linkUrl)}" target="_blank" rel="noopener">Open Link</a>` : ""}
    </div>
  `;
  sessionStorage.setItem("iconrealms_ad_seen_page", "true");
  localStorage.setItem(`iconrealms_ad_${ad.id}`, String(Date.now()));
  const close = document.getElementById("adCloseBtn");
  setTimeout(() => {
    if (!close) return;
    close.disabled = false;
    close.textContent = "Close";
  }, closeDelay * 1000);
  close?.addEventListener("click", () => {
    if (close.disabled) return;
    popup.classList.remove("open");
    popup.innerHTML = "";
  });
}

function adMedia(ad) {
  if (!ad.mediaUrl) return "";
  const type = ad.mediaType === "auto" ? mediaType(ad.mediaUrl) : ad.mediaType;
  const url = escapeAttribute(ad.mediaUrl);
  if (type === "video") return `<video class="ad-media" src="${url}" controls playsinline></video>`;
  if (type === "audio") return `<audio class="ad-audio" src="${url}" controls></audio>`;
  return `<img class="ad-media" src="${url}" alt="">`;
}

function mediaType(url) {
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return "video";
  if (/\.(mp3|wav|m4a|aac|oga)(\?.*)?$/i.test(url)) return "audio";
  return "image";
}

function setBanner() {
  const isLight = document.documentElement.dataset.theme === "light";
  const banner = assetUrl(isLight ? config.brand.lightBanner : config.brand.darkBanner);
  document.querySelector(".site-header").style.setProperty("--banner", `url("${banner}")`);
}

function renderPage() {
  const views = { home, login, signup, forums, news, gamemodes, community, supporters, staff, profile, admin, privacy };
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
            <p class="kicker">${escapeHtml(config.home.kicker || "")}</p>
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
    <p class="form-note">Need an account? Use <strong>/register email password</strong> in-game, then log in here with that password.</p>
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
    <p class="form-note">If <strong>/register</strong> already said registered, you can <a href="${pageUrl("login")}">login here</a>.</p>
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
    ${state.user && (!board?.locked || state.user.isAdmin) ? `
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
  if (!thread) return `<section class="panel composer"><h1>Thread not found</h1><a class="btn" href="${pageUrl("forums")}">Back to forums</a></section>`;
  const board = state.boards.find((item) => item.id === thread.boardId);
  return `
    <article class="panel profile-card">
      <a href="${profileHref(thread.author)}"><img class="avatar" src="${avatar(thread.author, 128)}" alt=""></a>
      <div>
        <p class="kicker"><a href="${profileHref(thread.author)}">${escapeHtml(thread.author)}</a></p>
        <h1>${escapeHtml(thread.title)}</h1>
        <div class="rich-text">${renderRichText(thread.body)}</div>
        ${imageGrid(thread.images)}
        ${state.user && (state.user.isAdmin || sameUser(state.user.username, thread.author)) ? `<button class="btn danger" data-delete-thread="${thread.id}">Delete Post</button>` : ""}
      </div>
    </article>
    <div class="stack" style="width:min(900px,100%);margin:22px auto">
      ${(thread.replies || []).map((reply) => `<article class="panel composer"><strong><a href="${profileHref(reply.author)}">${escapeHtml(reply.author)}</a></strong><div class="rich-text">${renderRichText(reply.body)}</div>${imageGrid(reply.images)}</article>`).join("")}
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
  const modeId = new URLSearchParams(location.search).get("mode");
  if (modeId) return gamemodeTracker(modeId);
  return `
    <section class="section-head"><p class="kicker">Play</p><h1>Gamemodes</h1></section>
    <section class="grid-cards">
      ${config.gamemodes.map((mode) => `<a class="panel mode-card" href="${pageUrl("gamemodes")}?mode=${encodeURIComponent(mode.id || slug(mode.name))}"><p class="kicker">${escapeHtml(mode.tag)}</p><h2>${escapeHtml(mode.name)}</h2><p>${escapeHtml(mode.description)}</p><span class="mode-open">Open tracker</span></a>`).join("")}
    </section>
  `;
}

function gamemodeTracker(modeId) {
  const mode = config.gamemodes.find((item) => (item.id || slug(item.name)) === modeId);
  if (!mode) return `<section class="panel composer"><h1>Gamemode not found</h1><a class="btn" href="${pageUrl("gamemodes")}">Back to gamemodes</a></section>`;
  const tracker = trackerFor(mode);
  const players = tracker?.players || [];
  const online = Boolean(tracker?.online);
  return `
    <section class="section-head">
      <p class="kicker">${escapeHtml(mode.tag)}</p>
      <h1>${escapeHtml(mode.name)} Tracker</h1>
      <p>${escapeHtml(mode.description)}</p>
    </section>
    <section class="tracker-grid">
      <article class="panel tracker-hero">
        <div>
          <p class="kicker">${online ? "Server Online" : "Server Offline"}</p>
          <h2>${escapeHtml(tracker?.name || mode.serverName || mode.name)}</h2>
          <button class="copy-ip" type="button" data-copy-ip="${escapeHtml(tracker?.ip || mode.ip || config.brand.serverAddress)}">${escapeHtml(tracker?.ip || mode.ip || config.brand.serverAddress)}</button>
        </div>
        <div class="status-dot ${online ? "online" : ""}">${online ? "Online" : "Offline"}</div>
      </article>
      ${trackerStat("Players", `${players.length}${tracker?.maxPlayers ? ` / ${tracker.maxPlayers}` : ""}`)}
      ${trackerStat("Peak Players", tracker?.maxPlayersEver ?? 0)}
      ${trackerStat("TPS", tracker?.tps && tracker.tps > 0 ? tracker.tps.toFixed(2) : "Waiting")}
      ${trackerStat("Ping", tracker?.pingMs ? `${tracker.pingMs}ms API / ${tracker.averagePlayerPingMs || 0}ms avg` : "Waiting")}
      ${trackerStat("Uptime", tracker?.uptimeMs ? formatDuration(tracker.uptimeMs) : "Waiting")}
      ${trackerStat("Last Restart", tracker?.lastRestartAt ? formatLongDateTime(tracker.lastRestartAt) : "Unknown")}
      ${trackerStat("Last Crash", tracker?.lastCrashAt ? formatLongDateTime(tracker.lastCrashAt) : "None reported")}
      <details class="panel tracker-players" ${players.length ? "open" : ""}>
        <summary>Players Online (${players.length})</summary>
        <div class="player-list">
          ${players.length ? players.map((player) => `<a href="${profileHref(player.username)}"><img class="avatar" src="${avatar(player.username, 32)}" alt=""><strong>${escapeHtml(player.username)}</strong><small>${escapeHtml(player.rank || "Member")}</small></a>`).join("") : `<p>No players online.</p>`}
        </div>
      </details>
    </section>
  `;
}

function trackerFor(mode) {
  const keys = [mode.serverName, mode.ip, mode.name, mode.id].map(slug);
  return state.servers.find((server) => keys.includes(slug(server.name)) || keys.includes(slug(server.ip)) || keys.includes(slug(server.id)));
}

function trackerStat(label, value) {
  return `<article class="panel tracker-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function community() {
  return `
    <section class="section-head"><p class="kicker">Community</p><h1>Join the conversation</h1></section>
    <section class="community-layout">
      <article class="welcome" style="grid-template-columns:1fr">
        <div>
          <h2>Discord, forums, and server updates.</h2>
          <p>Chat with players, share media, make suggestions, and keep up with what is happening on IconRealms.</p>
          <div class="chips"><a class="chip" href="${pageUrl("forums")}">Forums</a><a class="chip" href="${pageUrl("news")}">News</a><a class="chip" href="${pageUrl("staff")}">Staff</a></div>
        </div>
      </article>
      ${discordFrame()}
    </section>
  `;
}

function supporters() {
  const data = state.supporters || config.supporters || {};
  return `
    <section class="section-head"><p class="kicker">Community</p><h1>${escapeHtml(data.title || "Supporters")}</h1><p>${escapeHtml(data.intro || "")}</p></section>
    <section class="supporter-podium">
      ${(data.podium || []).map((person, index) => supporterPodium(person, index)).join("")}
    </section>
    <section class="supporter-carousel panel">
      <h2>${escapeHtml(data.customersTitle || "Customers")}</h2>
      <div class="supporter-track">
        ${(data.customers || []).map((username) => supporterMini(username)).join("")}
      </div>
    </section>
  `;
}

function supporterPodium(person, index) {
  const places = ["first", "second", "third"];
  return `<a class="panel podium-card ${places[index] || ""}" href="${profileHref(person.username)}"><span>#${index + 1}</span><img src="${avatar(person.username, 96)}" alt=""><strong>${escapeHtml(person.username)}</strong><small>Spent: ${escapeHtml(person.spent)}</small></a>`;
}

function supporterMini(username) {
  return `<a class="customer-card" href="${profileHref(username)}"><img class="avatar" src="${avatar(username, 48)}" alt=""><strong>${escapeHtml(username)}</strong><small>View profile</small></a>`;
}

function staff() {
  const username = new URLSearchParams(location.search).get("user");
  if (username) return staffProfile(username);
  const featured = staffOfMonthCard();
  return `
    <section class="section-head"><p class="kicker">Team</p><h1>IconRealms Staff</h1></section>
    ${featured}
    <section class="staff-board">
      ${config.staffRanks.map(([rank, color]) => {
        const people = state.staff.filter((person) => person.rank === rank);
        if (!people.length) return "";
        return `<div><h2 class="rank-title" style="color:${color}">${rank}</h2><div class="staff-grid">${people.map((person) => staffCard(person, color)).join("")}</div></div>`;
      }).join("")}
    </section>
  `;
}

function staffOfMonthCard() {
  const pick = state.staffOfMonth;
  if (!pick?.username) return "";
  const person = state.staff.find((item) => sameUser(item.username, pick.username)) || { username: pick.username, rank: "Staff", avatar: avatar(pick.username, 128) };
  const rank = config.staffRanks.find(([name]) => name === person.rank);
  return `
    <section class="staff-month-wrap">
      <a class="panel staff-month-card" href="${staffHref(person.username)}">
        <div class="staff-month-glow"></div>
        <img src="${person.avatar || avatar(person.username, 128)}" alt="">
        <div>
          <p class="kicker">Staff Of The Month</p>
          <h2>${escapeHtml(person.username)}</h2>
          <span class="rank-pill" style="display:inline-block;background:${rank?.[1] || "#5865f2"}">${escapeHtml(person.rank || "Staff")}</span>
          ${pick.message ? `<p>${escapeHtml(pick.message)}</p>` : `<p>Recognized by the IconRealms team.</p>`}
        </div>
      </a>
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
        <div class="chips">${person.friends?.length ? person.friends.map((friend) => `<a class="chip" href="${staffHref(friend)}">${escapeHtml(friend)}</a>`).join("") : `<span class="chip">No friends listed yet</span>`}</div>
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
  if (requested && !profileUser) return publicMinecraftProfile(requested);
  if (!profileUser) {
    if (!state.user) return `<section class="panel composer"><h1>Login Required</h1><p>You need to log in before viewing profiles.</p><a class="btn" href="${pageUrl("login")}">Login</a></section>`;
    return `<section class="panel composer"><h1>User not found</h1></section>`;
  }
  const isSelf = state.user && sameUser(state.user.username, profileUser.username);
  const isFriend = state.user && (state.user.friends || []).some((name) => sameUser(name, profileUser.username));
  const follows = state.user && (state.user.following || []).some((name) => sameUser(name, profileUser.username));
  const hasRequest = state.user && (state.user.friendRequests || []).some((name) => sameUser(name, profileUser.username));
  const profileDms = state.dms.filter((dm) => dm.participants.some((name) => sameUser(name, profileUser.username)));
  return `
    <article class="panel profile-hero-card">
      <div class="profile-avatar-ring"><img src="${profileUser.avatar || avatar(profileUser.username, 128)}" alt=""></div>
      <div class="profile-main">
        <p class="kicker">${escapeHtml(statusLine(profileUser))}</p>
        <h1>${escapeHtml(profileUser.username)}</h1>
        <h2 class="player-rank">${escapeHtml(profileUser.rank || "Member")}</h2>
        <p>${escapeHtml(profileUser.bio || "No bio yet.")}</p>
        <div class="profile-meta">
          <span>Joined ${escapeHtml(formatLongDate(profileUser.joinedAt || profileUser.createdAt))}</span>
          <span>${(profileUser.followers || []).length} followers</span>
          <span>${(profileUser.friends || []).length} friends</span>
        </div>
        <div class="profile-actions">
          ${isSelf ? `<button class="btn secondary" id="logoutBtn">Logout</button>` : ""}
          ${state.user && !isSelf ? `<button class="btn secondary" data-social-action="${follows ? "unfollow" : "follow"}" data-username="${escapeHtml(profileUser.username)}">${follows ? "Unfollow" : "Follow"}</button>` : ""}
          ${state.user && !isSelf && !isFriend ? `<button class="btn secondary" data-social-action="friend-request" data-username="${escapeHtml(profileUser.username)}">Add Friend</button>` : ""}
          ${state.user && hasRequest ? `<button class="btn secondary" data-social-action="accept-friend" data-username="${escapeHtml(profileUser.username)}">Accept Friend</button>` : ""}
          ${state.user && hasRequest ? `<button class="btn secondary" data-social-action="deny-friend" data-username="${escapeHtml(profileUser.username)}">Deny Friend</button>` : ""}
          ${state.user && !isSelf && isFriend ? `<button class="btn secondary" data-social-action="remove-friend" data-username="${escapeHtml(profileUser.username)}">Remove Friend</button>` : ""}
          ${state.user && !isSelf && isFriend ? `<button class="btn secondary" data-open-dm="${escapeHtml(profileUser.username)}">Message</button>` : ""}
        </div>
      </div>
    </article>
    ${profileStats(profileUser)}
    ${isSelf && (profileUser.friendRequests || []).length ? `
      <section class="panel forum-section" style="width:min(900px,100%)">
        <h2>Friend Requests</h2>
        <div class="friend-request-list">
          ${profileUser.friendRequests.map((name) => `<div><a href="${profileHref(name)}">${escapeHtml(name)}</a><span><button class="btn secondary" data-social-action="accept-friend" data-username="${escapeHtml(name)}">Accept</button><button class="btn secondary" data-social-action="deny-friend" data-username="${escapeHtml(name)}">Deny</button></span></div>`).join("")}
        </div>
      </section>
    ` : ""}
    <section class="panel forum-section" style="width:min(900px,100%)">
      <h2>Friends</h2>
      <div class="relationship-list">${(profileUser.friends || []).length ? profileUser.friends.map((name) => `<a class="chip" href="${profileHref(name)}">${escapeHtml(name)}</a>`).join("") : `<span class="chip">No friends yet</span>`}</div>
      <h2>Followers</h2>
      <div class="relationship-list">${(profileUser.followers || []).length ? profileUser.followers.map((name) => `<a class="chip" href="${profileHref(name)}">${escapeHtml(name)}</a>`).join("") : `<span class="chip">No followers yet</span>`}</div>
    </section>
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

function publicMinecraftProfile(username) {
  return `
    <article class="panel profile-card">
      <img src="${avatar(username, 160)}" alt="">
      <div>
        <p class="kicker">Public Profile</p>
        <h1>${escapeHtml(username)}</h1>
        <h2 class="player-rank">Supporter</h2>
        <p>This player has not linked a website account yet.</p>
        <div class="chips"><span class="chip">Minecraft profile</span></div>
      </div>
    </article>
  `;
}

function profileStats(profileUser) {
  const statGroups = Object.values(profileUser.statsByServer || {});
  const cards = config.gamemodes.map((mode) => {
    const modeId = mode.id || slug(mode.name);
    const group = statGroups.find((item) => sameStatSource(item, mode));
    const fields = (config.profileStats || []).filter((field) => !field.gamemodeId || field.gamemodeId === modeId);
    const rows = group?.stats
      ? fields.map((field) => statRow(field.label, group.stats[field.key])).filter(Boolean).join("")
      : "";
    return `
      <details class="profile-stat-game" ${modeId === "icongens" ? "open" : ""}>
        <summary>
          <span>${escapeHtml(mode.name)}</span>
          <small>${escapeHtml(group?.serverName || mode.ip || mode.serverName || "No data yet")}</small>
        </summary>
        <div class="profile-stat-rows">
          ${rows || `<p>No stats for this player.</p>`}
          ${group?.updatedAt ? `<small>Updated ${escapeHtml(relativeTime(group.updatedAt))} ago</small>` : ""}
        </div>
      </details>
    `;
  }).join("");
  return `
    <section class="panel profile-stats-panel">
      <div class="profile-tabs">
        <details open>
          <summary>Stats</summary>
          <div class="profile-stat-list">${cards}</div>
        </details>
      </div>
    </section>
  `;
}

function sameStatSource(group, mode) {
  if (!group) return false;
  const keys = [group.gamemodeId, group.serverId, group.serverName, group.serverIp].map(slug);
  const modeKeys = [mode.id, mode.name, mode.serverName, mode.ip].map(slug);
  return keys.some((key) => key && modeKeys.includes(key));
}

function statRow(label, value) {
  if (value === undefined || value === null || value === "") return "";
  return `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function admin() {
  if (!state.user?.isAdmin) return `<section class="panel composer"><h1>Error 67</h1><p>You are not authorized to enter the administrator console.</p><a class="btn" href="${pageUrl("login")}">Login</a></section>`;
  const supporterData = state.supporters || config.supporters || {};
  const monthPick = state.staffOfMonth;
  return `
    <section class="section-head"><p class="kicker">Administrator</p><h1>Console</h1></section>
    <section class="admin-grid admin-console">
      <article class="panel admin-card">
        <h2>Staff Page</h2>
        <form id="staffForm">
          <input name="username" placeholder="Username" required>
          <select name="rank">${config.staffRanks.map(([rank]) => `<option value="${rank}">${escapeHtml(rank)}</option>`).join("")}</select>
          <input name="bio" placeholder="Bio">
          <input name="friends" placeholder="Friends, comma separated">
          <button class="btn">Add / Update Staff</button>
        </form>
        <form id="staffMonthForm" class="staff-month-admin">
          <select name="username" required>
            <option value="">Staff of the month</option>
            ${state.staff.map((person) => `<option value="${escapeHtml(person.username)}" ${sameUser(person.username, monthPick?.username) ? "selected" : ""}>${escapeHtml(person.username)} - ${escapeHtml(person.rank)}</option>`).join("")}
          </select>
          <input name="message" placeholder="Short message, optional" value="${escapeHtml(monthPick?.message || "")}">
          <button class="btn">Set Staff Of The Month</button>
        </form>
        ${monthPick?.username ? `<button class="btn danger" type="button" id="deleteStaffMonth">Delete Staff Of The Month</button>` : ""}
        <div class="admin-list">${state.staff.map((person) => `<button class="btn secondary" data-remove-staff="${escapeHtml(person.username)}">Remove ${escapeHtml(person.username)}</button>`).join("")}</div>
      </article>
      <article class="panel admin-card admin-card-wide">
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
        <form id="banForm" class="admin-user-form">
          <select name="username" required>
            <option value="">Select user</option>
            ${state.accounts.map((account) => `<option value="${escapeHtml(account.username)}">${escapeHtml(account.username)}${account.banned ? " (banned)" : ""}</option>`).join("")}
          </select>
          <select name="banned">
            <option value="true">Ban selected user</option>
            <option value="false">Unban selected user</option>
          </select>
          <button class="btn danger">Apply User Action</button>
        </form>
        <div class="admin-note">${state.accounts.length} registered account${state.accounts.length === 1 ? "" : "s"} loaded.</div>
      </article>
      <article class="panel admin-card admin-card-wide">
        <h2>Supporters</h2>
        <form id="supporterTextForm">
          <input name="title" placeholder="Supporter page title" value="${escapeHtml(supporterData.title || "")}">
          <input name="intro" placeholder="Intro text" value="${escapeHtml(supporterData.intro || "")}">
          <input name="customersTitle" placeholder="Customer carousel title" value="${escapeHtml(supporterData.customersTitle || "")}">
          <button class="btn">Save Supporter Text</button>
        </form>
        <form id="supporterPodiumForm">
          <select name="place"><option value="1">1st Place</option><option value="2">2nd Place</option><option value="3">3rd Place</option></select>
          <input name="username" placeholder="Player username" required>
          <input name="spent" placeholder="Spent amount, ex: 177.31 USD" required>
          <button class="btn">Save Podium Player</button>
        </form>
        <form id="supporterCustomerForm">
          <input name="username" placeholder="Add customer username" required>
          <button class="btn">Add Customer</button>
        </form>
        <div class="admin-list supporter-admin-list">
          ${(supporterData.podium || []).map((person, index) => `<div class="admin-row"><strong>#${index + 1} ${escapeHtml(person.username)}</strong><span>${escapeHtml(person.spent)}</span></div>`).join("")}
          ${(supporterData.customers || []).map((name) => `<button class="btn secondary" data-remove-supporter="${escapeHtml(name)}">Remove ${escapeHtml(name)}</button>`).join("")}
        </div>
      </article>
      <article class="panel admin-card admin-card-wide ad-admin-card">
        <h2>Ad Campaigns</h2>
        <p class="admin-note">Ads appear occasionally in a corner of the website. Visitors can close each one after the delay you set.</p>
        <form id="adForm" class="ad-admin-form">
          <input name="name" placeholder="Campaign name (internal)" required>
          <input name="text" placeholder="Display text">
          <input name="linkUrl" placeholder="Link URL, https://...">
          <select name="placement">
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-right">Top right</option>
            <option value="top-left">Top left</option>
            <option value="bottom-center">Bottom center</option>
            <option value="top-center">Top center</option>
          </select>
          <select name="mediaType">
            <option value="auto">Auto media type</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
          <input name="mediaUrl" placeholder="Image, video, or audio URL">
          <input name="intervalSeconds" type="number" min="60" value="600" placeholder="Cooldown seconds">
          <input name="closeDelaySeconds" type="number" min="1" max="10" value="1" placeholder="Close delay seconds">
          <label class="inline-check"><input type="checkbox" name="enabled" checked> Enabled</label>
          <button class="btn">Add Campaign</button>
        </form>
        <div class="admin-list ad-admin-list">
          ${(state.ads || []).length ? state.ads.map((ad) => `
            <div class="admin-row ad-admin-row">
              <span class="ad-preview-swatch">${ad.mediaUrl ? adMedia({ ...ad, text: "" }) : ""}</span>
              <div>
                <strong>${escapeHtml(ad.name || "Untitled campaign")}</strong>
                <small>${escapeHtml(ad.text || "No display text")} / ${escapeHtml(ad.placement || "bottom-right")} / every ${escapeHtml(ad.intervalSeconds || 600)}s</small>
              </div>
              <button class="btn secondary" data-ad-toggle="${escapeHtml(ad.id)}" data-ad-enabled="${ad.enabled === false ? "true" : "false"}">${ad.enabled === false ? "Enable" : "Disable"}</button>
              <button class="btn danger" data-ad-delete="${escapeHtml(ad.id)}">Delete</button>
            </div>
          `).join("") : `<p class="admin-note">No ad campaigns yet.</p>`}
        </div>
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
  bindForm("loginForm", "/api/auth/login", () => location.href = pageUrl("profile"));
  bindForm("signupForm", "/api/auth/signup", () => location.href = pageUrl("profile"));
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
  bindForm("staffMonthForm", "/api/admin/staff", () => location.reload(), (form) => ({
    action: "set-staff-month",
    username: form.username.value,
    message: form.message.value
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
  bindForm("banForm", "/api/admin/users", () => location.reload(), (form) => ({ username: form.username.value, banned: form.banned.value === "true" }));
  bindForm("supporterTextForm", "/api/admin/supporters", () => location.reload(), (form) => ({
    title: form.title.value,
    intro: form.intro.value,
    customersTitle: form.customersTitle.value
  }));
  bindForm("supporterPodiumForm", "/api/admin/supporters", () => location.reload(), (form) => ({
    action: "podium",
    place: form.place.value,
    username: form.username.value,
    spent: form.spent.value
  }));
  bindForm("supporterCustomerForm", "/api/admin/supporters", () => location.reload(), (form) => ({
    action: "add-customer",
    username: form.username.value
  }));
  bindForm("adForm", "/api/admin/ads", () => location.reload(), (form) => ({
    name: form.name.value,
    text: form.text.value,
    linkUrl: form.linkUrl.value,
    mediaUrl: form.mediaUrl.value,
    mediaType: form.mediaType.value,
    placement: form.placement.value,
    showOn: "website",
    intervalSeconds: form.intervalSeconds.value,
    closeDelaySeconds: form.closeDelaySeconds.value,
    enabled: form.enabled.checked
  }));

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await api("/api/auth/logout", {});
    location.href = pageUrl("home");
  });
  document.querySelectorAll("[data-remove-staff]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/admin/staff", { username: button.dataset.removeStaff }, "DELETE");
    location.reload();
  }));
  document.getElementById("deleteStaffMonth")?.addEventListener("click", async () => {
    await api("/api/admin/staff", { action: "delete-staff-month" }, "PATCH");
    location.reload();
  });
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
  document.querySelectorAll("[data-remove-supporter]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/admin/supporters", { action: "remove-customer", username: button.dataset.removeSupporter }, "PATCH");
    location.reload();
  }));
  document.querySelectorAll("[data-ad-toggle]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/admin/ads", { action: "toggle", id: button.dataset.adToggle, enabled: button.dataset.adEnabled === "true" }, "PATCH");
    location.reload();
  }));
  document.querySelectorAll("[data-ad-delete]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/admin/ads", { action: "delete", id: button.dataset.adDelete }, "DELETE");
    location.reload();
  }));
  document.querySelectorAll("[data-delete-thread]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/forums/delete", { threadId: button.dataset.deleteThread }, "DELETE");
    location.href = pageUrl("forums");
  }));
  document.querySelectorAll("[data-social-action]").forEach((button) => button.addEventListener("click", async () => {
    await api("/api/user/social", { action: button.dataset.socialAction, username: button.dataset.username });
    location.reload();
  }));
  document.querySelectorAll("[data-open-dm]").forEach((button) => button.addEventListener("click", async () => {
    await openDmDrawer(button.dataset.openDm);
  }));
  document.querySelectorAll("[data-copy-ip]").forEach((button) => button.addEventListener("click", async () => {
    await navigator.clipboard?.writeText(button.dataset.copyIp);
    button.textContent = "Copied";
    setTimeout(() => { button.textContent = button.dataset.copyIp; }, 1200);
  }));
  bindForm("dmForm", "/api/user/social", () => location.reload(), (form) => ({
    action: "dm",
    username: form.username.value,
    message: form.message.value
  }));
}

async function openDmDrawer(username = "") {
  const drawer = document.getElementById("dmDrawer");
  if (!drawer || !state.user) return;
  drawer.classList.add("open");
  await refreshDms();
  if (username) {
    activeDmUser = username;
    await renderDmChat();
  } else {
    renderDmList();
  }
}

function closeDmDrawer() {
  document.getElementById("dmDrawer")?.classList.remove("open");
  activeDmUser = "";
}

async function refreshDms() {
  const result = await api("/api/user/dms", { action: "list" });
  if (result.ok) state.dms = result.conversations || [];
}

function renderDmList() {
  activeDmUser = "";
  const body = document.getElementById("dmBody");
  const title = document.getElementById("dmTitle");
  const compose = document.getElementById("dmCompose");
  if (!body || !title) return;
  title.textContent = "Direct Messages";
  if (compose) compose.style.display = "none";
  body.innerHTML = state.dms.length ? state.dms.map((dm) => {
    const other = dm.other || dm.participants?.find((name) => !sameUser(name, state.user.username)) || "Unknown";
    const last = dm.lastMessage;
    const label = last ? `${sameUser(last.from, state.user.username) ? "You" : other}: "${last.body}"` : "Open chat";
    return `<button class="dm-row" type="button" data-dm-user="${escapeHtml(other)}"><img class="avatar" src="${avatar(other, 40)}" alt=""><span><strong>${escapeHtml(other)}</strong><small>${escapeHtml(label)}</small></span></button>`;
  }).join("") : `<p>No DMs yet. Open a friend's profile and press Message.</p>`;
  body.querySelectorAll("[data-dm-user]").forEach((button) => button.addEventListener("click", async () => {
    activeDmUser = button.dataset.dmUser;
    await renderDmChat();
  }));
}

async function renderDmChat() {
  const body = document.getElementById("dmBody");
  const title = document.getElementById("dmTitle");
  const compose = document.getElementById("dmCompose");
  if (!body || !title || !activeDmUser) return;
  title.textContent = activeDmUser;
  if (compose) compose.style.display = "grid";
  const result = await api("/api/user/dms", { action: "get", username: activeDmUser });
  const messages = result.conversation?.messages || [];
  body.innerHTML = `
    <div class="dm-chat">
      ${messages.length ? messages.map((message) => {
        const mine = sameUser(message.from, state.user.username);
        return `<div class="dm-bubble ${mine ? "me" : ""}"><strong>${mine ? "You" : escapeHtml(message.from)}</strong><p>${escapeHtml(message.body)}</p><small>${date(message.createdAt)}</small></div>`;
      }).join("") : `<p>No messages yet.</p>`}
    </div>
  `;
  body.scrollTop = body.scrollHeight;
}

async function sendDrawerDm() {
  const input = document.getElementById("dmInput");
  if (!input || !activeDmUser || !input.value.trim()) return;
  const result = await api("/api/user/dms", { action: "send", username: activeDmUser, message: input.value.trim() });
  if (!result.ok) {
    input.value = result.error || "Failed to send";
    return;
  }
  input.value = "";
  await refreshDms();
  await renderDmChat();
}

function bindForm(id, url, success, serialize) {
  const form = document.getElementById(id);
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = serialize ? serialize(form) : Object.fromEntries(new FormData(form).entries());
    const result = await api(url, body);
    if (result.ok) return success(result);
    let message = form.querySelector(".message") || document.getElementById("formMessage");
    if (!message) {
      message = document.createElement("p");
      message.className = "message";
      form.appendChild(message);
    }
    if (message) message.textContent = result.error || `Something went wrong. Tried ${apiUrl(url)}.`;
  });
}

async function api(url, body, method = "POST", retriedIndexRoute = false) {
  let res;
  try {
    res = await fetch(apiUrl(url), {
      method,
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (error) {
    return { ok: false, error: `Could not reach the website API. ${error.message || ""}`.trim() };
  }
  const text = await res.text();
  const json = text ? parseJson(text) : {};
  if (!res.ok && !retriedIndexRoute && url.startsWith("/api/") && !url.startsWith("/api/index")) {
    const indexUrl = `/api/index?path=${encodeURIComponent(url.replace(/^\/api\/?/, ""))}`;
    const retry = await api(indexUrl, body, method, true);
    if (retry.ok || retry.error !== "API route not found.") return retry;
  }
  return {
    ok: res.ok,
    error: json.error || (!res.ok ? text.slice(0, 180) || `Request failed (${res.status})` : undefined),
    ...json
  };
}

function apiUrl(path) {
  const base = String(config.api?.baseUrl || "").replace(/\/$/, "");
  const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (!base || isLocal || location.origin === base) return path;
  return `${base}${path}`;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function boardRow(board, threads) {
  const latest = threads.find((thread) => thread.boardId === board.id);
  return `
    <a class="board-row" href="${pageUrl("forums")}?board=${board.id}">
      <span class="forum-icon">Chat</span>
      <div><strong>${escapeHtml(board.name)}</strong><br><small>${escapeHtml(board.description)}${board.locked ? " / Locked" : ""}</small></div>
      ${latest ? latestBlock(latest) : `<small>0 Threads</small>`}
    </a>
  `;
}

function threadRow(thread) {
  return `
    <a class="thread-row" href="${pageUrl("forums")}?thread=${thread.id}">
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
        <div class="byline"><img class="avatar" src="${avatar(thread.author, 40)}" alt=""><strong><a href="${profileHref(thread.author)}">${escapeHtml(thread.author)}</a></strong><small>${date(thread.createdAt)}</small></div>
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

function allNotifications() {
  if (!state.user) return [];
  const following = state.user.following || [];
  const items = [];
  for (const thread of state.threads) {
    if (thread.boardId === "announcements" || thread.boardId === "rules" || thread.announcement) {
      items.push({ type: "thread", title: thread.title, detail: `Official ${thread.boardId} post`, href: `${pageUrl("forums")}?thread=${thread.id}`, createdAt: thread.createdAt });
    } else if (following.some((name) => sameUser(name, thread.author))) {
      items.push({ type: "thread", title: thread.title, detail: `${thread.author} posted a thread`, href: `${pageUrl("forums")}?thread=${thread.id}`, createdAt: thread.createdAt });
    }
  }
  for (const dm of state.dms || []) {
    const last = dm.lastMessage || (dm.messages || [])[dm.messages?.length - 1];
    if (!last) continue;
    const other = dm.other || dm.participants?.find((name) => !sameUser(name, state.user.username)) || last.from;
    items.push({ type: "dm", user: other, mine: sameUser(last.from, state.user.username), title: `DM from ${sameUser(last.from, state.user.username) ? "you" : other}`, detail: `${sameUser(last.from, state.user.username) ? "You" : other}: "${last.body}"`, href: "#", createdAt: last.createdAt || dm.updatedAt });
  }
  return items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 12);
}

function unreadNotifications() {
  const seen = state.user?.lastNotificationSeenAt ? new Date(state.user.lastNotificationSeenAt).getTime() : 0;
  return allNotifications().filter((item) => new Date(item.createdAt || 0).getTime() > seen && !item.mine);
}

function unreadDmCount() {
  const seen = state.user?.lastNotificationSeenAt ? new Date(state.user.lastNotificationSeenAt).getTime() : 0;
  return allNotifications().filter((item) => item.type === "dm" && !item.mine && new Date(item.createdAt || 0).getTime() > seen).length;
}

function staffCard(person, color) {
  return `<a class="panel staff-card" href="${staffHref(person.username)}"><img src="${person.avatar || avatar(person.username, 96)}" alt=""><strong>${escapeHtml(person.username)}</strong><span class="rank-pill" style="background:${color}">${escapeHtml(person.rank)}</span></a>`;
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
    supporters: "Supporters",
    staff: "Staff",
    profile: "Profile",
    admin: "Admin",
    privacy: "Privacy"
  };
  const parts = [`<a href="${pageUrl("home")}">Home</a>`];
  if (page !== "home") parts.push(`<span>/</span><a href="${pageUrl(page)}">${labels[page] || page}</a>`);
  if (page === "forums" && params.get("board")) {
    const board = state.boards.find((item) => item.id === params.get("board"));
    parts.push(`<span>/</span><strong>${escapeHtml(board?.name || "Board")}</strong>`);
  }
  if (page === "forums" && params.get("thread")) {
    const thread = state.threads.find((item) => item.id === params.get("thread"));
    const board = state.boards.find((item) => item.id === thread?.boardId);
    if (board) parts.push(`<span>/</span><a href="${pageUrl("forums")}?board=${board.id}">${escapeHtml(board.name)}</a>`);
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
    const res = await fetch(apiUrl("/api/server/status"), { credentials: "include" });
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

function formatLongDateTime(value) {
  if (!value) return "unknown";
  return new Date(value).toLocaleString(undefined, { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days) return `${days}d ${hours}h ${minutes}m`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function sameUser(a, b) {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

function registeredUser(username) {
  return state.users.find((user) => sameUser(user.username, username));
}

function profileHref(username) {
  return `${pageUrl("profile")}?user=${encodeURIComponent(username)}`;
}

function staffHref(username) {
  return registeredUser(username) ? profileHref(username) : `${pageUrl("staff")}?user=${encodeURIComponent(username)}`;
}

function pageUrl(name) {
  const routes = {
    home: "home/",
    login: "login/",
    signup: "signup/",
    forums: "forums/",
    news: "news/",
    gamemodes: "gamemodes/",
    community: "community/",
    supporters: "supporters/",
    staff: "staff/",
    profile: "profile/",
    admin: "admin/",
    privacy: "privacy/",
    store: "store/"
  };
  return routes[name] || "home/";
}

function slug(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

function escapeAttribute(value) {
  return escapeHtml(value);
}
