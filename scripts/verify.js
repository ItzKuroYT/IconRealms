const fs = require("node:fs");

const required = [
  "index.html",
  "login.html",
  "signup.html",
  "forums.html",
  "news.html",
  "gamemodes.html",
  "community.html",
  "staff.html",
  "profile.html",
  "admin.html",
  "store.html",
  "privacy.html",
  "assets/site.css",
  "assets/app.js",
  "config.js",
<<<<<<< Updated upstream
  "scripts/build-public.js",
  "api/state.js",
  "api/server/status.js",
  "api/user/profile.js",
  "api/user/social.js",
  "api/plugin/register.js",
  "api/plugin/heartbeat.js",
=======
  "build-public.js",
  "scripts/build-public.js",
  "api/index.js",
  "lib/server.js",
>>>>>>> Stashed changes
  "icon-register/pom.xml"
];

for (const file of required) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${file}`);
    process.exit(1);
  }
}

console.log("IconRealms static HTML + API files verified.");
