/**
 * HoopBoard — Fondations du moteur d'événements de match (PR4.2)
 *
 * Objectif : un match repose sur UNE seule liste chronologique d'événements
 * (`events`), qui devient la source de vérité pour toutes les statistiques.
 *
 * ⚠️ PR4.2 = fondations seulement. Ce module est autonome : il n'est branché
 * sur aucune route API et ne modifie aucune réponse existante. Les fonctions
 * sont pures et sans effet de bord, prêtes à être consommées par les futures
 * PR (calcul de box score, feed live, play-by-play).
 */

/**
 * Les 15 (et uniquement 15) types d'événements supportés.
 * Aucun autre type ne doit être ajouté sans décision produit explicite.
 */
const EVENT_TYPES = Object.freeze({
  SHOT_MADE: "SHOT_MADE",
  SHOT_MISSED: "SHOT_MISSED",
  FREE_THROW_MADE: "FREE_THROW_MADE",
  FREE_THROW_MISSED: "FREE_THROW_MISSED",
  REBOUND_OFF: "REBOUND_OFF",
  REBOUND_DEF: "REBOUND_DEF",
  ASSIST: "ASSIST",
  STEAL: "STEAL",
  BLOCK: "BLOCK",
  TURNOVER: "TURNOVER",
  FOUL: "FOUL",
  SUBSTITUTION: "SUBSTITUTION",
  TIMEOUT: "TIMEOUT",
  START_PERIOD: "START_PERIOD",
  END_PERIOD: "END_PERIOD",
});

const EVENT_TYPE_LIST = Object.freeze(Object.keys(EVENT_TYPES));

/**
 * Structure d'un événement de match (la source de vérité).
 * @typedef {Object} MatchEvent
 * @property {string} type    - une valeur de EVENT_TYPES
 * @property {?string} player - joueur concerné (null pour TIMEOUT / PERIOD)
 * @property {?number} points - points marqués par l'événement (2, 3, 1 ou 0)
 * @property {?number} period - numéro de période (1..N), si connu
 * @property {?string} clock  - horloge "mm:ss" restante, si connue
 * @property {?Object} meta    - infos additionnelles (zone, adversaire…)
 */

/** Vrai si `type` fait partie des 15 types autorisés. */
function isValidEventType(type) {
  return Object.prototype.hasOwnProperty.call(EVENT_TYPES, type);
}

/**
 * Fabrique un événement normalisé. Ne persiste rien, ne valide que le type.
 * @param {string} type
 * @param {Object} [attrs]
 * @returns {MatchEvent}
 */
function makeEvent(type, attrs = {}) {
  if (!isValidEventType(type)) {
    throw new Error(`Type d'événement inconnu : ${type}`);
  }
  return {
    type,
    player: attrs.player != null ? String(attrs.player) : null,
    points: Number.isFinite(attrs.points) ? attrs.points : 0,
    period: Number.isFinite(attrs.period) ? attrs.period : null,
    clock: attrs.clock != null ? String(attrs.clock) : null,
    meta: attrs.meta || null,
  };
}

/**
 * Enveloppe un match sous forme de timeline unique.
 * @param {Object} [meta]  - métadonnées (date, compétition, adversaire…)
 * @param {MatchEvent[]} [events]
 */
function createMatchTimeline(meta = {}, events = []) {
  return { meta, events: Array.isArray(events) ? events.slice() : [] };
}

/** Parse "8-10" -> { made: 8, attempted: 10 }. Tolérant aux valeurs vides. */
function parseMadeAttempted(str) {
  if (typeof str !== "string") return { made: 0, attempted: 0 };
  const [m, a] = str.split("-").map((n) => parseInt(n, 10));
  return { made: m || 0, attempted: a || 0 };
}

/**
 * Reconstruit une liste d'événements à partir d'une ligne de box score
 * joueur (ancien format `matchHapoel.joueurs[i]`). Les COMPTES sont factuels ;
 * seule la chronologie (period/clock) est inconnue et laissée à null.
 *
 * Sert à alimenter la timeline depuis les données historiques existantes
 * sans réécrire les sources. Aggregate(events) reproduit alors la ligne.
 *
 * @param {Object} line - ex. { nom, p2:"8-10", p3:"0-0", lf:"9-9", ro, rd, pd, int, ct, bp, fa }
 * @returns {MatchEvent[]}
 */
function eventsFromBoxScoreLine(line) {
  const out = [];
  const push = (n, type, points, meta) => {
    for (let i = 0; i < n; i++) out.push(makeEvent(type, { player: line.nom, points, meta }));
  };

  const two = parseMadeAttempted(line.p2);
  const three = parseMadeAttempted(line.p3);
  const ft = parseMadeAttempted(line.lf);

  // Les tirs portent leur valeur (meta.value) pour que le split 2/3 pts soit
  // reconstituable depuis les événements (y compris pour les tirs manqués).
  push(two.made, EVENT_TYPES.SHOT_MADE, 2, { value: 2 });
  push(two.attempted - two.made, EVENT_TYPES.SHOT_MISSED, 0, { value: 2 });
  push(three.made, EVENT_TYPES.SHOT_MADE, 3, { value: 3 });
  push(three.attempted - three.made, EVENT_TYPES.SHOT_MISSED, 0, { value: 3 });
  push(ft.made, EVENT_TYPES.FREE_THROW_MADE, 1);
  push(ft.attempted - ft.made, EVENT_TYPES.FREE_THROW_MISSED, 0);

  push(line.ro || 0, EVENT_TYPES.REBOUND_OFF, 0);
  push(line.rd || 0, EVENT_TYPES.REBOUND_DEF, 0);
  push(line.pd || 0, EVENT_TYPES.ASSIST, 0);
  push(line.int || 0, EVENT_TYPES.STEAL, 0);
  push(line.ct || 0, EVENT_TYPES.BLOCK, 0);
  push(line.bp || 0, EVENT_TYPES.TURNOVER, 0);
  push(line.fa || 0, EVENT_TYPES.FOUL, 0);

  return out;
}

/** Construit la timeline complète d'un match à partir d'un box score existant. */
function timelineFromBoxScore(boxScore) {
  const events = [];
  (boxScore.joueurs || []).forEach((line) => {
    events.push(...eventsFromBoxScoreLine(line));
  });
  return createMatchTimeline(
    { date: boxScore.date, competition: boxScore.competition, scoreFinal: boxScore.scoreFinal },
    events
  );
}

/** Ligne de stats vierge pour l'agrégation. */
function emptyStatLine() {
  return {
    pts: 0,
    fgMade: 0, fgAtt: 0, ftMade: 0, ftAtt: 0,
    ro: 0, rd: 0, reb: 0,
    pd: 0, int: 0, ct: 0, bp: 0, fa: 0,
  };
}

/**
 * Agrège une liste d'événements en statistiques par joueur.
 * Fondation du futur calcul de box score : la timeline devient la source
 * de vérité, ces totaux en découlent.
 *
 * @param {MatchEvent[]} events
 * @returns {Object<string, ReturnType<typeof emptyStatLine>>} stats par joueur
 */
function aggregateStats(events) {
  const byPlayer = {};
  const lineFor = (name) => (byPlayer[name] || (byPlayer[name] = emptyStatLine()));

  for (const ev of events) {
    if (!ev || ev.player == null) continue; // TIMEOUT / PERIOD / SUBSTITUTION sans joueur
    const s = lineFor(ev.player);
    switch (ev.type) {
      case EVENT_TYPES.SHOT_MADE: s.fgMade++; s.fgAtt++; s.pts += ev.points || 0; break;
      case EVENT_TYPES.SHOT_MISSED: s.fgAtt++; break;
      case EVENT_TYPES.FREE_THROW_MADE: s.ftMade++; s.ftAtt++; s.pts += ev.points || 1; break;
      case EVENT_TYPES.FREE_THROW_MISSED: s.ftAtt++; break;
      case EVENT_TYPES.REBOUND_OFF: s.ro++; s.reb++; break;
      case EVENT_TYPES.REBOUND_DEF: s.rd++; s.reb++; break;
      case EVENT_TYPES.ASSIST: s.pd++; break;
      case EVENT_TYPES.STEAL: s.int++; break;
      case EVENT_TYPES.BLOCK: s.ct++; break;
      case EVENT_TYPES.TURNOVER: s.bp++; break;
      case EVENT_TYPES.FOUL: s.fa++; break;
      default: break; // SUBSTITUTION / TIMEOUT / START_PERIOD / END_PERIOD : pas de stat
    }
  }
  return byPlayer;
}

const HoopEvents = {
  EVENT_TYPES,
  EVENT_TYPE_LIST,
  isValidEventType,
  makeEvent,
  createMatchTimeline,
  eventsFromBoxScoreLine,
  timelineFromBoxScore,
  aggregateStats,
};

/* Utilisable côté Node (require) ET navigateur (window.HoopEvents). */
if (typeof module !== "undefined" && module.exports) module.exports = HoopEvents;
if (typeof window !== "undefined") window.HoopEvents = HoopEvents;
