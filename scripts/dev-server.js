/**
 * Serveur de développement local — équivalent minimal de `vercel dev`.
 *
 * Sert les fichiers statiques à la racine et route /api/<nom> vers
 * api/<nom>.js (mêmes handlers que sur Vercel, non modifiés). Sert uniquement
 * au test local ; la production reste gérée par vercel.json.
 *
 *   node scripts/dev-server.js [port]
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PORT = Number(process.argv[2]) || 3000;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let pathname = decodeURIComponent(url.pathname);

  // --- Routes API : on recharge le handler à chaque requête (hot reload). ---
  if (pathname.startsWith("/api/")) {
    const name = pathname.slice(5).split("/")[0];
    const file = path.join(ROOT, "api", name + ".js");
    if (!fs.existsSync(file)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Route inconnue : " + pathname }));
    }
    try {
      delete require.cache[require.resolve(file)];
      const handler = require(file);
      return handler(req, res);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: String(err && err.message) }));
    }
  }

  // --- Fichiers statiques -------------------------------------------------
  if (pathname === "/") pathname = "/index.html";
  const file = path.join(ROOT, pathname);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("404 — " + pathname);
  }
  res.writeHead(200, {
    "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log("HoopBoard dev — http://localhost:" + PORT);
  console.log("  coach : http://localhost:" + PORT + "/coach.html");
});
