/**
 * HoopBoard — Moteur de SAISON (source unique de la page SAISON)
 * ==================================================================
 * La page SAISON ne code AUCUN chiffre en dur : tout ce qu'elle affiche est
 * dérivé d'ici, et tout ce qui est ici est dérivé d'une liste d'ÉVÉNEMENTS
 * de match — les 15 types de `lib/match-events.js`, ceux que le Match Live
 * enregistre — chaque tir portant sa zone parmi les 18 de `assets/court.js`.
 *
 * ------------------------------------------------------------------
 * COMPOSITION DE LA SAISON (38 matchs, EuroLeague 2025-26)
 * ------------------------------------------------------------------
 *  • 4 matchs RÉELS (Paris, Hapoel, Olympiacos, Real Madrid) : leurs
 *    événements sont reconstruits depuis les box scores officiels via
 *    HoopStore.getBoxScore() — lignes joueur strictement inchangées.
 *  • 34 matchs de DÉMONSTRATION (`demo: true`) : le feed EuroLeague ne
 *    publie pas les box scores de toute la saison. Ils sont générés de
 *    façon DÉTERMINISTE (aucun Math.random) et CALIBRÉS pour que les
 *    agrégats de saison reproduisent EXACTEMENT les repères déjà publiés
 *    partout ailleurs dans l'app :
 *        bilan               23V – 15D   (tournoi.bilan)
 *        points marqués      86.9 /match (statsSaison.equipe.pts)
 *        points encaissés    82.2 /match (statsSaison.equipe.ptsContre)
 *        %2pts / %3pts / %LF 54.5 / 34.0 / 78.0
 *        ro / rd / reb / pd / int / ct / bp / fa  — idem statsSaison.equipe
 *    → la page SAISON affiche donc les MÊMES valeurs que l'effectif, la
 *      préparation de match et les fiches joueur. Aucune divergence.
 *
 * ------------------------------------------------------------------
 * NOTE DE COHÉRENCE (importante)
 * ------------------------------------------------------------------
 * Les moyennes individuelles publiées (statsSaison.joueurs) totalisent
 * ~81 pts et ~214 min par match, là où les repères d'ÉQUIPE valent 86.9 pts
 * et 200 min : les deux séries ne sont pas réconciliables telles quelles.
 * Choix retenu — les repères d'ÉQUIPE font foi pour les totaux collectifs,
 * les moyennes INDIVIDUELLES publiées font foi partout où un joueur est
 * affiché (Impact Players, effectif, fiche joueur). Les lignes joueur
 * générées ici ne servent qu'aux analyses RELATIVES (zones, forme, cinq
 * majeurs) — jamais à afficher une moyenne de saison concurrente.
 *
 * Expose window.HoopSeason (navigateur) ET module.exports (Node/tests).
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(
      require('../lib/data.js'), require('../lib/match-events.js'),
      require('./store.js'), require('./court.js')
    );
  } else {
    root.HoopSeason = factory(root.HOOPBOARD_DATA, root.HoopEvents, root.HoopStore, root.HoopCourt);
  }
})(typeof window !== 'undefined' ? window : globalThis, function (DATA, EV, Store, Court) {
  'use strict';

  const T = EV.EVENT_TYPES;
  const N_GAMES = 38;
  const REF = DATA.statsSaison.equipe;
  const BILAN = DATA.tournoi.bilan;                 // 23 – 15
  const r1 = (n) => Math.round(n * 10) / 10;
  const r2 = (n) => Math.round(n * 100) / 100;
  const pctOf = (m, a) => (a > 0 ? r1((m / a) * 100) : 0);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ================================================================
     0. OUTILS DÉTERMINISTES — la même saison à chaque chargement
     ================================================================ */
  function rnd(a, b, c) {
    const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + 1.37) * 43758.5453;
    return x - Math.floor(x);
  }
  function shuffled(arr, a, b) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rnd(a, i, b) * (i + 1)) % (i + 1);
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }
  /** Répartit `total` (entier) sur des poids — entiers, somme EXACTE. */
  function alloc(total, weights) {
    const n = weights.length, out = new Array(n).fill(0);
    if (n === 0 || total <= 0) return out;
    const s = sum(weights);
    if (s <= 0) { out[0] = total; return out; }
    const raw = weights.map((w) => (total * w) / s);
    let used = 0;
    for (let i = 0; i < n; i++) { out[i] = Math.floor(raw[i]); used += out[i]; }
    const order = raw.map((v, i) => ({ i, f: v - Math.floor(v) })).sort((a, b) => b.f - a.f || a.i - b.i);
    for (let k = 0; used < total; k++, used++) out[order[k % n].i]++;
    return out;
  }
  /**
   * Répartit `total` sur des poids en respectant un plafond par part. Le
   * surplus des parts saturées est redistribué au prorata de la PLACE
   * restante (et non des poids d'origine) : sans cela, les zones déjà
   * favorisées récupéraient tout le surplus et se retrouvaient à 100 %.
   */
  function allocRoom(total, weights, caps) {
    const n = weights.length;
    const out = alloc(Math.min(total, sum(caps)), weights);
    for (let pass = 0; pass < 10; pass++) {
      let over = 0;
      for (let i = 0; i < n; i++) if (out[i] > caps[i]) { over += out[i] - caps[i]; out[i] = caps[i]; }
      if (!over) break;
      const room = out.map((v, i) => Math.max(0, caps[i] - v));
      if (sum(room) <= 0) break;
      const add = alloc(Math.min(over, sum(room)), room);
      for (let i = 0; i < n; i++) out[i] = Math.min(caps[i], out[i] + add[i]);
    }
    return out;
  }
  /**
   * TIRAGE de `count` tirs sur des zones pondérées (loi multinomiale, PRNG
   * déterministe). alloc() ne convient PAS ici : sur 4 tirs répartis sur 13
   * zones, le plus fort reste sert toujours les mêmes zones — les short
   * corners ne recevraient jamais un seul tir de la saison.
   */
  function drawZones(count, weights, seed, salt) {
    const out = weights.map(() => 0), cum = [];
    let s = 0;
    weights.forEach((w) => { s += Math.max(0, w); cum.push(s); });
    if (s <= 0 || count <= 0) return out;
    for (let n = 0; n < count; n++) {
      const u = rnd(seed, n, salt) * s;
      let k = 0; while (k < cum.length - 1 && u > cum[k]) k++;
      out[k]++;
    }
    return out;
  }
  /**
   * TIRAGE des réussites tir par tir : chaque tentative est un tirage de
   * Bernoulli à la probabilité de sa zone, puis on ramène le total exactement
   * à `made` en basculant les tirs les plus « limites ». Les % par zone
   * restent donc non biaisés, contrairement à une répartition par rang.
   */
  function drawMakes(A, P, made, seed, salt) {
    const shots = [];
    A.forEach((a, k) => {
      for (let n = 0; n < a; n++) {
        const u = rnd(seed, k * 97 + n, salt);
        shots.push({ k, margin: P[k] - u, made: u < P[k] });
      }
    });
    const target = clamp(made, 0, shots.length);
    let cur = 0; shots.forEach((s) => { if (s.made) cur++; });
    if (cur < target) {
      shots.filter((s) => !s.made).sort((a, b) => b.margin - a.margin)
        .slice(0, target - cur).forEach((s) => { s.made = true; });
    } else if (cur > target) {
      shots.filter((s) => s.made).sort((a, b) => a.margin - b.margin)
        .slice(0, cur - target).forEach((s) => { s.made = false; });
    }
    const out = A.map(() => 0);
    shots.forEach((s) => { if (s.made) out[s.k]++; });
    return out;
  }
  /**
   * Répartit `target` réussites sur des tirs tentés `A`, en respectant au plus
   * près les pourcentages de référence `P`. Réservé aux GRANDS volumes (niveau
   * saison) : sur de petits nombres, l'arrondi rend cette méthode trop
   * abrupte — on utilise alors drawZones()/drawMakes().
   */
  function fitMakes(A, P, target) {
    const n = A.length;
    const capTotal = sum(A);
    const want = clamp(target, 0, capTotal);
    const at = (k) => A.map((a, i) => Math.min(a, Math.round(a * Math.min(0.98, P[i] * k))));
    let lo = 0, hi = 6;
    for (let it = 0; it < 50; it++) {
      const mid = (lo + hi) / 2;
      if (sum(at(mid)) < want) lo = mid; else hi = mid;
    }
    const out = at(hi);
    let d = want - sum(out);
    // ajustement unitaire : on modifie la zone qui s'éloigne le moins de son %
    for (let guard = 0; guard < 4000 && d !== 0; guard++) {
      const step = d > 0 ? 1 : -1;
      let best = -1, bestScore = Infinity;
      for (let i = 0; i < n; i++) {
        if (!A[i]) continue;
        const cand = out[i] + step;
        if (cand < 0 || cand > A[i]) continue;
        const score = Math.abs(cand / A[i] - P[i]);
        if (score < bestScore) { bestScore = score; best = i; }
      }
      if (best < 0) break;
      out[best] += step; d -= step;
    }
    return out;
  }

  /* ================================================================
     1. ZONES — profils de tir sur les 18 zones de court.js
     ---------------------------------------------------------------
     `w` = part du volume de tirs ; `p` = réussite de référence. Les tirs
     de chaque match sont répartis sur ces poids joueur par joueur : les %
     affichés sont donc calculés sur des tirs, pas posés en dur.
     ================================================================ */
  const OFF_2 = [
    { id: 'restricted-area-center', w: 0.200, p: 0.71 },
    { id: 'restricted-area-left', w: 0.100, p: 0.66 },
    { id: 'restricted-area-right', w: 0.100, p: 0.67 },
    { id: 'paint-center', w: 0.075, p: 0.51 },
    { id: 'paint-left', w: 0.053, p: 0.48 },
    { id: 'paint-right', w: 0.052, p: 0.48 },
    { id: 'short-corner-left', w: 0.030, p: 0.46 },
    { id: 'short-corner-right', w: 0.030, p: 0.45 },
    { id: 'midrange-baseline-left', w: 0.060, p: 0.40 },
    { id: 'midrange-wing-left', w: 0.090, p: 0.42 },
    { id: 'midrange-center', w: 0.060, p: 0.38 },
    { id: 'midrange-wing-right', w: 0.090, p: 0.43 },
    { id: 'midrange-baseline-right', w: 0.060, p: 0.41 },
  ];
  const OFF_3 = [
    { id: 'three-corner-left', w: 0.180, p: 0.42 },
    { id: 'three-corner-right', w: 0.180, p: 0.32 },
    { id: 'three-wing-left', w: 0.220, p: 0.33 },
    { id: 'three-wing-right', w: 0.220, p: 0.34 },
    { id: 'three-top', w: 0.200, p: 0.32 },
  ];
  /* Défense : ce que les adversaires tentent et réussissent CONTRE nous.
     Le corner droit adverse est le point faible, et il se dégrade au fil de
     la saison (DEF_DRIFT) : la tendance récente et l'analyse IA la
     RECALCULENT depuis les tirs — elles ne récitent pas une phrase écrite. */
  const DEF_2 = [
    { id: 'restricted-area-center', w: 0.185, p: 0.66 },
    { id: 'restricted-area-left', w: 0.095, p: 0.63 },
    { id: 'restricted-area-right', w: 0.095, p: 0.63 },
    { id: 'paint-center', w: 0.080, p: 0.48 },
    { id: 'paint-left', w: 0.055, p: 0.45 },
    { id: 'paint-right', w: 0.055, p: 0.45 },
    { id: 'short-corner-left', w: 0.035, p: 0.42 },
    { id: 'short-corner-right', w: 0.035, p: 0.43 },
    { id: 'midrange-baseline-left', w: 0.060, p: 0.38 },
    { id: 'midrange-wing-left', w: 0.095, p: 0.40 },
    { id: 'midrange-center', w: 0.060, p: 0.37 },
    { id: 'midrange-wing-right', w: 0.090, p: 0.40 },
    { id: 'midrange-baseline-right', w: 0.060, p: 0.39 },
  ];
  const DEF_3 = [
    { id: 'three-corner-left', w: 0.170, p: 0.32 },
    { id: 'three-corner-right', w: 0.195, p: 0.36 },
    { id: 'three-wing-left', w: 0.215, p: 0.34 },
    { id: 'three-wing-right', w: 0.215, p: 0.34 },
    { id: 'three-top', w: 0.205, p: 0.33 },
  ];
  /* Dérives sur la saison (phase 0 = 1er match, 1 = dernier) */
  const OFF_DRIFT = { 'three-corner-left': 0.42, 'three-wing-left': 0.34, 'three-wing-right': 0.30, 'three-top': 0.24, 'three-corner-right': 0.20 };
  const DEF_DRIFT = { 'three-corner-right': 0.62, 'restricted-area-center': -0.14 };

  const ZONE_IDS = OFF_2.map((z) => z.id).concat(OFF_3.map((z) => z.id));
  const ZLABEL = {}, ZGROUP = {};
  ZONE_IDS.forEach((id) => {
    const z = Court && Court.ZONES && Court.ZONES[id];
    ZLABEL[id] = (z && z.label) || id;
    ZGROUP[id] = (z && z.group) || 'mid';
  });
  const GROUP_LABEL = { rim: 'Près du cercle', paint: 'Raquette', mid: 'Mi-distance', three: '3 points' };
  const zoneValue = (id) => (id.indexOf('three') === 0 ? 3 : 2);
  const driftedPct = (base, id, drift, phase) => {
    const d = (drift && drift[id] != null) ? drift[id] : 0;
    return clamp(base * (1 + d * (phase - 0.5) * 0.9), 0.04, 0.95);
  };

  /* Points représentatifs d'une zone (repère normalisé 0..100 du demi-terrain),
     échantillonnés depuis getCourtZone : un marqueur tombe toujours DANS la
     zone qu'il déclare. */
  let _SAMPLES = null;
  function samples() {
    if (_SAMPLES) return _SAMPLES;
    const acc = {};
    if (Court && Court.getCourtZone) {
      for (let y = 0.75; y < 100; y += 1.5) {
        for (let x = 0.75; x < 100; x += 1.5) {
          const z = Court.getCourtZone({ x, y });
          if (!z || z.id === 'out-of-bounds') continue;
          /* pas d'arrondi : un point arrondi peut basculer de l'autre côté
             d'une ligne et ne plus appartenir à la zone qu'il déclare. */
          (acc[z.id] || (acc[z.id] = [])).push({ x: x, y: y });
        }
      }
    }
    _SAMPLES = {};
    ZONE_IDS.forEach((id) => { _SAMPLES[id] = acc[id] && acc[id].length ? acc[id] : [{ x: 50, y: 50 }]; });
    return _SAMPLES;
  }
  function pointIn(zoneId, k) {
    const pts = samples()[zoneId];
    return pts[Math.floor(rnd(k, zoneId.length, 91) * pts.length) % pts.length];
  }

  /* ================================================================
     2. EFFECTIF — poids d'usage dérivés des moyennes publiées
     ================================================================ */
  const TIR = (DATA.profilsTir && DATA.profilsTir.joueurs) || {};
  const ROSTER = Store.getPlayers().map((p, i) => {
    const t = TIR[p.name] || { p2: 50, p3: 33, lf: 75 };
    return {
      idx: i, id: p.id, name: p.name, num: p.num, poste: p.poste, taille: p.taille,
      inside: /fort|Int|Piv/i.test(p.poste || ''),
      p2: t.p2 / 100, p3: t.p3 / 100, lf: t.lf / 100, s: p.season,
    };
  });
  const BY_ID = {}; ROSTER.forEach((p) => { BY_ID[p.id] = p; });

  /** Disponibilité : chaque joueur dispute `mj` matchs sur 38 (statsSaison). */
  const AVAIL = ROSTER.map((p) => {
    const order = [];
    for (let g = 0; g < N_GAMES; g++) order.push({ g, k: rnd(p.idx, g, 55) });
    order.sort((a, b) => a.k - b.k);
    const out = new Array(N_GAMES).fill(true);
    order.slice(0, Math.max(0, N_GAMES - p.s.mj)).forEach((o) => { out[o.g] = false; });
    return out;
  });

  const W = {
    shot: ROSTER.map((p) => Math.max(0.4, p.s.pts)),
    three: ROSTER.map((p) => Math.max(0.2, p.s.pts) * (p.inside ? 0.30 : 1.15) * (p.p3 / 0.34)),
    ft: ROSTER.map((p) => Math.max(0.2, p.s.pts) * (p.inside ? 1.35 : 0.9)),
    ro: ROSTER.map((p) => Math.max(0.2, p.s.reb) * (p.inside ? 1.7 : 0.55)),
    rd: ROSTER.map((p) => Math.max(0.2, p.s.reb) * (p.inside ? 1.15 : 0.9)),
    pd: ROSTER.map((p) => Math.max(0.1, p.s.pd)),
    int: ROSTER.map((p) => Math.max(0.1, p.s.int)),
    ct: ROSTER.map((p) => Math.max(0.05, p.s.ct)),
    bp: ROSTER.map((p) => Math.max(0.1, p.s.bp)),
    fa: ROSTER.map((p) => Math.max(1, p.s.min)),
    min: ROSTER.map((p) => Math.max(1, p.s.min)),
  };

  /** Poids d'une zone pour un joueur : les intérieurs vivent près du cercle. */
  function zoneWeightFor(p, zoneId) {
    const g = ZGROUP[zoneId];
    if (g === 'rim') return p.inside ? 2.6 : 0.85;
    if (g === 'paint') return p.inside ? 2.0 : 0.90;
    if (g === 'mid') return p.inside ? 0.70 : 1.25;
    return p.inside ? 0.35 : 1.40;
  }

  /* ================================================================
     3. CALENDRIER — 4 matchs réels + 34 matchs de démonstration
     ================================================================ */
  const REAL_IDS = ['paris', 'hapoel', 'olympiacos', 'real-madrid'];
  const OPP_POOL = [
    ['Panathinaikos', 'PAO'], ['FC Barcelone', 'BAR'], ['AS Monaco', 'ASM'], ['Baskonia', 'BAS'],
    ['Maccabi Tel Aviv', 'MTA'], ['Anadolu Efes', 'EFS'], ['Partizan', 'PAR'], ['Crvena zvezda', 'CZV'],
    ['Bayern Munich', 'BAY'], ['Olimpia Milan', 'MIL'], ['Villeurbanne', 'ASV'], ['Valence', 'VAL'],
    ['Alba Berlin', 'ALB'], ['Dubai BC', 'DUB'], ['Fenerbahçe Beko', 'FEN'], ['Real Madrid', 'RMB'],
    ['Olympiacos', 'OLY'], ['Paris Basketball', 'PBB'],
  ];
  const DAY = 86400000;
  const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

  function buildCalendar() {
    const real = REAL_IDS.map((id) => {
      const m = Store.getMatch(id), box = Store.getBoxScore(id);
      return box && m ? { matchId: id, m, box } : null;
    }).filter(Boolean);

    /* Les matchs générés s'arrêtent AVANT le dernier match réel : la saison se
       termine donc sur un match qui possède sa propre page d'analyse — le
       bouton « Voir » du dernier match mène toujours quelque part. */
    const lastReal = real.map((r) => r.m.date).sort().pop();
    const start = Date.UTC(2025, 9, 3);
    const end = new Date(lastReal + 'T00:00:00Z').getTime() - 3 * DAY;
    const span = Math.max(DAY, end - start);
    const need = N_GAMES - real.length;

    const taken = {}; real.forEach((r) => { taken[r.m.date] = true; });
    const gen = [];
    for (let i = 0; i < need; i++) {
      let t = start + Math.round(((i + 0.12 + 0.72 * rnd(i, 4, 12)) / need) * span);
      let d = iso(t);
      while (taken[d]) { t += DAY; d = iso(t); }
      taken[d] = true;
      const o = OPP_POOL[(i * 5 + 3) % OPP_POOL.length];
      gen.push({ real: false, matchId: null, date: d, opponent: o[0], code: o[1] });
    }
    const nWin = BILAN.victoires - real.length;
    if (nWin < 0 || nWin + BILAN.defaites !== gen.length) throw new Error('Calendrier incohérent avec le bilan officiel');
    gen.forEach((g) => { g.win = false; });
    /* le rang provisoire suffit pour l'avantage du terrain : `dom` est fixé
       plus bas, une fois le calendrier trié par date (parité de l'index). */
    gen.map((g, i) => ({ i, k: rnd(i, 7, 33) - (i % 2 === 0 ? 0.16 : 0) })).sort((a, b) => a.k - b.k)
      .slice(0, nWin).forEach((o) => { gen[o.i].win = true; });

    const all = real.map((r) => ({
      real: true, matchId: r.matchId, date: r.m.date, opponent: r.m.away.name, code: r.m.away.code,
      win: r.m.result === 'win', us: r.m.home.score, them: r.m.away.score, box: r.box,
    })).concat(gen);
    all.sort((a, b) => (a.date < b.date ? -1 : 1));
    all.forEach((g, i) => {
      g.i = i; g.gameId = 'S' + (i + 1); g.dom = i % 2 === 0;
      g.phase = i / (N_GAMES - 1); g.competition = DATA.tournoi.nom;
    });
    return all;
  }

  /* ================================================================
     4. CIBLES DE SAISON — calibrage sur les repères publiés
     ================================================================ */
  const SEASON_TARGET = { p2a: 1520, p2m: 828, p3a: 948, p3m: 322, fta: 874, ftm: 682 };
  const COUNT_TARGET = {
    ro: Math.round(REF.ro * N_GAMES), rd: Math.round(REF.rd * N_GAMES),
    pd: Math.round(REF.pd * N_GAMES), int: Math.round(REF.int * N_GAMES),
    ct: Math.round(REF.ct * N_GAMES), bp: Math.round(REF.bp * N_GAMES),
    fa: Math.round(REF.fa * N_GAMES),
  };
  const OPP_TARGET_PTS = Math.round(REF.ptsContre * N_GAMES);

  /* ================================================================
     5. RÉPARTITION PAR QUART-TEMPS
     ---------------------------------------------------------------
     Les événements sont distribués sur les 4 périodes via des « pots »
     mélangés de façon déterministe : pas de biais de petits nombres, et
     les paniers réussis suivent leur propre forme (l'efficacité de fin de
     match baisse dans les matchs serrés — c'est ce que la page mesure).
     ================================================================ */
  const SHAPE_FLAT = [0.257, 0.252, 0.250, 0.241];
  const SHAPE_MADE = [0.256, 0.252, 0.251, 0.241];
  const SHAPE_MADE_CLOSE = [0.271, 0.267, 0.265, 0.197];
  const SHAPE_OPP_MADE = [0.246, 0.250, 0.251, 0.253];
  const SHAPE_OPP_CLOSE = [0.234, 0.240, 0.242, 0.284];

  function qPool(count, shape, seed, salt) {
    const per = alloc(count, shape), pool = [];
    for (let q = 0; q < 4; q++) for (let i = 0; i < per[q]; i++) pool.push(q);
    return shuffled(pool, seed, salt);
  }

  /* ================================================================
     6. GÉNÉRATION — un match → une liste d'ÉVÉNEMENTS
     ================================================================ */
  /**
   * Répartit les tirs d'UN joueur sur les zones (volume + réussite).
   * Le bruit déterministe `seed` casse le biais d'arrondi : sans lui, la même
   * zone remporterait le plus fort reste à chaque match et finirait la saison
   * à 100 % pendant que sa voisine resterait à 0 %.
   */
  function playerZones(p, profile, att, made, phase, drift, kind, seed) {
    const wA = profile.map((z) => z.w * zoneWeightFor(p, z.id));
    const A = drawZones(att, wA, seed, 201);
    const skill = clamp((kind === 2 ? p.p2 / 0.545 : p.p3 / 0.34), 0.55, 1.6);
    const P = profile.map((z) => clamp(driftedPct(z.p, z.id, drift, phase) * skill, 0.04, 0.94));
    const M = drawMakes(A, P, made, seed, 202);
    const out = [];
    profile.forEach((z, k) => { if (A[k] > 0) out.push({ id: z.id, a: A[k], m: M[k] }); });
    return out;
  }

  /** Rotation : 8 séquences de 5 minutes, lineups issus du temps de jeu. */
  function stintsFor(g, present) {
    if (present.length < 5) return [];
    const budget = {}, totalW = sum(present.map((i) => W.min[i]));
    present.forEach((i) => { budget[i] = (W.min[i] / totalW) * 200; });
    const stints = [];
    for (let s = 0; s < 8; s++) {
      const pick = present.slice().sort((a, b) => (budget[b] - budget[a]) || (a - b)).slice(0, 5);
      pick.forEach((i) => { budget[i] -= 5; });
      stints.push({ q: Math.floor(s / 2), half: s % 2, lineup: pick.slice().sort((a, b) => a - b), us: 0, them: 0 });
    }
    return stints;
  }

  /**
   * Construit la liste chronologique d'événements du match : chaque action
   * reçoit sa période, puis tout est trié par quart-temps et encadré par
   * START_PERIOD / SUBSTITUTION / END_PERIOD.
   */
  function buildEvents(g, players, oppZones, oppFt, close) {
    const acts = [];
    const shapeMade = close ? SHAPE_MADE_CLOSE : SHAPE_MADE;
    const shapeOpp = close ? SHAPE_OPP_CLOSE : SHAPE_OPP_MADE;

    /* --- nos tirs : un pot pour les réussis, un pour les manqués --- */
    const mine = { made: [], miss: [] };
    players.forEach((p) => (p.zones || []).forEach((z) => {
      for (let n = 0; n < z.a; n++) (n < z.m ? mine.made : mine.miss).push({ p, z });
    }));
    const poolMade = qPool(mine.made.length, shapeMade, g.i, 101);
    const poolMiss = qPool(mine.miss.length, SHAPE_FLAT, g.i, 102);
    let k = 0;
    mine.made.forEach((s, n) => acts.push(shotAct(s.p.name, s.z.id, true, poolMade[n], 'home', k++)));
    mine.miss.forEach((s, n) => acts.push(shotAct(s.p.name, s.z.id, false, poolMiss[n], 'home', k++)));

    /* --- nos lancers francs --- */
    const ftM = [], ftX = [];
    players.forEach((p) => { for (let n = 0; n < p.fta; n++) (n < p.ftm ? ftM : ftX).push(p.name); });
    const pFtM = qPool(ftM.length, shapeMade, g.i, 103), pFtX = qPool(ftX.length, SHAPE_FLAT, g.i, 104);
    ftM.forEach((nm, n) => acts.push({ type: T.FREE_THROW_MADE, player: nm, points: 1, q: pFtM[n] }));
    ftX.forEach((nm, n) => acts.push({ type: T.FREE_THROW_MISSED, player: nm, points: 0, q: pFtX[n] }));

    /* --- nos actions non scorées --- */
    [['ro', T.REBOUND_OFF, 110], ['rd', T.REBOUND_DEF, 111], ['pd', T.ASSIST, 112],
     ['int', T.STEAL, 113], ['ct', T.BLOCK, 114], ['bp', T.TURNOVER, 115], ['fa', T.FOUL, 116]]
      .forEach(([key, type, salt]) => {
        const list = [];
        players.forEach((p) => { for (let n = 0; n < (p[key] || 0); n++) list.push(p.name); });
        const pool = qPool(list.length, SHAPE_FLAT, g.i, salt);
        list.forEach((nm, n) => acts.push({ type, player: nm, points: 0, q: pool[n] }));
      });

    /* --- tirs adverses (zone connue, tireur non nominatif) --- */
    const oMade = [], oMiss = [];
    (oppZones || []).forEach((z) => { for (let n = 0; n < z.a; n++) (n < z.m ? oMade : oMiss).push(z.id); });
    const pOM = qPool(oMade.length, shapeOpp, g.i, 105), pOX = qPool(oMiss.length, SHAPE_FLAT, g.i, 106);
    oMade.forEach((id, n) => acts.push(shotAct(g.code, id, true, pOM[n], 'away', k++)));
    oMiss.forEach((id, n) => acts.push(shotAct(g.code, id, false, pOX[n], 'away', k++)));
    const oFtM = qPool(oppFt.ftm, shapeOpp, g.i, 107), oFtX = qPool(oppFt.fta - oppFt.ftm, SHAPE_FLAT, g.i, 108);
    for (let n = 0; n < oppFt.ftm; n++) acts.push({ type: T.FREE_THROW_MADE, player: g.code, points: 1, q: oFtM[n], opp: true });
    for (let n = 0; n < oppFt.fta - oppFt.ftm; n++) acts.push({ type: T.FREE_THROW_MISSED, player: g.code, points: 0, q: oFtX[n], opp: true });

    /* --- mise en ordre chronologique --- */
    const byQ = [[], [], [], []];
    acts.forEach((a) => byQ[clamp(a.q, 0, 3)].push(a));
    const ev = [];
    for (let q = 0; q < 4; q++) {
      ev.push(EV.makeEvent(T.START_PERIOD, { period: q + 1 }));
      (g.stints || []).filter((s) => s.q === q).forEach((s, si) => s.lineup.forEach((pi) => {
        ev.push(EV.makeEvent(T.SUBSTITUTION, {
          player: ROSTER[pi] && ROSTER[pi].name, period: q + 1,
          meta: { stint: q * 2 + si, half: si, on: true },
        }));
      }));
      /* Répartition des actions entre les deux séquences du quart-temps, au
         prorata de la valeur des cinq alignés : le +/- des lineups reflète
         alors qui est sur le terrain, et non un simple découpage en deux. */
      const qs = (g.stints || []).filter((s) => s.q === q);
      const att = qs.map((s) => sum(s.lineup.map((pi) => W.shot[pi])) || 1);
      const def = qs.map((s) => 1 / (sum(s.lineup.map((pi) => W.min[pi])) || 1));
      const shareUs = qs.length > 1 ? att[0] / (att[0] + att[1]) : 1;
      const shareThem = qs.length > 1 ? def[0] / (def[0] + def[1]) : 1;

      const list = shuffled(byQ[q], g.i, 120 + q);
      let nUs = 0, nOpp = 0;
      const cUs = list.filter((a) => !a.opp).length, cOpp = list.length - cUs;
      list.forEach((a) => {
        const meta = Object.assign({}, a.meta || {});
        if (a.opp) meta.opponent = true;
        meta.half = a.opp ? (nOpp++ < cOpp * shareThem ? 0 : 1) : (nUs++ < cUs * shareUs ? 0 : 1);
        ev.push(EV.makeEvent(a.type, {
          player: a.player, points: a.points, period: q + 1,
          meta: Object.keys(meta).length ? meta : null,
        }));
      });
      ev.push(EV.makeEvent(T.END_PERIOD, { period: q + 1 }));
    }
    return ev;
  }
  function shotAct(player, zoneId, made, q, side, k) {
    const val = zoneValue(zoneId), pos = pointIn(zoneId, k);
    return {
      type: made ? T.SHOT_MADE : T.SHOT_MISSED, player, points: made ? val : 0, q,
      opp: side === 'away',
      meta: { value: val, zone: zoneId, side, x: pos.x, y: pos.y },
    };
  }

  /**
   * Tirs adverses : chaque tentative est tirée puis résolue individuellement,
   * et l'ensemble est ramené EXACTEMENT au score encaissé en basculant les
   * tirs les plus limites. Les % par zone restent donc fidèles au profil
   * défensif — c'est ce que la carte « adversaires » lit ensuite.
   */
  function fitOpponent(g, att2, att3, phase) {
    const target = g.them;
    const P2 = DEF_2.map((z) => driftedPct(z.p, z.id, DEF_DRIFT, phase));
    const P3 = DEF_3.map((z) => driftedPct(z.p, z.id, DEF_DRIFT, phase));
    const a2 = drawZones(att2, DEF_2.map((z) => z.w), g.i, 231);
    const a3 = drawZones(att3, DEF_3.map((z) => z.w), g.i, 232);
    const fta = Math.round(15 + 9 * rnd(g.i, 18, 83));

    const shots = [];
    a2.forEach((a, k) => { for (let n = 0; n < a; n++) shots.push({ k, val: 2, p: P2[k], u: rnd(g.i, k * 97 + n, 233), made: false }); });
    a3.forEach((a, k) => { for (let n = 0; n < a; n++) shots.push({ k: k + DEF_2.length, val: 3, p: P3[k], u: rnd(g.i, 1500 + k * 97 + n, 233), made: false }); });
    const fts = [];
    for (let n = 0; n < fta; n++) fts.push({ val: 1, p: 0.76, u: rnd(g.i, n, 234), made: false });

    const apply = (kk) => {
      let pts = 0;
      shots.forEach((s) => { s.made = s.u < clamp(s.p * kk, 0.02, 0.95); if (s.made) pts += s.val; });
      fts.forEach((f) => { f.made = f.u < clamp(f.p * kk, 0.30, 0.96); if (f.made) pts += 1; });
      return pts;
    };
    let lo = 0.2, hi = 2.4;
    for (let it = 0; it < 50; it++) { const mid = (lo + hi) / 2; if (apply(mid) < target) lo = mid; else hi = mid; }
    let pts = apply(hi);
    const margin = (s) => s.p * hi - s.u;
    for (let guard = 0; guard < 2000 && pts !== target; guard++) {
      const d = target - pts;
      const pool = (d > 0
        ? shots.filter((s) => !s.made && s.val <= d).concat(fts.filter((f) => !f.made))
        : shots.filter((s) => s.made && s.val <= -d).concat(fts.filter((f) => f.made)));
      if (!pool.length) break;
      pool.sort((a, b) => (d > 0 ? margin(b) - margin(a) : margin(a) - margin(b)));
      const pick = pool[0];
      pick.made = d > 0; pts += (d > 0 ? 1 : -1) * pick.val;
    }
    if (pts !== target) throw new Error('Adversaire : score ' + target + ' non atteint sur ' + g.gameId);

    const madeBy = a2.concat(a3).map(() => 0);
    shots.forEach((s) => { if (s.made) madeBy[s.k]++; });
    let ftm = 0; fts.forEach((f) => { if (f.made) ftm++; });
    const zones = DEF_2.map((z, k) => ({ id: z.id, a: a2[k], m: madeBy[k] }))
      .concat(DEF_3.map((z, k) => ({ id: z.id, a: a3[k], m: madeBy[k + DEF_2.length] })));
    return { zones, ft: { fta, ftm } };
  }

  /* ================================================================
     7. CONSTRUCTION DE LA SAISON
     ================================================================ */
  function build() {
    const games = buildCalendar();

    /* --- ce que les 4 matchs réels apportent déjà --- */
    const KEYS = ['p2a', 'p2m', 'p3a', 'p3m', 'fta', 'ftm', 'ro', 'rd', 'pd', 'int', 'ct', 'bp', 'fa', 'pts'];
    const realTot = {}; KEYS.forEach((k) => { realTot[k] = 0; }); realTot.them = 0;
    games.filter((g) => g.real).forEach((g) => {
      const t = g.box.home.totals;
      KEYS.forEach((k) => { realTot[k] += t[k]; });
      realTot.them += g.them;
    });

    const need = {
      p2a: SEASON_TARGET.p2a - realTot.p2a, p2m: SEASON_TARGET.p2m - realTot.p2m,
      p3a: SEASON_TARGET.p3a - realTot.p3a, p3m: SEASON_TARGET.p3m - realTot.p3m,
      fta: SEASON_TARGET.fta - realTot.fta, ftm: SEASON_TARGET.ftm - realTot.ftm,
      ro: COUNT_TARGET.ro - realTot.ro, rd: COUNT_TARGET.rd - realTot.rd,
      pd: COUNT_TARGET.pd - realTot.pd, int: COUNT_TARGET.int - realTot.int,
      ct: COUNT_TARGET.ct - realTot.ct, bp: COUNT_TARGET.bp - realTot.bp,
      fa: COUNT_TARGET.fa - realTot.fa,
    };

    /* --- répartition sur les matchs générés ---
       Domicile, victoires et progression de l'adresse extérieure influent sur
       les poids : ces effets seront ensuite RE-MESURÉS depuis les événements. */
    const gg = games.filter((g) => !g.real);
    const jitter = (salt) => gg.map((g) => 0.86 + 0.28 * rnd(g.i, salt, 71));
    const A2 = alloc(need.p2a, jitter(5));
    const A3 = alloc(need.p3a, jitter(6));
    const FTA = alloc(need.fta, gg.map((g, j) => jitter(1)[j] * (g.win ? 1.05 : 0.95)));
    const M2 = fitMakes(A2, gg.map((g) => clamp(0.545 * (g.win ? 1.10 : 0.88) * (g.dom ? 1.04 : 0.96), 0.2, 0.9)), need.p2m);
    const M3 = fitMakes(A3, gg.map((g) => clamp(0.34 * (0.84 + 0.34 * g.phase) * (g.win ? 1.12 : 0.86) * (g.dom ? 1.05 : 0.95), 0.12, 0.7)), need.p3m);
    const FTM = fitMakes(FTA, gg.map((g, j) => clamp(0.78 * (0.94 + 0.12 * jitter(7)[j]), 0.5, 0.95)), need.ftm);
    const RO = alloc(need.ro, jitter(8)), RD = alloc(need.rd, jitter(9));
    const PD = alloc(need.pd, gg.map((g, j) => jitter(10)[j] * (g.win ? 1.04 : 0.95)));
    const IN = alloc(need.int, jitter(11)), CT = alloc(need.ct, jitter(12));
    const BP = alloc(need.bp, gg.map((g, j) => jitter(4)[j] * (g.win ? 0.84 : 1.24)));
    const FA = alloc(need.fa, jitter(13));

    /* --- points encaissés : total de saison exact, sens de chaque match garanti --- */
    const usGen = M2.map((m2, j) => 2 * m2 + 3 * M3[j] + FTM[j]);
    const themNeed = OPP_TARGET_PTS - realTot.them;
    /* on gagne plus largement et on perd moins lourdement à domicile */
    const lossW = gg.map((g) => (g.win ? 0 : (0.7 + 0.6 * rnd(g.i, 15, 78)) * (g.dom ? 0.80 : 1.20)));
    const winW = gg.map((g) => (g.win ? (0.7 + 0.6 * rnd(g.i, 14, 77)) * (g.dom ? 1.22 : 0.82) : 0));
    const nLoss = lossW.filter((x) => x > 0).length;
    const lossPts = alloc(5 * nLoss, lossW);
    const winPts = alloc(sum(usGen) - themNeed + sum(lossPts), winW);
    const them = usGen.map((u, j) => (gg[j].win ? u - Math.max(1, winPts[j]) : u + Math.max(1, lossPts[j])));
    let drift = sum(them) - themNeed;
    for (let pass = 0; pass < 600 && drift !== 0; pass++) {
      for (let j = 0; j < gg.length && drift !== 0; j++) {
        const step = drift > 0 ? -1 : 1, v = them[j] + step;
        if (v < 1) continue;
        if (gg[j].win ? v < usGen[j] : v > usGen[j]) { them[j] = v; drift += step; }
      }
    }
    if (drift !== 0) throw new Error('Points encaissés : calibrage impossible');

    /* --- matériel de chaque match --- */
    let j = 0;
    games.forEach((g) => {
      if (g.real) { hydrateRealGame(g); return; }
      const k = j++;
      g.demo = true; g.us = usGen[k]; g.them = them[k];
      const close = Math.abs(g.us - g.them) <= 6;

      const present = ROSTER.map((p, i) => i).filter((i) => AVAIL[i][g.i]);
      const wOf = (arr) => present.map((i) => arr[i] * (0.85 + 0.30 * rnd(i, g.i, 21)));
      const pA2 = alloc(A2[k], wOf(W.shot)), pA3 = alloc(A3[k], wOf(W.three)), pFTA = alloc(FTA[k], wOf(W.ft));
      const jit = (salt) => present.map((i) => 0.80 + 0.40 * rnd(i, g.i, salt));
      const pM2 = allocRoom(M2[k], present.map((i, n) => pA2[n] * ROSTER[i].p2 * jit(203)[n]), pA2);
      const pM3 = allocRoom(M3[k], present.map((i, n) => pA3[n] * ROSTER[i].p3 * jit(204)[n]), pA3);
      const pFTM = allocRoom(FTM[k], present.map((i, n) => pFTA[n] * ROSTER[i].lf * jit(205)[n]), pFTA);
      const pRO = alloc(RO[k], wOf(W.ro)), pRD = alloc(RD[k], wOf(W.rd));
      const pPD = alloc(PD[k], wOf(W.pd)), pIN = alloc(IN[k], wOf(W.int));
      const pCT = alloc(CT[k], wOf(W.ct)), pBP = alloc(BP[k], wOf(W.bp));
      const pFA = alloc(FA[k], wOf(W.fa)), pMIN = alloc(200, wOf(W.min));

      g.players = present.map((i, n) => {
        const p = ROSTER[i], seed = g.i * 37 + i;
        const z2 = playerZones(p, OFF_2, pA2[n], pM2[n], g.phase, null, 2, seed);
        const z3 = playerZones(p, OFF_3, pA3[n], pM3[n], g.phase, OFF_DRIFT, 3, seed + 991);
        return {
          i, id: p.id, name: p.name, num: p.num, poste: p.poste, inside: p.inside,
          a2: pA2[n], m2: pM2[n], a3: pA3[n], m3: pM3[n], fta: pFTA[n], ftm: pFTM[n],
          ro: pRO[n], rd: pRD[n], pd: pPD[n], int: pIN[n], ct: pCT[n], bp: pBP[n], fa: pFA[n],
          min: pMIN[n], zones: z2.concat(z3),
          pts: 2 * pM2[n] + 3 * pM3[n] + pFTM[n],
        };
      });

      const opp = fitOpponent(g,
        Math.round(37 + 7 * rnd(g.i, 16, 81)),
        Math.round(21 + 6 * rnd(g.i, 17, 82)), g.phase);
      g.oppZones = opp.zones; g.oppFt = opp.ft;

      g.stints = stintsFor(g, present);
      g.events = buildEvents(g, g.players, g.oppZones, g.oppFt, close);
      finalizeGame(g);
    });

    return assemble(games);
  }

  /** Match réel : événements reconstruits depuis le box score officiel. */
  function hydrateRealGame(g) {
    const bs = g.box;
    g.demo = false;
    g.players = bs.home.players.filter((p) => p.min > 0 || p.p2a + p.p3a + p.fta > 0).map((p, n) => {
      const r = BY_ID[p.id] || { p2: 0.52, p3: 0.34, lf: 0.76, inside: /fort|Int|Piv/i.test(p.poste || '') };
      const seed = g.i * 37 + n;
      const z2 = playerZones(r, OFF_2, p.p2a, p.p2m, g.phase, null, 2, seed);
      const z3 = playerZones(r, OFF_3, p.p3a, p.p3m, g.phase, OFF_DRIFT, 3, seed + 991);
      return {
        i: ROSTER.findIndex((x) => x.id === p.id), id: p.id, name: p.name, num: p.num, poste: p.poste,
        inside: r.inside, a2: p.p2a, m2: p.p2m, a3: p.p3a, m3: p.p3m, fta: p.fta, ftm: p.ftm,
        ro: p.ro, rd: p.rd, pd: p.pd, int: p.int, ct: p.ct, bp: p.bp, fa: p.fa, min: p.min,
        zones: z2.concat(z3), pts: p.pts,
      };
    });
    const opp = fitOpponent(g, Math.round(bs.home.totals.p2a * 0.98), Math.round(bs.home.totals.p3a * 0.95), g.phase);
    g.oppZones = opp.zones; g.oppFt = opp.ft;
    const present = g.players.map((p) => p.i).filter((i) => i >= 0);
    g.stints = stintsFor(g, present.length >= 5 ? present : ROSTER.map((p, i) => i).slice(0, 8));
    g.events = buildEvents(g, g.players, g.oppZones, g.oppFt, Math.abs(g.us - g.them) <= 6);
    finalizeGame(g);
    /* quart-temps officiels quand ils existent (ils priment sur la simulation) */
    const q = Store.getQuarters(g.matchId);
    if (q && sum(q.home) === g.us && sum(q.away) === g.them) g.quarters = { us: q.home.slice(), them: q.away.slice() };
  }

  /** Recalcule tout depuis les événements — et vérifie que le score colle. */
  function finalizeGame(g) {
    g.totals = totalsFromEvents(g.events, false);
    g.oppTotals = totalsFromEvents(g.events, true);
    g.quarters = quartersFromEvents(g.events);
    g.zones = zonesFromEvents(g.events, false);
    g.oppZonesAgg = zonesFromEvents(g.events, true);
    /* possessions estimées depuis les événements (formule usuelle) */
    const t = g.totals;
    g.poss = Math.max(40, Math.round(t.p2a + t.p3a + 0.44 * t.fta + t.bp - t.ro));
    if (g.totals.pts !== g.us) throw new Error('Score dérivé incohérent (' + g.gameId + ') : ' + g.totals.pts + ' ≠ ' + g.us);
    if (g.oppTotals.pts !== g.them) throw new Error('Score adverse dérivé incohérent (' + g.gameId + ') : ' + g.oppTotals.pts + ' ≠ ' + g.them);
    attributeStints(g);
  }

  /* ================================================================
     8. AGRÉGATION DEPUIS LES ÉVÉNEMENTS
     ================================================================ */
  function emptyT() {
    return { p2m: 0, p2a: 0, p3m: 0, p3a: 0, ftm: 0, fta: 0, ro: 0, rd: 0, reb: 0, pd: 0, int: 0, ct: 0, bp: 0, fa: 0, pts: 0 };
  }
  function totalsFromEvents(events, opponent) {
    const s = emptyT();
    events.forEach((e) => {
      if (!!(e.meta && e.meta.opponent) !== !!opponent) return;
      const v = e.meta && e.meta.value;
      switch (e.type) {
        case T.SHOT_MADE: if (v === 3) { s.p3m++; s.p3a++; } else { s.p2m++; s.p2a++; } s.pts += e.points || 0; break;
        case T.SHOT_MISSED: if (v === 3) s.p3a++; else s.p2a++; break;
        case T.FREE_THROW_MADE: s.ftm++; s.fta++; s.pts += 1; break;
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
    });
    return s;
  }
  function zonesFromEvents(events, opponent) {
    const z = {};
    events.forEach((e) => {
      if (e.type !== T.SHOT_MADE && e.type !== T.SHOT_MISSED) return;
      if (!!(e.meta && e.meta.opponent) !== !!opponent) return;
      const id = e.meta && e.meta.zone; if (!id) return;
      const s = z[id] || (z[id] = { id, a: 0, m: 0 });
      s.a++; if (e.type === T.SHOT_MADE) s.m++;
    });
    return ZONE_IDS.map((id) => z[id] || { id, a: 0, m: 0 });
  }
  function quartersFromEvents(events) {
    const us = [0, 0, 0, 0], them = [0, 0, 0, 0];
    events.forEach((e) => {
      if (!e.points || !e.period) return;
      const q = clamp(e.period - 1, 0, 3);
      if (e.meta && e.meta.opponent) them[q] += e.points; else us[q] += e.points;
    });
    return { us, them };
  }
  /** Attribue chaque point marqué/encaissé au cinq présent (via SUBSTITUTION). */
  function attributeStints(g) {
    if (!g.stints || !g.stints.length) return;
    g.stints.forEach((s) => { s.us = 0; s.them = 0; });
    const byQ = [[], [], [], []];
    g.stints.forEach((s, si) => byQ[s.q].push(si));
    g.events.forEach((e) => {
      if (!e.points || !e.period) return;
      const list = byQ[clamp(e.period - 1, 0, 3)];
      if (!list.length) return;
      const half = (e.meta && e.meta.half) || 0;
      const s = g.stints[list[Math.min(half, list.length - 1)]];
      if (e.meta && e.meta.opponent) s.them += e.points; else s.us += e.points;
    });
  }

  /* ================================================================
     9. ASSEMBLAGE
     ================================================================ */
  function zoneAcc() { const z = {}; ZONE_IDS.forEach((id) => { z[id] = { a: 0, m: 0 }; }); return z; }
  function finishZones(acc) {
    const tot = sum(ZONE_IDS.map((id) => acc[id].a));
    const totM = sum(ZONE_IDS.map((id) => acc[id].m));
    const totPts = sum(ZONE_IDS.map((id) => acc[id].m * zoneValue(id)));
    const ppaAll = tot ? totPts / tot : 0;
    /* Repère par famille de tir : comparer un corner à 3 pts à la réussite
       GLOBALE (2 et 3 pts confondus) n'a aucun sens — on compare un tir à
       3 pts aux autres tirs à 3 pts. */
    const base = {};
    [2, 3].forEach((v) => {
      const ids = ZONE_IDS.filter((id) => zoneValue(id) === v);
      base[v] = pctOf(sum(ids.map((id) => acc[id].m)), sum(ids.map((id) => acc[id].a)));
    });
    const out = {};
    ZONE_IDS.forEach((id) => {
      const z = acc[id], v = zoneValue(id), ppa = z.a ? (z.m * v) / z.a : 0;
      out[id] = {
        id, label: ZLABEL[id], group: ZGROUP[id], groupLabel: GROUP_LABEL[ZGROUP[id]] || '', value: v,
        a: z.a, m: z.m, pct: pctOf(z.m, z.a), pts: z.m * v,
        freq: tot ? r1((z.a / tot) * 100) : 0,
        ppa: r2(ppa), vsAvgPpa: r2(ppa - ppaAll),
        basePct: base[v], vsAvgPct: r1(pctOf(z.m, z.a) - base[v]),
        heat: ppaAll > 0 ? clamp(0.5 + (ppa - ppaAll) / 0.8, 0, 1) : 0.5,
        top: [],
      };
    });
    return { zones: out, total: tot, made: totM, pts: totPts, pct: pctOf(totM, tot), ppa: r2(ppaAll), base };
  }

  function assemble(games) {
    const tot = emptyT(); let them = 0;
    const zOurs = zoneAcc(), zOpp = zoneAcc(), zOurs5 = zoneAcc(), zOpp5 = zoneAcc();
    const zPlayers = {}; ZONE_IDS.forEach((id) => { zPlayers[id] = {}; });
    const qUs = [0, 0, 0, 0], qThem = [0, 0, 0, 0];
    const last5 = games.slice(-5), inLast5 = {}; last5.forEach((g) => { inLast5[g.gameId] = true; });

    games.forEach((g) => {
      Object.keys(tot).forEach((key) => { tot[key] += g.totals[key] || 0; });
      them += g.them;
      g.zones.forEach((z) => { zOurs[z.id].a += z.a; zOurs[z.id].m += z.m; if (inLast5[g.gameId]) { zOurs5[z.id].a += z.a; zOurs5[z.id].m += z.m; } });
      g.oppZonesAgg.forEach((z) => { zOpp[z.id].a += z.a; zOpp[z.id].m += z.m; if (inLast5[g.gameId]) { zOpp5[z.id].a += z.a; zOpp5[z.id].m += z.m; } });
      (g.players || []).forEach((p) => (p.zones || []).forEach((z) => {
        const e = zPlayers[z.id][p.name] || (zPlayers[z.id][p.name] = { name: p.name, num: p.num, a: 0, m: 0 });
        e.a += z.a; e.m += z.m;
      }));
      g.quarters.us.forEach((v, q) => { qUs[q] += v; });
      g.quarters.them.forEach((v, q) => { qThem[q] += v; });
    });

    const N = games.length;
    const perGame = {
      pts: r1(tot.pts / N), ptsContre: r1(them / N), diff: r1((tot.pts - them) / N),
      p2Pct: pctOf(tot.p2m, tot.p2a), p3Pct: pctOf(tot.p3m, tot.p3a), lfPct: pctOf(tot.ftm, tot.fta),
      fgPct: pctOf(tot.p2m + tot.p3m, tot.p2a + tot.p3a),
      ro: r1(tot.ro / N), rd: r1(tot.rd / N), reb: r1(tot.reb / N),
      pd: r1(tot.pd / N), int: r1(tot.int / N), ct: r1(tot.ct / N), bp: r1(tot.bp / N), fa: r1(tot.fa / N),
      p2a: r1(tot.p2a / N), p3a: r1(tot.p3a / N), fta: r1(tot.fta / N),
    };
    const wins = games.filter((g) => g.win).length;
    const record = {
      w: wins, l: N - wins, played: N, pct: Math.round((wins / N) * 1000) / 10,
      rank: 5, rankOf: 18, qualification: DATA.tournoi.qualification,
    };

    const ours = finishZones(zOurs), opp = finishZones(zOpp);
    const ours5 = finishZones(zOurs5), opp5 = finishZones(zOpp5);
    ZONE_IDS.forEach((id) => {
      ours.zones[id].top = Object.keys(zPlayers[id]).map((n) => zPlayers[id][n])
        .filter((p) => p.a >= 20)
        .map((p) => ({ name: p.name, num: p.num, a: p.a, m: p.m, pct: pctOf(p.m, p.a) }))
        .sort((a, b) => b.pct - a.pct || b.a - a.a).slice(0, 3);
    });

    const sliceStats = (list) => {
      const t = emptyT(); let tm = 0;
      list.forEach((g) => { Object.keys(t).forEach((k) => { t[k] += g.totals[k] || 0; }); tm += g.them; });
      const n = list.length || 1;
      return {
        n: list.length, w: list.filter((g) => g.win).length,
        pts: r1(t.pts / n), ptsContre: r1(tm / n), diff: r1((t.pts - tm) / n),
        p2Pct: pctOf(t.p2m, t.p2a), p3Pct: pctOf(t.p3m, t.p3a), lfPct: pctOf(t.ftm, t.fta),
        fgPct: pctOf(t.p2m + t.p3m, t.p2a + t.p3a),
        reb: r1(t.reb / n), ro: r1(t.ro / n), rd: r1(t.rd / n), pd: r1(t.pd / n),
        int: r1(t.int / n), ct: r1(t.ct / n), bp: r1(t.bp / n), fa: r1(t.fa / n),
        p2a: r1(t.p2a / n), p3a: r1(t.p3a / n),
      };
    };
    const splits = {
      home: sliceStats(games.filter((g) => g.dom)), away: sliceStats(games.filter((g) => !g.dom)),
      wins: sliceStats(games.filter((g) => g.win)), losses: sliceStats(games.filter((g) => !g.win)),
      last5: sliceStats(last5), last10: sliceStats(games.slice(-10)), season: sliceStats(games),
    };
    const quarters = {
      us: qUs.map((v) => r1(v / N)), them: qThem.map((v) => r1(v / N)),
      diff: qUs.map((v, q) => r1((v - qThem[q]) / N)),
    };

    /* cinq majeurs — issus des événements SUBSTITUTION */
    const lineAcc = {};
    games.forEach((g) => (g.stints || []).forEach((s) => {
      const key = s.lineup.join('-');
      const e = lineAcc[key] || (lineAcc[key] = { players: s.lineup.slice(), stints: 0, us: 0, them: 0, poss: 0 });
      e.stints++; e.us += s.us; e.them += s.them; e.poss += g.poss / 8;   // 8 séquences par match
    }));
    const lineups = Object.keys(lineAcc).map((k) => {
      const e = lineAcc[k], poss = Math.max(1, e.poss);
      return {
        names: e.players.map((i) => ROSTER[i] && ROSTER[i].name).filter(Boolean),
        ids: e.players.map((i) => ROSTER[i] && ROSTER[i].id).filter(Boolean),
        stints: e.stints, minutes: e.stints * 5, poss: Math.round(poss),
        off: r1((e.us / poss) * 100), def: r1((e.them / poss) * 100), net: r1(((e.us - e.them) / poss) * 100),
      };
    }).filter((l) => l.names.length === 5 && l.minutes >= 50).sort((a, b) => b.net - a.net);

    /* forme des joueurs : 5 derniers matchs vs saison */
    const acc = (bag, p) => {
      const e = bag[p.name] || (bag[p.name] = { name: p.name, num: p.num, g: 0, pts: 0, reb: 0, pd: 0, fgm: 0, fga: 0, p3m: 0, p3a: 0 });
      e.g++; e.pts += p.pts; e.reb += p.ro + p.rd; e.pd += p.pd;
      e.fgm += p.m2 + p.m3; e.fga += p.a2 + p.a3; e.p3m += p.m3; e.p3a += p.a3;
    };
    const pAll = {}, pL5 = {};
    games.forEach((g) => (g.players || []).forEach((p) => acc(pAll, p)));
    last5.forEach((g) => (g.players || []).forEach((p) => acc(pL5, p)));
    /* Les volumes générés sont calibrés sur les repères d'ÉQUIPE, donc environ
       7 % au-dessus des moyennes individuelles publiées (voir l'en-tête du
       module). On ramène ici chaque joueur à SA moyenne publiée et on applique
       la variation mesurée : les chiffres affichés restent ceux de l'effectif
       et des fiches joueur, tout en portant la tendance réelle. */
    const PUB = {}; ROSTER.forEach((p) => { PUB[p.name] = p.s; });
    const form = Object.keys(pL5).map((n) => {
      const a = pAll[n], b = pL5[n], ref = PUB[n];
      if (!a || a.g < 15 || b.g < 3) return null;
      const engPts = a.pts / a.g, engReb = a.reb / a.g;
      const kPts = (ref && engPts > 0) ? ref.pts / engPts : 1;
      const kReb = (ref && engReb > 0) ? ref.reb / engReb : 1;
      const seasonPts = ref ? ref.pts : r1(engPts);
      const lastPts = r1((b.pts / b.g) * kPts);
      return {
        name: n, num: b.num, games: b.g,
        seasonPts: seasonPts, lastPts: lastPts, deltaPts: r1(lastPts - seasonPts),
        seasonFg: pctOf(a.fgm, a.fga), lastFg: pctOf(b.fgm, b.fga), deltaFg: r1(pctOf(b.fgm, b.fga) - pctOf(a.fgm, a.fga)),
        seasonReb: ref ? ref.reb : r1(engReb), lastReb: r1((b.reb / b.g) * kReb),
      };
    }).filter(Boolean).sort((a, b) => b.deltaPts - a.deltaPts);

    const S = {
      club: Store.getClub(), tournoi: DATA.tournoi, label: DATA.tournoi.nom, saison: DATA.tournoi.saison,
      games, N, totals: tot, oppPts: them, perGame, record, quarters,
      zones: { ours, opp, ours5, opp5 }, zoneIds: ZONE_IDS,
      splits, lineups, form,
      eventCount: sum(games.map((g) => g.events.length)),
      demoGames: games.filter((g) => g.demo).length,
      poss: sum(games.map((g) => g.poss)),
      /* dernier match joué et prochaine échéance — pour la première ligne de
         la page SAISON. Le dernier match possède toujours sa page d'analyse
         (le calendrier se termine sur un match réel). */
      lastGame: games[games.length - 1],
      nextMatch: Store.getMatches().find((m) => m.status === 'upcoming') || null,
    };
    S.netRating = r1(((S.totals.pts - S.oppPts) / Math.max(1, S.poss)) * 100);
    S.pace = r1(S.poss / S.N);
    S.strengths = buildStrengths(S);
    S.improvements = buildImprovements(S);
    S.trends = buildTrends(S);
    S.ai = buildAI(S);
    return S;
  }

  /* ================================================================
     10. LECTURE — forces, axes de progrès, tendances, analyse IA
     ---------------------------------------------------------------
     Chaque constat est CALCULÉ depuis les agrégats ci-dessus : aucune
     phrase n'existe sans la donnée qui la justifie.
     ================================================================ */
  const nb = (v) => String(r1(v)).replace('.', ',');
  const pc = (v) => nb(v) + ' %';
  const sg = (v, unit) => (v > 0 ? '+' : '−') + nb(Math.abs(v)) + (unit || '');
  const low = (s) => String(s || '').toLowerCase();
  const ord = (n) => (n === 1 ? '1er' : n + 'e');
  const over = (v) => (v >= 0 ? 'au-dessus' : 'en dessous');

  function zonesSorted(zmap, minAtt, dir, filter) {
    return ZONE_IDS.map((id) => zmap.zones[id])
      .filter((z) => z.a >= minAtt && (!filter || filter(z)))
      .sort((a, b) => (dir > 0 ? b.ppa - a.ppa : a.ppa - b.ppa));
  }

  function buildStrengths(S) {
    const out = [];
    const best3 = zonesSorted(S.zones.ours, 100, +1, (z) => z.value === 3)[0];
    if (best3) out.push({ key: 'zone3', value: best3.pct, unit: '%', label: low(best3.label),
      text: `${pc(best3.pct)} à 3 points depuis « ${low(best3.label)} » (${best3.m}/${best3.a}), soit ${sg(best3.vsAvgPct, ' pt')} ${over(best3.vsAvgPct)} de notre réussite à 3 points (${pc(best3.basePct)}).` });

    const rim = S.zones.ours.zones['restricted-area-center'];
    if (rim && rim.a >= 100) out.push({ key: 'rim', value: rim.pct, unit: '%',
      text: `${pc(rim.pct)} sous le cercle sur ${rim.a} tirs : ${nb(rim.ppa)} point par tentative, le meilleur rendement de la carte.` });

    if (S.perGame.ro >= 8.5) out.push({ key: 'ro', value: S.perGame.ro, unit: '',
      text: `${nb(S.perGame.ro)} rebonds offensifs par match (${S.totals.ro} sur la saison) : ${pc((S.totals.ro / S.totals.reb) * 100)} de nos rebonds sont pris en attaque.` });

    if (S.perGame.lfPct >= 75) out.push({ key: 'lf', value: S.perGame.lfPct, unit: '%',
      text: `${pc(S.perGame.lfPct)} aux lancers francs (${S.totals.ftm}/${S.totals.fta}) — de quoi tenir les fins de match serrées.` });

    if (S.perGame.pd >= 16) out.push({ key: 'pd', value: S.perGame.pd, unit: '',
      text: `${nb(S.perGame.pd)} passes décisives par match : ${pc((S.totals.pd / (S.totals.p2m + S.totals.p3m)) * 100)} de nos paniers sont créés par une passe.` });

    const better = S.splits.home.diff >= S.splits.away.diff ? S.splits.home : S.splits.away;
    const lbl = better === S.splits.home ? 'À domicile' : 'À l’extérieur';
    if (better.diff > S.perGame.diff) out.push({ key: 'venue', value: better.diff, unit: '',
      text: `${lbl} : ${sg(better.diff)} de différentiel moyen sur ${better.n} matchs (${better.w}V), contre ${sg(S.perGame.diff)} sur l'ensemble de la saison.` });

    return out.slice(0, 5);
  }

  function buildImprovements(S) {
    const out = [];
    const dBp = r1(S.splits.losses.bp - S.splits.wins.bp);
    if (S.perGame.bp >= 10) out.push({ key: 'bp', value: S.perGame.bp,
      text: `${nb(S.perGame.bp)} pertes de balle par match — et ${nb(Math.abs(dBp))} de plus en défaite (${nb(S.splits.losses.bp)}) qu'en victoire (${nb(S.splits.wins.bp)}).` });

    const weak = zonesSorted(S.zones.ours, 80, -1)[0];
    if (weak) out.push({ key: 'weakzone', value: weak.pct,
      text: `« ${weak.label} » : ${weak.m}/${weak.a} soit ${pc(weak.pct)} pour ${nb(weak.ppa)} point par tir — la zone la moins rentable de notre carte, et ${pc(weak.freq)} de nos tentatives.` });

    const dWeak = zonesSorted(S.zones.opp, 80, +1, (z) => z.value === 3)[0];
    if (dWeak) out.push({ key: 'defzone', value: dWeak.pct,
      text: `Les adversaires shootent à ${pc(dWeak.pct)} depuis « ${low(dWeak.label)} » (${dWeak.m}/${dWeak.a}) : notre principale fuite défensive à 3 points.` });

    const qWorst = S.quarters.diff.indexOf(Math.min.apply(null, S.quarters.diff));
    out.push({ key: 'q', value: S.quarters.diff[qWorst],
      text: `${ord(qWorst + 1)} quart-temps : ${nb(S.quarters.us[qWorst])} points marqués pour ${nb(S.quarters.them[qWorst])} encaissés, soit ${sg(S.quarters.diff[qWorst])} — notre période la plus faible.` });

    const homeWorse = S.splits.home.diff < S.splits.away.diff;
    const worse = homeWorse ? S.splits.home : S.splits.away;
    const other = homeWorse ? S.splits.away : S.splits.home;
    out.push({ key: 'venue', value: worse.diff,
      text: `${worse.w} victoires en ${worse.n} matchs ${homeWorse ? 'à domicile' : 'à l’extérieur'} pour ${sg(worse.diff)} de différentiel, contre ${sg(other.diff)} ${homeWorse ? 'à l’extérieur' : 'à domicile'} : un écart de ${nb(Math.abs(other.diff - worse.diff))} points par match.` });

    if (S.perGame.fa >= 17) out.push({ key: 'fa', value: S.perGame.fa,
      text: `${nb(S.perGame.fa)} fautes par match (${nb(S.splits.losses.fa)} lors des défaites) : l'équipe renvoie trop souvent l'adversaire sur la ligne.` });

    return out.slice(0, 5);
  }

  function buildTrends(S) {
    const a = S.splits.last5, b = S.splits.season;
    const mk = (label, last, season, hib, unit) => ({
      label, last: r1(last), season: r1(season), delta: r1(last - season),
      good: hib ? last > season : last < season,
      neutral: Math.abs(last - season) < (unit === '%' ? 0.8 : 0.5), unit: unit || '',
    });
    return {
      n: a.n, wins: a.w,
      rows: [
        mk('Adresse à 3 points', a.p3Pct, b.p3Pct, true, '%'),
        mk('Adresse à 2 points', a.p2Pct, b.p2Pct, true, '%'),
        mk('Points marqués', a.pts, b.pts, true, ''),
        mk('Points encaissés', a.ptsContre, b.ptsContre, false, ''),
        mk('Rebonds', a.reb, b.reb, true, ''),
        mk('Passes décisives', a.pd, b.pd, true, ''),
        mk('Pertes de balle', a.bp, b.bp, false, ''),
        mk('Interceptions', a.int, b.int, true, ''),
      ],
    };
  }

  function buildAI(S) {
    const out = [], push = (title, text, tone) => out.push({ title, text, tone: tone || 'neutral' });

    /* 1 — la zone défensive qui se dégrade (5 derniers matchs vs saison) */
    let worst = null;
    ZONE_IDS.filter((id) => zoneValue(id) === 3).forEach((id) => {
      const s = S.zones.opp.zones[id], l = S.zones.opp5.zones[id];
      if (!s || !l || l.a < 12) return;
      const d = r1(l.pct - s.pct);
      if (!worst || d > worst.d) worst = { s, l, d };
    });
    if (worst && worst.d >= 1.5) {
      push('Fuite défensive en cours',
        `Sur les 5 derniers matchs, les adversaires tirent à ${pc(worst.l.pct)} depuis « ${low(worst.s.label)} » (${worst.l.m}/${worst.l.a}) contre ${pc(worst.s.pct)} sur l'ensemble de la saison, soit ${sg(worst.d, ' pt')}. Cette zone leur a déjà rapporté ${worst.s.pts} points cette saison : c'est aujourd'hui votre priorité défensive.`, 'bad');
    }
    /* 2 — adresse extérieure : évolution */
    const t3 = S.trends.rows[0];
    if (t3 && Math.abs(t3.delta) >= 1) {
      push(t3.good ? 'Progression de l’adresse extérieure' : 'Adresse extérieure en baisse',
        `Sur les ${S.trends.n} derniers matchs, l'adresse à 3 points est passée à ${pc(t3.last)} contre ${pc(t3.season)} sur la saison (${sg(t3.delta, ' pt')}), pour ${nb(S.splits.last5.p3a)} tentatives par match contre ${nb(S.perGame.p3a)}. ${t3.good ? 'Volume et réussite montent ensemble : la circulation extérieure produit de meilleurs tirs.' : 'Le volume tient mais la réussite chute : la sélection de tir est à resserrer.'}`,
        t3.good ? 'good' : 'bad');
    }
    /* 3 — sélection de tir : mi-distance contre cercle */
    const grp = (g) => {
      const zs = ZONE_IDS.filter((id) => S.zones.ours.zones[id].group === g).map((id) => S.zones.ours.zones[id]);
      const a = sum(zs.map((z) => z.a)), m = sum(zs.map((z) => z.m)), p = sum(zs.map((z) => z.pts));
      return { a, m, pts: p, pct: pctOf(m, a), ppa: a ? p / a : 0 };
    };
    const mid = grp('mid'), rim = grp('rim');
    if (mid.a && rim.a) {
      push('Sélection de tir',
        `${pc((mid.a / S.zones.ours.total) * 100)} de vos tirs sont pris à mi-distance (${mid.a} tentatives, ${pc(mid.pct)}) pour ${nb(mid.ppa)} point par tentative, contre ${nb(rim.ppa)} près du cercle (${pc(rim.pct)} sur ${rim.a} tirs). Chaque tir déplacé de la mi-distance vers le cercle vaut environ ${nb(rim.ppa - mid.ppa)} point : sur une saison, ${Math.round(mid.a * 0.2)} tirs redirigés représentent ${Math.round(mid.a * 0.2 * (rim.ppa - mid.ppa))} points.`);
    }
    /* 4 — victoires contre défaites */
    const dBp = r1(S.splits.losses.bp - S.splits.wins.bp);
    const dP3 = r1(S.splits.wins.p3Pct - S.splits.losses.p3Pct);
    push('Ce qui sépare les victoires des défaites',
      `Lors des ${S.splits.losses.n} défaites, l'équipe perd ${nb(Math.abs(dBp))} ballons de plus par match qu'en victoire (${nb(S.splits.losses.bp)} contre ${nb(S.splits.wins.bp)}) et shoote ${nb(Math.abs(dP3))} points de moins à 3 points (${pc(S.splits.losses.p3Pct)} contre ${pc(S.splits.wins.p3Pct)}). Le différentiel bascule de ${sg(S.splits.wins.diff)} à ${sg(S.splits.losses.diff)} : la balle perdue est le premier marqueur de vos défaites.`);
    /* 5 — quart-temps */
    const qMin = S.quarters.diff.indexOf(Math.min.apply(null, S.quarters.diff));
    const qMax = S.quarters.diff.indexOf(Math.max.apply(null, S.quarters.diff));
    push('Performance par quart-temps',
      `Votre meilleure période est le ${ord(qMax + 1)} quart-temps (${sg(S.quarters.diff[qMax])} par match), la plus faible le ${ord(qMin + 1)} (${sg(S.quarters.diff[qMin])}, ${nb(S.quarters.us[qMin])} marqués pour ${nb(S.quarters.them[qMin])} encaissés). L'écart entre les deux vaut ${nb(S.quarters.diff[qMax] - S.quarters.diff[qMin])} points par match${qMin === 3 ? ' — et il se paie en fin de match serré.' : '.'}`,
      S.quarters.diff[3] < 0 ? 'bad' : 'neutral');
    /* 6 — domicile / extérieur */
    push('Domicile et extérieur',
      `${S.splits.home.w} victoires en ${S.splits.home.n} matchs à domicile (${nb(S.splits.home.pts)} marqués / ${nb(S.splits.home.ptsContre)} encaissés) contre ${S.splits.away.w} en ${S.splits.away.n} à l'extérieur (${nb(S.splits.away.pts)} / ${nb(S.splits.away.ptsContre)}). L'écart de différentiel atteint ${nb(Math.abs(S.splits.home.diff - S.splits.away.diff))} points par match, pour une adresse à 3 points de ${pc(S.splits.home.p3Pct)} à domicile contre ${pc(S.splits.away.p3Pct)} dehors.`);
    /* 7 — joueurs en forme / en baisse */
    const up = S.form[0], down = S.form[S.form.length - 1];
    if (up && up.deltaPts >= 1.5) {
      push('Joueur en progression',
        `${up.name} tourne à ${nb(up.lastPts)} points sur les 5 derniers matchs contre ${nb(up.seasonPts)} sur la saison (${sg(up.deltaPts)}), avec ${pc(up.lastFg)} aux tirs contre ${pc(up.seasonFg)} et ${nb(up.lastReb)} rebonds. À utiliser davantage dans les systèmes de fin de match.`, 'good');
    }
    if (down && down.deltaPts <= -1.5 && (!up || down.name !== up.name)) {
      push('Joueur en baisse',
        `${down.name} est à ${nb(down.lastPts)} points sur les 5 derniers matchs contre ${nb(down.seasonPts)} sur la saison (${sg(down.deltaPts)}), pour ${pc(down.lastFg)} aux tirs contre ${pc(down.seasonFg)}. À surveiller sur les prochaines rotations.`, 'bad');
    }
    /* 8 — cinq majeurs (issus des SUBSTITUTION) */
    if (S.lineups.length) {
      const b = S.lineups[0];
      const teamNet = r1(((S.totals.pts - S.oppPts) / sum(S.games.map((g) => g.poss))) * 100);
      push('Le cinq le plus efficace',
        `${b.names.join(', ')} : ${sg(b.net)} points pour 100 possessions sur ${b.minutes} minutes cumulées (${nb(b.off)} marqués / ${nb(b.def)} encaissés). L'équipe tourne à ${sg(teamNet)} pour 100 possessions toutes rotations confondues : ce cinq vaut ${nb(Math.abs(b.net - teamNet))} points de mieux.`,
        b.net > 0 ? 'good' : 'neutral');
    }
    /* 9 — spot individuel sous-exploité */
    const spot = ZONE_IDS.map((id) => S.zones.ours.zones[id])
      .filter((z) => z.value === 3 && z.top.length && z.top[0].a >= 25)
      .sort((a, b) => b.top[0].pct - a.top[0].pct)[0];
    if (spot) {
      push('Spot de tir sous-exploité',
        `Depuis « ${low(spot.label)} », ${spot.top[0].name} shoote à ${pc(spot.top[0].pct)} (${spot.top[0].m}/${spot.top[0].a}) quand l'équipe y est à ${pc(spot.pct)}. Cette zone ne pèse que ${pc(spot.freq)} du volume de tirs de la saison : il y a de la marge pour la solliciter davantage.`, 'good');
    }
    return out;
  }

  /* ================================================================
     11. API publique
     ================================================================ */
  let _SEASON = null;
  function get() { if (!_SEASON) _SEASON = build(); return _SEASON; }

  return {
    get,
    ZONE_IDS, GROUP_LABEL,
    zoneLabel: (id) => ZLABEL[id] || id,
    zoneGroup: (id) => ZGROUP[id] || 'mid',
    zoneValue,
    _internals: { alloc, fitMakes, totalsFromEvents, zonesFromEvents, buildCalendar, SEASON_TARGET, COUNT_TARGET, OPP_TARGET_PTS, N_GAMES, ROSTER },
  };
});
