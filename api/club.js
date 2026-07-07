const DATA = require("../lib/data.js");
const { send, methodGuard } = require("../lib/http.js");

/**
 * GET /api/club — identité du club + bilan du tournoi en cours.
 * `zonesTir` (zones de tir saison) est ajouté de façon additive pour préparer
 * les terrains analytics — clés existantes (club, tournoi) inchangées.
 */
module.exports = (req, res) => {
  if (!methodGuard(req, res, ["GET"])) return;
  send(res, 200, { club: DATA.club, tournoi: DATA.tournoi, zonesTir: DATA.zonesTirSaison });
};
