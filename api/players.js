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

  // Identité/effectif issus du box score (poste, taille, id), puis on superpose
  // les MOYENNES SAISON (Effectif = moyennes saison, pas la ligne d'un match).
  // Les clés exposées restent identiques (min, pts, reb, pd, int, ct, bp,
  // tirsPct, eva) ; on ajoute mj (matchs joués). Compatibilité API préservée.
  const saison = new Map((DATA.statsSaison?.joueurs || []).map((s) => [s.nom, s]));
  const roster = DATA.matchHapoel.joueurs.map((j) => {
    const s = saison.get(j.nom);
    const base = { id: slug(j.nom), ...j };
    if (!s) return base;
    return {
      ...base,
      mj: s.mj,
      min: s.min, pts: s.pts, reb: s.reb, pd: s.pd,
      int: s.int, ct: s.ct, bp: s.bp, tirsPct: s.tirsPct, eva: s.eva,
    };
  });

  if (!id) {
    return send(res, 200, {
      club: DATA.club.nom,
      source: "Moyennes saison EuroLeague 2025-26 (valeurs démo — cf. statsSaison.demo)",
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
