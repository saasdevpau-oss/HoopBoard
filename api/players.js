const DATA = require("../lib/data.js");
const { send, methodGuard, slug } = require("../lib/http.js");

/**
 * GET /api/players            — effectif avec la ligne du dernier box score
 * GET /api/players?id=<slug>  — fiche d'un joueur (la vedette a ses moyennes)
 */
module.exports = (req, res) => {
  if (!methodGuard(req, res, ["GET"])) return;
  const url = new URL(req.url, "http://x");
  const id = url.searchParams.get("id");

  const roster = DATA.matchHapoel.joueurs.map((j) => ({ id: slug(j.nom), ...j }));

  if (!id) {
    return send(res, 200, {
      club: DATA.club.nom,
      source: "Box score vs Hapoel Tel Aviv (Proballers, 20/03/2026)",
      players: roster,
    });
  }

  const player = roster.find((p) => p.id === id || p.id.includes(id));
  if (!player) return send(res, 404, { error: `Joueur inconnu : ${id}` });

  const fiche = { ...player };
  if (slug(DATA.joueurVedette.nom) === player.id) {
    fiche.profil = DATA.joueurVedette;
  }
  send(res, 200, { player: fiche });
};
