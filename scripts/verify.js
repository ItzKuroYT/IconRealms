const fs = require("node:fs");

const required = [
  "index.html",
  "login.html",
  "signup.html",
  "forums.html",
  "news.html",
  "gamemodes.html",
  "community.html",
  "supporters.html",
  "staff.html",
  "profile.html",
  "admin.html",
  "store.html",
  "privacy.html",
  "assets/site.css",
  "assets/app.js",
  "assets/icon.png",
  "config.js",
  "package.json",
  "vercel.json",
  "build-public.js",
  "scripts/dev-server.js",
  "api/index.js",
  "lib/server.js",
  "home/index.html",
  "login/index.html",
  "signup/index.html",
  "forums/index.html",
  "news/index.html",
  "gamemodes/index.html",
  "community/index.html",
  "staff/index.html",
  "supporters/index.html",
  "profile/index.html",
  "admin/index.html",
  "store/index.html",
  "privacy/index.html"
];

const alternatives = [
  ["icon-register/pom.xml", "../icon-register/pom.xml"]
];

for (const file of required) {
  if (!fs.existsSync(file)) {
    console.error(`Missing ${file}`);
    process.exit(1);
  }
}

for (const group of alternatives) {
  if (!group.some((file) => fs.existsSync(file))) {
    console.error(`Missing one of: ${group.join(", ")}`);
    process.exit(1);
  }
}

console.log("IconRealms static HTML + API files verified.");
