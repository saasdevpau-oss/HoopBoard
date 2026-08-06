/**
 * HoopBoard — Store : source de vérité unique côté UI.
 * ------------------------------------------------------------------
 * Normalise les vraies données Žalgiris (lib/data.js) en un modèle propre
 * (matchs, joueurs) et DÉRIVE les box scores des ÉVÉNEMENTS (lib/match-events.js)
 * plutôt que de coder des nombres en dur dans les composants.
 *
 * - Un match « finalisé » avec box score officiel (Žalgiris–Hapoel) est
 *   converti en événements puis ré-agrégé : les totaux reproduisent la donnée
 *   officielle (prouve le modèle event-sourced).
 * - Un match « live » (à venir) portera directement sa liste d'événements.
 *
 * Expose window.HoopStore (navigateur) ET module.exports (Node/tests).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('../lib/data.js'), require('../lib/match-events.js'));
  } else {
    root.HoopStore = factory(root.HOOPBOARD_DATA, root.HoopEvents);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (DATA, EV) {
  'use strict';

  const slug = (s) => (s == null ? '' : String(s)).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const CLUB = DATA.club;
  const TOURNOI = DATA.tournoi;
  const MH = DATA.matchHapoel;

  /* Numéros de maillot — cohérents avec le ROSTER du Match Live. */
  const NUMS = {
    'Sylvain Francisco': 3, 'Nigel Williams-Goss': 1, 'Moses Wright': 7, 'Maodo Lô': 12,
    'Ąžuolas Tubelis': 10, 'Ignas Brazdeikis': 9, 'Dustin Sleva': 8, 'Edgaras Ulanovas': 6,
    'Arnas Butkevičius': 5, 'Laurynas Birutis': 13
  };

  /* Identifiants de match stables (URLs courtes et lisibles). */
  const MATCH_ID = {
    'Hapoel Tel Aviv': 'hapoel', 'Real Madrid': 'real-madrid', 'Olympiacos': 'olympiacos',
    'Paris Basketball': 'paris', 'Fenerbahçe Beko': 'fenerbahce'
  };
  const matchIdFor = (adv) => MATCH_ID[adv] || slug(adv);

  /* ================================================================
     Agrégation DÉTAILLÉE d'événements -> ligne de box score (split 2/3 pts)
     ================================================================ */
  function emptyDetailed() {
    return { p2m: 0, p2a: 0, p3m: 0, p3a: 0, ftm: 0, fta: 0, ro: 0, rd: 0, reb: 0, pd: 0, int: 0, ct: 0, bp: 0, fa: 0, pts: 0 };
  }
  function aggregateDetailed(events) {
    const T = EV.EVENT_TYPES, s = emptyDetailed();
    for (const ev of (events || [])) {
      const v = ev.meta && ev.meta.value;
      switch (ev.type) {
        case T.SHOT_MADE: if (v === 3) { s.p3m++; s.p3a++; } else { s.p2m++; s.p2a++; } s.pts += ev.points || 0; break;
        case T.SHOT_MISSED: if (v === 3) s.p3a++; else s.p2a++; break;
        case T.FREE_THROW_MADE: s.ftm++; s.fta++; s.pts += ev.points || 1; break;
        case T.FREE_THROW_MISSED: s.fta++; break;
        case T.REBOUND_OFF: s.ro++; s.reb++; break;
        case T.REBOUND_DEF: s.rd++; s.reb++; break;
        case T.ASSIST: s.pd++; break;
        case T.STEAL: s.int++; break;
        case T.BLOCK: s.ct++; break;
        case T.TURNOVER: s.bp++; break;
        case T.FOUL: s.fa++; break;
        default: break;
      }
    }
    return s;
  }
  const pct = (m, a) => (a > 0 ? Math.round((m / a) * 1000) / 10 : null);

  /* ================================================================
     JOUEURS (effectif) — moyennes saison = source de vérité de l'effectif
     ================================================================ */
  const IDENTITY = {};
  MH.joueurs.forEach((j) => { IDENTITY[j.nom] = { poste: j.poste, taille: j.taille }; });

  const PLAYERS = (DATA.statsSaison.joueurs || []).map((s) => ({
    id: slug(s.nom),
    num: NUMS[s.nom] != null ? NUMS[s.nom] : null,
    name: s.nom,
    poste: (IDENTITY[s.nom] || {}).poste || null,
    taille: (IDENTITY[s.nom] || {}).taille || null,
    status: 'actif',
    season: { mj: s.mj, min: s.min, pts: s.pts, reb: s.reb, pd: s.pd, int: s.int, ct: s.ct, bp: s.bp, tirsPct: s.tirsPct, eva: s.eva }
  }));
  const getPlayers = () => PLAYERS.slice();
  const getPlayer = (id) => PLAYERS.find((p) => p.id === id) || null;

  /* ================================================================
     MATCHS
     ================================================================ */
  const MATCHES = TOURNOI.resultats.map((r) => {
    const id = matchIdFor(r.adversaire);
    return {
      id,
      date: r.date,
      competition: id === 'hapoel' ? MH.competition : TOURNOI.nom,
      status: 'final',
      home: { name: CLUB.nom, code: CLUB.tag, score: r.score[0] },
      away: { name: r.adversaire, code: r.code, score: r.score[1] },
      result: r.victoire ? 'win' : 'loss',
      topScorer: r.topScorer || null,
      lieu: null,
      hasBoxScore: id === 'hapoel'
    };
  });
  const PROCHAIN = TOURNOI.prochainMatch;
  MATCHES.push({
    id: matchIdFor(PROCHAIN.adversaire),
    date: null,
    competition: PROCHAIN.contexte || TOURNOI.nom,
    status: 'upcoming',
    home: { name: CLUB.nom, code: CLUB.tag, score: null },
    away: { name: PROCHAIN.adversaire, code: PROCHAIN.code, score: null },
    result: null, topScorer: null, lieu: PROCHAIN.lieu || null, hasBoxScore: false
  });

  const getMatches = () => MATCHES.slice();
  function getMatch(id) {
    if (!id) return null;
    const k = String(id).toLowerCase();
    return MATCHES.find((m) => m.id === k)
      || MATCHES.find((m) => m.id.indexOf(k) !== -1 || k.indexOf(m.id) !== -1)
      || MATCHES.find((m) => slug(m.away.name).indexOf(k) !== -1)
      || null;
  }

  /* ---- Box score d'un match, DÉRIVÉ des événements ---- */
  function buildHomeLines() {
    const lines = MH.joueurs.map((j) => {
      const agg = aggregateDetailed(EV.eventsFromBoxScoreLine(j));
      return Object.assign({
        id: slug(j.nom), num: NUMS[j.nom] != null ? NUMS[j.nom] : null,
        name: j.nom, poste: j.poste, taille: j.taille,
        min: j.min, eva: j.eva, plusMinus: null
      }, agg);
    });
    const starters = lines.slice().sort((a, b) => b.min - a.min).slice(0, 5).map((l) => l.id);
    lines.forEach((l) => { l.starter = starters.indexOf(l.id) !== -1; });
    return lines;
  }
  function totalsOf(lines) {
    const keys = ['p2m', 'p2a', 'p3m', 'p3a', 'ftm', 'fta', 'ro', 'rd', 'reb', 'pd', 'int', 'ct', 'bp', 'fa', 'pts', 'min', 'eva'];
    return lines.reduce((t, l) => { keys.forEach((k) => { t[k] = (t[k] || 0) + (l[k] || 0); }); return t; }, {});
  }

  function getBoxScore(matchId) {
    const m = getMatch(matchId);
    if (!m || !m.hasBoxScore) return null;
    const homeLines = buildHomeLines();
    return {
      match: m,
      derivedFromEvents: true,
      home: { name: m.home.name, code: m.home.code, score: m.home.score, players: homeLines, totals: totalsOf(homeLines) },
      // Détail joueurs de l'adversaire non publié par le feed EuroLeague -> état vide.
      away: { name: m.away.name, code: m.away.code, score: m.away.score, players: null, totals: { pts: m.away.score } }
    };
  }

  function getQuarters(matchId) {
    const m = getMatch(matchId);
    if (!m || !m.hasBoxScore || !MH.quartTemps) return null;
    return { labels: ['Q1', 'Q2', 'Q3', 'Q4'], home: MH.quartTemps.poleFrance.slice(), away: MH.quartTemps.hapoel.slice() };
  }

  /* ================================================================
     Persistance légère (séances/joueurs créés) — localStorage
     ================================================================ */
  function ls() { try { return (typeof window !== 'undefined') && window.localStorage; } catch (e) { return null; } }
  function readColl(key) { const s = ls(); if (!s) return []; try { return JSON.parse(s.getItem('hb_' + key) || '[]'); } catch (e) { return []; } }
  function writeColl(key, arr) { const s = ls(); if (s) try { s.setItem('hb_' + key, JSON.stringify(arr)); } catch (e) {} return arr; }
  function addToColl(key, item) { const arr = readColl(key); const it = Object.assign({ id: 'u' + Date.now().toString(36), createdAt: new Date().toISOString() }, item); arr.unshift(it); writeColl(key, arr); return it; }

  return {
    slug, pct, aggregateDetailed,
    getClub: () => CLUB, getTournoi: () => TOURNOI,
    getPlayers, getPlayer,
    getMatches, getMatch, getBoxScore, getQuarters,
    getSeasonZones: () => (DATA.zonesTirSaison && DATA.zonesTirSaison.zones) || {},
    // persistance
    getSessions: () => readColl('sessions'), addSession: (s) => addToColl('sessions', s),
    getUserPlayers: () => readColl('players'), addUserPlayer: (p) => addToColl('players', p),
    _coll: { readColl, writeColl, addToColl }
  };
});
