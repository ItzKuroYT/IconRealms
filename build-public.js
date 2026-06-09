const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const out = path.join(root, "public");

const files = [
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
  "config.js"
];

const optionalFiles = [
  "banner-lightmode.png",
  "banner-darkmode.png"
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of files) copyFile(file);
for (const file of optionalFiles) {
  if (fs.existsSync(path.join(root, file))) copyFile(file);
}
copyDir("assets");

console.log("Built static website into public/");

function copyFile(relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(out, relativePath);
  if (!fs.existsSync(from)) {
    console.error(`Missing ${relativePath}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDir(relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(out, relativePath);
  if (!fs.existsSync(from)) {
    console.error(`Missing ${relativePath}`);
    process.exit(1);
  }
  fs.cpSync(from, to, { recursive: true });
}
