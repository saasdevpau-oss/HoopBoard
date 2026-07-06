const DATA = require("../lib/data.js");
const { send, methodGuard, slug } = require("../lib/http.js");

/**
 * GET /api/matches            — liste des matchs du tournoi
 * GET /api/matches?id=<slug>  — détail (le box score complet existe pour hapoel)
 */
module.exports = (req, res) => {
  if (!methodGuard(req, res, ["GET"])) return;
  const url = new URL(req.url, "http://x");
  const id = url.searchParams.get("id");

  const list = DATA.tournoi.resultats.map((m) => ({
    id: slug(m.adversaire),
    ...m,
  }));

  if (!id) return send(res, 200, { matches: list });

  const match = list.find((m) => m.id === id || m.id.includes(id));
  if (!match) return send(res, 404, { error: `Match inconnu : ${id}` });

  const detail = { ...match };
  if (match.id.includes("hapoel")) detail.boxScore = DATA.matchHapoel;
  send(res, 200, { match: detail });
};
