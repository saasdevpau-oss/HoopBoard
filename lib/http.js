/** Petits utilitaires partagés par les fonctions API. */
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function methodGuard(req, res, allowed) {
  if (req.method === "OPTIONS") { send(res, 204, {}); return false; }
  if (!allowed.includes(req.method)) {
    send(res, 405, { error: `Méthode ${req.method} non autorisée` });
    return false;
  }
  return true;
}

async function readJson(req) {
  if (req.body !== undefined) {
    // Vercel parse déjà le JSON quand Content-Type est application/json
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

const slug = (s) => s.toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

module.exports = { send, methodGuard, readJson, slug };
