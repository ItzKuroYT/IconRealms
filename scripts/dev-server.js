const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const port = Number(process.env.PORT || 3000);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

const rewrites = {
  "/": "/index.html"
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url.pathname);

  const pathname = rewrites[url.pathname] || routePath(url.pathname);
  const filePath = path.normalize(path.join(root, pathname));
  if (!filePath.startsWith(root)) return notFound(res);
  fs.readFile(filePath, (error, data) => {
    if (error) return notFound(res);
    res.statusCode = 200;
    res.setHeader("Content-Type", types[path.extname(filePath)] || "application/octet-stream");
    res.end(data);
  });
});

function routePath(pathname) {
  if (pathname.endsWith("/")) return `${pathname}index.html`;
  if (!path.extname(pathname)) return `${pathname}/index.html`;
  return pathname;
}

async function handleApi(req, res, pathname) {
  const file = path.join(root, "api", "index.js");
  if (!fs.existsSync(file)) return notFound(res);
  delete require.cache[require.resolve(file)];
  try {
    await require(file)(req, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: error.message }));
  }
}

function notFound(res) {
  res.statusCode = 404;
  res.end("Not found");
}

server.listen(port, () => {
  console.log(`IconRealms HTML website running at http://localhost:${port}`);
});
