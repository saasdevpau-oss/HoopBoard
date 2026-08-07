/**
 * HoopBoard — Espace Joueur (démo Sylvain Francisco · Žalgiris Kaunas)
 * ------------------------------------------------------------------
 * Application joueur pilotée par la SOURCE DE DONNÉES COMMUNE (HoopStore).
 * Un seul modèle `M` est dérivé du store puis alimente les 5 vues :
 *   Dashboard · Entraînements (Collectif/Tirs) · Game Center (Saison/Matchs)
 *   · HoopFeed · Profil.
 *
 * Cohérence : un match (playerMatchLog/getPlayerGame) alimente à la fois le
 * Dashboard, le Game Center, le Profil (records/badges) et le HoopFeed. Une
 * séance de tir alimente l'onglet Tirs, le Dashboard et un post HoopFeed.
 *
 * Terrain & shot charts : composant unique HoopCourt (assets/court.js).
 * Aucune donnée n'est codée en dur ici : tout vient de HoopStore, sauf les
 * séances d'entraînement/tir de démo — inexistantes dans le feed EuroLeague —
 * générées de façon déterministe et clairement identifiées (demo).
 */
(function () {
  'use strict';
  const S = window.HoopStore;
  const Court = window.HoopCourt;
  if (!S) { console.error('[HoopBoard] HoopStore introuvable — vérifier l\'ordre des <script>.'); return; }

  const PID = 'sylvain-francisco';

  /* ============================================================
     0. Utilitaires
     ============================================================ */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const round1 = (n) => Math.round(n * 10) / 10;
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const pctOf = (m, a) => (a > 0 ? round1((m / a) * 100) : 0);

  // RNG déterministe (mulberry32) à partir d'une graine chaîne — pour la démo.
  function hashStr(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
  function rng(seed) { let a = (typeof seed === 'string' ? hashStr(seed) : seed) >>> 0; return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
  function parseISO(d) { const p = String(d).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function fmtDate(d, withDay) { const dt = (d instanceof Date) ? d : parseISO(d); const s = dt.getDate() + ' ' + MOIS[dt.getMonth()]; return withDay ? JOURS[dt.getDay()] + ' ' + s : s; }
  function fmtDateLong(d) { const dt = (d instanceof Date) ? d : parseISO(d); return dt.getDate() + ' ' + MOIS[dt.getMonth()] + ' ' + dt.getFullYear(); }
  const signed = (n) => (n > 0 ? '+' + n : '' + n);
  const initials = (name) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  /* ============================================================
     1. Modèle commun — dérivé de HoopStore
     ============================================================ */
  const club = S.getClub();
  const tournoi = S.getTournoi();
  const player = S.getPlayer(PID);
  const profile = S.getPlayerProfile(PID);   // header, matchLog(24), last5, avg5, seasonCmp, matchZones, training…
  const H = profile.header;                   // moyennes saison officielles + profil de tir
  const LOG = profile.matchLog.slice();       // 24 matchs générés (canon interne, cohérent avec la saison)

  // Records personnels — dérivés du MÊME match log (Game Center = Profil = Feed).
  function maxBy(key) { return LOG.reduce((best, g) => (g[key] > best[key] ? g : best), LOG[0]); }
  const RECORDS = {
    pts: maxBy('pts'), reb: maxBy('reb'), pd: maxBy('pd'), int: maxBy('int'),
    p3m: maxBy('p3m'), eva: maxBy('eva'),
  };
  const bestGame = RECORDS.eva; // "meilleur match" = meilleure évaluation

  // Badges / accomplissements — comptés sur le match log.
  const streak10 = (() => { let cur = 0, best = 0; LOG.forEach((g) => { if (g.pts >= 10) { cur++; best = Math.max(best, cur); } else cur = 0; }); return best; })();
  const BADGES = [
    { key: '20pts', name: '20+ points', desc: 'Match à 20 points ou plus', ico: '🔥', count: LOG.filter((g) => g.pts >= 20).length },
    { key: '10ast', name: '10+ passes', desc: 'Match à 10 passes décisives', ico: '🎯', count: LOG.filter((g) => g.pd >= 10).length },
    { key: '5tp', name: '5+ tirs à 3 pts', desc: '5 paniers primés dans un match', ico: '🏹', count: LOG.filter((g) => g.p3m >= 5).length },
    { key: 'dd', name: 'Double-double', desc: '10+ dans deux catégories', ico: '💫', count: LOG.filter((g) => [g.pts, g.reb, g.pd].filter((v) => v >= 10).length >= 2).length },
    { key: 'streak', name: 'Série 10+ pts', desc: 'Matchs consécutifs à 10+ points', ico: '⚡', count: streak10 },
    { key: '30eva', name: '30 d\'évaluation', desc: 'Évaluation de 30 ou plus', ico: '👑', count: LOG.filter((g) => g.eva >= 30).length },
  ];

  // Séances collectives (store) — vues côté Francisco.
  const COLLECTIFS = S.getCollectifs().filter((s) => s.eval);           // récentes en premier
  const COLL_CHRONO = COLLECTIFS.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const COLL_CRIT = S.collectifCriteria();                              // {intensite,execution,concentration,communication,engagement}
  const COLL_CRIT_LABEL = { intensite: 'Intensité', execution: 'Exécution', concentration: 'Concentration', communication: 'Communication', engagement: 'Impact collectif' };
  const playerColl = profile.training.collective;                     // {presenceRate,noteAvg,critAvg,series,recent…} (exposé via getPlayerProfile)

  /* ---- Séances de TIR (démo déterministe, alimentée par le profil de tir du store) ----
     Le feed EuroLeague ne publie pas de séances de tir : on génère un suivi
     hebdomadaire réaliste et cohérent avec le profil du joueur (H.p2/p3/lf),
     en progression légère sur la saison. Sert au shot chart, aux KPIs, à
     l'historique, aux courbes d'évolution et à un post HoopFeed. */
  const ZONE8 = ['RAQUETTE', 'MI_DISTANCE_GAUCHE', 'MI_DISTANCE_CENTRE', 'MI_DISTANCE_DROITE', 'CORNER_3_GAUCHE', 'CORNER_3_DROIT', 'TOP_KEY_GAUCHE', 'TOP_KEY_DROIT'];
  const ZONE8_LABEL = { RAQUETTE: 'Raquette', MI_DISTANCE_GAUCHE: 'Mi-distance gauche', MI_DISTANCE_CENTRE: 'Mi-distance axe', MI_DISTANCE_DROITE: 'Mi-distance droite', CORNER_3_GAUCHE: 'Corner 3 gauche', CORNER_3_DROIT: 'Corner 3 droit', TOP_KEY_GAUCHE: 'Aile 3 gauche', TOP_KEY_DROIT: 'Aile 3 droite' };
  const ZONE_IS3 = (k) => k.indexOf('CORNER_3') === 0 || k.indexOf('TOP_KEY') === 0;
  // Base de réussite par zone, calée sur le profil du joueur.
  function zoneBase(k) {
    if (k === 'RAQUETTE') return H.p2 + 14;
    if (k.indexOf('MI_DISTANCE') === 0) return H.p2 - 4;
    if (k.indexOf('CORNER_3') === 0) return H.p3 + 3;
    return H.p3 - 2; // TOP_KEY
  }
  const SHOOT_FOCUS = [
    { label: 'Tir à 3 points', zones: ['CORNER_3_GAUCHE', 'TOP_KEY_GAUCHE', 'TOP_KEY_DROIT', 'CORNER_3_DROIT'] },
    { label: 'Mi-distance', zones: ['MI_DISTANCE_GAUCHE', 'MI_DISTANCE_CENTRE', 'MI_DISTANCE_DROITE'] },
    { label: 'Finitions près du cercle', zones: ['RAQUETTE', 'MI_DISTANCE_GAUCHE', 'MI_DISTANCE_DROITE'] },
    { label: 'Séance mixte', zones: ZONE8.slice() },
    { label: 'Catch & shoot', zones: ['CORNER_3_GAUCHE', 'CORNER_3_DROIT', 'TOP_KEY_GAUCHE', 'TOP_KEY_DROIT', 'MI_DISTANCE_CENTRE'] },
  ];
  function buildShooting() {
    const N = 16, r = rng('sf-shoot'), sessions = [];
    let start = parseISO('2025-11-03').getTime();
    for (let i = 0; i < N; i++) {
      const focus = SHOOT_FOCUS[i % SHOOT_FOCUS.length];
      const prog = (i / (N - 1)) * 6;               // +0..+6 % de progression sur la saison
      const date = new Date(start + i * 7 * 86400000 + Math.round((r() * 2 - 1) * 2) * 86400000);
      const zones = {}; let tm = 0, ta = 0;
      focus.zones.forEach((k, zi) => {
        const att = 12 + Math.round(r() * 10);
        const pct = clamp(zoneBase(k) + prog + (r() * 2 - 1) * 6, 8, 96);
        const made = clamp(Math.round(att * pct / 100), 0, att);
        zones[k] = { a: att, m: made };
        tm += made; ta += att;
      });
      // composante lancers francs
      const fta = 8 + Math.round(r() * 6), ftm = clamp(Math.round(fta * (H.lf + prog + (r() * 2 - 1) * 5) / 100), 0, fta);
      const globalPct = ta ? pctOf(tm, ta) : 0;
      sessions.push({ i: i, date: date, focus: focus.label, zones: zones, made: tm, att: ta, pct: globalPct, ftm: ftm, fta: fta });
    }
    // agrégats par zone (shot chart) + séries d'évolution par zone
    const byZone = {}; ZONE8.forEach((k) => (byZone[k] = { made: 0, att: 0, series: [] }));
    sessions.forEach((s) => { ZONE8.forEach((k) => { if (s.zones[k]) { byZone[k].made += s.zones[k].m; byZone[k].att += s.zones[k].a; byZone[k].series.push(pctOf(s.zones[k].m, s.zones[k].a)); } }); });
    ZONE8.forEach((k) => (byZone[k].pct = pctOf(byZone[k].made, byZone[k].att)));
    const totMade = sum(sessions.map((s) => s.made)), totAtt = sum(sessions.map((s) => s.att));
    const ftMade = sum(sessions.map((s) => s.ftm)), ftAtt = sum(sessions.map((s) => s.fta));
    let m2 = 0, a2 = 0, m3 = 0, a3 = 0;
    ZONE8.forEach((k) => { if (ZONE_IS3(k)) { m3 += byZone[k].made; a3 += byZone[k].att; } else { m2 += byZone[k].made; a2 += byZone[k].att; } });
    return {
      sessions: sessions, byZone: byZone,
      kpi: { count: sessions.length, att: totAtt, made: totMade, pct: pctOf(totMade, totAtt), p2: pctOf(m2, a2), p3: pctOf(m3, a3), ft: pctOf(ftMade, ftAtt) },
      evolution: sessions.map((s) => s.pct),
    };
  }
  const SHOOT = buildShooting();

  /* ============================================================
     2. Géométrie shot chart — 8 zones -> terrain HoopCourt (18 zones)
     ============================================================ */
  const ZONE18_TO_8 = {
    'restricted-area-left': 'RAQUETTE', 'restricted-area-center': 'RAQUETTE', 'restricted-area-right': 'RAQUETTE',
    'paint-left': 'RAQUETTE', 'paint-center': 'RAQUETTE', 'paint-right': 'RAQUETTE',
    'short-corner-left': 'MI_DISTANCE_GAUCHE', 'short-corner-right': 'MI_DISTANCE_DROITE',
    'midrange-baseline-left': 'MI_DISTANCE_GAUCHE', 'midrange-wing-left': 'MI_DISTANCE_GAUCHE', 'midrange-center': 'MI_DISTANCE_CENTRE',
    'midrange-wing-right': 'MI_DISTANCE_DROITE', 'midrange-baseline-right': 'MI_DISTANCE_DROITE',
    'three-corner-left': 'CORNER_3_GAUCHE', 'three-corner-right': 'CORNER_3_DROIT',
    'three-wing-left': 'TOP_KEY_GAUCHE', 'three-top': 'TOP_KEY_GAUCHE', 'three-wing-right': 'TOP_KEY_DROIT',
  };
  // position normalisée (x:0..100 gauche->droite, y:0..100 fond->milieu) d'une étiquette par zone8
  const ZONE8_POS = {
    RAQUETTE: [50, 11], MI_DISTANCE_GAUCHE: [21, 33], MI_DISTANCE_CENTRE: [50, 40], MI_DISTANCE_DROITE: [79, 33],
    CORNER_3_GAUCHE: [7, 12], CORNER_3_DROIT: [93, 12], TOP_KEY_GAUCHE: [30, 62], TOP_KEY_DROIT: [70, 62],
  };
  // conversion position normalisée -> pourcentages CSS dans .court-hold (viewBox -16..616 / -16..576)
  function courtLeftPct(nx) { return (16 + nx / 100 * 600) / 632 * 100; }
  function courtTopPct(ny) { return (16 + ny / 100 * 560) / 592 * 100; }

  // Rend un shot chart : `zones8` = {ZONE:{pct,made,att,...}}. Retourne l'API HoopCourt.
  function renderShotChart(holder, zones8, onSelect) {
    const heatmap = {};
    Object.keys(ZONE18_TO_8).forEach((z18) => { const z = zones8[ZONE18_TO_8[z18]]; if (z && z.att > 0) heatmap[z18] = z.pct / 100; });
    const courtBox = document.createElement('div');
    holder.innerHTML = '';
    holder.appendChild(courtBox);
    const api = Court.render(courtBox, {
      mode: onSelect ? 'analysis' : 'readonly', heatmap: heatmap, showShotMarkers: false,
      onZoneSelect: onSelect ? (zone) => { const k = ZONE18_TO_8[zone.id]; if (k) onSelect(k); } : null,
    });
    // étiquettes de pourcentage par zone
    const tags = document.createElement('div');
    tags.className = 'zone-tags';
    ZONE8.forEach((k) => {
      const z = zones8[k]; if (!z || !z.att) return;
      const p = ZONE8_POS[k], t = document.createElement('div');
      t.className = 'zone-tag'; t.style.left = courtLeftPct(p[0]) + '%'; t.style.top = courtTopPct(p[1]) + '%';
      t.textContent = z.pct + '%';
      tags.appendChild(t);
    });
    holder.appendChild(tags);
    return api;
  }

  /* ============================================================
     3. Graphiques SVG (légers, cohérents avec la charte)
     ============================================================ */
  let gradId = 0;
  function lineChart(values, opts) {
    opts = opts || {};
    const w = 520, h = opts.h || 150, pL = 30, pR = 12, pT = 12, pB = 22;
    const iw = w - pL - pR, ih = h - pT - pB;
    if (!values.length) return '';
    const min = opts.min != null ? opts.min : Math.min.apply(null, values);
    const max = opts.max != null ? opts.max : Math.max.apply(null, values);
    const span = (max - min) || 1;
    const X = (i) => pL + (values.length === 1 ? iw / 2 : (i / (values.length - 1)) * iw);
    const Y = (v) => pT + ih - ((v - min) / span) * ih;
    const pts = values.map((v, i) => [X(i), Y(v)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = 'M' + pts[0][0].toFixed(1) + ' ' + (pT + ih) + ' ' + pts.map((p) => 'L' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ') + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (pT + ih) + ' Z';
    const gid = 'ag' + (gradId++);
    const grid = [0, 0.5, 1].map((t) => { const y = pT + ih - t * ih; return '<line class="grid-ln" x1="' + pL + '" y1="' + y.toFixed(1) + '" x2="' + (w - pR) + '" y2="' + y.toFixed(1) + '"/><text class="axis-lab" x="' + (pL - 5) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end">' + Math.round(min + t * span) + (opts.unit || '') + '</text>'; }).join('');
    const dots = pts.map((p, i) => '<circle class="dot' + (i === pts.length - 1 ? ' hi' : '') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (i === pts.length - 1 ? 4 : 2.6) + '"/>').join('');
    const xlabs = (opts.labels || []).map((l, i) => '<text class="axis-lab" x="' + X(i).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle">' + esc(l) + '</text>').join('');
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--orange)" stop-opacity="0.28"/><stop offset="1" stop-color="var(--orange)" stop-opacity="0"/></linearGradient></defs>' + grid + '<path d="' + area + '" fill="url(#' + gid + ')"/><path class="line" d="' + line + '"/>' + dots + xlabs + '</svg>';
  }
  function barChart(items, opts) {
    opts = opts || {};
    const n = items.length, w = 520, h = opts.h || 150, pL = 26, pR = 8, pT = 14, pB = 22;
    const iw = w - pL - pR, ih = h - pT - pB;
    const max = opts.max != null ? opts.max : Math.max.apply(null, items.map((it) => it.v)) || 1;
    const bw = iw / n * 0.62, gap = iw / n;
    const bars = items.map((it, i) => {
      const bh = Math.max(1, (it.v / max) * ih), x = pL + i * gap + (gap - bw) / 2, y = pT + ih - bh;
      const cls = it.win === true ? 'win' : it.win === false ? 'loss' : '';
      const lab = it.label != null ? '<text class="axis-lab" x="' + (x + bw / 2).toFixed(1) + '" y="' + (h - 6) + '" text-anchor="middle">' + esc(it.label) + '</text>' : '';
      const vl = opts.showVal ? '<text class="val-lab" x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '">' + it.v + '</text>' : '';
      return '<rect class="bar ' + cls + '" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="2"/>' + vl + lab;
    }).join('');
    return '<svg class="chart" viewBox="0 0 ' + w + ' ' + h + '">' + bars + '</svg>';
  }
  function sparkline(values, accent) {
    if (!values.length) return '';
    const w = 120, h = 34, min = Math.min.apply(null, values), max = Math.max.apply(null, values), span = (max - min) || 1;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none"><path d="' + d + '" style="stroke:' + (accent || 'var(--orange)') + '"/></svg>';
  }
  function ring(pct, opts) {
    opts = opts || {};
    const size = opts.size || 64, sw = opts.sw || 5, r = (size - sw) / 2 - 1, c = 2 * Math.PI * r, cx = size / 2;
    const col = opts.color || 'var(--orange)';
    const off = c * (1 - clamp(pct, 0, 100) / 100);
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '"><circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="var(--hair)" stroke-width="' + sw + '"/><circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>';
  }
  function pctCell(label, pct, made, att) {
    return '<div class="pct-cell"><div class="pct-ring">' + ring(pct, { color: pct >= 50 ? 'var(--win)' : pct >= 35 ? 'var(--orange)' : 'var(--gold)' }) + '<span class="pv">' + pct + '%</span></div><div class="pct-lab">' + label + '</div>' + (made != null ? '<div class="pct-fr">' + made + '/' + att + '</div>' : '') + '</div>';
  }

  /* ============================================================
     4. Panneaux réutilisables
     ============================================================ */
  const icoDot = '<span class="dot"></span>';
  function tile(val, lab, sub, opts) {
    opts = opts || {};
    let delta = '';
    if (opts.delta != null) { const d = opts.delta, cls = d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'flat', arr = d > 0.05 ? '▲' : d < -0.05 ? '▼' : '▪'; delta = '<div class="tile-delta ' + cls + '">' + arr + ' ' + signed(round1(d)) + (opts.deltaUnit || '') + '</div>'; }
    return '<div class="tile' + (opts.accent ? ' accent' : '') + '"><div class="tile-val">' + val + '</div><div class="tile-lab">' + lab + '</div>' + (sub ? '<div class="tile-sub">' + sub + '</div>' : '') + delta + '</div>';
  }
  function critRow(label, val) {
    return '<div class="crit-row"><span class="crit-lab">' + label + '</span><span class="crit-track"><span class="crit-fill" style="width:' + (val / 10 * 100) + '%"></span></span><span class="crit-val">' + round1(val) + '</span></div>';
  }
  function noteColor(n) { return n >= 8 ? 'var(--win)' : n >= 6.5 ? 'var(--orange)' : n >= 5 ? 'var(--gold)' : 'var(--loss)'; }

  /* ============================================================
     5. VUE — DASHBOARD
     ============================================================ */
  function rangeGames(days) {
    if (days >= 9999) return LOG.slice();
    const last = parseISO(LOG[LOG.length - 1].date).getTime();
    let g = LOG.filter((x) => (last - parseISO(x.date).getTime()) <= days * 86400000);
    if (g.length < 3) g = LOG.slice(-3);
    return g;
  }
  let dashRange = '30j';
  function dashChartHTML() {
    const days = dashRange === '7j' ? 7 : dashRange === '30j' ? 30 : 9999;
    const g = rangeGames(days);
    const vals = g.map((x) => x.pts);
    const labels = g.length <= 10 ? g.map((x) => fmtDate(x.date)) : g.map((x, i) => (i % Math.ceil(g.length / 8) === 0 ? fmtDate(x.date) : ''));
    return '<div class="panel-head"><div class="sec-title">Progression — points par match</div>'
      + '<div class="range-toggle" data-range-toggle>'
      + ['7j', '30j', 'saison'].map((r) => '<button data-range="' + r + '"' + (r === dashRange ? ' class="active"' : '') + '>' + (r === 'saison' ? 'Saison' : r) + '</button>').join('')
      + '</div></div>'
      + lineChart(vals, { h: 160, labels: labels, min: 0 })
      + '<div class="tile-sub" style="margin-top:8px">' + g.length + ' matchs · moy. ' + round1(mean(vals)) + ' pts · pic à ' + Math.max.apply(null, vals) + ' pts</div>';
  }
  function lastShoot() { return SHOOT.sessions[SHOOT.sessions.length - 1]; }
  function lastColl() { return COLL_CHRONO[COLL_CHRONO.length - 1]; }
  function renderDashboard() {
    const last = LOG[LOG.length - 1];
    const ls = lastShoot(), lc = lastColl();
    const lcNote = lc ? S.playerAvg(lc, PID) : null;
    const next = tournoi.prochainMatch;
    const feedTop = FEED.slice(0, 2);
    const html =
      '<div class="view-head"><h2 class="view-title">Bonjour, <em class="serif">Sylvain</em></h2><div class="view-sub">Ta saison ' + esc(tournoi.nom) + ' en un coup d\'œil</div></div>'
      // hero identité + prochain rendez-vous
      + '<div class="stack-16" style="margin-bottom:16px">'
      + '<div class="id-hero"><div class="id-photo"><span class="init">' + initials(player.name) + '</span><span class="num">' + player.num + '</span></div>'
      + '<div class="id-meta"><div class="id-name">' + esc(player.name) + '</div><div class="id-role">' + esc(player.poste) + ' · ' + esc(player.taille) + ' · ' + esc(club.nom) + '</div>'
      + '<div class="id-tags"><span class="id-tag hot">Meilleur marqueur du club</span><span class="id-tag">' + H.pts + ' pts/m</span><span class="id-tag">' + H.pd + ' passes/m</span><span class="id-tag">Éva ' + H.eva + '</span></div></div></div>'
      + '<div class="next-strip"><span class="ns-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></span>'
      + '<div><div class="ns-eyebrow">Prochain match</div><div class="ns-title">Žalgiris vs ' + esc(next.adversaire) + '</div><div class="ns-meta">' + esc(next.contexte) + ' · ' + esc(next.lieu) + '</div></div>'
      + '<div class="ns-when"><b>J-2</b><span>À venir</span></div></div></div>'
      // gros chiffres par match
      + '<div class="sec-head"><span class="sec-title">Mes moyennes par match</span><span class="tile-sub">Saison ' + esc(tournoi.saison) + '</span></div>'
      + '<div class="tiles" style="margin-bottom:12px">'
      + tile(H.pts, 'Points', null, { accent: true, delta: profile.avg5.pts - H.pts })
      + tile(H.reb, 'Rebonds', null, { delta: profile.avg5.reb - H.reb })
      + tile(H.pd, 'Passes déc.', null, { delta: profile.avg5.pd - H.pd })
      + tile(H.int, 'Interceptions', null, { delta: profile.avg5.int - H.int })
      + '</div>'
      // pourcentages de tir
      + '<div class="pcts" style="margin-bottom:16px">'
      + pctCell('FG%', player.season.tirsPct) + pctCell('2PT%', H.p2) + pctCell('3PT%', H.p3) + pctCell('LF%', H.lf)
      + '</div>'
      // graphique progression
      + '<div class="panel card-elevated" id="dashChart" style="margin-bottom:16px">' + dashChartHTML() + '</div>'
      // accès rapides
      + '<div class="sec-head"><span class="sec-title">Mon activité récente</span></div>'
      + '<div class="grid-3" style="margin-bottom:8px">'
      + qaMatch(last)
      + qaColl(lc, lcNote)
      + qaShoot(ls)
      + '</div>'
      // dernières publications
      + '<div class="sec-head"><span class="sec-title">Dernières publications HoopFeed</span><span class="sec-link" data-goto="feed">Tout voir →</span></div>'
      + '<div class="grid-2">' + feedTop.map(feedMiniCard).join('') + '</div>';
    $('#pane-dashboard').innerHTML = html;
  }
  function qaMatch(g) {
    return '<div class="qa-card" data-match="' + g.gameId + '"><div class="qa-eyebrow">' + icoDot + ' Dernier match</div>'
      + '<div class="qa-title">' + (g.win ? 'V' : 'D') + ' ' + g.us + '–' + g.them + ' vs ' + esc(g.opponent) + '</div>'
      + '<div class="qa-meta">' + fmtDate(g.date) + ' · ' + (g.dom ? 'domicile' : 'extérieur') + '</div>'
      + '<div class="qa-stats"><span class="qa-stat"><b>' + g.pts + '</b><span>PTS</span></span><span class="qa-stat"><b>' + g.reb + '</b><span>REB</span></span><span class="qa-stat"><b>' + g.pd + '</b><span>AST</span></span><span class="qa-stat"><b>' + g.eva + '</b><span>ÉVA</span></span></div></div>';
  }
  function qaColl(s, note) {
    if (!s) return '';
    return '<div class="qa-card" data-goto="training" data-subtab="collectif"><div class="qa-eyebrow">' + icoDot + ' Dernier entraînement</div>'
      + '<div class="qa-title">' + esc(s.titre) + '</div><div class="qa-meta">' + fmtDate(s.date) + ' · ' + s.duree + ' min · ' + esc(s.lieu) + '</div>'
      + '<div class="qa-stats"><span class="qa-stat"><b style="color:' + noteColor(note) + '">' + note + '</b><span>Ma note</span></span><span class="qa-stat"><b>' + S.collectifAvg(s) + '</b><span>Collectif</span></span></div></div>';
  }
  function qaShoot(s) {
    return '<div class="qa-card" data-goto="training" data-subtab="tirs"><div class="qa-eyebrow">' + icoDot + ' Dernière séance de tir</div>'
      + '<div class="qa-title">' + esc(s.focus) + '</div><div class="qa-meta">' + fmtDate(s.date) + ' · ' + s.made + '/' + s.att + ' au tir</div>'
      + '<div class="qa-stats"><span class="qa-stat"><b style="color:var(--orange)">' + s.pct + '%</b><span>Réussite</span></span><span class="qa-stat"><b>' + s.att + '</b><span>Tirs</span></span></div></div>';
  }

  /* ============================================================
     6. VUE — ENTRAÎNEMENTS (Collectif / Tirs)
     ============================================================ */
  let trainSub = 'collectif';
  function renderTraining() {
    const html =
      '<div class="view-head"><h2 class="view-title">Mes <em class="serif">entraînements</em></h2><div class="view-sub">Séances collectives du staff Žalgiris et suivi de progression au tir</div></div>'
      + '<div class="subtabs" data-subtabs="training">'
      + '<button class="subtab' + (trainSub === 'collectif' ? ' active' : '') + '" data-sub="collectif">Collectif</button>'
      + '<button class="subtab' + (trainSub === 'tirs' ? ' active' : '') + '" data-sub="tirs">Tirs</button></div>'
      + '<div class="subpane' + (trainSub === 'collectif' ? ' active' : '') + '" id="sub-collectif"></div>'
      + '<div class="subpane' + (trainSub === 'tirs' ? ' active' : '') + '" id="sub-tirs"></div>';
    $('#pane-training').innerHTML = html;
    renderCollectif();
    renderTirs();
  }
  function renderCollectif() {
    const series = playerColl.series.map((x) => x.avg);
    const crit = playerColl.critAvg;
    const PLc = S.playerCriteria();
    const html =
      '<div class="grid-3" style="margin-bottom:16px">'
      + tile(playerColl.attended, 'Séances suivies', 'sur ' + playerColl.doneCount + ' au total')
      + tile(playerColl.noteAvg, 'Ma note moyenne', 'évaluation staff /10', { delta: playerColl.recent, accent: true })
      + tile(playerColl.presenceRate + '%', 'Présence', 'assiduité saison')
      + '</div>'
      // évolution
      + '<div class="panel card-elevated" style="margin-bottom:16px"><div class="panel-head"><div class="sec-title">Évolution de mes notes collectives</div><div class="tile-sub">' + series.length + ' séances notées</div></div>'
      + lineChart(series, { h: 150, min: 4, max: 10, labels: playerColl.series.map((x, i) => (i % 2 === 0 ? fmtDate(x.date) : '')) }) + '</div>'
      // moyennes par critère
      + '<div class="grid-2" style="margin-bottom:16px"><div class="panel card-elevated"><div class="panel-title">' + icoDot + 'Mes moyennes par critère</div><div class="crit-rows">'
      + PLc.map((c) => critRow(c.label, crit[c.key])).join('') + '</div></div>'
      + '<div class="panel card-elevated"><div class="panel-title">' + icoDot + 'Le mot du coach</div>'
      + (lastColl() && lastColl().eval.noteCoach ? '<div class="coach-quote">« ' + esc(lastColl().eval.noteCoach) + ' »</div>' : '<div class="tile-sub">Pas de commentaire sur la dernière séance.</div>')
      + '<div class="tile-sub" style="margin-top:12px">Le staff note chaque séance sur 5 critères : intensité, exécution, concentration, communication et impact collectif.</div></div></div>'
      // historique séances
      + '<div class="sec-head"><span class="sec-title">Historique des séances collectives</span></div>'
      + '<div class="sess-list">' + COLLECTIFS.map(sessCard).join('') + '</div>';
    $('#sub-collectif').innerHTML = html;
    requestAnimationFrame(() => $$('#sub-collectif .crit-fill').forEach((f) => (f.style.width = f.style.width)));
  }
  function sessCard(s) {
    const note = S.playerAvg(s, PID);
    const present = !!s.presence[PID];
    const crit = s.eval.collectif;
    return '<div class="sess-card" data-coll="' + s.id + '"><div class="sess-top"><div><div class="sess-date">' + esc(s.titre) + ' · ' + fmtDate(s.date, true) + '</div>'
      + '<div class="sess-meta">' + s.heure + ' · ' + s.duree + ' min · ' + esc(s.lieu) + '</div></div>'
      + (present ? '<span class="sess-note-badge" style="background:' + noteColor(note) + '22;color:' + noteColor(note) + '">' + note + '/10</span>' : '<span class="sess-note-badge" style="background:var(--hair-soft);color:var(--t4)">Absent</span>')
      + '</div><div class="crit-rows">'
      + COLL_CRIT.map((c) => critRow(COLL_CRIT_LABEL[c.key], crit[c.key])).join('')
      + '</div>' + (s.eval.noteCoach ? '<div class="coach-quote">« ' + esc(s.eval.noteCoach) + ' »</div>' : '') + '</div>';
  }
  function renderTirs() {
    const k = SHOOT.kpi;
    const html =
      // KPIs
      '<div class="tiles" style="margin-bottom:12px">'
      + tile(k.count, 'Séances', 'de tir cette saison')
      + tile(k.att, 'Tirs tentés', k.made + ' réussis')
      + tile(k.pct + '%', 'Réussite globale', null, { accent: true })
      + tile(SHOOT.sessions[SHOOT.sessions.length - 1].pct + '%', 'Dernière séance', fmtDate(lastShoot().date))
      + '</div>'
      + '<div class="pcts" style="margin-bottom:16px">' + pctCell('2PT%', k.p2) + pctCell('3PT%', k.p3) + pctCell('LF%', k.ft) + pctCell('Global', k.pct) + '</div>'
      // shot chart interactif
      + '<div class="panel card-elevated" style="margin-bottom:16px"><div class="panel-title">' + icoDot + 'Ma carte de tir — réussite par zone</div>'
      + '<div class="panel-sub" style="color:var(--t3);font-size:12.5px;margin-bottom:14px">Touche une zone du terrain pour voir le détail et son évolution</div>'
      + '<div class="shot-wrap"><div><div class="court-hold" id="tirCourt"></div>'
      + '<div class="zone-legend"><span class="lg"><span class="sw" style="background:#7FA05F"></span>Zone chaude</span><span class="lg"><span class="sw" style="background:#C99E63"></span>Moyenne</span><span class="lg"><span class="sw" style="background:#C25645"></span>Zone à travailler</span></div></div>'
      + '<div class="zone-detail" id="tirZone"></div></div></div>'
      // évolution
      + '<div class="panel card-elevated" style="margin-bottom:16px"><div class="panel-head"><div class="sec-title">Évolution de ma réussite au tir</div><div class="tile-sub">réussite globale par séance</div></div>'
      + lineChart(SHOOT.evolution, { h: 150, min: 30, max: 70, unit: '%', labels: SHOOT.sessions.map((s, i) => (i % 3 === 0 ? fmtDate(s.date) : '')) }) + '</div>'
      // historique
      + '<div class="sec-head"><span class="sec-title">Historique des séances de tir</span></div>'
      + '<div class="sess-list">' + SHOOT.sessions.slice().reverse().map(shootRow).join('') + '</div>';
    $('#sub-tirs').innerHTML = html;
    // shot chart
    const holder = $('#tirCourt');
    const zones = {}; ZONE8.forEach((z) => (zones[z] = { pct: SHOOT.byZone[z].pct, made: SHOOT.byZone[z].made, att: SHOOT.byZone[z].att }));
    renderShotChart(holder, zones, showTirZone);
    showTirZone('RAQUETTE');
  }
  function showTirZone(k) {
    const z = SHOOT.byZone[k];
    const trend = z.series.length > 1 ? round1(z.series[z.series.length - 1] - z.series[0]) : 0;
    const html = '<h4>' + ZONE8_LABEL[k] + '</h4><div class="zd-hint">' + (ZONE_IS3(k) ? 'Tir à 3 points' : 'Tir à 2 points') + ' · ' + z.series.length + ' séances</div>'
      + '<div class="zd-stats"><div class="zd-stat"><b>' + z.att + '</b><span>Tentés</span></div><div class="zd-stat"><b>' + z.made + '</b><span>Réussis</span></div><div class="zd-stat"><b style="color:var(--orange-vif)">' + z.pct + '%</b><span>Réussite</span></div></div>'
      + '<div class="tile-sub" style="margin-bottom:6px">Évolution sur la saison <b style="color:' + (trend >= 0 ? 'var(--win)' : 'var(--loss)') + '">' + signed(trend) + ' pts</b></div>'
      + sparkline(z.series, trend >= 0 ? 'var(--win)' : 'var(--loss)');
    $('#tirZone').innerHTML = html;
    $$('#tirCourt .zone-tag').forEach((t) => (t.style.color = '#fff'));
  }
  function shootRow(s) {
    return '<div class="sess-card" style="cursor:default"><div class="sess-top"><div><div class="sess-date">' + esc(s.focus) + ' · ' + fmtDate(s.date, true) + '</div>'
      + '<div class="sess-meta">' + Object.keys(s.zones).length + ' zones travaillées · ' + s.made + '/' + s.att + ' au tir · LF ' + s.ftm + '/' + s.fta + '</div></div>'
      + '<span class="sess-note-badge" style="background:var(--orange-soft);color:var(--orange-vif)">' + s.pct + '%</span></div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px">' + Object.keys(s.zones).map((z) => '<span class="id-tag">' + ZONE8_LABEL[z] + ' ' + pctOf(s.zones[z].m, s.zones[z].a) + '%</span>').join('') + '</div></div>';
  }

  /* ============================================================
     7. VUE — GAME CENTER (Saison / Matchs)
     ============================================================ */
  let gameSub = 'saison', seasonFilter = 'saison';
  function renderGames() {
    const html =
      '<div class="view-head"><h2 class="view-title">Game <em class="serif">Center</em></h2><div class="view-sub">Mes statistiques et le détail de chaque match — ' + esc(tournoi.nom) + '</div></div>'
      + '<div class="subtabs" data-subtabs="games">'
      + '<button class="subtab' + (gameSub === 'saison' ? ' active' : '') + '" data-sub="saison">Saison</button>'
      + '<button class="subtab' + (gameSub === 'matchs' ? ' active' : '') + '" data-sub="matchs">Matchs</button></div>'
      + '<div class="subpane' + (gameSub === 'saison' ? ' active' : '') + '" id="sub-saison"></div>'
      + '<div class="subpane' + (gameSub === 'matchs' ? ' active' : '') + '" id="sub-matchs"></div>';
    $('#pane-games').innerHTML = html;
    renderSaison();
    renderMatchs();
  }
  function seasonAverages(filter) {
    if (filter === 'saison') {
      return { mj: H.mj, min: H.min, pts: H.pts, reb: H.reb, pd: H.pd, int: H.int, ct: player.season.ct, bp: player.season.bp, fg: player.season.tirsPct, p2: H.p2, p3: H.p3, lf: H.lf, label: 'Saison complète' };
    }
    const n = filter === '5' ? 5 : 10;
    const g = LOG.slice(-n);
    const avg = (k) => round1(mean(g.map((x) => x[k])));
    const p2m = sum(g.map((x) => x.p2m)), p2a = sum(g.map((x) => x.p2a)), p3m = sum(g.map((x) => x.p3m)), p3a = sum(g.map((x) => x.p3a)), ftm = sum(g.map((x) => x.ftm)), fta = sum(g.map((x) => x.fta));
    return { mj: g.length, min: avg('min'), pts: avg('pts'), reb: avg('reb'), pd: avg('pd'), int: avg('int'), ct: avg('ct'), bp: avg('bp'), fg: pctOf(p2m + p3m, p2a + p3a), p2: pctOf(p2m, p2a), p3: pctOf(p3m, p3a), lf: pctOf(ftm, fta), label: n + ' derniers matchs' };
  }
  function renderSaison() {
    const a = seasonAverages(seasonFilter);
    const statGrid = [
      ['Matchs', a.mj], ['Minutes', a.min], ['Points', a.pts], ['Rebonds', a.reb],
      ['Passes déc.', a.pd], ['Interceptions', a.int], ['Contres', a.ct], ['Pertes', a.bp],
    ];
    const html =
      '<div class="chips-filter" data-season-filter>'
      + [['5', '5 derniers'], ['10', '10 derniers'], ['saison', 'Saison']].map((f) => '<button class="chipf' + (seasonFilter === f[0] ? ' active' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>').join('')
      + '</div>'
      + '<div class="tile-sub" style="margin:-6px 0 14px">' + a.label + '</div>'
      + '<div class="tiles" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">'
      + statGrid.map((s, i) => tile(s[1], s[0], null, { accent: i === 2 })).join('')
      + '</div>'
      + '<div class="pcts" style="margin-bottom:20px">' + pctCell('FG%', a.fg) + pctCell('2PT%', a.p2) + pctCell('3PT%', a.p3) + pctCell('LF%', a.lf) + '</div>'
      // évolution match après match
      + '<div class="panel card-elevated" style="margin-bottom:20px"><div class="panel-head"><div class="sec-title">Points match après match</div><div class="tile-sub">saison complète</div></div>'
      + barChart(LOG.map((g) => ({ v: g.pts, win: g.win })), { h: 150 })
      + '<div class="tile-sub" style="margin-top:8px">Barres vertes = victoires · rouges = défaites</div></div>'
      // records
      + '<div class="sec-head"><span class="sec-title">Mes records de la saison</span></div>'
      + '<div class="rec-grid">' + recordsHTML() + '</div>';
    $('#sub-saison').innerHTML = html;
  }
  function recordCard(val, lab, g) { return '<div class="rec-card"><div class="rec-val">' + val + '</div><div class="rec-lab">' + lab + '</div><div class="rec-ctx">vs ' + esc(g.opponent) + ' · ' + fmtDate(g.date) + '</div></div>'; }
  function recordsHTML() {
    return recordCard(RECORDS.pts.pts, 'Points', RECORDS.pts)
      + recordCard(RECORDS.reb.reb, 'Rebonds', RECORDS.reb)
      + recordCard(RECORDS.pd.pd, 'Passes déc.', RECORDS.pd)
      + recordCard(RECORDS.int.int, 'Interceptions', RECORDS.int)
      + recordCard(RECORDS.p3m.p3m, 'Paniers à 3 pts', RECORDS.p3m)
      + recordCard(RECORDS.eva.eva, 'Évaluation', RECORDS.eva);
  }
  function renderMatchs() {
    const rows = LOG.slice().reverse().map(matchRow).join('');
    $('#sub-matchs').innerHTML = '<div class="tile-sub" style="margin-bottom:12px">' + LOG.length + ' matchs joués · touche un match pour le détail, la carte de tir et les actions</div><div class="match-list">' + rows + '</div>';
  }
  function matchRow(g) {
    return '<div class="match-row" data-match="' + g.gameId + '"><div class="mr-res ' + (g.win ? 'win' : 'loss') + '">' + (g.win ? 'V' : 'D') + '</div>'
      + '<div><div class="mr-opp">' + esc(g.opponent) + '</div><div class="mr-meta">' + fmtDate(g.date, true) + ' · ' + (g.dom ? 'domicile' : 'extérieur') + '</div>'
      + '<div class="mr-line"><span><b>' + g.pts + '</b> pts</span><span>' + g.reb + ' reb</span><span>' + g.pd + ' ast</span><span>' + g.eva + ' éva</span></div></div>'
      + '<div style="text-align:right"><div class="mr-score">' + g.us + '–' + g.them + '</div><svg class="mr-chev" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></div></div>';
  }

  /* ============================================================
     8. MODAL DÉTAIL MATCH + play-by-play
     ============================================================ */
  let sheetTab = 'resume', pbpQuarter = 'all', pbpFilter = 'all', PBP = [];
  function openMatch(gameId) {
    const g = S.getPlayerGame(PID, gameId);
    if (!g) return;
    const line = g.game;
    PBP = buildPBP(g);
    sheetTab = 'resume'; pbpQuarter = 'all'; pbpFilter = 'all';
    const box = $('#sheetBox');
    box.innerHTML =
      '<div class="sheet-head"><button class="sheet-close" id="sheetClose" aria-label="Fermer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
      + '<div class="sheet-eyebrow">' + (line.win ? 'Victoire' : 'Défaite') + ' · ' + fmtDateLong(line.date) + ' · ' + (line.dom ? 'domicile' : 'extérieur') + '</div>'
      + '<div class="sheet-score">Žalgiris <span class="mono">' + line.us + '</span><span class="sep">–</span><span class="mono">' + line.them + '</span> ' + esc(line.opponent) + '</div></div>'
      + '<div class="sheet-tabs"><button class="sheet-tab active" data-stab="resume">Résumé</button><button class="sheet-tab" data-stab="actions">Actions du match</button></div>'
      + '<div class="sheet-body"><div class="sheet-pane active" id="spane-resume">' + resumePane(g) + '</div><div class="sheet-pane" id="spane-actions">' + actionsPane(line) + '</div></div>';
    // shot chart du match
    const zones = {}; ZONE8.forEach((z) => { const zz = g.zones[z]; if (zz) zones[z] = { pct: zz.pct, made: zz.reussis, att: zz.tentes }; });
    renderShotChart($('#matchCourt'), zones, null);
    const ov = $('#sheetOverlay'); ov.classList.add('open'); document.body.style.overflow = 'hidden';
    renderPBP();
  }
  function closeMatch() { $('#sheetOverlay').classList.remove('open'); document.body.style.overflow = ''; }
  function resumePane(g) {
    const line = g.game;
    const statLine = [['PTS', line.pts], ['REB', line.reb], ['AST', line.pd], ['INT', line.int], ['CT', line.ct], ['ÉVA', line.eva]];
    const shoot = [['2 pts', line.p2m, line.p2a], ['3 pts', line.p3m, line.p3a], ['LF', line.ftm, line.fta]];
    const cmp = g.metrics;
    return '<div class="tiles" style="grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px">'
      + statLine.map((s, i) => '<div class="tile" style="padding:12px 10px"><div class="tile-val" style="font-size:22px">' + s[1] + '</div><div class="tile-lab">' + s[0] + '</div></div>').join('')
      + '</div>'
      + '<div class="grid-2" style="margin-bottom:18px"><div><div class="sec-title" style="margin-bottom:10px">Adresse au tir</div>'
      + '<div class="pcts" style="grid-template-columns:1fr 1fr 1fr">' + shoot.map((s) => pctCell(s[0], pctOf(s[1], s[2]), s[1], s[2])).join('') + '</div>'
      + '<div style="min-height:0"></div></div>'
      + '<div><div class="sec-title" style="margin-bottom:10px">Carte de tir</div><div class="court-hold" id="matchCourt" style="max-width:320px"></div></div></div>'
      // comparaison saison
      + '<div class="sec-title" style="margin-bottom:12px">Par rapport à mes moyennes</div>'
      + cmp.map(cmpRow).join('')
      + '<div class="coach-quote" style="margin-top:16px">' + esc(g.obs) + '</div>';
  }
  function cmpRow(m) {
    const max = Math.max(m.m, m.s, 1);
    const good = m.delta > 0.05, bad = m.delta < -0.05;
    return '<div class="cmp-row"><span class="cmp-lab">' + m.label + '</span>'
      + '<div class="cmp-bars"><div class="cmp-bar-track"><div class="cmp-bar match" style="width:' + (m.m / max * 100) + '%"></div></div><div class="cmp-bar-track"><div class="cmp-bar season" style="width:' + (m.s / max * 100) + '%"></div></div></div>'
      + '<div class="cmp-vals"><span class="m">' + m.m + ' <small style="color:var(--t4)">match</small></span><span style="color:' + (good ? 'var(--win)' : bad ? 'var(--loss)' : 'var(--t4)') + '">' + signed(m.delta) + '</span><span class="s">' + m.s + ' moy</span></div></div>';
  }
  // Génère un déroulé chronologique réaliste (démo) à partir de la feuille du match.
  function buildPBP(g) {
    const line = g.game, r = rng('pbp-' + line.gameId);
    const roster = S.getPlayers().filter((p) => p.id !== PID).map((p) => p.name);
    const teammate = () => roster[Math.floor(r() * roster.length)];
    const ev = [];
    const add = (who, cat, kind, desc, sub, dpts, side) => ev.push({ who: who, cat: cat, kind: kind, desc: desc, sub: sub || '', dpts: dpts || 0, side: side || null });
    // actions de Francisco
    for (let i = 0; i < line.p2m; i++) add('sf', 'score', 'shot', 'Panier à 2 points', 'Sylvain Francisco', 2, 'us');
    for (let i = 0; i < line.p2a - line.p2m; i++) add('sf', 'miss', 'shot', 'Tir à 2 points manqué', 'Sylvain Francisco', 0, null);
    for (let i = 0; i < line.p3m; i++) add('sf', 'score', 'shot3', 'Panier à 3 points', 'Sylvain Francisco', 3, 'us');
    for (let i = 0; i < line.p3a - line.p3m; i++) add('sf', 'miss', 'shot3', 'Tir à 3 points manqué', 'Sylvain Francisco', 0, null);
    for (let i = 0; i < line.ftm; i++) add('sf', 'score', 'ft', 'Lancer franc réussi', 'Sylvain Francisco', 1, 'us');
    for (let i = 0; i < line.fta - line.ftm; i++) add('sf', 'miss', 'ft', 'Lancer franc manqué', 'Sylvain Francisco', 0, null);
    for (let i = 0; i < line.reb; i++) add('sf', 'def', 'reb', 'Rebond', 'Sylvain Francisco', 0, null);
    for (let i = 0; i < line.pd; i++) add('sf', 'play', 'ast', 'Passe décisive', 'Sylvain Francisco', 0, null);
    for (let i = 0; i < line.int; i++) add('sf', 'def', 'stl', 'Interception', 'Sylvain Francisco', 0, null);
    for (let i = 0; i < line.ct; i++) add('sf', 'def', 'blk', 'Contre', 'Sylvain Francisco', 0, null);
    for (let i = 0; i < line.bp; i++) add('sf', 'play', 'tov', 'Perte de balle', 'Sylvain Francisco', 0, null);
    for (let i = 0; i < line.fa; i++) add('sf', 'neutral', 'foul', 'Faute', 'Sylvain Francisco', 0, null);
    // points des coéquipiers (us - points de Francisco) et de l'adversaire (them)
    function scatterPoints(total, side) {
      let left = total;
      while (left > 0) {
        const three = left >= 3 && r() < 0.28;
        const p = three ? 3 : (left >= 2 ? 2 : 1);
        if (side === 'us') add('team', 'score', p === 3 ? 'shot3' : 'shot', 'Panier de ' + teammate(), null, p, 'us');
        else add('opp', 'score', p === 3 ? 'shot3' : 'shot', 'Panier adverse', esc(line.opponent), p, 'them');
        left -= p;
      }
    }
    scatterPoints(Math.max(0, line.us - line.pts), 'us');
    scatterPoints(line.them, 'them');
    // entrée / sortie
    add('sf', 'neutral', 'in', 'Entrée en jeu', 'Sylvain Francisco', 0, null);
    add('sf', 'neutral', 'out', 'Sortie', 'Sylvain Francisco', 0, null);
    // répartition temporelle sur 4 quart-temps (40 min), puis score cumulé
    ev.forEach((e) => { e._t = r(); });
    const inEv = ev.find((e) => e.kind === 'in'), outEv = ev.find((e) => e.kind === 'out');
    inEv._t = 0.01; outEv._t = 0.985;
    ev.sort((a, b) => a._t - b._t);
    let us = 0, them = 0;
    ev.forEach((e) => {
      const t = e._t * 40;                       // minute absolue 0..40
      const period = clamp(Math.floor(t / 10) + 1, 1, 4);
      const rem = 10 - (t - (period - 1) * 10);  // minutes restantes dans le QT
      const mm = clamp(Math.floor(rem), 0, 9), ss = Math.floor((rem - mm) * 60);
      if (e.side === 'us') us += e.dpts; if (e.side === 'them') them += e.dpts;
      e.period = period; e.clock = mm + ':' + String(ss).padStart(2, '0'); e.us = us; e.them = them;
    });
    return ev;
  }
  const PBP_ICO = {
    shot: { c: 'score', s: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/></svg>' },
    shot3: { c: 'score', s: '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.8.6-5.1 4.5 1.5 6.7L12 17l-6 3.6 1.5-6.7-5.1-4.5 6.8-.6z"/></svg>' },
    ft: { c: 'score', s: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12l5 5L20 6"/></svg>' },
    reb: { c: 'def', s: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a9 9 0 100 18M12 3v18M3 12h18"/></svg>' },
    ast: { c: 'play', s: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h13M13 6l6 6-6 6"/></svg>' },
    stl: { c: 'def', s: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8L6 20M6 8l12 12"/></svg>' },
    blk: { c: 'def', s: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20L20 4M8 4H4v4"/></svg>' },
    tov: { c: 'play', s: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 019-9M21 12a9 9 0 01-9 9M8 3L3 3l0 5"/></svg>' },
    foul: { c: 'neutral', s: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 8v5M12 16v.5"/><circle cx="12" cy="12" r="9"/></svg>' },
    in: { c: 'neutral', s: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h11M11 7l5 5-5 5M19 5v14"/></svg>' },
    out: { c: 'neutral', s: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H8M13 7l-5 5 5 5M5 5v14"/></svg>' },
  };
  function actionsPane(line) {
    return '<div class="tile-sub" style="margin-bottom:14px">Temps de jeu de Sylvain : <b style="color:var(--t1)">' + line.min + ' min</b> · déroulé chronologique reconstitué</div>'
      + '<div class="pbp-filters"><div class="pbp-quarters" data-pbp-q>'
      + [['all', 'Tout'], ['1', 'Q1'], ['2', 'Q2'], ['3', 'Q3'], ['4', 'Q4']].map((q) => '<button data-q="' + q[0] + '"' + (q[0] === 'all' ? ' class="active"' : '') + '>' + q[1] + '</button>').join('')
      + '</div><div class="chips-filter" style="margin:0" data-pbp-f>'
      + [['all', 'Toutes'], ['sf', 'Sylvain Francisco'], ['paniers', 'Paniers'], ['defense', 'Défense']].map((f) => '<button class="chipf' + (f[0] === 'all' ? ' active' : '') + '" data-pf="' + f[0] + '">' + f[1] + '</button>').join('')
      + '</div></div><div class="pbp-list" id="pbpList"></div>';
  }
  function pbpMatch(e) {
    if (pbpQuarter !== 'all' && String(e.period) !== pbpQuarter) return false;
    if (pbpFilter === 'sf') return e.who === 'sf';
    if (pbpFilter === 'paniers') return e.cat === 'score';
    if (pbpFilter === 'defense') return e.cat === 'def';
    return true;
  }
  function renderPBP() {
    const list = $('#pbpList'); if (!list) return;
    const items = PBP.filter(pbpMatch);
    if (!items.length) { list.innerHTML = '<div class="tile-sub" style="padding:20px 0;text-align:center">Aucune action pour ce filtre.</div>'; return; }
    list.innerHTML = items.map((e) => {
      const ic = PBP_ICO[e.kind] || { c: 'neutral', s: '' };
      const lead = e.us > e.them ? 'lead' : e.us < e.them ? 'trail' : '';
      const badge = e.dpts ? ' <b style="color:var(--orange)">+' + e.dpts + '</b>' : '';
      return '<div class="pbp-item"><span class="pbp-clock">Q' + e.period + ' ' + e.clock + '</span>'
        + '<span class="pbp-ico ' + ic.c + '">' + ic.s + '</span>'
        + '<span><span class="pbp-desc">' + esc(e.desc) + badge + '</span>' + (e.sub ? '<span class="pbp-sub"> · ' + esc(e.sub) + '</span>' : '') + '</span>'
        + '<span class="pbp-score ' + lead + '">' + e.us + '–' + e.them + '</span></div>';
    }).join('');
  }

  /* ============================================================
     9. VUE — HOOPFEED (posts générés depuis les données partagées)
     ============================================================ */
  function buildFeed() {
    const bg = bestGame, posts = [];
    const scene = (cls, eyebrow, score, tag) => '<div class="post-media" data-media><div class="scene ' + cls + '"><svg class="scene-court" viewBox="0 0 300 320" fill="none"><path d="M18 4 V96 A132 132 0 0 0 282 96 V4" stroke="rgba(201,158,99,0.35)" stroke-width="2"/><rect x="110" y="4" width="80" height="118" stroke="rgba(201,158,99,0.28)" stroke-width="2"/><circle cx="150" cy="24" r="6" stroke="rgba(244,150,88,0.7)" stroke-width="2"/></svg><div class="scene-eyebrow">' + eyebrow + '</div>' + (score ? '<div class="scene-score mono">' + score + '</div>' : '') + (tag ? '<div class="scene-tag">' + tag + '</div>' : '') + '</div><div class="burst"><div class="heart-big"><svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.9-10-9.5C.6 8.3 2.4 4.6 6 4.1c2-.3 3.9.6 6 3 2.1-2.4 4-3.3 6-3 3.6.5 5.4 4.2 4 7.4-2.5 4.6-10 9.5-10 9.5z"/></svg></div></div></div>';
    const chips = (arr) => '<div class="stats-carousel card">' + arr.map((c) => '<div class="stat-chip"><span class="sc-val mono">' + c[0] + '</span><span class="sc-label">' + c[1] + '</span></div>').join('') + '</div>';
    // 1. meilleur match (auto)
    posts.push({ id: 'p-best', author: 'sf', flag: bg.win ? 'VICTOIRE' : 'DÉFAITE', flagCls: bg.win ? 'win' : 'loss', ctx: 'EuroLeague · vs ' + bg.opponent + ' · ' + fmtDate(bg.date), auto: true,
      media: scene('scene-1', 'Meilleur match de la saison · ' + bg.eva + ' d\'évaluation', bg.us + '<small> –</small>' + bg.them, 'Masterclass'),
      stats: chips([[bg.pts + ' PTS', 'Points'], [bg.pd + ' AST', 'Passes déc.'], [bg.reb + ' REB', 'Rebonds'], ['+' + bg.eva + ' ÉVA', 'Évaluation']]),
      caption: '<b>@sylvainfrancisco</b> ' + bg.eva + ' d\'évaluation face à ' + bg.opponent + ', mon meilleur match de la saison. Fier du groupe <span style="color:var(--tq)">#Zalgiris #EuroLeague</span>',
      likes: 214 + bg.eva, comments: [['staff.zalgiris', 'Match référence, le travail paie Sylvain'], ['m.wright7', 'Gros match frérot 🔥']] });
    // 2. record de points (auto)
    posts.push({ id: 'p-rec', author: 'club', flag: 'RECORD', flagCls: 'win', ctx: 'Žalgiris Kaunas · ' + fmtDate(RECORDS.pts.date), auto: true,
      media: scene('scene-2', 'Record personnel de la saison', RECORDS.pts.pts + '<small> PTS</small>', 'Career-high saison'),
      stats: chips([[RECORDS.pts.pts + ' PTS', 'Record'], [RECORDS.pts.p3m + '/' + RECORDS.pts.p3a + ' 3PT', 'À 3 points'], [RECORDS.pts.pd + ' AST', 'Passes'], ['vs ' + RECORDS.pts.opponent.split(' ')[0], 'Adversaire']]),
      caption: '<b>@bczalgiris</b> ' + RECORDS.pts.pts + " points pour Sylvain Francisco face à " + RECORDS.pts.opponent + ' : record personnel de la saison ! <span style="color:var(--tq)">#Zalgiris</span>',
      likes: 512, comments: [['fan_kaunas', 'Quel meneur 💚'], ['sylvainfrancisco', 'Merci pour le soutien 🙏']] });
    // 3. séance de tir (auto)
    const ls = lastShoot();
    posts.push({ id: 'p-shoot', author: 'sf', flag: 'TRAINING', flagCls: 'gold', ctx: 'Séance de tir · ' + fmtDate(ls.date), auto: true,
      media: scene('scene-3', ls.focus + ' · ' + ls.made + '/' + ls.att + ' au tir', ls.pct + '<small> %</small>', 'Shooting'),
      stats: chips([[ls.pct + '%', 'Réussite'], [ls.att + '', 'Tirs pris'], [ls.ftm + '/' + ls.fta, 'Lancers'], [SHOOT.kpi.count + '', 'Séances']]),
      caption: '<b>@sylvainfrancisco</b> Encore du travail au shoot avant les Playoffs. ' + ls.pct + '% aujourd\'hui <span style="color:var(--tq)">#Shooting #Zalgiris</span>',
      likes: 128, comments: [['coach.trinchieri', 'La régularité paie 👌']] });
    // 4. entraînement collectif (auto)
    const lc = lastColl(), lcNote = lc ? S.playerAvg(lc, PID) : null;
    if (lc) posts.push({ id: 'p-coll', author: 'club', flag: 'COLLECTIF', flagCls: 'gold', ctx: esc(lc.titre) + ' · ' + fmtDate(lc.date), auto: true,
      media: scene('scene-2', 'Séance collective · préparation Playoffs', S.collectifAvg(lc) + '<small> /10</small>', 'Team work'),
      stats: chips([[lcNote + '/10', 'Note de Sylvain'], [S.collectifAvg(lc) + '/10', 'Collectif'], [lc.duree + ' min', 'Durée'], ['Žalgiris', 'Arena']]),
      caption: '<b>@bczalgiris</b> Grosse séance collective à la Žalgiris Arena. Le groupe répond présent avant les Playoffs 💪',
      likes: 176, comments: [['edgaras.u', 'On lâche rien 💚']] });
    // 5. prochain match (club)
    const nm = tournoi.prochainMatch;
    posts.push({ id: 'p-next', author: 'club', flag: 'À VENIR', flagCls: 'gold', ctx: 'Playoffs EuroLeague · ' + esc(nm.lieu), auto: false,
      media: scene('scene-1', 'Prochain rendez-vous · Playoffs EuroLeague', 'ZAL <small>vs</small> ' + nm.code, esc(nm.adversaire)),
      stats: chips([['J-2', 'Compte à rebours'], [tournoi.bilan.victoires + '-' + tournoi.bilan.defaites, 'Bilan saison'], ['5e', 'Classement'], ['Istanbul', 'Déplacement']]),
      caption: '<b>@bczalgiris</b> Direction ' + esc(nm.lieu) + ' pour affronter ' + esc(nm.adversaire) + ' en Playoffs. On y va ensemble 💚 <span style="color:var(--tq)">#EuroLeague</span>',
      likes: 341, comments: [['fan_kaunas', 'On croit en vous !'], ['sylvainfrancisco', 'Prêts 🔒']] });
    return posts;
  }
  function postHTML(p) {
    const av = p.author === 'sf' ? 'SF' : p.author === 'club' ? 'ZAL' : 'ZAL';
    const user = p.author === 'sf' ? '@sylvainfrancisco' : '@bczalgiris';
    return '<article class="post card-elevated" data-post="' + p.id + '"><div class="post-head"><div class="post-avatar"><div class="post-avatar-inner"><span class="init">' + av + '</span></div></div>'
      + '<div><div class="post-user">' + user + '</div><div class="post-ctx">' + p.ctx + '</div></div>'
      + '<span class="post-flag ' + (p.flagCls === 'win' ? 'win' : p.flagCls === 'loss' ? 'loss' : '') + '"' + (p.flagCls === 'gold' ? ' style="background:var(--gold-soft);color:var(--gold)"' : '') + '>' + p.flag + '</span></div>'
      + p.media + p.stats
      + '<div class="post-actions"><button class="pa-btn" data-like data-count="' + p.likes + '"><span class="ico"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.9-10-9.5C.6 8.3 2.4 4.6 6 4.1c2-.3 3.9.6 6 3 2.1-2.4 4-3.3 6-3 3.6.5 5.4 4.2 4 7.4-2.5 4.6-10 9.5-10 9.5z"/></svg></span><span class="like-count mono">' + p.likes + '</span></button>'
      + '<button class="pa-btn" data-comment-focus><span class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z"/></svg></span><span class="mono">' + p.comments.length + '</span></button>'
      + '<button class="pa-btn pa-share"><span class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg></span></button>'
      + (p.auto ? '<span class="id-tag" style="margin-left:auto;font-size:10px">⚡ Généré automatiquement</span>' : '') + '</div>'
      + '<div class="post-caption">' + p.caption + '</div>'
      + '<div class="post-comments" data-comments>' + p.comments.map((c) => '<div class="comment"><b>' + esc(c[0]) + '</b> ' + esc(c[1]) + '</div>').join('') + '</div>'
      + '<div class="comment-box card"><input type="text" placeholder="Ajouter un commentaire…" data-input><button class="btn-send" data-send>Publier</button></div></article>';
  }
  function feedMiniCard(p) {
    return '<div class="qa-card" data-goto="feed"><div class="qa-eyebrow">' + icoDot + ' ' + p.flag + (p.auto ? ' · auto' : '') + '</div><div class="qa-title">' + (p.author === 'sf' ? '@sylvainfrancisco' : '@bczalgiris') + '</div><div class="qa-meta">' + p.ctx + '</div></div>';
  }
  const FEED = buildFeed();
  function renderFeed() {
    const html = '<div class="view-head"><h2 class="view-title">Hoop<em class="serif">Feed</em></h2><div class="view-sub">L\'actualité du Žalgiris — publications automatiques à partir de tes performances</div></div>'
      + '<div class="feed-col stagger">' + FEED.map(postHTML).join('') + '</div>';
    $('#pane-feed').innerHTML = html;
    wireFeed($('#pane-feed'));
  }
  function wireFeed(root) {
    $$('.post', root).forEach((post) => {
      const likeBtn = $('[data-like]', post), countEl = $('.like-count', post), burst = $('.burst', post);
      let count = parseInt(likeBtn.dataset.count, 10);
      function setLiked(on) { likeBtn.classList.toggle('liked', on); const path = $('svg path', likeBtn); if (path) path.setAttribute('fill', on ? 'currentColor' : 'none'); count += on ? 1 : -1; countEl.textContent = count.toLocaleString('fr-FR'); }
      likeBtn.addEventListener('click', () => setLiked(!likeBtn.classList.contains('liked')));
      const media = $('[data-media]', post);
      if (media && burst) media.addEventListener('dblclick', () => { if (!likeBtn.classList.contains('liked')) setLiked(true); burst.classList.remove('go'); void burst.offsetWidth; burst.classList.add('go'); setTimeout(() => burst.classList.remove('go'), 750); });
      const input = $('[data-input]', post), send = $('[data-send]', post), comments = $('[data-comments]', post);
      function addC() { const t = input.value.trim(); if (!t) return; const c = document.createElement('div'); c.className = 'comment'; c.innerHTML = '<b>moi</b> ' + esc(t); comments.appendChild(c); input.value = ''; }
      if (send) send.addEventListener('click', addC);
      if (input) input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addC(); });
      const cf = $('[data-comment-focus]', post); if (cf && input) cf.addEventListener('click', () => input.focus());
    });
  }

  /* ============================================================
     10. VUE — PROFIL
     ============================================================ */
  function seasonsTable() {
    // saisons antérieures : démo déterministe en progression vers la saison réelle
    const cur = { season: tournoi.saison, mj: H.mj, min: H.min, pts: H.pts, reb: H.reb, pd: H.pd, p3: H.p3, eva: H.eva, cur: true };
    const prev = [
      { season: '2024–2025', f: 0.86 }, { season: '2023–2024', f: 0.72 }, { season: '2022–2023', f: 0.58 },
    ].map((s) => ({ season: s.season, mj: Math.round(28 + s.f * 6), min: round1(H.min * (0.82 + s.f * 0.18)), pts: round1(H.pts * s.f), reb: round1(H.reb * (0.8 + s.f * 0.2)), pd: round1(H.pd * (0.75 + s.f * 0.25)), p3: Math.round(H.p3 * (0.9 + s.f * 0.1)), eva: round1(H.eva * s.f) }));
    return [cur].concat(prev);
  }
  function renderProfile() {
    const seasons = seasonsTable();
    const badges = BADGES.slice().sort((a, b) => (b.count > 0) - (a.count > 0));
    const html =
      '<div class="view-head"><h2 class="view-title">Mon <em class="serif">profil</em></h2><div class="view-sub">Sylvain Francisco — ' + esc(club.nom) + ' · ' + esc(tournoi.nom) + '</div></div>'
      // hero
      + '<div class="id-hero" style="margin-bottom:16px"><div class="id-photo"><span class="init">' + initials(player.name) + '</span><span class="num">' + player.num + '</span></div>'
      + '<div class="id-meta"><div class="id-name">' + esc(player.name) + '</div><div class="id-role">' + esc(player.poste) + ' · n°' + player.num + ' · ' + esc(club.nom) + '</div>'
      + '<div class="id-tags"><span class="id-tag hot">' + esc(tournoi.mvp === player.name ? 'MVP du club' : 'Meilleur marqueur') + '</span><span class="id-tag">' + esc(player.taille) + '</span><span class="id-tag">Meneur</span><span class="id-tag">' + esc(tournoi.qualification) + '</span></div></div></div>'
      // infos joueur
      + '<div class="info-grid" style="margin-bottom:20px">'
      + [['Poste', player.poste], ['Taille', player.taille], ['Numéro', '#' + player.num], ['Équipe', club.nom], ['Compétition', 'EuroLeague'], ['Nationalité', 'France']].map((c) => '<div class="info-cell"><div class="k">' + c[0] + '</div><div class="v">' + esc(c[1]) + '</div></div>').join('')
      + '</div>'
      // stats saison
      + '<div class="sec-head"><span class="sec-title">Statistiques de la saison</span><span class="tile-sub">' + esc(tournoi.saison) + '</span></div>'
      + '<div class="tiles" style="grid-template-columns:repeat(4,1fr);margin-bottom:12px">'
      + tile(H.pts, 'Points', null, { accent: true }) + tile(H.reb, 'Rebonds') + tile(H.pd, 'Passes déc.') + tile(H.eva, 'Évaluation')
      + '</div>'
      + '<div class="pcts" style="margin-bottom:20px">' + pctCell('FG%', player.season.tirsPct) + pctCell('2PT%', H.p2) + pctCell('3PT%', H.p3) + pctCell('LF%', H.lf) + '</div>'
      // stats par saison
      + '<div class="sec-head"><span class="sec-title">Statistiques par saison</span></div>'
      + '<div class="panel card-elevated" style="margin-bottom:20px"><div class="table-scroll"><table class="season-table"><thead><tr><th>Saison</th><th>MJ</th><th>MIN</th><th>PTS</th><th>REB</th><th>PD</th><th>3PT%</th><th>ÉVA</th></tr></thead><tbody>'
      + seasons.map((s) => '<tr class="' + (s.cur ? 'cur' : '') + '"><td>' + esc(s.season) + '</td><td>' + s.mj + '</td><td>' + s.min + '</td><td>' + s.pts + '</td><td>' + s.reb + '</td><td>' + s.pd + '</td><td>' + s.p3 + '%</td><td>' + s.eva + '</td></tr>').join('')
      + '</tbody></table></div><div class="tile-sub" style="margin-top:8px">Saisons antérieures : données de démonstration en progression.</div></div>'
      // records
      + '<div class="sec-head"><span class="sec-title">Records personnels</span></div>'
      + '<div class="rec-grid" style="margin-bottom:22px">' + recordsHTML() + '</div>'
      // badges
      + '<div class="sec-head"><span class="sec-title">Badges & accomplissements</span></div>'
      + '<div class="badges">' + badges.map(badgeHTML).join('') + '</div>';
    $('#pane-profile').innerHTML = html;
  }
  function badgeHTML(b) {
    const earned = b.count > 0;
    return '<div class="badge ' + (earned ? 'earned' : 'locked') + '"><div class="badge-ico">' + b.ico + '</div><div><div class="badge-name">' + b.name + '</div><div class="badge-desc">' + b.desc + '</div>' + (earned ? '<div class="badge-count">✓ ' + b.count + ' fois cette saison</div>' : '<div class="badge-count" style="color:var(--t4)">Non débloqué</div>') + '</div></div>';
  }

  /* ============================================================
     11. Routage & interactions globales
     ============================================================ */
  const VIEWS = ['dashboard', 'training', 'games', 'feed', 'profile'];
  const TITLES = { dashboard: 'Dashboard', training: 'Entraînements', games: 'Game Center', feed: 'HoopFeed', profile: 'Profil' };
  let current = 'dashboard';
  function showView(view, opts) {
    if (VIEWS.indexOf(view) === -1) return;
    const from = VIEWS.indexOf(current), to = VIEWS.indexOf(view);
    const dir = to > from ? 'enter-right' : 'enter-left';
    current = view;
    $$('.ptab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
    $$('.bn-item').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
    $$('.pview').forEach((v) => v.classList.remove('active', 'enter-right', 'enter-left'));
    const el = document.getElementById('view-' + view);
    if (el) el.classList.add('active', dir);
    const title = $('#tbTitle'); if (title) title.textContent = TITLES[view];
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.classList.remove('nav-open');
    if (opts && opts.subtab) { if (view === 'training') { trainSub = opts.subtab; setSubtab('training', opts.subtab); } if (view === 'games') { gameSub = opts.subtab; setSubtab('games', opts.subtab); } }
  }
  function setSubtab(group, sub) {
    const pane = group === 'training' ? $('#pane-training') : $('#pane-games');
    if (!pane) return;
    $$('.subtab', pane).forEach((b) => b.classList.toggle('active', b.dataset.sub === sub));
    $$('.subpane', pane).forEach((p) => p.classList.remove('active'));
    const target = $('#sub-' + sub); if (target) target.classList.add('active');
  }

  function init() {
    renderDashboard(); renderTraining(); renderGames(); renderFeed(); renderProfile();

    // navigation principale (sidebar + bottom nav)
    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-view]');
      if (nav) { showView(nav.dataset.view); return; }
      const goto = e.target.closest('[data-goto]');
      if (goto) { showView(goto.dataset.goto, { subtab: goto.dataset.subtab }); return; }
      // sous-onglets
      const sub = e.target.closest('.subtab');
      if (sub) { const group = sub.closest('[data-subtabs]').dataset.subtabs; if (group === 'training') trainSub = sub.dataset.sub; else gameSub = sub.dataset.sub; setSubtab(group, sub.dataset.sub); return; }
      // toggle de plage (dashboard)
      const rg = e.target.closest('[data-range]');
      if (rg) { dashRange = rg.dataset.range; const box = $('#dashChart'); if (box) box.innerHTML = dashChartHTML(); return; }
      // filtre saison
      const sf = e.target.closest('[data-f]');
      if (sf && sf.closest('[data-season-filter]')) { seasonFilter = sf.dataset.f; renderSaison(); return; }
      // ouverture d'un match
      const mm = e.target.closest('[data-match]');
      if (mm) { openMatch(mm.dataset.match); return; }
      // séance collective -> ouvre son détail (réutilise la carte étendue, ici scroll)
      // filtres play-by-play
      const pq = e.target.closest('[data-q]');
      if (pq && pq.closest('[data-pbp-q]')) { pbpQuarter = pq.dataset.q; $$('[data-pbp-q] button').forEach((b) => b.classList.toggle('active', b === pq)); renderPBP(); return; }
      const pf = e.target.closest('[data-pf]');
      if (pf && pf.closest('[data-pbp-f]')) { pbpFilter = pf.dataset.pf; $$('[data-pbp-f] button').forEach((b) => b.classList.toggle('active', b === pf)); renderPBP(); return; }
      // onglets de la modal
      const st = e.target.closest('[data-stab]');
      if (st) { sheetTab = st.dataset.stab; $$('.sheet-tab').forEach((b) => b.classList.toggle('active', b === st)); $$('.sheet-pane').forEach((p) => p.classList.remove('active')); const sp = $('#spane-' + sheetTab); if (sp) sp.classList.add('active'); return; }
      if (e.target.closest('#sheetClose')) { closeMatch(); return; }
      const ov = $('#sheetOverlay'); if (ov && e.target === ov) { closeMatch(); return; }
    });

    // drawer mobile
    const menuBtn = $('#menuBtn'), scrim = $('#appScrim');
    if (menuBtn) menuBtn.addEventListener('click', () => { const open = document.body.classList.toggle('nav-open'); menuBtn.setAttribute('aria-expanded', open); });
    if (scrim) scrim.addEventListener('click', () => document.body.classList.remove('nav-open'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { document.body.classList.remove('nav-open'); closeMatch(); } });

    console.info('[HoopBoard] Espace joueur prêt — modèle dérivé de HoopStore (', LOG.length, 'matchs,', SHOOT.sessions.length, 'séances de tir).');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
