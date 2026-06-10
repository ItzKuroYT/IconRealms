const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const out = path.join(root, "public");

const files = [
  "index.html",
  "config.js"
];

const pages = [
  ["home.html", "home"],
  ["login.html", "login"],
  ["signup.html", "signup"],
  ["forums.html", "forums"],
  ["news.html", "news"],
  ["gamemodes.html", "gamemodes"],
  ["community.html", "community"],
  ["supporters.html", "supporters"],
  ["staff.html", "staff"],
  ["profile.html", "profile"],
  ["admin.html", "admin"],
  ["store.html", "store"],
  ["privacy.html", "privacy"]
];

const optionalFiles = [
  "banner-lightmode.png",
  "banner-darkmode.png"
];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const file of files) copyFile(file);
for (const [file, route] of pages) copyFile(file, path.join(route, "index.html"));
for (const file of optionalFiles) {
  if (fs.existsSync(path.join(root, file))) copyFile(file);
}
copyDir("assets");

console.log("Built static website into public/");

function copyFile(relativePath, outputPath = relativePath) {
  const from = path.join(root, relativePath);
  const to = path.join(out, outputPath);
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
