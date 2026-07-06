const { send, methodGuard, readJson } = require("../lib/http.js");

const LABELS = {
  make2: { label: "Panier à 2 points", pts: 2 },
  make3: { label: "Panier à 3 points", pts: 3 },
  miss: { label: "Tir manqué", pts: 0 },
  reb: { label: "Rebond", pts: 0 },
  ast: { label: "Passe décisive", pts: 0 },
  stl: { label: "Interception", pts: 0 },
  blk: { label: "Contre", pts: 0 },
  to: { label: "Perte de balle", pts: 0 },
  foul: { label: "Faute personnelle", pts: 0 },
};

/**
 * POST /api/events { type, player, zone?, clock? } — pipeline de saisie live.
 * Répond l'entrée normalisée telle qu'elle serait persistée/diffusée.
 */
module.exports = async (req, res) => {
  if (!methodGuard(req, res, ["POST"])) return;
  let body;
  try { body = await readJson(req); }
  catch { return send(res, 400, { error: "JSON invalide" }); }

  const def = LABELS[body.type];
  if (!def) return send(res, 400, { error: `Type inconnu : ${body.type}`, types: Object.keys(LABELS) });
  if (!body.player) return send(res, 400, { error: "Champ player requis" });

  send(res, 201, {
    ok: true,
    event: {
      id: `evt_${Date.now().toString(36)}`,
      type: body.type,
      label: def.label,
      pts: def.pts,
      player: String(body.player).slice(0, 60),
      zone: body.zone ? String(body.zone).slice(0, 40) : null,
      clock: body.clock || null,
      recordedAt: new Date().toISOString(),
    },
  });
};
