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
      hasBoxScore: id === 'hapoel' || !!(DATA.matchsDetails && DATA.matchsDetails[id] && DATA.matchsDetails[id].joueurs)
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

  let LIVE = null; // feuille générée par le Match Live (session en cours)
  const getMatches = () => MATCHES.slice();
  function getMatch(id) {
    if (!id) return null;
    const k = String(id).toLowerCase();
    if (k === 'live') return LIVE ? LIVE.match : null;
    return MATCHES.find((m) => m.id === k)
      || MATCHES.find((m) => m.id.indexOf(k) !== -1 || k.indexOf(m.id) !== -1)
      || MATCHES.find((m) => slug(m.away.name).indexOf(k) !== -1)
      || null;
  }

  /* ---- Box score d'un match, DÉRIVÉ des événements ----
     Généralisé : fonctionne pour Hapoel (MH.joueurs, données réelles) comme
     pour tout match détaillé (DATA.matchsDetails[id].joueurs). Poste, taille et
     n° sont retrouvés dans les tables d'identité si la ligne ne les porte pas. */
  function buildHomeLinesFrom(joueurs) {
    const lines = joueurs.map((j) => {
      const agg = aggregateDetailed(EV.eventsFromBoxScoreLine(j));
      const idn = IDENTITY[j.nom] || {};
      return Object.assign({
        id: slug(j.nom), num: NUMS[j.nom] != null ? NUMS[j.nom] : null,
        name: j.nom, poste: j.poste || idn.poste || null, taille: j.taille || idn.taille || null,
        min: j.min, eva: j.eva, plusMinus: null
      }, agg);
    });
    const starters = lines.slice().sort((a, b) => b.min - a.min).slice(0, 5).map((l) => l.id);
    lines.forEach((l) => { l.starter = starters.indexOf(l.id) !== -1; });
    return lines;
  }
  function detailsFor(id) { return (DATA.matchsDetails && DATA.matchsDetails[id]) || null; }
  function totalsOf(lines) {
    const keys = ['p2m', 'p2a', 'p3m', 'p3a', 'ftm', 'fta', 'ro', 'rd', 'reb', 'pd', 'int', 'ct', 'bp', 'fa', 'pts', 'min', 'eva'];
    return lines.reduce((t, l) => { keys.forEach((k) => { t[k] = (t[k] || 0) + (l[k] || 0); }); return t; }, {});
  }

  function getBoxScore(matchId) {
    const m = getMatch(matchId);
    if (!m || !m.hasBoxScore) return null;
    let homeLines;
    if (m.id === 'hapoel') homeLines = buildHomeLinesFrom(MH.joueurs);
    else {
      const d = detailsFor(m.id);
      if (!d || !d.joueurs) return null;
      homeLines = buildHomeLinesFrom(d.joueurs);
    }
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
    if (!m) return null;
    if (m.id === 'hapoel') {
      if (!MH.quartTemps) return null;
      return { labels: ['Q1', 'Q2', 'Q3', 'Q4'], home: MH.quartTemps.poleFrance.slice(), away: MH.quartTemps.hapoel.slice() };
    }
    const d = detailsFor(m.id);
    if (d && d.quarts) return { labels: ['Q1', 'Q2', 'Q3', 'Q4'], home: d.quarts.zalgiris.slice(), away: d.quarts.adversaire.slice() };
    return null;
  }

  /* ================================================================
     Persistance légère (séances/joueurs créés) — localStorage
     ================================================================ */
  function ls() { try { return (typeof window !== 'undefined') && window.localStorage; } catch (e) { return null; } }
  function readColl(key) { const s = ls(); if (!s) return []; try { return JSON.parse(s.getItem('hb_' + key) || '[]'); } catch (e) { return []; } }
  function writeColl(key, arr) { const s = ls(); if (s) try { s.setItem('hb_' + key, JSON.stringify(arr)); } catch (e) {} return arr; }
  function addToColl(key, item) { const arr = readColl(key); const it = Object.assign({ id: 'u' + Date.now().toString(36), createdAt: new Date().toISOString() }, item); arr.unshift(it); writeColl(key, arr); return it; }
  function readObj(key) { const s = ls(); if (!s) return {}; try { return JSON.parse(s.getItem('hb_' + key) || '{}'); } catch (e) { return {}; } }
  function writeObj(key, obj) { const s = ls(); if (s) try { s.setItem('hb_' + key, JSON.stringify(obj)); } catch (e) {} return obj; }

  /* ================================================================
     ENTRAÎNEMENTS COLLECTIFS — planning auto + notation rapide + tendances
     ================================================================ */
  const COL_CRIT = [
    { key: 'intensite', label: 'Intensité' }, { key: 'execution', label: "Qualité d'exécution" },
    { key: 'concentration', label: 'Concentration' }, { key: 'communication', label: 'Communication' },
    { key: 'engagement', label: 'Engagement collectif' },
  ];
  const PL_CRIT = [
    { key: 'intensite', label: 'Intensité' }, { key: 'reussite', label: 'Réussite / efficacité' },
    { key: 'concentration', label: 'Concentration' }, { key: 'impact', label: 'Impact collectif' },
    { key: 'attitude', label: 'Attitude / engagement' },
  ];
  const CRIT_OFFSET = [0.1, -0.5, 0.2, 0.0, 0.35];
  const seeded = (a, b, c) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + 1.37) * 43758.5453; return x - Math.floor(x); };
  const clampNote = (n) => Math.max(1, Math.min(10, Math.round(n)));
  const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const round1 = (n) => Math.round(n * 10) / 10;
  const playerSlope = (pIdx) => (seeded(pIdx, 99, 7) * 2 - 1) * 0.16;

  function genCollectifRoster() {
    const niv = (DATA.planningCollectif && DATA.planningCollectif.niveaux) || {};
    return PLAYERS.filter((p) => niv[p.name] != null);
  }
  function genSessionEval(sessionIdx, roster, cfg, total) {
    const joueurs = {}, presence = {};
    /* Progression du joueur sur la période, NORMALISÉE par le nombre de
       séances : la pente reste la même d'un bout à l'autre de la saison
       (≈ ±1,1 point) que le planning compte 12 séances ou 60, au lieu de
       saturer l'échelle 1-10 dès que la saison s'allonge. */
    const n = Math.max(2, total || 12), mid = (n - 1) / 2;
    const span = (sessionIdx - mid) / mid; // -1 (début de saison) → +1 (fin)
    /* progression d'ensemble du groupe sur la saison (0 = aucune) */
    const teamProg = (cfg.progressionSaison != null ? cfg.progressionSaison : 0) * span;
    roster.forEach((p, pIdx) => {
      const absent = seeded(pIdx, sessionIdx, 3) < 0.08;
      presence[p.id] = !absent;
      if (absent) return;
      const base = cfg.niveaux[p.name] != null ? cfg.niveaux[p.name] : 6.2, prog = playerSlope(pIdx) * 7 * span, crit = {};
      PL_CRIT.forEach((c, ci) => {
        crit[c.key] = clampNote(base + prog + teamProg + CRIT_OFFSET[ci] + (seeded(pIdx, sessionIdx, ci) * 2 - 1) * 1.0);
      });
      const avg = mean(PL_CRIT.map((c) => crit[c.key]));
      crit.note = ''; crit.tresBon = avg >= 8.2; crit.aSurveiller = avg <= 5.3;
      if (crit.tresBon) crit.note = cfg.notesBon[Math.floor(seeded(pIdx, sessionIdx, 5) * cfg.notesBon.length)];
      else if (crit.aSurveiller) crit.note = cfg.notesSurveiller[Math.floor(seeded(pIdx, sessionIdx, 6) * cfg.notesSurveiller.length)];
      joueurs[p.id] = crit;
    });
    const present = roster.filter((p) => presence[p.id]), collectif = {};
    COL_CRIT.forEach((c, ci) => {
      collectif[c.key] = clampNote(mean(present.map((p) => joueurs[p.id][PL_CRIT[ci].key])) + (seeded(0, sessionIdx, ci) * 2 - 1) * 0.5);
    });
    const noteCoach = seeded(0, sessionIdx, 42) < 0.2 ? '' : cfg.notesCoach[Math.floor(seeded(0, sessionIdx, 43) * cfg.notesCoach.length)];
    return { collectif, noteCoach, joueurs, presence };
  }
  function baseCollectifs() {
    const cfg = DATA.planningCollectif; if (!cfg) return [];
    const roster = genCollectifRoster();
    return (cfg.seances || []).map((sc, i) => {
      const s = {
        id: 'col-' + sc.date, type: 'collectif', titre: cfg.titre, date: sc.date, heure: cfg.heure,
        duree: cfg.duree, lieu: cfg.lieu, status: sc.status, convoques: roster.map((p) => p.id), presence: {}, eval: null,
      };
      if (sc.status === 'done') { const e = genSessionEval(i, roster, cfg, (cfg.seances || []).length); s.presence = e.presence; s.eval = { collectif: e.collectif, noteCoach: e.noteCoach, joueurs: e.joueurs }; }
      else roster.forEach((p) => { s.presence[p.id] = true; });
      return s;
    });
  }
  function getCollectifs() {
    const ov = readObj('collectif_evals');
    return baseCollectifs().map((s) => {
      const o = ov[s.id];
      return o ? Object.assign({}, s, { status: o.status || s.status, presence: o.presence || s.presence, eval: o.eval || s.eval }) : s;
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  function getCollectif(id) { return getCollectifs().find((s) => s.id === id) || null; }
  function saveCollectifEval(id, data) {
    const ov = readObj('collectif_evals');
    ov[id] = {
      status: 'done',
      presence: data.presence || {},
      eval: { collectif: data.collectif || {}, noteCoach: data.noteCoach || '', joueurs: data.joueurs || {} },
    };
    writeObj('collectif_evals', ov);
    return getCollectif(id);
  }
  function collectifAvg(s) { return (s && s.eval) ? round1(mean(COL_CRIT.map((c) => s.eval.collectif[c.key]))) : null; }
  function playerAvg(s, pid) { if (!s || !s.eval || !s.eval.joueurs[pid]) return null; const j = s.eval.joueurs[pid]; return round1(mean(PL_CRIT.map((c) => j[c.key]))); }
  function doneChrono() { return getCollectifs().filter((s) => s.eval).sort((a, b) => (a.date < b.date ? -1 : 1)); }
  function getCollectifTrends() {
    const all = doneChrono();
    const sessions = all.map((s) => ({ id: s.id, date: s.date, avg: collectifAvg(s) }));
    const roster = genCollectifRoster();
    const players = roster.map((p) => {
      const series = all.map((s) => playerAvg(s, p.id)).filter((v) => v != null);
      if (series.length < 2) return null;
      return { id: p.id, name: p.name, num: p.num, avg: round1(mean(series)), delta: round1(series[series.length - 1] - series[0]), last: series[series.length - 1] };
    }).filter(Boolean);
    return { sessions, risers: players.slice().sort((a, b) => b.delta - a.delta).slice(0, 3), fallers: players.slice().sort((a, b) => a.delta - b.delta).slice(0, 3), players };
  }
  function getCollectifRecap(id) {
    const s = getCollectif(id); if (!s || !s.eval) return null;
    const roster = genCollectifRoster();
    const present = roster.filter((p) => s.presence[p.id] && s.eval.joueurs[p.id]);
    const perPlayer = present.map((p) => ({ id: p.id, name: p.name, num: p.num, avg: playerAvg(s, p.id), j: s.eval.joueurs[p.id] }));
    let bestCrit = null; COL_CRIT.forEach((c) => { const v = s.eval.collectif[c.key]; if (!bestCrit || v > bestCrit.val) bestCrit = { label: c.label, val: v }; });
    const done = doneChrono(), idx = done.findIndex((x) => x.id === id);
    const prev = idx > 0 ? done.slice(Math.max(0, idx - 3), idx) : [];
    const prevAvg = prev.length ? round1(mean(prev.map(collectifAvg))) : null, avg = collectifAvg(s);
    const fallers = [];
    perPlayer.forEach((pp) => {
      for (let k = idx - 1; k >= 0; k--) { const pa = playerAvg(done[k], pp.id); if (pa != null) { const d = round1(pp.avg - pa); if (d < 0) fallers.push({ name: pp.name, num: pp.num, avg: pp.avg, delta: d }); break; } }
    });
    fallers.sort((a, b) => a.delta - b.delta);
    return {
      session: s, avg: avg, perCrit: COL_CRIT.map((c) => ({ label: c.label, val: s.eval.collectif[c.key] })), bestCrit: bestCrit,
      top: perPlayer.slice().sort((a, b) => b.avg - a.avg).slice(0, 3), fallers: fallers.slice(0, 3),
      prevAvg: prevAvg, delta: prevAvg != null ? round1(avg - prevAvg) : null, prevCount: prev.length, noteCoach: s.eval.noteCoach, present: perPlayer.length, convoques: s.convoques.length,
    };
  }

  /* ---- Séances à thème : génération des résultats (tir) et notes (coach) ---- */
  const clampPct = (n) => Math.max(3, Math.min(96, Math.round(n)));
  const zoneType = (id) => (id.indexOf('three') === 0 ? '3pt' : (id.indexOf('midrange') === 0 || id.indexOf('short-corner') === 0 ? 'mid' : 'paint'));
  const posteCat = (poste) => (/fort|Int|Piv/i.test(poste || '') ? 'int' : 'ext');
  const SHOT_BASE = { '3pt': { ext: 37, int: 25 }, mid: { ext: 44, int: 41 }, paint: { ext: 54, int: 65 } };
  function thematicRoster(s) {
    return s.convoques === 'all' ? PLAYERS.slice() : PLAYERS.filter((p) => (s.convoques || []).indexOf(p.id) !== -1);
  }
  /* Position d'une séance dans la saison, normalisée -1 (1re) → +1 (dernière).
     Basée sur la DATE, donc indépendante de l'ordre du tableau de données. */
  function thematicSpan(date) {
    const l = ((DATA.seancesThematiques && DATA.seancesThematiques.seances) || [])
      .map((x) => x.date).filter(Boolean).sort();
    if (l.length < 2 || l[0] === l[l.length - 1] || !date) return 0;
    const t0 = Date.parse(l[0]), t1 = Date.parse(l[l.length - 1]), t = Date.parse(date);
    if (!(t1 > t0) || isNaN(t)) return 0;
    return Math.max(-1, Math.min(1, ((t - t0) / (t1 - t0)) * 2 - 1));
  }
  function genShootResults(s, sIdx, roster) {
    const reps = s.reps || 10, res = {};
    /* progression d'adresse du groupe sur la saison (en points de %), pilotée
       par les données — 0 si absente : l'adresse reste alors stable. */
    const prog = ((DATA.seancesThematiques && DATA.seancesThematiques.progressionSaison) || 0) * thematicSpan(s.date);
    roster.forEach((p, pIdx) => {
      const cat = posteCat(p.poste), skillAdj = (((p.season && p.season.tirsPct) || 50) - 50) * 0.22;
      const zones = {}; let tm = 0, ta = 0;
      s.zones.forEach((zid, zi) => {
        const pct = clampPct(SHOT_BASE[zoneType(zid)][cat] + skillAdj + prog + (seeded(pIdx, sIdx * 7 + zi, 21) * 2 - 1) * 8);
        const m = Math.max(0, Math.min(reps, Math.round(reps * pct / 100)));
        zones[zid] = { m: m, a: reps }; tm += m; ta += reps;
      });
      res[p.id] = { zones: zones, total: { m: tm, a: ta, pct: ta ? round1((tm / ta) * 100) : 0 } };
    });
    return res;
  }
  function genCoachEval(s, sIdx, roster) {
    const niv = (DATA.planningCollectif && DATA.planningCollectif.niveaux) || {};
    const bon = (DATA.planningCollectif && DATA.planningCollectif.notesBon) || [];
    const surv = (DATA.planningCollectif && DATA.planningCollectif.notesSurveiller) || [];
    const out = {};
    roster.forEach((p, pIdx) => {
      const base = niv[p.name] != null ? niv[p.name] : 6.2;
      const note = clampNote(base + (seeded(pIdx, sIdx * 5 + 3, 11) * 2 - 1) * 1.3);
      let comment = '';
      if (note >= 8 && bon.length) comment = bon[Math.floor(seeded(pIdx, sIdx, 8) * bon.length)];
      else if (note <= 5 && surv.length) comment = surv[Math.floor(seeded(pIdx, sIdx, 9) * surv.length)];
      out[p.id] = { note: note, comment: comment };
    });
    return out;
  }
  function buildThematic(s, sIdx) {
    const roster = thematicRoster(s);
    const t = Object.assign({ id: s.id || ('th-' + (sIdx + 1)), demo: true, status: 'done' }, s);
    t.roster = roster.map((p) => p.id);
    /* une séance à venir n'a ni résultats ni notes : elle n'a pas eu lieu */
    if (t.status !== 'done') return t;
    if (s.categorie === 'tir') {
      t.resultats = genShootResults(s, sIdx, roster);
      const totM = roster.reduce((a, p) => a + t.resultats[p.id].total.m, 0);
      const totA = roster.reduce((a, p) => a + t.resultats[p.id].total.a, 0);
      t.teamPct = totA ? round1((totM / totA) * 100) : 0; t.teamMade = totM; t.teamAtt = totA;
    } else {
      t.evalCoach = genCoachEval(s, sIdx, roster);
      const notes = roster.map((p) => t.evalCoach[p.id].note);
      t.avgNote = round1(mean(notes));
    }
    return t;
  }
  function allThematic() {
    const t = DATA.seancesThematiques;
    return (t && t.seances) ? t.seances.map((s, i) => buildThematic(s, i)) : [];
  }

  /* ================================================================
     FICHE JOUEUR — génération saison (matchs + entraînements)
     ================================================================ */
  const isoOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const jr = (pi, gi, salt) => 0.62 + 0.76 * seeded(pi, gi, salt);
  const clampPct2 = (n) => Math.max(0, Math.min(100, Math.round(n)));
  const OPP_POOL = ['Real Madrid', 'Olympiacos', 'Fenerbahçe Beko', 'Panathinaikos', 'FC Barcelone', 'AS Monaco', 'Baskonia', 'Maccabi Tel Aviv', 'Anadolu Efes', 'Partizan', 'Crvena zvezda', 'Bayern Munich', 'Olimpia Milan', 'Villeurbanne', 'Paris Basketball', 'Hapoel Tel Aviv'];
  const ZONE8 = ['RAQUETTE', 'MI_DISTANCE_GAUCHE', 'MI_DISTANCE_CENTRE', 'MI_DISTANCE_DROITE', 'CORNER_3_GAUCHE', 'CORNER_3_DROIT', 'TOP_KEY_GAUCHE', 'TOP_KEY_DROIT'];
  const ZONE8_LABEL = { RAQUETTE: 'Raquette', MI_DISTANCE_GAUCHE: 'Mi-distance gauche', MI_DISTANCE_CENTRE: 'Mi-distance centre', MI_DISTANCE_DROITE: 'Mi-distance droite', CORNER_3_GAUCHE: 'Corner 3 gauche', CORNER_3_DROIT: 'Corner 3 droit', TOP_KEY_GAUCHE: 'Aile 3 gauche', TOP_KEY_DROIT: 'Aile 3 droite' };
  const Z2S_STORE = { 'restricted-area-left': 'RAQUETTE', 'restricted-area-center': 'RAQUETTE', 'restricted-area-right': 'RAQUETTE', 'paint-left': 'RAQUETTE', 'paint-center': 'RAQUETTE', 'paint-right': 'RAQUETTE', 'short-corner-left': 'MI_DISTANCE_GAUCHE', 'short-corner-right': 'MI_DISTANCE_DROITE', 'midrange-baseline-left': 'MI_DISTANCE_GAUCHE', 'midrange-wing-left': 'MI_DISTANCE_GAUCHE', 'midrange-center': 'MI_DISTANCE_CENTRE', 'midrange-wing-right': 'MI_DISTANCE_DROITE', 'midrange-baseline-right': 'MI_DISTANCE_DROITE', 'three-corner-left': 'CORNER_3_GAUCHE', 'three-corner-right': 'CORNER_3_DROIT', 'three-wing-left': 'TOP_KEY_GAUCHE', 'three-top': 'TOP_KEY_GAUCHE', 'three-wing-right': 'TOP_KEY_DROIT' };
  const PIDX = {}; PLAYERS.forEach((p, i) => { PIDX[p.id] = i; });
  function tirProfile(p) {
    const m = (DATA.profilsTir && DATA.profilsTir.joueurs) || {}, t = m[p.name];
    return t || (posteCat(p.poste) === 'int' ? { p2: 58, p3: 22, lf: 68 } : { p2: 50, p3: 35, lf: 80 });
  }
  let _SCHED = null;
  function seasonSchedule() {
    if (_SCHED) return _SCHED;
    const out = []; let t = new Date('2025-10-02T00:00:00').getTime();
    for (let i = 0; i < 24; i++) {
      const opp = OPP_POOL[(i * 3 + 5) % OPP_POOL.length], dom = i % 2 === 0, win = seeded(i, 1, 2) > 0.4;
      const us = 76 + Math.round(seeded(i, 2, 3) * 24), margin = 1 + Math.round(seeded(i, 3, 4) * 13);
      t += (4 + Math.round(seeded(i, 5, 6) * 3)) * 86400000;
      out.push({ i: i, gameId: 'g' + (i + 1), date: isoOf(new Date(t)), opponent: opp, dom: dom, win: win, us: us, them: win ? us - margin : us + margin });
    }
    _SCHED = out; return out;
  }
  function genGame(p, g) {
    const pi = PIDX[p.id], S = p.season, tir = tirProfile(p), cat = posteCat(p.poste);
    const min = clamp(Math.round(S.min + (seeded(pi, g.i, 10) * 2 - 1) * 6), 5, 36), mr = min / Math.max(8, S.min);
    const p3a = Math.max(0, Math.round((cat === 'ext' ? S.pts * 0.36 : S.pts * 0.12) * mr * jr(pi, g.i, 11)));
    const p2a = Math.max(cat === 'int' ? 3 : 2, Math.round((cat === 'ext' ? S.pts * 0.42 : S.pts * 0.52) * mr * jr(pi, g.i, 12)));
    const fta = Math.max(0, Math.round((cat === 'ext' ? S.pts * 0.22 : S.pts * 0.44) * mr * jr(pi, g.i, 13)));
    const p3m = clamp(Math.round(p3a * tir.p3 / 100 + (seeded(pi, g.i, 14) * 2 - 1) * 1.0), 0, p3a);
    const p2m = clamp(Math.round(p2a * tir.p2 / 100 + (seeded(pi, g.i, 15) * 2 - 1) * 1.3), 0, p2a);
    const ftm = clamp(Math.round(fta * tir.lf / 100 + (seeded(pi, g.i, 16) * 2 - 1) * 0.6), 0, fta);
    const pts = 2 * p2m + 3 * p3m + ftm;
    const reb = Math.max(0, Math.round(S.reb * mr * jr(pi, g.i, 17))), pd = Math.max(0, Math.round(S.pd * mr * jr(pi, g.i, 18)));
    const intc = Math.max(0, Math.round(S.int * mr * jr(pi, g.i, 19))), ct = Math.max(0, Math.round((S.ct || 0) * mr * jr(pi, g.i, 20)));
    const bp = Math.max(0, Math.round((S.bp || 1) * mr * jr(pi, g.i, 21))), fa = Math.max(0, Math.round(2 * mr * jr(pi, g.i, 22)));
    const pm = (g.win ? 3 : -3) + Math.round((seeded(pi, g.i, 23) * 2 - 1) * 12);
    const eva = pts + reb + pd + intc + ct - (p2a - p2m) - (p3a - p3m) - (fta - ftm) - bp - fa;
    return { gameId: g.gameId, date: g.date, opponent: g.opponent, dom: g.dom, win: g.win, us: g.us, them: g.them, min: min, p2m: p2m, p2a: p2a, p3m: p3m, p3a: p3a, ftm: ftm, fta: fta, fgm: p2m + p3m, fga: p2a + p3a, pts: pts, reb: reb, pd: pd, int: intc, ct: ct, bp: bp, fa: fa, pm: pm, eva: eva };
  }
  function playerMatchLog(id) { const p = getPlayer(id); if (!p || !p.season) return []; return seasonSchedule().map((g) => genGame(p, g)); }
  function allocZones(att, made, weights, Z) {
    const keys = Object.keys(weights); if (att <= 0) return;
    const raw = keys.map((k) => att * weights[k]), flo = raw.map((x) => Math.floor(x));
    let rem = att - flo.reduce((a, b) => a + b, 0);
    const order = keys.map((k, i) => ({ i: i, f: raw[i] - flo[i] })).sort((a, b) => b.f - a.f);
    for (let j = 0; j < rem; j++) flo[order[j % keys.length].i]++;
    keys.forEach((k, i) => { const a = flo[i]; if (a <= 0) return; const m = Math.min(a, Math.round(made * a / att)); Z[k] = Z[k] || { tentes: 0, reussis: 0 }; Z[k].tentes += a; Z[k].reussis += m; });
  }
  const W2_INT = { RAQUETTE: 0.60, MI_DISTANCE_GAUCHE: 0.14, MI_DISTANCE_CENTRE: 0.12, MI_DISTANCE_DROITE: 0.14 };
  const W2_EXT = { RAQUETTE: 0.40, MI_DISTANCE_GAUCHE: 0.20, MI_DISTANCE_CENTRE: 0.19, MI_DISTANCE_DROITE: 0.21 };
  const W3 = { CORNER_3_GAUCHE: 0.26, CORNER_3_DROIT: 0.26, TOP_KEY_GAUCHE: 0.24, TOP_KEY_DROIT: 0.24 };
  function withPct(Z) { Object.keys(Z).forEach((k) => { Z[k].pct = Z[k].tentes ? round1(Z[k].reussis / Z[k].tentes * 100) : 0; }); return Z; }
  function playerMatchZones(id) {
    const p = getPlayer(id); if (!p || !p.season) return null;
    const pi = PIDX[p.id], cat = posteCat(p.poste), tir = tirProfile(p), Z = {};
    const w2 = cat === 'int' ? W2_INT : W2_EXT, tot2 = cat === 'int' ? 190 : 130, tot3 = cat === 'int' ? 45 : 160;
    Object.keys(w2).forEach((k, ki) => { const a = Math.max(8, Math.round(tot2 * w2[k])); const bp = (k === 'RAQUETTE' ? tir.p2 + 13 : tir.p2 - 5); const pct = clampPct(bp + (seeded(pi, ki, 31) * 2 - 1) * 7); Z[k] = { tentes: a, reussis: Math.round(a * pct / 100) }; });
    Object.keys(W3).forEach((k, ki) => { const a = Math.max(6, Math.round(tot3 * W3[k])); const pct = clampPct(tir.p3 + (seeded(pi, ki, 32) * 2 - 1) * 8); Z[k] = { tentes: a, reussis: Math.round(a * pct / 100) }; });
    return withPct(Z);
  }
  function zoneSummary(Z) {
    if (!Z) return null; const ks = Object.keys(Z); if (!ks.length) return null;
    let tt = 0, tr = 0, best = null, worst = null;
    ks.forEach((k) => { const z = Z[k]; tt += z.tentes; tr += z.reussis; if (!best || z.pct > best.pct) best = { key: k, label: ZONE8_LABEL[k], pct: z.pct, tentes: z.tentes }; if (!worst || z.pct < worst.pct) worst = { key: k, label: ZONE8_LABEL[k], pct: z.pct, tentes: z.tentes }; });
    return { best: best, worst: worst, pct: tt ? round1(tr / tt * 100) : 0, made: tr, att: tt };
  }
  function playerTrainingZones(id) {
    const th = allThematic().filter((s) => s.categorie === 'tir' && s.resultats), Z = {};
    th.forEach((s) => { const r = s.resultats[id]; if (!r) return; s.zones.forEach((zid) => { const z = r.zones[zid], k = Z2S_STORE[zid]; if (!k) return; Z[k] = Z[k] || { tentes: 0, reussis: 0 }; Z[k].tentes += z.a; Z[k].reussis += z.m; }); });
    return Object.keys(Z).length ? withPct(Z) : null;
  }
  function playerCollective(id) {
    const done = getCollectifs().filter((s) => s.eval).sort((a, b) => (a.date < b.date ? -1 : 1));
    const att = done.filter((s) => s.presence[id] && s.eval.joueurs[id]);
    const critAvg = {}; PL_CRIT.forEach((c) => { critAvg[c.key] = att.length ? round1(mean(att.map((s) => s.eval.joueurs[id][c.key]))) : 0; });
    const series = att.map((s) => ({ date: s.date, avg: playerAvg(s, id) }));
    const recent = series.length >= 4 ? round1(mean(series.slice(-2).map((x) => x.avg)) - mean(series.slice(0, 2).map((x) => x.avg))) : 0;
    return { doneCount: done.length, attended: att.length, presenceRate: done.length ? Math.round(att.length / done.length * 100) : 0, noteAvg: att.length ? round1(mean(series.map((x) => x.avg))) : 0, critAvg: critAvg, series: series, recent: recent };
  }
  const PERSO_CATS = ['Pick and roll', 'Défense', 'Transition', 'Rebond', 'Attaque placée'];
  function playerPerso(id) {
    const p = getPlayer(id), pi = PIDX[id], niv = ((DATA.planningCollectif && DATA.planningCollectif.niveaux) || {})[p.name] || 6.2;
    return PERSO_CATS.map((cat, ci) => {
      const base = clamp(niv + (seeded(pi, ci, 41) * 2 - 1) * 1.3, 3, 9.5), slope = (seeded(pi, ci, 42) * 2 - 1) * 0.2, n = 7, series = [];
      for (let k = 0; k < n; k++) series.push(clampNote(base + slope * (k - (n - 1) / 2) + (seeded(pi, ci * 10 + k, 43) * 2 - 1) * 0.9));
      return { cat: cat, avg: round1(mean(series)), last: series[n - 1], delta: round1(series[n - 1] - series[0]), recent: round1(mean(series.slice(-3)) - mean(series.slice(0, 3))), series: series };
    });
  }
  function playerTrainingHistory(id) {
    const out = [];
    getCollectifs().filter((s) => s.eval).forEach((s) => { const present = !!s.presence[id], j = s.eval.joueurs[id]; out.push({ id: s.id, date: s.date, type: 'Collectif', titre: s.titre, present: present, note: (present && j) ? playerAvg(s, id) : null, result: (present && j) ? ('Intensité ' + j.intensite + ' · Effic. ' + j.reussite) : 'Absent' }); });
    allThematic().forEach((s) => { if ((s.roster || []).indexOf(id) === -1) return; if (s.status !== 'done') return; if (s.categorie === 'tir') { const r = s.resultats[id]; out.push({ id: s.id, date: s.date, type: s.type, titre: s.titre, present: true, note: null, pct: r.total.pct, result: r.total.m + '/' + r.total.a + ' (' + r.total.pct + '%)' }); } else { const e = s.evalCoach[id]; out.push({ id: s.id, date: s.date, type: s.type, titre: s.titre, present: true, note: e.note, result: 'Note coach ' + e.note + '/10' }); } });
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  function playerMatchVsTraining(id) {
    const mz = playerMatchZones(id), tz = playerTrainingZones(id);
    const rows = ZONE8.filter((k) => tz && tz[k] && mz && mz[k]).map((k) => ({ key: k, label: ZONE8_LABEL[k], train: tz[k].pct, match: mz[k].pct, ecart: round1(tz[k].pct - mz[k].pct) }));
    const tg = tz ? zoneSummary(tz).pct : null, mg = mz ? zoneSummary(mz).pct : null;
    return { rows: rows, trainGlobal: tg, matchGlobal: mg, ecart: (tg != null && mg != null) ? round1(tg - mg) : null };
  }
  function getPlayerProfile(id) {
    const p = getPlayer(id); if (!p || !p.season) return null;
    const S = p.season, tir = tirProfile(p), log = playerMatchLog(id), last5 = log.slice(-5);
    const avg5 = {}; ['pts', 'reb', 'pd', 'int', 'eva', 'min'].forEach((k) => { avg5[k] = last5.length ? round1(mean(last5.map((g) => g[k]))) : 0; });
    const seasonCmp = [['pts', 'Points', S.pts], ['reb', 'Rebonds', S.reb], ['pd', 'Passes', S.pd], ['int', 'Interceptions', S.int], ['eva', 'Évaluation', S.eva]].map((x) => ({ key: x[0], label: x[1], last5: avg5[x[0]], season: x[2], delta: round1(avg5[x[0]] - x[2]) }));
    const mz = playerMatchZones(id), tz = playerTrainingZones(id), coll = playerCollective(id);
    return {
      header: { id: p.id, name: p.name, num: p.num, poste: p.poste, taille: p.taille, mj: S.mj, min: S.min, pts: S.pts, reb: S.reb, pd: S.pd, int: S.int, p2: tir.p2, p3: tir.p3, lf: tir.lf, eva: S.eva },
      matchLog: log, last5: last5, avg5: avg5, seasonCmp: seasonCmp,
      matchZones: mz, matchZoneSummary: zoneSummary(mz),
      training: { collective: coll, trainingZones: tz, trainingZoneSummary: zoneSummary(tz), perso: playerPerso(id), history: playerTrainingHistory(id), vsMatch: playerMatchVsTraining(id) },
    };
  }
  function genGameZones(p, line) {
    const cat = posteCat(p.poste), Z = {};
    allocZones(line.p2a, line.p2m, cat === 'int' ? W2_INT : W2_EXT, Z);
    allocZones(line.p3a, line.p3m, W3, Z);
    return withPct(Z);
  }
  function getPlayerGame(id, gameId) {
    const p = getPlayer(id); if (!p || !p.season) return null;
    const g = seasonSchedule().find((x) => x.gameId === gameId); if (!g) return null;
    const line = genGame(p, g), S = p.season, zones = genGameZones(p, line);
    const metrics = [['pts', 'Points', line.pts, S.pts], ['reb', 'Rebonds', line.reb, S.reb], ['pd', 'Passes', line.pd, S.pd], ['int', 'Interceptions', line.int, S.int], ['eva', 'Évaluation', line.eva, S.eva]].map((x) => ({ key: x[0], label: x[1], m: x[2], s: x[3], delta: round1(x[2] - x[3]) }));
    const better = metrics.filter((x) => x.delta > 0.5).sort((a, b) => b.delta - a.delta);
    const worse = metrics.filter((x) => x.delta < -0.5).sort((a, b) => a.delta - b.delta);
    const actions = [];
    if (line.p3m >= 3) actions.push(line.p3m + '/' + line.p3a + ' à 3 points');
    if (line.pd >= 5) actions.push(line.pd + ' passes décisives');
    if (line.reb >= 8) actions.push(line.reb + ' rebonds captés');
    if (line.int >= 2) actions.push(line.int + ' interceptions');
    if (line.pts >= S.pts + 8) actions.push('Pointe à ' + line.pts + ' points');
    if (!actions.length) actions.push(line.pts + ' pts · ' + line.reb + ' reb · ' + line.pd + ' pd');
    const obs = line.eva >= S.eva + 6 ? 'Match référence, nettement au-dessus de son niveau habituel.' : (line.eva <= S.eva - 6 ? 'Soirée compliquée, en dessous de ses standards de la saison.' : 'Contribution solide, conforme à sa moyenne de saison.');
    return { player: p, game: line, zones: zones, zoneSummary: zoneSummary(zones), metrics: metrics, better: better, worse: worse, actions: actions, obs: obs };
  }

  return {
    slug, pct, aggregateDetailed,
    getClub: () => CLUB, getTournoi: () => TOURNOI,
    getPlayers, getPlayer,
    getMatches, getMatch, getBoxScore, getQuarters,
    getSeasonZones: () => (DATA.zonesTirSaison && DATA.zonesTirSaison.zones) || {},
    /* ---- Analyse de match : carte de tirs, évolution, moments, comparaison ---- */
    getMatchZones: function (matchId) {
      const d = detailsFor((getMatch(matchId) || {}).id); if (!d || !d.zones) return null;
      const out = {};
      Object.keys(d.zones).forEach((k) => {
        const z = d.zones[k], t = z.t != null ? z.t : z.tentes, r = z.r != null ? z.r : z.reussis;
        out[k] = { tentes: t, reussis: r, pct: t > 0 ? Math.round((r / t) * 1000) / 10 : 0 };
      });
      return out;
    },
    getScoreTimeline: function (matchId) {
      const d = detailsFor((getMatch(matchId) || {}).id);
      return (d && d.timeline) ? d.timeline.map((p) => ({ min: p[0], home: p[1], away: p[2] })) : null;
    },
    getKeyMoments: function (matchId) {
      const d = detailsFor((getMatch(matchId) || {}).id);
      return (d && d.moments) ? d.moments.slice() : [];
    },
    /* Comparaison du match aux repères de la saison (équipe + joueurs). */
    getSeasonComparison: function (matchId) {
      const bs = getBoxScore(matchId); if (!bs) return null;
      const S = (DATA.statsSaison && DATA.statsSaison.equipe) || null; if (!S) return null;
      const t = bs.home.totals;
      const p2Pct = pct(t.p2m, t.p2a) || 0, p3Pct = pct(t.p3m, t.p3a) || 0, lfPct = pct(t.ftm, t.fta) || 0;
      const M = [
        { key: 'pts',   label: 'Points marqués',     match: t.pts, season: S.pts,   unit: '',  hib: true },
        { key: 'p3Pct', label: 'Réussite à 3 pts',   match: p3Pct, season: S.p3Pct, unit: '%', hib: true },
        { key: 'p2Pct', label: 'Réussite à 2 pts',   match: p2Pct, season: S.p2Pct, unit: '%', hib: true },
        { key: 'lfPct', label: 'Lancers francs',     match: lfPct, season: S.lfPct, unit: '%', hib: true },
        { key: 'reb',   label: 'Rebonds',            match: t.reb, season: S.reb,   unit: '',  hib: true },
        { key: 'ro',    label: 'Rebonds offensifs',  match: t.ro,  season: S.ro,    unit: '',  hib: true },
        { key: 'pd',    label: 'Passes décisives',   match: t.pd,  season: S.pd,    unit: '',  hib: true },
        { key: 'int',   label: 'Interceptions',      match: t.int, season: S.int,   unit: '',  hib: true },
        { key: 'ct',    label: 'Contres',            match: t.ct,  season: S.ct,    unit: '',  hib: true },
        { key: 'bp',    label: 'Pertes de balle',    match: t.bp,  season: S.bp,    unit: '',  hib: false },
        { key: 'fa',    label: 'Fautes',             match: t.fa,  season: S.fa,    unit: '',  hib: false },
      ].map((x) => {
        const delta = Math.round((x.match - x.season) * 10) / 10;
        const good = x.hib ? delta > 0 : delta < 0;
        const rel = x.season ? Math.abs(delta) / Math.abs(x.season) : 0;
        return Object.assign(x, { delta: delta, good: good, rel: rel });
      });
      const sig = M.filter((x) => Math.abs(x.delta) >= (x.unit === '%' ? 1.0 : 0.6));
      const better = sig.filter((x) => x.good).sort((a, b) => b.rel - a.rel);
      const worse = sig.filter((x) => !x.good).sort((a, b) => b.rel - a.rel);
      const avg = {}; (DATA.statsSaison.joueurs || []).forEach((j) => { avg[j.nom] = j; });
      const players = bs.home.players.filter((p) => p.min >= 10 && avg[p.name]).map((p) => {
        const a = avg[p.name], d = Math.round((p.pts - a.pts) * 10) / 10;
        return { name: p.name, num: p.num, pts: p.pts, reb: p.reb, pd: p.pd, eva: p.eva, avgPts: a.pts, avgEva: a.eva, delta: d };
      });
      const up = players.filter((p) => p.delta >= 2).sort((a, b) => b.delta - a.delta).slice(0, 3);
      const down = players.filter((p) => p.delta <= -2).sort((a, b) => a.delta - b.delta).slice(0, 3);
      const keyPlayers = bs.home.players.slice().filter((p) => p.min > 0).sort((a, b) => b.eva - a.eva).slice(0, 3)
        .map((p) => ({ name: p.name, num: p.num, pts: p.pts, reb: p.reb, pd: p.pd, eva: p.eva }));
      return { team: M, better: better, worse: worse, playersUp: up, playersDown: down, keyPlayers: keyPlayers, season: S, totals: t, pcts: { p2Pct: p2Pct, p3Pct: p3Pct, lfPct: lfPct } };
    },
    /* Dossier de scouting de l'adversaire d'un match (page « Préparer »).
       Les leaders (meilleur scoreur/passeur/rebondeur) sont dérivés ici pour
       rester cohérents avec joueursCles — pas de duplication dans data.js. */
    getScouting: function (matchId) {
      const m = getMatch(matchId);
      if (!m) return null;
      const sc = DATA.scouting || {};
      const raw = sc[m.id] || sc[slug(m.away.name)] || null;
      if (!raw) return null;
      const js = raw.joueursCles || [];
      const top = (k) => js.slice().sort((a, b) => (b[k] || 0) - (a[k] || 0))[0] || null;
      const leaders = { scoreur: top('pts'), passeur: top('pd'), rebondeur: top('reb') };
      return Object.assign({ matchId: m.id, adversaire: m.away.name }, raw, { leaders });
    },
    getPlayerHistory: function (id) {
      const out = [];
      const bs = getBoxScore('hapoel');
      if (bs) { const line = bs.home.players.find((p) => p.id === id); if (line) out.push({ matchId: 'hapoel', opponent: 'Hapoel Tel Aviv', pts: line.pts, reb: line.reb, pd: line.pd, eva: line.eva }); }
      const V = TOURNOI ? DATA.joueurVedette : null;
      if (V && slug(V.nom) === id) { (V.matchs || []).forEach((mm) => { const mid = matchIdFor(mm.adversaire); if (mid !== 'hapoel') out.push({ matchId: mid, opponent: mm.adversaire, pts: mm.pts, reb: mm.reb, pd: mm.pd, eva: mm.eva }); }); }
      return out;
    },
    // persistance
    getSessions: () => readColl('sessions'), addSession: (s) => addToColl('sessions', s),
    setLiveResult: (r) => { LIVE = r; }, getLiveResult: () => LIVE,
    getUserPlayers: () => readColl('players'), addUserPlayer: (p) => addToColl('players', p),
    // entraînements collectifs (planning auto + notation + tendances)
    collectifCriteria: () => COL_CRIT.slice(), playerCriteria: () => PL_CRIT.slice(),
    getCollectifRoster: () => genCollectifRoster().slice(),
    getCollectifs, getCollectif, saveCollectifEval, getCollectifTrends, getCollectifRecap,
    collectifAvg, playerAvg,
    getThematicSessions: function () {
      const t = DATA.seancesThematiques;
      if (!t || !t.seances) return [];
      return t.seances.map((s, i) => buildThematic(s, i));
    },
    getThematicSession: function (id) {
      const t = DATA.seancesThematiques; if (!t || !t.seances) return null;
      const i = t.seances.findIndex((s) => (s.id || ('th-')) === id);
      return i === -1 ? null : buildThematic(t.seances[i], i);
    },
    // fiche joueur : profil complet (matchs + entraînements) + détail par match
    getPlayerProfile, getPlayerGame,
    zone8Label: (k) => ZONE8_LABEL[k] || k,
    _coll: { readColl, writeColl, addToColl, readObj, writeObj }
  };
});
