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

  // Séances collectives (store) — vues côté Francisco.
  const COLLECTIFS = S.getCollectifs().filter((s) => s.eval);           // récentes en premier
  const COLL_CHRONO = COLLECTIFS.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const playerColl = profile.training.collective;                     // {presenceRate,noteAvg,critAvg,series,recent…} (exposé via getPlayerProfile)

  const ZONE8 = ['RAQUETTE', 'MI_DISTANCE_GAUCHE', 'MI_DISTANCE_CENTRE', 'MI_DISTANCE_DROITE', 'CORNER_3_GAUCHE', 'CORNER_3_DROIT', 'TOP_KEY_GAUCHE', 'TOP_KEY_DROIT'];

  /* ---- Séances thématiques (tir + personnalisées) : MÊME source que le coach ----
     Le staff saisit les séances de tir zone par zone et note les séances
     personnalisées dans HoopStore (getThematicSessions). On ne fait ici que
     filtrer la ligne de Sylvain Francisco : le joueur voit exactement ce que
     le coach a enregistré — aucune donnée n'est régénérée côté joueur.
     Sert au shot chart, à l'analyse, à l'historique, au Dashboard et au feed. */
  const THEMATIC = S.getThematicSessions() || [];
  const HEAT_SCALE = { three: [25, 45], mid: [32, 52], paint: [45, 72], rim: [48, 78] };
  const zoneMeta = (zid) => ((Court && Court.ZONES && Court.ZONES[zid]) ? Court.ZONES[zid] : null);
  const zoneLabel = (zid) => { const z = zoneMeta(zid); return z ? z.label : zid; };
  const zoneValue = (zid) => { const z = zoneMeta(zid); return z ? z.value : 2; };
  /* échelle de couleur par famille de zone : un 3 pts à 40 % vaut un 2 pts à 65 % */
  function heatValue(zid, pct) {
    const z = zoneMeta(zid), s = HEAT_SCALE[(z && z.group) || 'mid'] || HEAT_SCALE.mid;
    return clamp((pct - s[0]) / (s[1] - s[0]), 0, 1);
  }
  // agrège une liste de séances de tir -> { zoneId: {m, a, pct} }
  function zonesOf(list) {
    const Z = {};
    list.forEach((s) => Object.keys(s.zones).forEach((zid) => {
      const t = Z[zid] || (Z[zid] = { m: 0, a: 0 });
      t.m += s.zones[zid].m; t.a += s.zones[zid].a;
    }));
    Object.keys(Z).forEach((k) => (Z[k].pct = pctOf(Z[k].m, Z[k].a)));
    return Z;
  }
  function buildShooting() {
    const sessions = THEMATIC
      .filter((s) => s.categorie === 'tir' && s.status === 'done' && s.resultats && s.resultats[PID])
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((s, i) => {
        const r = s.resultats[PID], zones = {};
        (s.zones || []).forEach((zid) => { const z = r.zones[zid]; if (z) zones[zid] = { m: z.m, a: z.a, pct: pctOf(z.m, z.a) }; });
        return {
          i: i, id: s.id, date: parseISO(s.date), dateISO: s.date, focus: s.titre || 'Séance de tir',
          objectif: s.objectif || '', notes: s.notes || '', lieu: s.lieu || '', heure: s.heure || '',
          duree: s.duree || 0, intensite: s.intensite || '', reps: s.reps || 0,
          zones: zones, made: r.total.m, att: r.total.a, pct: r.total.pct,
          teamPct: (s.teamPct != null ? s.teamPct : null),
        };
      });
    const byZone = zonesOf(sessions);
    Object.keys(byZone).forEach((zid) => { byZone[zid].series = sessions.filter((s) => s.zones[zid]).map((s) => s.zones[zid].pct); });
    let m2 = 0, a2 = 0, m3 = 0, a3 = 0;
    Object.keys(byZone).forEach((zid) => {
      if (zoneValue(zid) === 3) { m3 += byZone[zid].m; a3 += byZone[zid].a; } else { m2 += byZone[zid].m; a2 += byZone[zid].a; }
    });
    const made = sum(sessions.map((s) => s.made)), att = sum(sessions.map((s) => s.att));
    return {
      sessions: sessions, byZone: byZone,
      kpi: { count: sessions.length, made: made, att: att, pct: pctOf(made, att), p2: pctOf(m2, a2), p3: pctOf(m3, a3), m2: m2, a2: a2, m3: m3, a3: a3 },
      evolution: sessions.map((s) => s.pct),
    };
  }
  const SHOOT = buildShooting();
  const lastShoot = () => SHOOT.sessions[SHOOT.sessions.length - 1];   // dernière séance de tir (HoopFeed)

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

  /* Rend un shot chart : `zones8` = {ZONE:{pct,made,att,...}}. Retourne l'API HoopCourt.
     `opts.scaled` colore chaque zone par rapport à la référence de sa famille
     (heatValue) plutôt qu'en pourcentage brut : un 3 pts à 40 % ne doit pas
     paraître « froid » face à un 2 pts près du cercle à 60 %. */
  function renderShotChart(holder, zones8, onSelect, opts) {
    opts = opts || {};
    const heatmap = {};
    Object.keys(ZONE18_TO_8).forEach((z18) => {
      const z = zones8[ZONE18_TO_8[z18]]; if (!z || !(z.att > 0)) return;
      heatmap[z18] = opts.scaled ? heatValue(z18, z.pct) : z.pct / 100;
    });
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
  function critRow(label, val) {
    return '<div class="crit-row"><span class="crit-lab">' + esc(label) + '</span><span class="crit-track"><span class="crit-fill" style="width:' + (val / 10 * 100) + '%"></span></span><span class="crit-val">' + fr(round1(val)) + '</span></div>';
  }
  function noteColor(n) { return n >= 8 ? 'var(--win)' : n >= 6.5 ? 'var(--orange)' : n >= 5 ? 'var(--gold)' : 'var(--loss)'; }

  /* ============================================================
     5. VUE — DASHBOARD
     ------------------------------------------------------------
     Même langage visuel que la page Saison du coach : un grand hero
     centré plein cadre, puis les blocs empilés — grande photo de
     profil, statistiques principales, UN SEUL graphique d'évolution
     avec sélecteur de statistique, et l'activité récente (matchs,
     séances, performances : que du basket, aucun contenu HoopFeed).
     Aucune donnée n'est recalculée ici : tout vient de HoopStore.
     ============================================================ */

  /* ---- les statistiques proposées au sélecteur du graphique ----
     `val` lit la ligne d'un match du log ; `avg` est la moyenne de
     saison publiée, tracée en repère sous forme de pointillés. */
  const DASH_STATS = [
    { key: 'pts', label: 'Points', short: 'PTS', unit: '', val: (g) => g.pts, avg: H.pts },
    { key: 'fg', label: '% au tir', short: 'FG%', unit: ' %', val: (g) => (g.fga > 0 ? pctOf(g.fgm, g.fga) : null), avg: player.season.tirsPct },
    { key: 'p3', label: '% à 3 pts', short: '3PT%', unit: ' %', val: (g) => (g.p3a > 0 ? pctOf(g.p3m, g.p3a) : null), avg: H.p3 },
    { key: 'lf', label: '% aux lancers', short: 'LF%', unit: ' %', val: (g) => (g.fta > 0 ? pctOf(g.ftm, g.fta) : null), avg: H.lf },
    { key: 'reb', label: 'Rebonds', short: 'REB', unit: '', val: (g) => g.reb, avg: H.reb },
    { key: 'pd', label: 'Passes déc.', short: 'AST', unit: '', val: (g) => g.pd, avg: H.pd },
    { key: 'int', label: 'Interceptions', short: 'INT', unit: '', val: (g) => g.int, avg: H.int },
    { key: 'eva', label: 'Évaluation', short: 'ÉVA', unit: '', val: (g) => g.eva, avg: H.eva },
    { key: 'min', label: 'Minutes', short: 'MIN', unit: '', val: (g) => g.min, avg: null },
  ];
  const DASH_RANGES = [['5 derniers', 5], ['10 derniers', 10], ['Saison', 0]];
  let dashStat = 'pts', dashRange = 10, actShown = 6;
  const dashDef = () => DASH_STATS.filter((s) => s.key === dashStat)[0] || DASH_STATS[0];
  function dashGames() { return dashRange > 0 ? LOG.slice(-dashRange) : LOG.slice(); }

  /* ---- 5a. Le graphique d'évolution (un seul, moderne) ----
     Aire dégradée + courbe lissée, moyenne de saison en pointillés,
     dernier match mis en avant. Le viewBox garde son ratio (pas de
     preserveAspectRatio="none") : aucune déformation dès 320 px. */
  function smoothPath(P) {
    let d = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
      const lo = Math.min(p1[1], p2[1]), hi = Math.max(p1[1], p2[1]);   // pas de dépassement vertical
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = clamp(p1[1] + (p2[1] - p0[1]) / 6, lo, hi);
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = clamp(p2[1] - (p3[1] - p1[1]) / 6, lo, hi);
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ',' + c2x.toFixed(1) + ' ' + c2y.toFixed(1)
        + ',' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  function dashChartSVG() {
    const def = dashDef(), games = dashGames();
    const pts = games.map((g, i) => ({ i: i, g: g, v: def.val(g) })).filter((p) => p.v != null);
    if (pts.length < 2) return '<p class="pt-empty">Pas encore assez de matchs pour tracer cette évolution.</p>';
    const W = 680, HT = 270, pl = 40, pr = 18, ptop = 26, pbot = 34;
    const iw = W - pl - pr, ih = HT - ptop - pbot;
    const vals = pts.map((p) => p.v);
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (def.avg != null) { lo = Math.min(lo, def.avg); hi = Math.max(hi, def.avg); }
    const pad = (hi - lo) * 0.2 || Math.max(1, Math.abs(hi) * 0.15) || 1;
    lo = Math.max(0, round1(lo - pad)); hi = round1(hi + pad);
    const span = (hi - lo) || 1;
    const n = games.length;
    const X = (i) => pl + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const Y = (v) => ptop + ih - ((v - lo) / span) * ih;
    const gid = 'pdg' + (gradId++);

    const grid = [0, 1, 2, 3].map((k) => {
      const v = lo + (span * k) / 3, y = Y(v);
      return '<line class="rc-grid" x1="' + pl + '" y1="' + y.toFixed(1) + '" x2="' + (W - pr) + '" y2="' + y.toFixed(1) + '"/>'
        + '<text class="rc-yl" x="' + (pl - 8) + '" y="' + (y + 4).toFixed(1) + '">' + fr(round1(v)) + '</text>';
    }).join('');

    const P = pts.map((p) => [X(p.i), Y(p.v)]);
    const line = smoothPath(P);
    const area = line + ' L' + P[P.length - 1][0].toFixed(1) + ' ' + (ptop + ih)
      + ' L' + P[0][0].toFixed(1) + ' ' + (ptop + ih) + ' Z';

    const avgLine = def.avg != null
      ? '<line class="pd-avg" x1="' + pl + '" y1="' + Y(def.avg).toFixed(1) + '" x2="' + (W - pr) + '" y2="' + Y(def.avg).toFixed(1) + '"/>'
        + '<text class="pd-avg-l" x="' + (W - pr) + '" y="' + (Y(def.avg) - 7).toFixed(1) + '">saison ' + fr(def.avg) + def.unit + '</text>'
      : '';

    const dots = P.map((p, j) => {
      const last = j === P.length - 1;
      return '<circle class="pd-dot' + (last ? ' hi' : '') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (last ? 6 : 3.6) + '"/>';
    }).join('');
    const lastP = pts[pts.length - 1];
    const lastLab = '<text class="pd-last" x="' + clamp(X(lastP.i), pl + 16, W - pr - 16).toFixed(1) + '" y="'
      + Math.max(ptop - 8, Y(lastP.v) - 16).toFixed(1) + '">' + fr(lastP.v) + def.unit + '</text>';

    const step = Math.max(1, Math.ceil(n / 5));
    const xl = games.map((g, i) => ((i % step === 0 || i === n - 1)
      ? '<text class="rc-xl" x="' + X(i).toFixed(1) + '" y="' + (HT - 10) + '">' + esc(fmtDate(g.date)) + '</text>' : '')).join('');

    return '<svg class="pd-svg" viewBox="0 0 ' + W + ' ' + HT + '" role="img" aria-label="Évolution — ' + esc(def.label) + '">'
      + '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="var(--orange)" stop-opacity="0.30"/>'
      + '<stop offset="1" stop-color="var(--orange)" stop-opacity="0"/></linearGradient></defs>'
      + grid + '<path d="' + area + '" fill="url(#' + gid + ')"/>' + avgLine
      + '<path class="pd-line" d="' + line + '"/>' + dots + lastLab + xl + '</svg>';
  }
  function dashSummaryHTML() {
    const def = dashDef(), games = dashGames();
    const pts = games.map((g) => ({ g: g, v: def.val(g) })).filter((p) => p.v != null);
    if (!pts.length) return '';
    const vals = pts.map((p) => p.v);
    const avg = round1(mean(vals));
    const best = pts.reduce((b, p) => (p.v > b.v ? p : b), pts[0]);
    const t = trend(vals, def.unit ? 1.5 : 0.3);
    return '<div class="tr2-sum">'
      + sumRow('Moyenne sur la période', fr(avg) + (def.unit || ''))
      + (def.avg != null ? sumRow('Moyenne de la saison', fr(def.avg) + (def.unit || '')
        + ' <i>· écart ' + frS(round1(avg - def.avg)) + '</i>', dirOf(round1(avg - def.avg), def.unit ? 1.5 : 0.3)) : '')
      + sumRow('Meilleur match', fr(best.v) + (def.unit || '') + ' <i>· ' + esc(best.g.opponent) + ', ' + fmtDate(best.g.date) + '</i>')
      + sumRow('Dernier match', fr(pts[pts.length - 1].v) + (def.unit || '')
        + ' <i>· ' + fmtDate(pts[pts.length - 1].g.date) + '</i>')
      + (t ? sumRow('Tendance', frS(t.d) + (def.unit || ''), t.dir) : '')
      + '</div>';
  }
  function paintDashChart() {
    const box = $('#pdChart'); if (box) box.innerHTML = dashChartSVG();
    const sum = $('#pdSum'); if (sum) sum.innerHTML = dashSummaryHTML();
    const lab = $('#pdChartLab'); if (lab) lab.textContent = dashDef().label;
    $$('#pane-dashboard [data-dstat]').forEach((b) => b.classList.toggle('on', b.dataset.dstat === dashStat));
    $$('#pane-dashboard [data-drange]').forEach((b) => b.classList.toggle('on', Number(b.dataset.drange) === dashRange));
  }

  /* ---- 5b. Activité récente — 100 % basket ----
     Matchs joués, séances (tir / collectif / personnalisée) et
     performances remarquables, fusionnés dans un ordre chronologique
     inverse. Chaque ligne ouvre le détail déjà existant. */
  const ACT_ICOS = {
    match: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.5"/><path d="M12 2.5v19M2.5 12h19M5.2 5.2c3.4 3.4 3.4 10.2 0 13.6M18.8 5.2c-3.4 3.4-3.4 10.2 0 13.6"/></svg>',
    tir: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.4"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/></svg>',
    coll: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="8" r="3.2"/><path d="M2.5 19.5c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6"/><circle cx="17.5" cy="9.5" r="2.6"/><path d="M17 14.2c2.6.2 4.5 2.1 4.5 5.3"/></svg>',
    perso: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6.5 6.5l11 11M4 10l2.5-2.5M10 4L7.5 6.5M20 14l-2.5 2.5M14 20l2.5-2.5"/><circle cx="12" cy="12" r="9.5"/></svg>',
  };
  const chip = (txt, cls) => '<span class="pt-chip' + (cls ? ' ' + cls : '') + '">' + txt + '</span>';
  /* écart affiché seulement s'il est significatif — pas de « 0 vs groupe » */
  function deltaChip(d, suffix, seuil) {
    if (d == null || Math.abs(d) < (seuil || 0.1)) return [];
    return [chip(frS(d) + ' ' + suffix, dirOf(d, seuil || 0.3))];
  }
  /* performances remarquables d'un match — dérivées du même match log */
  function matchHighlights(g) {
    const out = [];
    if (RECORDS.pts.gameId === g.gameId) out.push('Record de points');
    if (RECORDS.reb.gameId === g.gameId) out.push('Record de rebonds');
    if (RECORDS.pd.gameId === g.gameId) out.push('Record de passes');
    if (RECORDS.eva.gameId === g.gameId) out.push('Meilleure évaluation');
    if (!out.length) {
      const dd = [g.pts, g.reb, g.pd].filter((v) => v >= 10).length;
      if (dd >= 3) out.push('Triple-double');
      else if (dd >= 2) out.push('Double-double');
      else if (g.pts >= 20) out.push('20 points ou plus');
      else if (g.p3m >= 5) out.push(g.p3m + ' paniers à 3 points');
    }
    return out;
  }
  function activityItems() {
    const byFam = { match: [], tir: [], coll: [], perso: [] };
    const items = byFam.match;
    LOG.slice(-10).forEach((g) => {
      const hl = matchHighlights(g);
      items.push({
        dateISO: g.date, kind: 'match', eyebrow: 'Match', attr: 'data-match="' + esc(g.gameId) + '"',
        title: (g.win ? 'Victoire' : 'Défaite') + ' ' + g.us + '–' + g.them + ' vs ' + esc(g.opponent),
        meta: (g.dom ? 'Domicile' : 'Extérieur') + ' · ' + g.min + ' min jouées',
        badge: g.pts + ' PTS', badgeCls: g.win ? 'win' : 'loss',
        chips: hl.map((h) => chip(h, 'hot')).concat([chip(g.reb + ' reb'), chip(g.pd + ' pd'), chip(g.eva + ' éva')]),
      });
    });
    SHOOT.sessions.slice(-6).forEach((s) => {
      byFam.tir.push({
        dateISO: s.dateISO, kind: 'tir', eyebrow: 'Séance de tir', attr: 'data-ptsess="tir:' + esc(s.id) + '"',
        title: esc(s.focus), meta: s.made + '/' + s.att + ' au tir' + (s.duree ? ' · ' + s.duree + ' min' : ''),
        badge: fr(s.pct) + ' %', badgeCls: '',
        chips: deltaChip(s.teamPct != null ? round1(s.pct - s.teamPct) : null, 'pts vs équipe', 1.5)
          .concat([chip(Object.keys(s.zones).length + ' zones travaillées')]),
      });
    });
    COLL_ATT.slice(-6).forEach((s) => {
      const note = S.playerAvg(s, PID), team = S.collectifAvg(s);
      byFam.coll.push({
        dateISO: s.date, kind: 'coll', eyebrow: 'Entraînement collectif', attr: 'data-ptsess="coll:' + esc(s.id) + '"',
        /* le titre du store est générique : on affiche le retour du staff */
        title: esc((s.eval && s.eval.noteCoach) || s.titre),
        meta: (s.duree ? s.duree + ' min · ' : '') + esc(s.lieu || ''),
        badge: fr(note) + '/10', badgeCls: '',
        chips: [chip('Groupe ' + fr(team) + '/10')].concat(deltaChip(round1(note - team), 'vs groupe', 0.3)),
      });
    });
    PERSO.slice(-6).forEach((s) => {
      byFam.perso.push({
        dateISO: s.dateISO, kind: 'perso', eyebrow: 'Séance personnalisée', attr: 'data-ptsess="perso:' + esc(s.id) + '"',
        title: esc(s.titre), meta: esc(s.theme) + (s.duree ? ' · ' + s.duree + ' min' : ''),
        badge: fr(s.note) + '/10', badgeCls: '',
        chips: deltaChip(s.team != null ? round1(s.note - s.team) : null, 'vs groupe', 0.3),
      });
    });
    const desc = (l) => l.slice().sort((a, b) => (a.dateISO < b.dateISO ? 1 : (a.dateISO > b.dateISO ? -1 : 0)));
    Object.keys(byFam).forEach((k) => { byFam[k] = desc(byFam[k]); });
    /* Onglet « Tout » : on entrelace les familles par rang d'ancienneté
       (le dernier match, la dernière séance de tir, la dernière collective…
       puis l'avant-dernière de chacune). Le calendrier de la démo place les
       séances après le dernier match joué : un tri purement chronologique
       repousserait tous les matchs hors du premier écran. Chaque carte porte
       sa date, et les onglets Matchs / Entraînements restent chronologiques. */
    const fams = ['match', 'tir', 'coll', 'perso'];
    const mix = [], deep = Math.max.apply(null, fams.map((k) => byFam[k].length));
    for (let r = 0; r < deep; r++) fams.forEach((k) => { if (byFam[k][r]) mix.push(byFam[k][r]); });
    return {
      tout: mix,
      match: byFam.match,
      entrainement: desc(byFam.tir.concat(byFam.coll, byFam.perso)),
    };
  }
  /* construite à la première utilisation : COLL_ATT / PERSO sont déclarés
     plus bas, avec la vue Entraînement. */
  let ACT_ALL = null, actFilter = 'tout';
  const ACT_FILTERS = [['tout', 'Tout'], ['match', 'Matchs'], ['entrainement', 'Entraînements']];
  function actCard(it) {
    return '<button type="button" class="pd-act" ' + it.attr + '>'
      + '<span class="pd-act-ico ' + it.kind + '">' + ACT_ICOS[it.kind] + '</span>'
      + '<span class="pd-act-body">'
      + '<span class="pd-act-head"><span class="pd-act-kind">' + it.eyebrow + '</span>'
      + '<span class="pd-act-date">' + esc(fmtDate(it.dateISO, true)) + '</span></span>'
      + '<span class="pd-act-t">' + it.title + '</span>'
      + '<span class="pd-act-m">' + it.meta + '</span>'
      + (it.chips.length ? '<span class="pd-act-chips">' + it.chips.join('') + '</span>' : '')
      + '</span>'
      + '<span class="pd-act-badge ' + (it.badgeCls || '') + '">' + it.badge + '</span></button>';
  }
  function activityHTML() {
    if (!ACT_ALL) ACT_ALL = activityItems();
    const list = ACT_ALL[actFilter] || ACT_ALL.tout;
    const tabs = '<div class="tr2-chips pd-actfil" role="group" aria-label="Filtrer l’activité">'
      + ACT_FILTERS.map((f) => '<button type="button" class="tr2-chip' + (f[0] === actFilter ? ' on' : '') + '" data-dactfil="' + f[0] + '">' + f[1] + '</button>').join('')
      + '</div>';
    if (!list.length) return tabs + '<p class="pt-empty">Aucune activité enregistrée pour le moment.</p>';
    return tabs + '<div class="pd-acts">' + list.slice(0, actShown).map(actCard).join('') + '</div>'
      + (actShown < list.length ? '<button type="button" class="pt-more" data-dactmore>Voir plus d’activité</button>' : '');
  }
  function paintActivity() { const el = $('#pdActs'); if (el) el.innerHTML = activityHTML(); }

  /* ---- 5c. La vue complète ---- */
  const last5Sub = (k) => '5 derniers : ' + fr(profile.avg5[k]);
  function statBlock(val, lab, sub, delta, unit) {
    let d = '';
    if (delta != null) {
      const cls = delta > 0.05 ? 'up' : (delta < -0.05 ? 'down' : 'flat');
      d = '<span class="pd-stat-d ' + cls + '">' + frS(round1(delta)) + (unit || '') + '</span>';
    }
    return '<div class="pd-stat"><div class="pd-stat-v">' + fr(val) + (unit ? '<i>' + unit + '</i>' : '') + '</div>'
      + '<div class="pd-stat-l">' + lab + '</div>'
      + '<div class="pd-stat-s">' + (sub || '') + d + '</div></div>';
  }
  function renderDashboard() {
    const next = tournoi.prochainMatch;
    const played = LOG.length;
    const html =
      // 1. hero centré, plein cadre — même esprit que la page Saison du coach
      '<header class="tr2-hero pd-hero"><h1 class="tr2-hero-t">Dashboard</h1>'
      + '<p class="tr2-hero-s"><b>' + esc(player.name) + '</b><span class="sep">·</span>' + esc(club.nom)
      + '<span class="sep">·</span>' + esc(tournoi.nom) + '</p></header>'

      // 2. grande photo de profil
      + '<section class="pd-id">'
      + '<div class="pd-photo" aria-label="Photo de ' + esc(player.name) + '">'
      + '<svg class="pd-photo-bg" viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="1.4">'
      + '<circle cx="50" cy="50" r="34"/><path d="M50 16v68M16 50h68"/>'
      + '<path d="M26 26c11 11 11 37 0 48M74 26c-11 11-11 37 0 48"/></g></svg>'
      + '<span class="pd-photo-init">' + initials(player.name) + '</span>'
      + '<span class="pd-photo-num">' + player.num + '</span></div>'
      + '<div class="pd-idmeta">'
      + '<div class="pd-name">' + esc(player.name) + '</div>'
      + '<div class="pd-role">' + esc(player.poste) + '<span class="sep">·</span>' + esc(player.taille)
      + '<span class="sep">·</span>' + esc(club.nom) + '</div>'
      + '<div class="pd-tags"><span class="pd-tag hot">Meilleur marqueur du club</span>'
      + '<span class="pd-tag">' + played + ' matchs joués</span>'
      + '<span class="pd-tag">Éva ' + fr(H.eva) + '</span></div>'
      + '<div class="pd-next"><span class="pd-next-lab">Prochain match</span>'
      + '<span class="pd-next-t">' + esc(club.nom) + ' — ' + esc(next.adversaire) + '</span>'
      + '<span class="pd-next-m">' + esc(fmtDateLong(next.date)) + ' · ' + esc(next.heure) + ' · '
      + (next.domicile ? 'domicile' : 'extérieur') + ' · ' + esc(next.salle) + '</span></div>'
      + '</div></section>'

      // 3. statistiques principales, très lisibles sur mobile
      + '<h2 class="pd-h2">Mes statistiques</h2>'
      + '<p class="pd-h2-note">Moyennes par match sur la saison ' + esc(tournoi.saison)
      + ' · l’écart affiché compare mes 5 derniers matchs à ma saison.</p>'
      + '<div class="pd-stats">'
      + statBlock(H.pts, 'Points', last5Sub('pts'), round1(profile.avg5.pts - H.pts), '')
      + statBlock(H.reb, 'Rebonds', last5Sub('reb'), round1(profile.avg5.reb - H.reb), '')
      + statBlock(H.pd, 'Passes déc.', last5Sub('pd'), round1(profile.avg5.pd - H.pd), '')
      + statBlock(H.int, 'Interceptions', last5Sub('int'), round1(profile.avg5.int - H.int), '')
      + '</div>'
      + '<div class="pd-stats pd-stats-sec">'
      + statBlock(player.season.tirsPct, 'Réussite au tir', 'sur la saison', null, ' %')
      + statBlock(H.p3, 'À 3 points', 'sur la saison', null, ' %')
      + statBlock(H.lf, 'Aux lancers francs', 'sur la saison', null, ' %')
      + statBlock(H.eva, 'Évaluation', last5Sub('eva'), round1(profile.avg5.eva - H.eva), '')
      + '</div>'

      // 4. UN SEUL graphique d'évolution, avec sélecteur de statistique
      + '<section class="tr2-panel pd-panel">'
      + '<div class="tr2-panel-head"><h2 class="tr2-h2">Mon évolution</h2>'
      + '<div class="tr2-panel-sub">Match après match — <b id="pdChartLab">' + esc(dashDef().label) + '</b></div></div>'
      + '<div class="pd-picks">'
      + '<div class="tr2-chips" role="group" aria-label="Statistique affichée">'
      + DASH_STATS.map((s) => '<button type="button" class="tr2-chip' + (s.key === dashStat ? ' on' : '') + '" data-dstat="' + s.key + '">' + esc(s.label) + '</button>').join('')
      + '</div>'
      + '<div class="tr2-chips pd-ranges" role="group" aria-label="Période">'
      + DASH_RANGES.map((r) => '<button type="button" class="tr2-key' + (r[1] === dashRange ? ' on' : '') + '" data-drange="' + r[1] + '">' + r[0] + '</button>').join('')
      + '</div></div>'
      + '<div class="tr2-chart" id="pdChart"></div>'
      + '<div id="pdSum" style="margin-top:16px"></div>'
      + '</section>'

      // 5. activité récente — uniquement du basket
      + '<h2 class="pd-h2">Activité récente</h2>'
      + '<p class="pd-h2-note">Mes derniers matchs, mes dernières séances et mes performances marquantes. '
      + 'Touchez une ligne pour ouvrir le détail.</p>'
      + '<div id="pdActs"></div>';
    $('#pane-dashboard').innerHTML = html;
    paintDashChart();
    paintActivity();
  }

  /* ============================================================
     6. VUE — ENTRAÎNEMENT
     ------------------------------------------------------------
     Même parcours que la page Entraînement du coach : hero centré,
     vue globale des trois familles, trois grands boutons, puis
     l'analyse détaillée et l'historique de la famille choisie.
     Les données et les règles d'analyse (tendance sur le premier tiers
     vs le dernier tiers, échelle de couleur par famille de zone,
     comparaison à la référence) sont celles du staff : rien n'est
     recalculé différemment côté joueur.
     ============================================================ */
  const PT_CATS = [['tirs', 'Tirs'], ['collectifs', 'Collectifs'], ['perso', 'Personnalisés']];
  const PT_ALIAS = { tirs: 'tirs', tir: 'tirs', collectif: 'collectifs', collectifs: 'collectifs', perso: 'perso' };
  const PT_THEME_COLORS = ['#FF6A00', '#B0812C', '#3E7BB6', '#9B6A4E', '#7A8189', '#2E2A24', '#C4632A', '#5C6BC0'];
  let trainCat = 'tirs';

  /* ---- helpers d'analyse (mêmes règles que la page Entraînement du coach) ---- */
  const fr = (n) => String(n).replace('.', ',');
  const frS = (n) => (n > 0 ? '+' : '') + fr(round1(n));
  function dirOf(d, seuil) { const s = seuil || 0.3; return d >= s ? 'up' : (d <= -s ? 'down' : 'flat'); }
  // tendance : moyenne du premier tiers comparée à celle du dernier tiers
  function trend(vals, seuil) {
    if (!vals || vals.length < 4) return null;
    const k = Math.max(2, Math.round(vals.length / 3));
    const d = round1(mean(vals.slice(-k)) - mean(vals.slice(0, k)));
    return { d: d, dir: dirOf(d, seuil) };
  }
  function trendBadge(t, unit) {
    if (!t) return '';
    const txt = t.dir === 'up' ? 'En progression' : (t.dir === 'down' ? 'En baisse' : 'Stable');
    return '<span class="tr2-trend ' + t.dir + '">' + txt + ' <b>' + frS(t.d) + (unit || '') + '</b></span>';
  }
  function sumRow(k, v, cls) {
    return '<div class="tr2-sum-row"><span>' + k + '</span><b' + (cls && cls !== 'flat' ? ' class="' + cls + '"' : '') + '>' + v + '</b></div>';
  }
  function heatmapOf(Z) {
    const h = {}; Object.keys(Z).forEach((k) => { if (Z[k].a) h[k] = { value: heatValue(k, Z[k].pct), key: k }; });
    return h;
  }

  /* ---- les trois familles, dérivées du store ---- */
  const COLL_ATT = COLL_CHRONO.filter((s) => S.playerAvg(s, PID) != null);   // séances collectives suivies
  const PERSO = THEMATIC
    .filter((s) => s.categorie === 'coach' && s.status === 'done' && s.evalCoach && s.evalCoach[PID])
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((s, i) => ({
      i: i, id: s.id, dateISO: s.date, theme: s.theme || s.type || 'Autre', titre: s.titre || 'Séance',
      type: s.type || '', note: s.evalCoach[PID].note, comment: s.evalCoach[PID].comment || '',
      team: (s.avgNote != null ? s.avgNote : null), objectif: s.objectif || '', notes: s.notes || '',
      lieu: s.lieu || '', heure: s.heure || '', duree: s.duree || 0, intensite: s.intensite || '',
    }));
  const PERSO_THEMES = []; PERSO.forEach((s) => { if (PERSO_THEMES.indexOf(s.theme) === -1) PERSO_THEMES.push(s.theme); });
  const TRAIN = {
    tirs: { vals: SHOOT.sessions.map((s) => s.pct), unit: ' %', seuil: 1.5, avgRef: SHOOT.kpi.pct },
    collectifs: { vals: COLL_ATT.map((s) => S.playerAvg(s, PID)), unit: '', seuil: 0.3, avgRef: playerColl.noteAvg },
    perso: { vals: PERSO.map((s) => s.note), unit: '', seuil: 0.3 },
  };

  /* ---- 2. vue globale : une carte de synthèse par famille ---- */
  function ovStats(vals, seuil, avgRef) {
    if (!vals.length) return null;
    // avgRef : moyenne de référence du store quand elle est pondérée par le volume
    // (réussite au tir = total réussis / total tentés), sinon moyenne des séances.
    const n = vals.length, avg = avgRef != null ? avgRef : round1(mean(vals)), k = Math.min(5, n);
    return {
      n: n, last: vals[n - 1], avg: avg, best: Math.max.apply(null, vals), k: k,
      recent: round1(mean(vals.slice(-k)) - avg), trend: trend(vals, seuil),
      spark: vals.slice(-Math.min(12, n)),
    };
  }
  // n premiers / n derniers d'un classement, sans jamais se chevaucher
  function topBottom(list, n) {
    return [list.slice(0, n), list.slice(Math.max(n, list.length - n)).reverse()];
  }
  function ovRow(k, v, cls) {
    return '<div class="pt-ov-row"><span>' + k + '</span><b' + (cls && cls !== 'flat' ? ' class="' + cls + '"' : '') + '>' + v + '</b></div>';
  }
  function ovCard(cat, label, sub, empty) {
    const T = TRAIN[cat], st = ovStats(T.vals, T.seuil, T.avgRef);
    if (!st) return '<div class="pt-ov-card"><div class="pt-ov-cat">' + label + '</div><p class="pt-empty">' + empty + '</p></div>';
    const d = dirOf(st.recent, T.seuil);
    const col = d === 'up' ? 'var(--win)' : d === 'down' ? 'var(--loss)' : 'var(--orange)';
    return '<button type="button" class="pt-ov-card" data-ptcat="' + cat + '">'
      + '<div class="pt-ov-top"><div><div class="pt-ov-cat">' + label + '</div><div class="pt-ov-sub">' + sub + '</div></div>' + trendBadge(st.trend, T.unit) + '</div>'
      + '<div class="pt-ov-now"><span class="pt-ov-val">' + fr(st.last) + T.unit + '</span><span class="pt-ov-unit">niveau actuel · dernière séance</span></div>'
      + sparkline(st.spark, col)
      + '<div class="pt-ov-rows">'
      + ovRow('Moyenne saison', fr(st.avg) + T.unit)
      + ovRow('Meilleure séance', fr(st.best) + T.unit)
      + ovRow(st.k + ' dernières séances', frS(st.recent) + T.unit, d)
      + '</div></button>';
  }

  /* ---- 1 + 3. hero, vue globale et les trois grands boutons ---- */
  function renderTraining() {
    const total = SHOOT.sessions.length + COLL_ATT.length + PERSO.length;
    $('#pane-training').innerHTML =
      '<header class="tr2-hero pt-hero"><h1 class="tr2-hero-t">Entraînement</h1>'
      + '<p class="tr2-hero-s">' + esc(player.name) + ' · ' + esc(club.nom) + ' · Saison ' + esc(tournoi.saison) + '</p></header>'
      + '<section class="tr2-panel tr2-panel-wide">'
      + '<div class="tr2-panel-head"><h2 class="tr2-h2">Vue globale de mes entraînements</h2>'
      + '<div class="tr2-panel-sub">' + total + ' séances suivies cette saison · niveau actuel, moyenne et tendance par famille</div></div>'
      + '<div class="pt-ov">'
      + ovCard('tirs', 'Tirs', SHOOT.sessions.length + ' séances · réussite globale', 'Aucune séance de tir jouée.')
      + ovCard('collectifs', 'Collectifs', COLL_ATT.length + ' séances suivies · note du staff sur 10', 'Aucune séance collective notée.')
      + ovCard('perso', 'Personnalisés', PERSO.length + ' séances · note du coach sur 10', 'Aucune séance personnalisée notée.')
      + '</div></section>'
      + '<nav class="tr2-nav" aria-label="Familles d’entraînement">'
      + PT_CATS.map((c) => '<button type="button" class="tr2-navbtn' + (trainCat === c[0] ? ' on' : '') + '" data-ptcat="' + c[0] + '">' + c[1] + '</button>').join('')
      + '</nav><div id="pt-detail"></div>';
    renderTrainCat();
  }
  function setTrainCat(cat, scroll) {
    const c = PT_ALIAS[cat] || cat;
    if (!TRAIN[c]) return;
    trainCat = c;
    $$('#pane-training .tr2-navbtn').forEach((b) => b.classList.toggle('on', b.dataset.ptcat === c));
    renderTrainCat();
    if (scroll) { const d = $('#pt-detail'); if (d) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  function renderTrainCat() {
    const box = $('#pt-detail'); if (!box) return;
    if (trainCat === 'collectifs') renderCatCollectifs(box);
    else if (trainCat === 'perso') renderCatPerso(box);
    else renderCatTirs(box);
  }
  function rankRow(label, meta, val, delta, seuil, cls) {
    const d = delta == null ? '' : '<span class="d ' + dirOf(delta, seuil) + '">' + frS(delta) + '</span>';
    return '<div class="pt-rank-row ' + (cls || '') + '"><span class="lab">' + esc(label) + (meta ? '<small>' + meta + '</small>' : '') + '</span>'
      + '<span class="val">' + val + d + '</span></div>';
  }
  function rankPanel(title, note, rows) {
    return '<section class="tr2-panel"><div class="tr2-panel-head"><h2 class="tr2-h2">' + title + '</h2></div>'
      + '<div class="pt-rank">' + (rows || '<p class="pt-empty">Pas encore assez de données.</p>') + '</div>'
      + (note ? '<p class="pt-note">' + note + '</p>' : '') + '</section>';
  }

  /* ============================================================
     6a. TIRS — carte de tir, évolution de l'adresse, zones fortes
         et faibles, transfert en match, historique des séances
     ============================================================ */
  const TIR_PERIODS = [['Saison', 0], ['10 dernières', 10], ['5 dernières', 5], ['Dernière séance', 1]];
  let tirPeriod = 0, tirZone = null, tirShown = 6;
  function tirSubset() { return tirPeriod ? SHOOT.sessions.slice(-tirPeriod) : SHOOT.sessions; }
  function tirPeriodLabel() { const p = TIR_PERIODS.filter((x) => x[1] === tirPeriod)[0]; return p ? p[0].toLowerCase() : 'saison'; }

  function renderCatTirs(box) {
    const sess = SHOOT.sessions;
    if (!sess.length) { box.innerHTML = '<section class="tr2-panel"><p class="pt-empty">Aucune séance de tir enregistrée pour le moment.</p></section>'; return; }
    const K = SHOOT.kpi, vals = TRAIN.tirs.vals, t = trend(vals, 1.5);
    const rec5 = zonesOf(sess.slice(-5));
    const zdelta = (zid) => ((rec5[zid] && rec5[zid].a && SHOOT.byZone[zid]) ? round1(rec5[zid].pct - SHOOT.byZone[zid].pct) : null);
    const ranked = Object.keys(SHOOT.byZone).filter((z) => SHOOT.byZone[z].a >= 10)
      .map((z) => ({ id: z, pct: SHOOT.byZone[z].pct, m: SHOOT.byZone[z].m, a: SHOOT.byZone[z].a, v: heatValue(z, SHOOT.byZone[z].pct) }))
      .sort((a, b) => b.v - a.v);
    const tb = topBottom(ranked, 3), forts = tb[0], faibles = tb[1];
    const zRow = (z, cls) => rankRow(zoneLabel(z.id), z.m + '/' + z.a, fr(z.pct) + ' %', zdelta(z.id), 1.5, cls);

    box.innerHTML =
      // carte de tir interactive + résumé de la période
      '<section class="tr2-panel tr2-panel-wide"><div class="tr2-panel-head">'
      + '<h2 class="tr2-h2">Ma carte de tir</h2>'
      + '<div class="tr2-panel-sub">Ma réussite zone par zone sur les séances de tir'
      + '<span class="tr2-legend"><i class="lo"></i>zone faible<i class="lm"></i>moyenne<i class="lh"></i>efficace</span></div></div>'
      + '<div class="tr2-filters"><div class="tr2-chips" id="tirPer"></div></div>'
      + '<div class="tr2-court-wide"><div class="tr2-court" id="tirCourt"></div>'
      + '<div class="tr2-court-side"><div id="tirSum"></div><div id="tirZone"></div></div></div></section>'
      // évolution de l'adresse
      + '<section class="tr2-panel tr2-panel-wide"><div class="tr2-panel-head">'
      + '<h2 class="tr2-h2">Évolution de mon adresse</h2>'
      + '<div class="tr2-panel-sub">Réussite globale, séance après séance ' + trendBadge(t, ' %') + '</div></div>'
      + lineChart(vals, { h: 170, unit: '%', labels: sess.map((s, i) => ((i % 3 === 0 || i === sess.length - 1) ? fmtDate(s.date) : '')) })
      + '<p class="pt-note">Moyenne de la saison <b>' + fr(K.pct) + ' %</b> (' + K.made + '/' + K.att + ') · '
      + 'à 2 points <b>' + fr(K.p2) + ' %</b> (' + K.m2 + '/' + K.a2 + ') · à 3 points <b>' + fr(K.p3) + ' %</b> (' + K.m3 + '/' + K.a3 + ').</p></section>'
      // points forts / points à améliorer — classés comme chez le coach, au regard
      // du standard attendu à cette distance (un 3 pts à 40 % vaut un 2 pts à 65 %)
      + '<div class="pt-two">'
      + rankPanel('Mes points forts', 'Classement au regard du standard attendu à cette distance : un 3 points à 40 % vaut un 2 points à 65 %. L’écart affiché compare mes 5 dernières séances à ma moyenne de la saison.',
        forts.map((z) => zRow(z, 'good')).join(''))
      + rankPanel('À travailler', 'Les secteurs les plus en retard sur le standard attendu à cette distance — les prochains chantiers avec le staff.',
        faibles.map((z) => zRow(z, 'bad')).join(''))
      + '</div>'
      // transfert entraînement -> match
      + tirVsMatch(profile.training.vsMatch)
      // historique
      + '<div class="pt-sec">Historique de mes séances de tir</div><div id="tirHist"></div>';
    paintTirCourt();
    paintTirHist();
  }
  function paintTirCourt() {
    const chips = $('#tirPer'), courtEl = $('#tirCourt'), sumEl = $('#tirSum'), zoneEl = $('#tirZone');
    if (!chips || !courtEl) return;
    chips.innerHTML = TIR_PERIODS.map((p) => '<button type="button" class="tr2-chip' + (tirPeriod === p[1] ? ' on' : '') + '" data-tirper="' + p[1] + '">' + p[0] + '</button>').join('');
    const Z = zonesOf(tirSubset()), ids = Object.keys(Z).filter((k) => Z[k].a);
    let hi = null, lo = null, m = 0, a = 0, ms = 0, as = 0;
    ids.forEach((k) => {
      const v = heatValue(k, Z[k].pct); m += Z[k].m; a += Z[k].a;
      if (!hi || v > hi.v) hi = { id: k, v: v };
      if (!lo || v < lo.v) lo = { id: k, v: v };
      /* référence saison calculée sur LES MÊMES zones que la période affichée :
         comparer une séance de 3 pts à la moyenne toutes zones n'aurait aucun sens */
      if (SHOOT.byZone[k]) { ms += SHOOT.byZone[k].m; as += SHOOT.byZone[k].a; }
    });
    const tot = pctOf(m, a), totS = pctOf(ms, as), d = round1(tot - totS);
    sumEl.innerHTML = '<div class="tr2-sum">'
      + sumRow('Réussite ' + tirPeriodLabel(), fr(tot) + ' % <i>(' + m + '/' + a + ')</i>')
      + (tirPeriod ? sumRow('Ma moyenne de la saison <i>(mêmes zones)</i>', fr(totS) + ' % <i>(' + ms + '/' + as + ')</i>') + sumRow('Écart', frS(d) + ' %', dirOf(d, 1.5)) : '')
      + (hi ? sumRow('Zone forte', esc(zoneLabel(hi.id)) + ' · ' + fr(Z[hi.id].pct) + ' %') : '')
      + (lo ? sumRow('Zone à travailler', esc(zoneLabel(lo.id)) + ' · ' + fr(Z[lo.id].pct) + ' %') : '')
      + '</div>';
    zoneEl.innerHTML = tirZonePanel(tirZone, Z);
    if (Court) {
      Court.render(courtEl, {
        mode: 'analysis', heatmap: heatmapOf(Z), selectedZoneId: tirZone,
        onZoneSelect: (z) => {
          tirZone = (z.id === 'out-of-bounds') ? null : z.id;
          const box = $('#tirZone'); if (box) box.innerHTML = tirZonePanel(tirZone, zonesOf(tirSubset()));
        },
      });
    }
  }
  function tirZonePanel(zid, Z) {
    if (!zid) return '<div class="tr2-zone empty">Touche une zone du terrain pour voir le détail : réussite, volume, évolution récente et comparaison avec tes matchs.</div>';
    const z = Z[zid];
    if (!z || !z.a) {
      return '<div class="tr2-zone"><div class="tr2-zone-t">' + esc(zoneLabel(zid)) + '</div>'
        + '<p class="pt-empty">Aucun tir enregistré dans cette zone sur la période choisie.</p></div>';
    }
    const ref = SHOOT.byZone[zid], rec = zonesOf(SHOOT.sessions.slice(-5))[zid];
    const d = (rec && rec.a && ref && ref.a) ? round1(rec.pct - ref.pct) : null;
    const v = heatValue(zid, z.pct), cls = v >= 0.66 ? 'win' : (v <= 0.33 ? 'loss' : 'neutral');
    const mz = profile.matchZones ? profile.matchZones[ZONE18_TO_8[zid]] : null;
    return '<div class="tr2-zone"><div class="tr2-zone-t">' + esc(zoneLabel(zid)) + '</div>'
      + '<div class="tr2-zone-big"><span class="tr2-zone-made">' + z.m + ' / ' + z.a + '</span>'
      + '<span class="tr2-zone-pct ' + cls + '">' + fr(z.pct) + ' %</span></div>'
      + (d != null ? '<div class="tr2-zone-evo ' + dirOf(d, 1.5) + '">' + frS(d) + ' % sur mes 5 dernières séances</div>' : '')
      + (mz ? '<div class="tr2-zone-best"><span>Ma réussite en match sur ce secteur</span><b>' + fr(mz.pct) + ' % (' + mz.reussis + '/' + mz.tentes + ')</b></div>' : '')
      + '</div>';
  }
  function tirVsMatch(vm) {
    if (!vm || !vm.rows || !vm.rows.length) return '';
    return '<section class="tr2-panel tr2-panel-wide"><div class="tr2-panel-head">'
      + '<h2 class="tr2-h2">Ce que ça donne en match</h2>'
      + '<div class="tr2-panel-sub">Ma réussite à l’entraînement comparée à ma réussite en match, secteur par secteur</div></div>'
      + '<div class="pt-legend"><span><i class="tr"></i>entraînement</span><span><i class="mt"></i>match</span></div>'
      + '<div class="pt-cmp">' + vm.rows.map(cmpZoneRow).join('') + '</div>'
      + '<p class="pt-note">Global : <b>' + fr(vm.trainGlobal) + ' %</b> à l’entraînement contre <b>' + fr(vm.matchGlobal) + ' %</b> en match'
      + (vm.ecart != null ? ' — soit <b>' + frS(-vm.ecart) + ' pts</b> en match.' : '.')
      + ' Un écart positif en match veut dire que le travail se transfère bien sous pression.</p></section>';
  }
  function cmpZoneRow(r) {
    const max = Math.max(r.train, r.match, 1), gain = round1(-r.ecart);
    return '<div class="pt-cmp-row"><span>' + esc(r.label) + '</span>'
      + '<span class="pt-cmp-val ' + dirOf(gain, 1.5) + '">' + frS(gain) + ' pts en match</span>'
      + '<span class="pt-cmp-bars">'
      + '<span class="pt-cmp-track"><span class="pt-cmp-fill tr" style="width:' + (r.train / max * 100).toFixed(1) + '%"></span></span>'
      + '<span class="pt-cmp-track"><span class="pt-cmp-fill mt" style="width:' + (r.match / max * 100).toFixed(1) + '%"></span></span>'
      + '</span></div>';
  }
  function paintTirHist() {
    const el = $('#tirHist'); if (!el) return;
    const list = SHOOT.sessions.slice().reverse(), shown = list.slice(0, tirShown);
    el.innerHTML = '<div class="pt-list">' + shown.map(tirSessCard).join('') + '</div>'
      + (list.length > shown.length ? '<button type="button" class="pt-more" data-ptmore="tirs">Voir plus de séances (' + (list.length - shown.length) + ')</button>' : '');
  }
  function tirSessCard(s) {
    const nz = Object.keys(s.zones).length;
    const cls = s.pct >= 50 ? 'win' : (s.pct >= 35 ? '' : 'loss');
    const vsTeam = s.teamPct != null ? round1(s.pct - s.teamPct) : null;
    return '<button type="button" class="pt-sess" data-ptsess="tir:' + esc(s.id) + '">'
      + '<div class="pt-sess-top"><div><div class="pt-sess-t">' + esc(s.focus) + '</div>'
      + '<div class="pt-sess-m">Séance de tir · ' + fmtDate(s.date, true) + (s.heure ? ' · ' + esc(s.heure) : '') + (s.duree ? ' · ' + s.duree + ' min' : '') + '</div></div>'
      + '<span class="pt-sess-badge ' + cls + '">' + fr(s.pct) + ' %</span></div>'
      + '<div class="pt-sess-stats"><span class="pt-chip hot">' + s.made + '/' + s.att + ' au tir</span>'
      + '<span class="pt-chip">' + nz + ' zone' + (nz > 1 ? 's' : '') + ' travaillée' + (nz > 1 ? 's' : '') + '</span>'
      + (vsTeam != null ? '<span class="pt-chip ' + dirOf(vsTeam, 1.5) + '">' + frS(vsTeam) + ' pts vs équipe</span>' : '')
      + (s.intensite ? '<span class="pt-chip">Intensité ' + esc(s.intensite) + '</span>' : '')
      + '</div>'
      + (s.objectif ? '<div class="pt-sess-q">Objectif du coach : ' + esc(s.objectif) + '</div>' : '')
      + '<div class="pt-sess-go">Voir le détail de la séance</div></button>';
  }

  /* ============================================================
     6b. COLLECTIFS — évolution des notes du staff, critères,
         points forts / à améliorer, mot du coach, historique
     ============================================================ */
  let collShown = 8;
  function renderCatCollectifs(box) {
    const vals = TRAIN.collectifs.vals;
    if (!COLL_ATT.length) { box.innerHTML = '<section class="tr2-panel"><p class="pt-empty">Aucune séance collective notée pour le moment.</p></section>'; return; }
    const t = trend(vals, 0.3);
    const teamVals = COLL_ATT.map((s) => S.collectifAvg(s));
    const teamAvg = round1(mean(teamVals));
    const k = Math.min(5, vals.length);
    const recent = round1(mean(vals.slice(-k)) - playerColl.noteAvg);
    const last5 = COLL_ATT.slice(-k);
    const crit = S.playerCriteria().map((c) => ({
      key: c.key, label: c.label,
      val: playerColl.critAvg[c.key],
      d: round1(mean(last5.map((s) => s.eval.joueurs[PID][c.key])) - playerColl.critAvg[c.key]),
    }));
    const sorted = crit.slice().sort((a, b) => b.val - a.val);
    const withCoach = COLLECTIFS.filter((s) => s.eval && s.eval.noteCoach)[0];

    box.innerHTML =
      // évolution des notes + résumé
      '<section class="tr2-panel tr2-panel-wide"><div class="tr2-panel-head">'
      + '<h2 class="tr2-h2">Évolution de mes notes</h2>'
      + '<div class="tr2-panel-sub">Note du staff sur 10, séance après séance ' + trendBadge(t, '') + '</div></div>'
      + lineChart(vals, { h: 170, min: 4, max: 10, labels: COLL_ATT.map((s, i) => ((i % Math.ceil(COLL_ATT.length / 7) === 0 || i === COLL_ATT.length - 1) ? fmtDate(s.date) : '')) })
      + '<div class="tr2-sum" style="margin-top:16px">'
      + sumRow('Ma moyenne de la saison', fr(playerColl.noteAvg) + ' <i>/10</i>')
      + sumRow('Mes ' + k + ' dernières séances', frS(recent), dirOf(recent, 0.3))
      + sumRow('Moyenne du groupe', fr(teamAvg) + ' <i>/10</i>')
      + sumRow('Écart avec le groupe', frS(round1(playerColl.noteAvg - teamAvg)), dirOf(round1(playerColl.noteAvg - teamAvg), 0.3))
      + sumRow('Meilleure séance', fr(Math.max.apply(null, vals)) + ' <i>/10</i>')
      + sumRow('Présence', playerColl.presenceRate + ' % <i>(' + playerColl.attended + '/' + playerColl.doneCount + ')</i>')
      + '</div></section>'
      // critères + lecture du coach
      + '<div class="pt-two">'
      + '<section class="tr2-panel"><div class="tr2-panel-head"><h2 class="tr2-h2">Mes moyennes par critère</h2>'
      + '<div class="tr2-panel-sub">Le staff note chaque séance sur ces 5 critères</div></div>'
      + '<div class="crit-rows">' + crit.map((c) => critRow(c.label, c.val)).join('') + '</div></section>'
      + '<section class="tr2-panel"><div class="tr2-panel-head"><h2 class="tr2-h2">Points forts &amp; à améliorer</h2>'
      + '<div class="tr2-panel-sub">Écart de mes ' + k + ' dernières séances par rapport à ma moyenne</div></div>'
      + '<div class="pt-rank">'
      + sorted.slice(0, 2).map((c) => rankRow(c.label, '', fr(c.val) + '/10', c.d, 0.3, 'good')).join('')
      + sorted.slice(-2).reverse().map((c) => rankRow(c.label, '', fr(c.val) + '/10', c.d, 0.3, 'bad')).join('')
      + '</div>'
      + (withCoach ? '<div class="pt-sess-q" style="margin-top:14px">« ' + esc(withCoach.eval.noteCoach) + ' »<br><small style="font-style:normal;color:var(--t4)">Le mot du coach · ' + fmtDate(withCoach.date) + '</small></div>' : '')
      + '</section></div>'
      // historique
      + '<div class="pt-sec">Historique de mes séances collectives</div><div id="collHist"></div>';
    paintCollHist();
    requestAnimationFrame(() => $$('#pt-detail .crit-fill').forEach((f) => (f.style.width = f.style.width)));
  }
  function paintCollHist() {
    const el = $('#collHist'); if (!el) return;
    const list = COLLECTIFS, shown = list.slice(0, collShown);
    el.innerHTML = '<div class="pt-list">' + shown.map(collSessCard).join('') + '</div>'
      + (list.length > shown.length ? '<button type="button" class="pt-more" data-ptmore="collectifs">Voir plus de séances (' + (list.length - shown.length) + ')</button>' : '');
  }
  function collSessCard(s) {
    const note = S.playerAvg(s, PID), team = S.collectifAvg(s);
    const d = note != null ? round1(note - team) : null;
    const cls = note == null ? 'off' : (note >= 8 ? 'win' : (note >= 6 ? '' : 'loss'));
    let extremes = '';
    if (note != null) {
      const j = s.eval.joueurs[PID];
      const l = S.playerCriteria().map((c) => ({ label: c.label, v: j[c.key] })).sort((a, b) => b.v - a.v);
      extremes = '<span class="pt-chip up">' + esc(l[0].label) + ' ' + fr(l[0].v) + '</span>'
        + '<span class="pt-chip down">' + esc(l[l.length - 1].label) + ' ' + fr(l[l.length - 1].v) + '</span>';
    }
    return '<button type="button" class="pt-sess" data-ptsess="coll:' + esc(s.id) + '">'
      + '<div class="pt-sess-top"><div><div class="pt-sess-t">' + esc(s.titre || 'Entraînement collectif') + '</div>'
      + '<div class="pt-sess-m">Séance collective · ' + fmtDate(s.date, true) + (s.heure ? ' · ' + esc(s.heure) : '') + (s.duree ? ' · ' + s.duree + ' min' : '') + (s.lieu ? ' · ' + esc(s.lieu) : '') + '</div></div>'
      + '<span class="pt-sess-badge ' + cls + '">' + (note != null ? fr(note) + '/10' : 'Absent') + '</span></div>'
      + '<div class="pt-sess-stats"><span class="pt-chip hot">Groupe ' + fr(team) + '/10</span>'
      + (d != null ? '<span class="pt-chip ' + dirOf(d, 0.3) + '">' + frS(d) + ' vs groupe</span>' : '')
      + extremes + '</div>'
      + (s.eval.noteCoach ? '<div class="pt-sess-q">« ' + esc(s.eval.noteCoach) + ' »</div>' : '')
      + '<div class="pt-sess-go">Voir le détail de la séance</div></button>';
  }

  /* ============================================================
     6c. PERSONNALISÉS — progression par objectif travaillé,
         comparaison au groupe, historique des séances
     ============================================================ */
  let persoActive = null, persoShown = 8;
  function persoByTheme() {
    return PERSO_THEMES.map((th) => {
      const l = PERSO.filter((s) => s.theme === th), v = l.map((s) => s.note);
      const teams = l.filter((s) => s.team != null).map((s) => s.team);
      return {
        theme: th, n: l.length, avg: round1(mean(v)), last: v[v.length - 1], first: v[0],
        delta: round1(v[v.length - 1] - v[0]), best: Math.max.apply(null, v),
        team: teams.length ? round1(mean(teams)) : null, dateISO: l[l.length - 1].dateISO,
      };
    });
  }
  function renderCatPerso(box) {
    const vals = TRAIN.perso.vals;
    if (!PERSO.length) { box.innerHTML = '<section class="tr2-panel"><p class="pt-empty">Aucune séance personnalisée notée pour le moment.</p></section>'; return; }
    if (!persoActive) persoActive = PERSO_THEMES.slice(0, 2);
    const t = trend(vals, 0.3), avg = round1(mean(vals)), k = Math.min(5, vals.length);
    const teams = PERSO.filter((s) => s.team != null).map((s) => s.team);
    const teamAvg = teams.length ? round1(mean(teams)) : null;
    const byTheme = persoByTheme();
    const progTB = topBottom(byTheme.slice().sort((a, b) => b.delta - a.delta), 3);
    const tRow = (x, cls) => rankRow(x.theme, x.n + ' séances · moy. ' + fr(x.avg), fr(x.last) + '/10', x.delta, 0.3, cls);

    box.innerHTML =
      // évolution par objectif travaillé
      '<section class="tr2-panel tr2-panel-wide"><div class="tr2-panel-head">'
      + '<h2 class="tr2-h2">Progression par objectif</h2>'
      + '<div class="tr2-panel-sub">Note du coach sur 10, par catégorie de séance ' + trendBadge(t, '') + '</div></div>'
      + '<div class="tr2-chart" id="perChart"></div><div class="tr2-toggles" id="perKeys"></div>'
      + '<div class="tr2-sum" style="margin-top:16px">'
      + sumRow('Ma moyenne de la saison', fr(avg) + ' <i>/10</i>')
      + sumRow('Dernière séance', fr(vals[vals.length - 1]) + ' <i>/10 · ' + fmtDate(PERSO[PERSO.length - 1].dateISO) + '</i>')
      + sumRow('Mes ' + k + ' dernières séances', frS(round1(mean(vals.slice(-k)) - avg)), dirOf(round1(mean(vals.slice(-k)) - avg), 0.3))
      + sumRow('Meilleure séance', fr(Math.max.apply(null, vals)) + ' <i>/10</i>')
      + (teamAvg != null ? sumRow('Écart avec le groupe', frS(round1(avg - teamAvg)) + ' <i>(groupe ' + fr(teamAvg) + ')</i>', dirOf(round1(avg - teamAvg), 0.3)) : '')
      + sumRow('Objectifs travaillés', PERSO_THEMES.length + ' catégories')
      + '</div></section>'
      // objectifs en progression / à consolider
      + '<div class="pt-two">'
      + rankPanel('Objectifs en progression', 'Écart entre ma première et ma dernière séance sur cet objectif.',
        progTB[0].map((x) => tRow(x, 'good')).join(''))
      + rankPanel('Objectifs à consolider', 'Ces thèmes n’ont pas encore décollé : ce sont les prochains chantiers.',
        progTB[1].map((x) => tRow(x, 'bad')).join(''))
      + '</div>'
      // historique
      + '<div class="pt-sec">Historique de mes séances personnalisées</div><div id="perHist"></div>';
    paintPersoChart();
    paintPersoHist();
  }
  function paintPersoChart() {
    const c = $('#perChart'), k = $('#perKeys'); if (!c || !k) return;
    c.innerHTML = persoChart(persoActive);
    k.innerHTML = PERSO_THEMES.map((th, i) => '<button type="button" class="tr2-key' + (persoActive.indexOf(th) !== -1 ? ' on' : '') + '" data-ptheme="' + esc(th) + '">'
      + '<i style="background:' + PT_THEME_COLORS[i % PT_THEME_COLORS.length] + '"></i>' + esc(th) + '</button>').join('');
  }
  function persoChart(active) {
    const n = PERSO.length;
    if (n < 2) return '<p class="pt-empty">Pas encore assez de séances notées pour tracer une évolution.</p>';
    const W = 680, H = 280, pl = 30, pr = 14, pt = 14, pb = 26;
    const X = (i) => pl + (i / (n - 1)) * (W - pl - pr), Y = (v) => H - pb - (v / 10) * (H - pt - pb);
    const grid = [0, 2, 4, 6, 8, 10].map((v) => '<line x1="' + pl + '" y1="' + Y(v).toFixed(1) + '" x2="' + (W - pr) + '" y2="' + Y(v).toFixed(1) + '" class="rc-grid"/>'
      + '<text x="' + (pl - 6) + '" y="' + (Y(v) + 3.5).toFixed(1) + '" class="rc-yl">' + v + '</text>').join('');
    const step = Math.max(1, Math.ceil(n / 6));
    const xl = PERSO.map((s, i) => ((i % step === 0 || i === n - 1) ? '<text x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" class="rc-xl">' + esc(fmtDate(s.dateISO)) + '</text>' : '')).join('');
    const paths = PERSO_THEMES.filter((th) => active.indexOf(th) !== -1).map((th) => {
      const col = PT_THEME_COLORS[PERSO_THEMES.indexOf(th) % PT_THEME_COLORS.length];
      /* on relie entre eux les points d'une même catégorie : les séances des
         autres catégories ne coupent pas la courbe */
      const pts = PERSO.map((s, i) => ({ i: i, v: s.theme === th ? s.note : null })).filter((p) => p.v != null);
      const d = pts.map((p, j) => (j ? 'L' : 'M') + X(p.i).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
      const dots = pts.map((p) => '<circle cx="' + X(p.i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3.6" fill="' + col + '"/>').join('');
      return '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' + dots;
    }).join('');
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="rc-svg tr2-svg" preserveAspectRatio="none" role="img" aria-label="Évolution de mes séances personnalisées">'
      + grid + xl + paths + '</svg>';
  }
  function paintPersoHist() {
    const el = $('#perHist'); if (!el) return;
    const list = PERSO.slice().reverse(), shown = list.slice(0, persoShown);
    el.innerHTML = '<div class="pt-list">' + shown.map(persoSessCard).join('') + '</div>'
      + (list.length > shown.length ? '<button type="button" class="pt-more" data-ptmore="perso">Voir plus de séances (' + (list.length - shown.length) + ')</button>' : '');
  }
  function persoSessCard(s) {
    const d = s.team != null ? round1(s.note - s.team) : null;
    const cls = s.note >= 8 ? 'win' : (s.note >= 6 ? '' : 'loss');
    return '<button type="button" class="pt-sess" data-ptsess="perso:' + esc(s.id) + '">'
      + '<div class="pt-sess-top"><div><div class="pt-sess-t">' + esc(s.titre) + '</div>'
      + '<div class="pt-sess-m">' + esc(s.theme) + ' · ' + fmtDate(s.dateISO, true) + (s.heure ? ' · ' + esc(s.heure) : '') + (s.duree ? ' · ' + s.duree + ' min' : '') + '</div></div>'
      + '<span class="pt-sess-badge ' + cls + '">' + fr(s.note) + '/10</span></div>'
      + '<div class="pt-sess-stats"><span class="pt-chip hot">' + esc(s.theme) + '</span>'
      + (s.team != null ? '<span class="pt-chip">Groupe ' + fr(s.team) + '/10</span>' : '')
      + (d != null ? '<span class="pt-chip ' + dirOf(d, 0.3) + '">' + frS(d) + ' vs groupe</span>' : '')
      + (s.intensite ? '<span class="pt-chip">Intensité ' + esc(s.intensite) + '</span>' : '')
      + '</div>'
      + (s.comment ? '<div class="pt-sess-q">« ' + esc(s.comment) + ' »</div>' : (s.objectif ? '<div class="pt-sess-q">Objectif du coach : ' + esc(s.objectif) + '</div>' : ''))
      + '<div class="pt-sess-go">Voir le détail de la séance</div></button>';
  }

  /* ============================================================
     6d. DÉTAIL COMPLET D'UNE SÉANCE (modal .sheet réutilisée)
     ============================================================ */
  const PT_MORE_STEP = { tirs: 6, collectifs: 8, perso: 8 };
  function ptMore(cat) {
    if (cat === 'tirs') { tirShown += PT_MORE_STEP.tirs; paintTirHist(); }
    else if (cat === 'collectifs') { collShown += PT_MORE_STEP.collectifs; paintCollHist(); }
    else if (cat === 'perso') { persoShown += PT_MORE_STEP.perso; paintPersoHist(); }
  }
  function togglePersoTheme(th) {
    const i = persoActive.indexOf(th);
    if (i === -1) persoActive.push(th); else if (persoActive.length > 1) persoActive.splice(i, 1);
    paintPersoChart();
  }
  function dlCell(k, v) { return '<div><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }
  function sessHead(eyebrow, titre, meta) {
    return '<div class="sheet-head"><button class="sheet-close" id="sheetClose" aria-label="Fermer">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
      + '<div class="sheet-eyebrow">' + esc(eyebrow) + '</div>'
      + '<div class="sheet-score" style="font-family:var(--cond);font-size:26px;letter-spacing:.02em">' + esc(titre) + '</div>'
      + '<div class="tile-sub" style="margin-top:6px">' + meta + '</div></div>';
  }
  function openSession(kind, id) {
    let html = null, s = null;
    if (kind === 'tir') {
      s = SHOOT.sessions.filter((x) => x.id === id)[0];
      if (s) html = sessHead('Séance de tir · ' + fmtDate(s.date, true),
        s.focus, [s.heure, (s.duree ? s.duree + ' min' : ''), s.lieu, (s.intensite ? 'intensité ' + s.intensite : '')].filter(Boolean).map(esc).join(' · '))
        + '<div class="sheet-body">'
        + '<div class="pt-dl">' + dlCell('Ma réussite', fr(s.pct) + ' %') + dlCell('Paniers', s.made + '/' + s.att)
        + (s.teamPct != null ? dlCell('Équipe', fr(s.teamPct) + ' %') + dlCell('Écart', frS(round1(s.pct - s.teamPct)) + ' pts') : '')
        + (s.reps ? dlCell('Tirs / zone', s.reps) : '') + '</div>'
        + (s.objectif ? '<p class="pt-note" style="margin-bottom:16px"><b>Objectif :</b> ' + esc(s.objectif) + (s.notes ? '<br><b>Déroulé :</b> ' + esc(s.notes) : '') + '</p>' : '')
        + '<div class="tr2-court" id="sessCourt" style="max-width:360px;margin:0 auto 18px"></div>'
        + '<table class="pt-zt"><thead><tr><th>Zone</th><th>Réussis</th><th>Tentés</th><th>%</th><th>Saison</th></tr></thead><tbody>'
        + Object.keys(s.zones).map((zid) => {
          const z = s.zones[zid], ref = SHOOT.byZone[zid];
          return '<tr><td>' + esc(zoneLabel(zid)) + '</td><td>' + z.m + '</td><td>' + z.a + '</td><td>' + fr(z.pct) + ' %</td>'
            + '<td style="color:var(--t4)">' + (ref ? fr(ref.pct) + ' %' : '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else if (kind === 'coll') {
      s = COLLECTIFS.filter((x) => x.id === id)[0];
      if (s) {
        const note = S.playerAvg(s, PID), team = S.collectifAvg(s), j = note != null ? s.eval.joueurs[PID] : null;
        html = sessHead('Séance collective · ' + fmtDate(s.date, true), s.titre || 'Entraînement collectif',
          [s.heure, (s.duree ? s.duree + ' min' : ''), s.lieu].filter(Boolean).map(esc).join(' · '))
          + '<div class="sheet-body">'
          + '<div class="pt-dl">' + dlCell('Ma note', note != null ? fr(note) + '/10' : 'Absent')
          + dlCell('Groupe', fr(team) + '/10')
          + (note != null ? dlCell('Écart', frS(round1(note - team))) : '')
          + dlCell('Présents', Object.keys(s.presence || {}).filter((k) => s.presence[k]).length) + '</div>'
          + (j ? '<div class="sec-head"><span class="sec-title">Mes notes sur cette séance</span></div><div class="crit-rows" style="margin-bottom:18px">'
            + S.playerCriteria().map((c) => critRow(c.label, j[c.key])).join('') + '</div>' : '')
          + '<div class="sec-head"><span class="sec-title">La séance vue par le staff</span></div><div class="crit-rows">'
          + S.collectifCriteria().map((c) => critRow(c.label, s.eval.collectif[c.key])).join('') + '</div>'
          + (s.eval.noteCoach ? '<div class="pt-sess-q" style="margin-top:16px">« ' + esc(s.eval.noteCoach) + ' »</div>' : '')
          + '</div>';
      }
    } else {
      s = PERSO.filter((x) => x.id === id)[0];
      if (s) html = sessHead(esc(s.theme) + ' · ' + fmtDate(s.dateISO, true), s.titre,
        [s.type, s.heure, (s.duree ? s.duree + ' min' : ''), s.lieu, (s.intensite ? 'intensité ' + s.intensite : '')].filter(Boolean).map(esc).join(' · '))
        + '<div class="sheet-body">'
        + '<div class="pt-dl">' + dlCell('Ma note', fr(s.note) + '/10')
        + (s.team != null ? dlCell('Groupe', fr(s.team) + '/10') + dlCell('Écart', frS(round1(s.note - s.team))) : '')
        + dlCell('Objectif', esc(s.theme)) + '</div>'
        + (s.objectif ? '<p class="pt-note" style="margin-bottom:14px"><b>Objectif :</b> ' + esc(s.objectif) + '</p>' : '')
        + (s.notes ? '<p class="pt-note" style="margin-bottom:14px"><b>Déroulé :</b> ' + esc(s.notes) + '</p>' : '')
        + (s.comment ? '<div class="pt-sess-q">« ' + esc(s.comment) + ' »</div>' : '')
        + '</div>';
    }
    if (!html) return;
    $('#sheetBox').innerHTML = html;
    $('#sheetOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    if (kind === 'tir' && Court) {
      const c = $('#sessCourt');
      if (c) Court.render(c, { mode: 'readonly', heatmap: heatmapOf(s.zones), highlightZones: Object.keys(s.zones) });
    }
  }

  /* ============================================================
     7. VUE — GAME CENTER
     ------------------------------------------------------------
     Une seule page qui se lit de haut en bas, dans le langage visuel
     des pages du coach : hero centré (.tr2-hero), grands panneaux
     (.tr2-panel), chips (.tr2-chip), carte de tir (.tr2-court-wide),
     résumés (.tr2-sum). Ordre : hero → période → statistiques →
     carte de tir → évolution → records → matchs.

     UN SEUL sélecteur de période (saison / 10 derniers / 5 derniers)
     pilote tout ce qui est affiché : statistiques, carte de tir,
     graphique et liste des matchs.

     Aucune donnée nouvelle : tout vient de HoopStore — le match log
     (LOG), les moyennes officielles de la saison (H) et les zones de
     tir par match (getPlayerGame), la même source que la carte de tir
     du détail d'un match. Seules l'agrégation et la mise en forme
     changent.
     ============================================================ */
  const GC_PERIODS = [['saison', 'Saison'], ['10', '10 derniers'], ['5', '5 derniers']];
  const ZONE8_LAB = {
    RAQUETTE: 'Raquette', MI_DISTANCE_GAUCHE: 'Mi-distance gauche', MI_DISTANCE_CENTRE: 'Mi-distance centre',
    MI_DISTANCE_DROITE: 'Mi-distance droite', CORNER_3_GAUCHE: 'Corner 3 gauche', CORNER_3_DROIT: 'Corner 3 droit',
    TOP_KEY_GAUCHE: 'Aile 3 gauche', TOP_KEY_DROIT: 'Aile 3 droite',
  };
  /* Statistiques du graphique — « Évaluation » a remplacé « Points » comme
     statistique principale : elle résume l'ensemble de la feuille de match. */
  const GC_STATS = [
    { key: 'eva', label: 'Évaluation', unit: '', val: (g) => g.eva, avg: H.eva },
    { key: 'reb', label: 'Rebonds', unit: '', val: (g) => g.reb, avg: H.reb },
    { key: 'pd', label: 'Passes déc.', unit: '', val: (g) => g.pd, avg: H.pd },
    { key: 'p3m', label: 'Paniers à 3 pts', unit: '', val: (g) => g.p3m, avg: round1(mean(LOG.map((g) => g.p3m))) },
    { key: 'min', label: 'Minutes', unit: '', val: (g) => g.min, avg: H.min },
  ];
  let gcPeriod = 'saison', gcStat = 'eva', gcShown = 6, gcZone = null;

  const gcDef = () => GC_STATS.filter((s) => s.key === gcStat)[0] || GC_STATS[0];
  function gcGames() { return gcPeriod === 'saison' ? LOG.slice() : LOG.slice(-Number(gcPeriod)); }
  const gcPeriodLabel = () => (gcPeriod === 'saison' ? 'Saison complète' : gcPeriod + ' derniers matchs');

  /* ---- 7a. Agrégation d'une période (moyennes + adresse cumulée) ---- */
  function gcAgg(games) {
    const a = (k) => (games.length ? round1(mean(games.map((g) => g[k]))) : 0);
    const t = (k) => sum(games.map((g) => g[k]));
    const p2m = t('p2m'), p2a = t('p2a'), p3m = t('p3m'), p3a = t('p3a'), ftm = t('ftm'), fta = t('fta');
    return {
      n: games.length, wins: games.filter((g) => g.win).length, losses: games.filter((g) => !g.win).length,
      min: a('min'), pts: a('pts'), reb: a('reb'), pd: a('pd'), int: a('int'), ct: a('ct'), bp: a('bp'), eva: a('eva'),
      fgm: p2m + p3m, fga: p2a + p3a, fg: pctOf(p2m + p3m, p2a + p3a),
      p2m: p2m, p2a: p2a, p2: pctOf(p2m, p2a),
      p3m: p3m, p3a: p3a, p3: pctOf(p3m, p3a),
      ftm: ftm, fta: fta, lf: pctOf(ftm, fta),
    };
  }
  /* Zones de tir agrégées sur la période — mêmes zones que la carte d'un match. */
  const GC_ZCACHE = {};
  function gameZones(gameId) {
    if (!GC_ZCACHE[gameId]) { const g = S.getPlayerGame(PID, gameId); GC_ZCACHE[gameId] = (g && g.zones) || {}; }
    return GC_ZCACHE[gameId];
  }
  function gcZonesOf(games) {
    const Z = {};
    games.forEach((g) => {
      const z = gameZones(g.gameId);
      Object.keys(z).forEach((k) => { const c = Z[k] || (Z[k] = { made: 0, att: 0 }); c.made += z[k].reussis; c.att += z[k].tentes; });
    });
    Object.keys(Z).forEach((k) => { Z[k].pct = pctOf(Z[k].made, Z[k].att); });
    return Z;
  }
  let SEASON_ZONES = null;
  const seasonZones = () => (SEASON_ZONES || (SEASON_ZONES = gcZonesOf(LOG)));

  /* ---- 7b. La vue ---- */
  function renderGames() {
    $('#pane-games').innerHTML =
      '<header class="tr2-hero gc-hero"><h1 class="tr2-hero-t">Game Center</h1>'
      + '<p class="tr2-hero-s"><b>' + esc(player.name) + '</b><span class="sep">·</span>' + esc(club.nom)
      + '<span class="sep">·</span>' + esc(tournoi.nom) + '<span class="sep">·</span>' + LOG.length + ' matchs joués</p></header>'
      + '<section class="gc-period" aria-label="Période analysée">'
      + '<div class="gc-period-lab">Période analysée</div>'
      + '<div class="tr2-chips gc-period-chips" role="group" aria-label="Choisir la période">'
      + GC_PERIODS.map((p) => '<button type="button" class="tr2-chip" data-gcper="' + p[0] + '">' + p[1] + '</button>').join('')
      + '</div>'
      + '<p class="gc-period-note">Statistiques, carte de tir, graphique et liste des matchs suivent la période choisie.</p>'
      + '</section>'
      + '<div id="gcBody"></div>';
    paintGames();
  }
  function paintGames() {
    gcZone = null;
    $$('#pane-games [data-gcper]').forEach((b) => b.classList.toggle('on', b.dataset.gcper === gcPeriod));
    const body = $('#gcBody'); if (!body) return;
    body.innerHTML = gcStatsPanel() + gcCourtPanel() + gcChartPanel() + gcRecordsSection() + gcMatchesSection();
    paintGcCourt();
    paintGcChart();
  }

  /* ---- 7c. Statistiques principales — un grand panneau pleine largeur ---- */
  function gcStatsPanel() {
    const a = gcAgg(gcGames());
    /* sur une période courte, l'écart affiché compare à la moyenne de la saison */
    const d = (cur, ref) => (gcPeriod === 'saison' ? null : round1(cur - ref));
    const sub = (ref) => (gcPeriod === 'saison' ? 'moyenne par match' : 'saison ' + fr(ref));
    return '<section class="tr2-panel tr2-panel-wide gc-panel">'
      + '<div class="tr2-panel-head"><h2 class="tr2-h2">Mes statistiques</h2>'
      + '<div class="tr2-panel-sub"><span>' + gcPeriodLabel() + ' · ' + a.n + ' matchs · '
      + '<b class="gc-record">' + a.wins + ' V</b> – <b class="gc-record loss">' + a.losses + ' D</b></span>'
      + (gcPeriod === 'saison' ? '' : '<span class="tr2-trend ' + dirOf(round1(a.eva - H.eva), 1) + '">vs saison <b>' + frS(round1(a.eva - H.eva)) + ' éva</b></span>') + '</div></div>'
      + '<div class="pd-stats">'
      + statBlock(a.pts, 'Points', sub(H.pts), d(a.pts, H.pts), '')
      + statBlock(a.reb, 'Rebonds', sub(H.reb), d(a.reb, H.reb), '')
      + statBlock(a.pd, 'Passes déc.', sub(H.pd), d(a.pd, H.pd), '')
      + statBlock(a.eva, 'Évaluation', sub(H.eva), d(a.eva, H.eva), '')
      + '</div>'
      + '<div class="pd-stats pd-stats-sec">'
      + statBlock(a.min, 'Minutes', sub(H.min), d(a.min, H.min), '')
      + statBlock(a.int, 'Interceptions', sub(H.int), d(a.int, H.int), '')
      + statBlock(a.ct, 'Contres', sub(player.season.ct), d(a.ct, player.season.ct), '')
      + statBlock(a.bp, 'Pertes', sub(player.season.bp), d(a.bp, player.season.bp), '')
      + '</div>'
      + '<h3 class="gc-h3">Mon adresse sur la période</h3>'
      + '<div class="pcts gc-pcts">'
      + pctCell('Tirs', a.fg, a.fgm, a.fga) + pctCell('2 pts', a.p2, a.p2m, a.p2a)
      + pctCell('3 pts', a.p3, a.p3m, a.p3a) + pctCell('Lancers', a.lf, a.ftm, a.fta)
      + '</div>'
      + '<p class="pt-note">Réussite cumulée sur ' + (gcPeriod === 'saison' ? 'les ' + a.n + ' matchs de la saison' : 'les ' + a.n + ' derniers matchs')
      + ' — soit <b>' + a.fgm + '/' + a.fga + '</b> aux tirs et <b>' + a.ftm + '/' + a.fta + '</b> aux lancers francs.</p>'
      + '</section>';
  }

  /* ---- 7d. Carte de tir de la saison (demi-terrain, zone par zone) ---- */
  function gcCourtPanel() {
    return '<section class="tr2-panel tr2-panel-wide gc-panel">'
      + '<div class="tr2-panel-head"><h2 class="tr2-h2">Ma carte de tir</h2>'
      + '<div class="tr2-panel-sub">Mes réussites au tir zone par zone — ' + gcPeriodLabel().toLowerCase()
      + '<span class="tr2-legend"><i class="lo"></i>secteur faible<i class="lm"></i>dans la norme<i class="lh"></i>secteur fort</span></div></div>'
      + '<div class="tr2-court-wide">'
      + '<div class="tr2-court gc-court"><div class="court-hold" id="gcCourt"></div>'
      + '<p class="gc-court-help">Touche une zone du terrain pour voir le détail de ce secteur.</p></div>'
      + '<div class="tr2-court-side"><div id="gcCourtSum"></div><div id="gcCourtZones"></div></div>'
      + '</div></section>';
  }
  function paintGcCourt() {
    const holder = $('#gcCourt'); if (!holder || !Court) return;
    const Z = gcZonesOf(gcGames());
    renderShotChart(holder, Z, (key) => { gcZone = (gcZone === key ? null : key); paintGcCourtSide(Z); }, { scaled: true });
    paintGcCourtSide(Z);
  }
  function paintGcCourtSide(Z) {
    const sum = $('#gcCourtSum'), list = $('#gcCourtZones');
    if (!sum || !list) return;
    const a = gcAgg(gcGames());
    const ranked = ZONE8.filter((k) => Z[k] && Z[k].att > 0)
      .map((k) => ({ key: k, z: Z[k], v: heatValue(zone18Of(k), Z[k].pct) }))
      .sort((x, y) => y.v - x.v);
    const best = ranked[0], worst = ranked[ranked.length - 1];
    sum.innerHTML = '<div class="tr2-sum">'
      + sumRow('Tirs tentés sur la période', a.fga + ' <i>· ' + a.fgm + ' réussis</i>')
      + sumRow('Réussite globale', fr(a.fg) + ' %')
      + sumRow('À 2 points', fr(a.p2) + ' % <i>· ' + a.p2m + '/' + a.p2a + '</i>')
      + sumRow('À 3 points', fr(a.p3) + ' % <i>· ' + a.p3m + '/' + a.p3a + '</i>')
      + (best ? sumRow('Mon meilleur secteur', esc(ZONE8_LAB[best.key]) + ' <i>· ' + fr(best.z.pct) + ' % · ' + frS(round1(best.z.pct - zoneRef(best.key))) + ' vs attendu</i>', 'up') : '')
      + (worst && worst !== best ? sumRow('Secteur à travailler', esc(ZONE8_LAB[worst.key]) + ' <i>· ' + fr(worst.z.pct) + ' % · ' + frS(round1(worst.z.pct - zoneRef(worst.key))) + ' vs attendu</i>', 'down') : '')
      + '</div>';
    list.innerHTML = '<h3 class="gc-h3">Détail par secteur</h3><div class="pt-rank">'
      + ranked.map((r, i) => {
        const cls = gcZone === r.key ? ' on' : (i === 0 ? ' good' : (i === ranked.length - 1 ? ' bad' : ''));
        const d = round1(r.z.pct - zoneRef(r.key));
        return '<div class="pt-rank-row gc-zrow' + cls + '" data-gczone="' + r.key + '">'
          + '<span class="lab">' + esc(ZONE8_LAB[r.key]) + '<small>' + r.z.made + '/' + r.z.att + ' · attendu ' + fr(zoneRef(r.key)) + ' %</small></span>'
          + '<span class="val">' + fr(r.z.pct) + ' %<span class="d ' + dirOf(d, 1.5) + '">' + frS(d) + '</span></span></div>';
      }).join('')
      + '</div>'
      + '<p class="pt-note">Les secteurs sont classés au regard du standard attendu à cette distance, comme sur ma page '
      + 'Entraînement : un 3 points à 40 % vaut un 2 points près du cercle à 65 %. La colonne de droite montre mon écart à ce standard.</p>';
  }
  /* Une zone8 -> la zone du terrain (18 zones) qui la représente le mieux : sert à
     retrouver sa famille (paint / mid / three) et donc le standard attendu à cette
     distance. Même échelle que la page Entraînement (HEAT_SCALE). */
  const ZONE8_TO_18 = {
    RAQUETTE: 'paint-center',
    MI_DISTANCE_GAUCHE: 'midrange-wing-left', MI_DISTANCE_CENTRE: 'midrange-center', MI_DISTANCE_DROITE: 'midrange-wing-right',
    CORNER_3_GAUCHE: 'three-corner-left', CORNER_3_DROIT: 'three-corner-right',
    TOP_KEY_GAUCHE: 'three-wing-left', TOP_KEY_DROIT: 'three-wing-right',
  };
  const zone18Of = (k) => ZONE8_TO_18[k] || 'midrange-center';
  /* le « standard attendu » d'une zone : le milieu de la bande de référence de sa famille */
  function zoneRef(k) {
    const z = zoneMeta(zone18Of(k)), s = HEAT_SCALE[(z && z.group) || 'mid'] || HEAT_SCALE.mid;
    return round1((s[0] + s[1]) / 2);
  }

  /* ---- 7e. Graphique principal — Évaluation match après match ---- */
  function gcChartPanel() {
    return '<section class="tr2-panel tr2-panel-wide gc-panel">'
      + '<div class="tr2-panel-head"><h2 class="tr2-h2">Mon évolution</h2>'
      + '<div class="tr2-panel-sub">Match après match — <b id="gcChartLab">' + esc(gcDef().label) + '</b> · ' + gcPeriodLabel().toLowerCase() + '</div></div>'
      + '<div class="tr2-chips gc-statchips" role="group" aria-label="Statistique affichée">'
      + GC_STATS.map((s) => '<button type="button" class="tr2-chip' + (s.key === gcStat ? ' on' : '') + '" data-gcstat="' + s.key + '">' + esc(s.label) + '</button>').join('')
      + '</div>'
      + '<div class="tr2-chart" id="gcChart"></div>'
      + '<div class="gc-chart-key"><span><i class="win"></i>Victoire</span><span><i class="loss"></i>Défaite</span>'
      + '<span><i class="avg"></i>Moyenne de la saison</span></div>'
      + '<div id="gcChartSum" style="margin-top:14px"></div>'
      + '</section>';
  }
  /* Barres : une barre = un match, hauteur = la statistique choisie, couleur =
     résultat de l'équipe. Base à zéro (pas d'échelle tronquée), ligne pointillée
     à la moyenne de la saison, dernier match mis en avant. */
  function gcChartSVG() {
    const def = gcDef(), games = gcGames();
    const pts = games.map((g, i) => ({ i: i, g: g, v: def.val(g) })).filter((p) => p.v != null);
    if (pts.length < 2) return '<p class="pt-empty">Pas encore assez de matchs pour tracer cette évolution.</p>';
    const W = 680, HT = 268, pl = 34, pr = 14, ptop = 30, pbot = 44;
    const iw = W - pl - pr, ih = HT - ptop - pbot, n = pts.length;
    const vals = pts.map((p) => p.v);
    /* échelle à graduations rondes (1, 2, 5, 10…), base à zéro : des repères
       lisibles valent mieux qu'un axe collé au maximum exact */
    const raw = (Math.max(Math.max.apply(null, vals), def.avg != null ? def.avg : 0) || 1) * 1.08;
    const step = [0.5, 1, 2, 5, 10, 20, 50, 100].filter((s) => raw / s <= 5)[0] || Math.ceil(raw / 5);
    const top = Math.ceil(raw / step) * step;
    const Y = (v) => ptop + ih - (v / top) * ih;
    const gap = iw / n, bw = Math.max(4, Math.min(34, gap * 0.62));
    const X = (i) => pl + i * gap + (gap - bw) / 2;

    const grid = [];
    for (let v = 0; v <= top + 0.001; v += step) {
      const y = Y(v);
      grid.push('<line class="rc-grid" x1="' + pl + '" y1="' + y.toFixed(1) + '" x2="' + (W - pr) + '" y2="' + y.toFixed(1) + '"/>'
        + '<text class="rc-yl" x="' + (pl - 8) + '" y="' + (y + 4).toFixed(1) + '">' + fr(round1(v)) + '</text>');
    }

    const bars = pts.map((p, j) => {
      const y = Y(p.v), h = Math.max(2, ptop + ih - y), last = j === n - 1;
      return '<rect class="gc-bar ' + (p.g.win ? 'win' : 'loss') + (last ? ' hi' : '') + '" x="' + X(p.i).toFixed(1) + '" y="' + y.toFixed(1)
        + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="' + Math.min(3.5, bw / 2).toFixed(1) + '">'
        + '<title>' + esc(fmtDate(p.g.date)) + ' · ' + esc(p.g.opponent) + ' — ' + fr(p.v) + ' ' + esc(def.label.toLowerCase()) + '</title></rect>';
    }).join('');

    const avgLine = def.avg != null
      ? '<line class="gc-avg" x1="' + pl + '" y1="' + Y(def.avg).toFixed(1) + '" x2="' + (W - pr) + '" y2="' + Y(def.avg).toFixed(1) + '"/>'
        + '<text class="gc-avg-l" x="' + (W - pr) + '" y="' + Math.max(ptop - 8, Y(def.avg) - 7).toFixed(1) + '">saison ' + fr(def.avg) + def.unit + '</text>'
      : '';

    const lastP = pts[n - 1];
    const lastLab = '<text class="gc-barlab" x="' + (X(lastP.i) + bw / 2).toFixed(1) + '" y="' + Math.max(ptop - 9, Y(lastP.v) - 9).toFixed(1) + '">'
      + fr(lastP.v) + def.unit + '</text>';

    const xStep = Math.max(1, Math.ceil(n / 5));
    const xl = pts.map((p, i) => ((i % xStep === 0 || i === n - 1)
      ? '<text class="rc-xl" x="' + (X(p.i) + bw / 2).toFixed(1) + '" y="' + (HT - 22) + '">' + esc(fmtDate(p.g.date)) + '</text>'
      + '<text class="gc-opp" x="' + (X(p.i) + bw / 2).toFixed(1) + '" y="' + (HT - 8) + '">' + esc(shortOpp(p.g.opponent)) + '</text>' : '')).join('');

    return '<svg class="gc-svg" viewBox="0 0 ' + W + ' ' + HT + '" role="img" aria-label="' + esc(def.label) + ' match après match">'
      + grid.join('') + bars + avgLine + lastLab + xl + '</svg>';
  }
  const shortOpp = (name) => (String(name).length > 11 ? String(name).slice(0, 10) + '…' : String(name));
  function gcChartSummary() {
    const def = gcDef(), games = gcGames();
    const pts = games.map((g) => ({ g: g, v: def.val(g) })).filter((p) => p.v != null);
    if (!pts.length) return '';
    const vals = pts.map((p) => p.v), avg = round1(mean(vals));
    const best = pts.reduce((b, p) => (p.v > b.v ? p : b), pts[0]);
    const seuil = 1;
    const t = trend(vals, seuil);
    return '<div class="tr2-sum">'
      + sumRow('Moyenne sur la période', fr(avg) + def.unit)
      + (def.avg != null ? sumRow('Moyenne de la saison', fr(def.avg) + def.unit + ' <i>· écart ' + frS(round1(avg - def.avg)) + '</i>', dirOf(round1(avg - def.avg), seuil)) : '')
      + sumRow('Meilleur match', fr(best.v) + def.unit + ' <i>· ' + esc(best.g.opponent) + ', ' + fmtDate(best.g.date) + '</i>')
      + sumRow('Dernier match', fr(pts[pts.length - 1].v) + def.unit + ' <i>· ' + esc(pts[pts.length - 1].g.opponent) + ', ' + fmtDate(pts[pts.length - 1].g.date) + '</i>')
      + (t ? sumRow('Tendance sur la période', frS(t.d) + def.unit, t.dir) : '')
      + '</div>';
  }
  function paintGcChart() {
    const box = $('#gcChart'); if (box) box.innerHTML = gcChartSVG();
    const sum = $('#gcChartSum'); if (sum) sum.innerHTML = gcChartSummary();
    const lab = $('#gcChartLab'); if (lab) lab.textContent = gcDef().label;
    $$('#pane-games [data-gcstat]').forEach((b) => b.classList.toggle('on', b.dataset.gcstat === gcStat));
  }

  /* ---- 7f. Records de la saison (toujours la saison entière) ---- */
  function gcRecordsSection() {
    const rec = (val, lab, g) => '<div class="gc-rec"><div class="gc-rec-v">' + val + '</div><div class="gc-rec-l">' + lab + '</div>'
      + '<button type="button" class="gc-rec-g" data-gcopen="' + esc(g.gameId) + '|resume">' + esc(g.opponent) + ' · ' + fmtDate(g.date) + '</button></div>';
    return '<h2 class="pd-h2">Mes records de la saison</h2>'
      + '<p class="pd-h2-note">Mes meilleures feuilles de match depuis le début de la saison — touche un match pour l’ouvrir.</p>'
      + '<div class="gc-recs">'
      + rec(RECORDS.pts.pts, 'Points', RECORDS.pts)
      + rec(RECORDS.reb.reb, 'Rebonds', RECORDS.reb)
      + rec(RECORDS.pd.pd, 'Passes déc.', RECORDS.pd)
      + rec(RECORDS.int.int, 'Interceptions', RECORDS.int)
      + rec(RECORDS.p3m.p3m, 'Paniers à 3 pts', RECORDS.p3m)
      + rec(RECORDS.eva.eva, 'Évaluation', RECORDS.eva)
      + '</div>';
  }

  /* ---- 7g. Mes matchs — une carte par match, comme côté coach ---- */
  function gcMatchesSection() {
    const games = gcGames().slice().reverse();
    return '<h2 class="pd-h2">Mes matchs</h2>'
      + '<p class="pd-h2-note">' + games.length + ' matchs sur la période. Chaque carte donne accès au résumé, à l’analyse du match '
      + 'et au détail action par action.</p>'
      + '<div id="gcMatchWrap">' + gcMatchesHTML() + '</div>';
  }
  function gcMatchesHTML() {
    const games = gcGames().slice().reverse();
    return '<div class="gc-matches" id="gcMatches">' + games.slice(0, gcShown).map(gcMatchCard).join('') + '</div>'
      + (gcShown < games.length ? '<button type="button" class="pt-more" data-gcmore>Voir plus de matchs</button>' : '');
  }
  function paintGcMatches() { const w = $('#gcMatchWrap'); if (w) w.innerHTML = gcMatchesHTML(); }
  function gcMatchStat(v, l, hot) { return '<div class="gc-ms' + (hot ? ' hot' : '') + '"><b>' + v + '</b><span>' + l + '</span></div>'; }
  function gcMatchCard(g) {
    const hl = matchHighlights(g);
    const act = (tab, lab, ico) => '<button type="button" class="gc-act" data-gcopen="' + esc(g.gameId) + '|' + tab + '">' + ico + '<span>' + lab + '</span></button>';
    return '<article class="gc-match">'
      + '<button type="button" class="gc-match-head" data-gcopen="' + esc(g.gameId) + '|resume">'
      + '<span class="gc-res ' + (g.win ? 'win' : 'loss') + '">' + (g.win ? 'V' : 'D') + '</span>'
      + '<span class="gc-match-id"><span class="gc-match-opp">' + esc(g.opponent) + '</span>'
      + '<span class="gc-match-meta">' + esc(fmtDate(g.date, true)) + ' · ' + (g.dom ? 'Domicile' : 'Extérieur') + ' · ' + g.min + ' min</span></span>'
      + '<span class="gc-match-score">' + g.us + '<i>–</i>' + g.them + '</span></button>'
      + '<div class="gc-match-stats">'
      + gcMatchStat(g.pts, 'PTS', true) + gcMatchStat(g.reb, 'REB') + gcMatchStat(g.pd, 'PD')
      + gcMatchStat(g.int, 'INT') + gcMatchStat(g.eva, 'ÉVA', true)
      + '</div>'
      + '<div class="gc-match-chips">'
      + hl.map((h) => chip(h, 'hot')).join('')
      + chip(g.fgm + '/' + g.fga + ' aux tirs') + chip(g.p3m + '/' + g.p3a + ' à 3 pts')
      + '</div>'
      + '<div class="gc-match-acts">'
      + act('resume', 'Résumé', '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 4h14v16H5z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>')
      + act('ia', 'Analyse IA', '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l1.9 4.6L18.5 9.5 13.9 11.4 12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M18 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg>')
      + act('actions', 'Action par action', '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19.5" cy="18" r="1.6"/></svg>')
      + '</div></article>';
  }

  /* ============================================================
     8. MODAL DÉTAIL MATCH + play-by-play
     ============================================================ */
  let sheetTab = 'resume', pbpQuarter = 'all', pbpFilter = 'all', PBP = [];
  const SHEET_TABS = [['resume', 'Résumé'], ['ia', 'Analyse IA'], ['actions', 'Action par action']];
  function openMatch(gameId, tab) {
    const g = S.getPlayerGame(PID, gameId);
    if (!g) return;
    const line = g.game;
    PBP = buildPBP(g);
    sheetTab = SHEET_TABS.some((t) => t[0] === tab) ? tab : 'resume';
    pbpQuarter = 'all'; pbpFilter = 'all';
    const box = $('#sheetBox');
    box.innerHTML =
      '<div class="sheet-head"><button class="sheet-close" id="sheetClose" aria-label="Fermer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
      + '<div class="sheet-eyebrow">' + (line.win ? 'Victoire' : 'Défaite') + ' · ' + fmtDateLong(line.date) + ' · ' + (line.dom ? 'domicile' : 'extérieur') + '</div>'
      + '<div class="sheet-score">Žalgiris <span class="mono">' + line.us + '</span><span class="sep">–</span><span class="mono">' + line.them + '</span> ' + esc(line.opponent) + '</div></div>'
      + '<div class="sheet-tabs">'
      + SHEET_TABS.map((t) => '<button class="sheet-tab' + (t[0] === sheetTab ? ' active' : '') + '" data-stab="' + t[0] + '">' + t[1] + '</button>').join('')
      + '</div>'
      + '<div class="sheet-body">'
      + '<div class="sheet-pane' + (sheetTab === 'resume' ? ' active' : '') + '" id="spane-resume">' + resumePane(g) + '</div>'
      + '<div class="sheet-pane' + (sheetTab === 'ia' ? ' active' : '') + '" id="spane-ia">' + aiPane(g) + '</div>'
      + '<div class="sheet-pane' + (sheetTab === 'actions' ? ' active' : '') + '" id="spane-actions">' + actionsPane(line) + '</div>'
      + '</div>';
    // shot chart du match
    const zones = {}; ZONE8.forEach((z) => { const zz = g.zones[z]; if (zz) zones[z] = { pct: zz.pct, made: zz.reussis, att: zz.tentes }; });
    renderShotChart($('#matchCourt'), zones, null, { scaled: true });
    const ov = $('#sheetOverlay'); ov.classList.add('open'); document.body.style.overflow = 'hidden';
    renderPBP();
  }
  function closeMatch() { $('#sheetOverlay').classList.remove('open'); document.body.style.overflow = ''; }
  function resumePane(g) {
    const line = g.game;
    const statLine = [['PTS', line.pts], ['REB', line.reb], ['PD', line.pd], ['INT', line.int], ['CT', line.ct], ['ÉVA', line.eva]];
    const shoot = [['2 pts', line.p2m, line.p2a], ['3 pts', line.p3m, line.p3a], ['LF', line.ftm, line.fta]];
    return '<div class="gc-sheet-line">'
      + statLine.map((s) => '<div class="gc-ms' + (s[0] === 'PTS' || s[0] === 'ÉVA' ? ' hot' : '') + '"><b>' + s[1] + '</b><span>' + s[0] + '</span></div>').join('')
      + '</div>'
      + '<p class="pt-note gc-sheet-note">' + line.min + ' minutes jouées · ' + (line.dom ? 'à domicile' : 'à l’extérieur') + ' · différentiel ' + signed(line.pm) + '</p>'
      + '<h3 class="gc-h3">Mon adresse au tir</h3>'
      + '<div class="pcts gc-pcts gc-pcts-3">' + shoot.map((s) => pctCell(s[0], pctOf(s[1], s[2]), s[1], s[2])).join('') + '</div>'
      + '<h3 class="gc-h3">Ma carte de tir sur ce match</h3>'
      + '<div class="tr2-court gc-court"><div class="court-hold" id="matchCourt"></div></div>'
      + '<h3 class="gc-h3">Par rapport à mes moyennes</h3>'
      + g.metrics.map(cmpRow).join('')
      + '<div class="coach-quote" style="margin-top:16px">' + esc(g.obs) + '</div>';
  }

  /* ---- Analyse du match ----
     Lecture automatique de la feuille de match : chaque phrase est déduite des
     données déjà présentes dans HoopStore (écarts à mes moyennes de la saison,
     adresse par secteur, poids dans le score de l'équipe). Rien n'est inventé. */
  function aiPane(g) {
    const line = g.game;
    /* un secteur n'est commenté qu'à partir de 3 tirs : en dessous, un 1/1 ne dit rien */
    const zones = ZONE8.filter((k) => g.zones[k] && g.zones[k].tentes >= 3)
      .map((k) => ({ key: k, z: g.zones[k], v: heatValue(zone18Of(k), g.zones[k].pct) }))
      .sort((x, y) => y.v - x.v);
    const bestZ = zones.length ? zones[0] : null;
    const worstZ = zones.length > 1 ? zones[zones.length - 1] : null;
    const zLab = (z) => esc(ZONE8_LAB[z.key].toLowerCase());
    const zFrac = (z) => z.z.reussis + '/' + z.z.tentes + ' à ' + fr(z.z.pct) + ' %';
    const share = line.us > 0 ? Math.round((line.pts / line.us) * 100) : 0;
    const stat = (m) => '<b>' + fr(m.m) + ' ' + m.label.toLowerCase() + '</b> (' + frS(m.delta) + ' vs ma moyenne)';
    /* l'évaluation est le sujet de la carte « Lecture du match » : on ne la répète pas ici */
    const noEva = (list) => list.filter((m) => m.key !== 'eva');
    const card = (tone, title, text) => '<article class="gc-ai-card ' + tone + '"><h4 class="gc-ai-t">' + title + '</h4><p class="gc-ai-x">' + text + '</p></article>';

    // 1. ce qui a fonctionné
    const plus = noEva(g.better).slice(0, 2).map(stat);
    if (bestZ && bestZ.v >= 0.5) plus.push('un bon rendement en <b>' + zLab(bestZ) + '</b> (' + zFrac(bestZ) + ')');
    if (line.p3m >= 3) plus.push('<b>' + line.p3m + ' paniers à 3 points</b> sur ' + line.p3a + ' tentatives');
    const bon = (plus.length
      ? 'J’ai pesé avec ' + plus.slice(0, 3).join(', ') + '. '
      : 'Pas de pic statistique sur ce match : ' + line.pts + ' points, ' + line.reb + ' rebonds et ' + line.pd + ' passes décisives, dans la lignée de mes moyennes. ')
      + 'Au total ' + line.pts + ' points, soit ' + share + ' % du score de l’équipe.';

    // 2. ce qui a coûté
    const moins = noEva(g.worse).slice(0, 2).map(stat);
    if (worstZ && worstZ.v <= 0.4) moins.push('du déchet en <b>' + zLab(worstZ) + '</b> (' + zFrac(worstZ) + ')');
    if (line.bp >= 3) moins.push('<b>' + line.bp + ' ballons perdus</b>');
    if (line.fta >= 3 && pctOf(line.ftm, line.fta) < 70) moins.push('<b>' + line.ftm + '/' + line.fta + ' aux lancers francs</b>');
    const mauvais = moins.length
      ? 'Ce qui m’a coûté : ' + moins.slice(0, 3).join(', ') + '.'
      : 'Rien de marquant au débit : ni déchet au tir, ni excès de pertes de balle sur cette feuille de match.';

    // 3. lecture globale
    const dEva = round1(line.eva - H.eva);
    const niveau = dEva >= 4 ? 'C’est un match au-dessus de mes standards.'
      : (dEva <= -4 ? 'Soirée en dessous de ce que je produis habituellement.' : 'Une contribution conforme à ma moyenne.');
    const lecture = 'Évaluation de <b>' + line.eva + '</b> pour une moyenne de saison à ' + fr(H.eva) + ' (' + frS(dEva) + '). '
      + niveau + ' L’équipe ' + (line.win ? 'l’emporte' : 's’incline') + ' ' + line.us + '–' + line.them
      + ' et j’ai passé ' + line.min + ' minutes sur le parquet.';

    /* 4. la suite — sur un seul match, les volumes par secteur sont trop faibles pour
       trancher : le chantier est donc lu sur la carte de tir de la saison, et remis
       en regard de ce que j'ai produit dans ce secteur ce soir-là. */
    const SZ = seasonZones();
    const seasonRanked = ZONE8.filter((k) => SZ[k] && SZ[k].att > 0)
      .map((k) => ({ key: k, z: SZ[k], v: heatValue(zone18Of(k), SZ[k].pct) }))
      .sort((x, y) => x.v - y.v);
    const chantier = seasonRanked[0];
    const here = chantier ? g.zones[chantier.key] : null;
    const suite = chantier
      ? 'Mon secteur le plus en retard sur la saison — <b>' + esc(ZONE8_LAB[chantier.key].toLowerCase()) + '</b> : '
        + fr(chantier.z.pct) + ' % (' + chantier.z.made + '/' + chantier.z.att + ') pour un standard attendu à '
        + fr(zoneRef(chantier.key)) + ' %. '
        + (here && here.tentes ? 'Sur ce match : ' + here.reussis + '/' + here.tentes + '. ' : 'Aucun tir pris dans ce secteur sur ce match. ')
        + 'À croiser avec mes séances de tir sur ce secteur.'
      : 'Pas encore assez de tirs répertoriés pour dégager un chantier par secteur.';

    return '<p class="gc-ai-intro">Lecture automatique de ma feuille de match, croisée avec mes moyennes de la saison '
      + 'et ma réussite par secteur. Aucune donnée extérieure n’est utilisée.</p>'
      + '<div class="gc-ai">'
      + card('good', 'Ce qui a fonctionné', bon)
      + card('bad', 'Ce qui m’a coûté', mauvais)
      + card('neutral', 'Lecture du match', lecture)
      + card('neutral', 'À travailler ensuite', suite)
      + '</div>';
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
    return '<p class="gc-ai-intro">Le déroulé du match action par action : chaque ligne donne le quart-temps, '
      + 'le chrono, l’action et le score à cet instant. J’ai joué <b>' + line.min + ' minutes</b> de cette rencontre.</p>'
      + '<div class="gc-pbp-filters">'
      + '<div class="tr2-chips" data-pbp-q role="group" aria-label="Quart-temps">'
      + [['all', 'Tout le match'], ['1', 'Q1'], ['2', 'Q2'], ['3', 'Q3'], ['4', 'Q4']].map((q) => '<button type="button" class="tr2-chip' + (q[0] === 'all' ? ' on' : '') + '" data-q="' + q[0] + '">' + q[1] + '</button>').join('')
      + '</div>'
      + '<div class="tr2-chips" data-pbp-f role="group" aria-label="Type d’action">'
      + [['all', 'Toutes'], ['sf', 'Mes actions'], ['paniers', 'Paniers'], ['defense', 'Défense']].map((f) => '<button type="button" class="tr2-chip' + (f[0] === 'all' ? ' on' : '') + '" data-pf="' + f[0] + '">' + f[1] + '</button>').join('')
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
     9. HOOPFEED — univers SOCIAL (Feed / Messages / Profil)
     ------------------------------------------------------------
     Réseau social façon Instagram. STRICTEMENT public : ne montre que
     résumés de matchs, performances, records, posts — jamais les données
     privées (évaluations coach, détail des tirs, analyses, play-by-play).
     Connecté aux mêmes données : chaque match du Game Center privé peut
     générer une publication publique (résumé uniquement).
     ============================================================ */
  const AV_GRAD = {
    orange: 'linear-gradient(150deg,#E4682A,#C99E63)', green: 'linear-gradient(150deg,#2f7d4f,#7FA05F)',
    blue: 'linear-gradient(150deg,#3a6ea5,#7BA6C9)', purple: 'linear-gradient(150deg,#6d4b8c,#A8785C)',
    red: 'linear-gradient(150deg,#b0453a,#C0766B)', teal: 'linear-gradient(150deg,#2c7a72,#5fb3a8)',
    gold: 'linear-gradient(150deg,#b8863f,#C99E63)',
  };
  const noDia = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  function handleOf(name) { const p = noDia(name).toLowerCase().split(/\s+/); const last = p[p.length - 1].replace(/[^a-z]/g, ''); return p[0][0] + '.' + last; }
  function isoStr(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nowTime() { const d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function avatar(acc, cls) { return '<div class="' + (cls || 'dm-av') + '" style="background:' + (AV_GRAD[acc.color] || AV_GRAD.orange) + '">' + esc(acc.av) + '</div>'; }

  const SCENE_SVG = '<svg class="scene-court" viewBox="0 0 300 320" fill="none"><path d="M18 4 V96 A132 132 0 0 0 282 96 V4" stroke="rgba(201,158,99,0.35)" stroke-width="2"/><rect x="110" y="4" width="80" height="118" stroke="rgba(201,158,99,0.28)" stroke-width="2"/><circle cx="150" cy="24" r="6" stroke="rgba(244,150,88,0.7)" stroke-width="2"/></svg>';
  const HEART_BURST = '<div class="burst"><div class="heart-big"><svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.9-10-9.5C.6 8.3 2.4 4.6 6 4.1c2-.3 3.9.6 6 3 2.1-2.4 4-3.3 6-3 3.6.5 5.4 4.2 4 7.4-2.5 4.6-10 9.5-10 9.5z"/></svg></div></div>';
  const HEART_ICO = '<span class="ico"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7.5-4.9-10-9.5C.6 8.3 2.4 4.6 6 4.1c2-.3 3.9.6 6 3 2.1-2.4 4-3.3 6-3 3.6.5 5.4 4.2 4 7.4-2.5 4.6-10 9.5-10 9.5z"/></svg></span>';
  const COMMENT_ICO = '<span class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 01-8 8H5l-2 2V12a8 8 0 018-8h2a8 8 0 018 8z"/></svg></span>';
  const SHARE_ICO = '<span class="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg></span>';
  const SEND_ICO = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>';
  const DM_ICO = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 11.5a8.4 8.4 0 01-11.7 7.7L3 21l1.9-5.6A8.4 8.4 0 1121 11.5z"/></svg>';
  const HOME_ICO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>';
  const USER_ICO = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg>';
  const GRID_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>';
  const LOCK_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>';
  const DM_BIG_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 11.5a8.4 8.4 0 01-11.7 7.7L3 21l1.9-5.6A8.4 8.4 0 1121 11.5z"/></svg>';

  /* ---- Comptes (identités du réseau) ---- */
  const ME = { id: 'me', name: player.name, handle: 'sylvainfrancisco', type: 'me', club: club.nom, num: player.num, poste: player.poste, av: 'SF', color: 'orange', verified: true, followers: 15300, following: 183 };
  const CLUB_ACC = { id: 'bczalgiris', name: club.nom, handle: 'bczalgiris', type: 'club', club: club.nom, poste: 'Club officiel', av: 'ZAL', color: 'green', verified: true, followers: 412000, following: 64 };
  const MATE_COLORS = ['blue', 'purple', 'red', 'teal', 'gold', 'green'];
  const MATES = S.getPlayers().filter((p) => p.id !== PID).slice(0, 6).map((p, i) => ({
    id: p.id, name: p.name, handle: handleOf(p.name), type: 'player', club: club.nom, num: p.num, poste: p.poste,
    av: initials(p.name), color: MATE_COLORS[i % MATE_COLORS.length], verified: i < 2,
    followers: 2200 + Math.round(rng('f' + p.id)() * 9000), following: 130 + Math.round(rng('g' + p.id)() * 260), season: p.season,
  }));
  const EXTRA = [
    { id: 'keenanevans', name: 'Keenan Evans', handle: 'keenanevans', type: 'player', club: 'Basketball', poste: 'Arrière', av: 'KE', color: 'red', verified: true, followers: 38000, following: 210, season: { pts: 14.2, reb: 2.5, pd: 3.4 } },
    { id: 'staffzalgiris', name: 'Staff Žalgiris', handle: 'staff.zalgiris', type: 'coach', club: club.nom, poste: 'Coaching staff', av: 'ST', color: 'gold', verified: true, followers: 9800, following: 40 },
  ];
  const ACCOUNTS = [ME, CLUB_ACC].concat(MATES).concat(EXTRA);
  const ACC = {}; ACCOUNTS.forEach((a) => (ACC[a.id] = a));

  /* ---- Publications PUBLIQUES (résumés uniquement) ---- */
  function buildPublicPosts() {
    const posts = [], seen = {}, chosen = [];
    [RECORDS.pts, RECORDS.eva, RECORDS.pd].concat(LOG.slice(-7)).forEach((g) => { if (!seen[g.gameId]) { seen[g.gameId] = 1; chosen.push(g); } });
    chosen.sort((a, b) => (a.date < b.date ? 1 : -1));
    chosen.forEach((g) => {
      const rec = g.gameId === RECORDS.pts.gameId;
      posts.push({
        id: 'm-' + g.gameId, accId: ME.id, auto: true, date: g.date, srcGame: g.gameId,
        flag: rec ? 'RECORD' : (g.win ? 'VICTOIRE' : 'DÉFAITE'), flagCls: rec ? 'rec' : (g.win ? 'win' : 'loss'),
        ctx: 'EuroLeague · vs ' + g.opponent + ' · ' + fmtDate(g.date),
        sceneCls: rec ? 'scene-2' : (g.win ? 'scene-1' : 'scene-3'),
        eyebrow: rec ? ('Record personnel · ' + g.pts + ' points 🔥') : ((g.win ? 'Victoire' : 'Défaite') + ' · ' + g.eva + ' d\'évaluation'),
        score: g.us + '<small> –</small>' + g.them, tag: 'vs ' + g.opponent,
        stats: [[g.pts + ' PTS', 'Points'], [g.pd + ' AST', 'Passes'], [g.reb + ' REB', 'Rebonds'], [g.p3m + '/' + g.p3a + ' 3PT', 'À 3 pts']],
        caption: '<b>@sylvainfrancisco</b> ' + (rec ? ('Nouveau record avec ' + g.pts + ' points 🔥 ') : ('Žalgiris ' + g.us + '–' + g.them + ' face à ' + g.opponent + '. ')) + '<span style="color:var(--tq)">#Zalgiris #EuroLeague</span>',
        likes: 120 + g.eva * 4 + (rec ? 280 : 0),
        comments: [['staff.zalgiris', rec ? 'Historique 👏' : 'Solide Sylvain'], ['m.wright', g.win ? 'On enchaîne 💚' : 'On se relève 💪']],
        grid: { top: 'vs ' + g.opponent, score: 'ZAL ' + g.us + '–' + g.them, stat: g.pts, statLab: 'PTS', badge: rec ? '🔥' : '' },
      });
    });
    // post entraînement/lifestyle (public, SANS détail privé)
    posts.push({
      id: 't-grind', accId: ME.id, auto: false, date: isoStr(lastShoot().date),
      flag: 'TRAINING', flagCls: 'info', ctx: 'Séance · ' + fmtDate(lastShoot().date),
      sceneCls: 'scene-3', eyebrow: 'Préparation Playoffs', score: null, tag: 'Grind',
      stats: [], caption: '<b>@sylvainfrancisco</b> Encore du travail à la salle avant les Playoffs 💪 <span style="color:var(--tq)">#Grind #Zalgiris</span>',
      likes: 142, comments: [['keenanevans', 'Beast mode 🔥']],
      grid: { top: 'Entraînement', score: 'Žalgiris Arena', stat: '∞', statLab: 'GRIND', badge: '' },
    });
    // posts coéquipiers
    MATES.slice(0, 2).forEach((m, i) => {
      const r = rng('tm' + m.id), s = m.season, opp = i ? 'Real Madrid' : 'FC Barcelone', g = LOG[LOG.length - 1 - i];
      const pts = Math.round(s.pts * (1.5 + r() * 0.4)), reb = Math.round(s.reb * (1.3 + r() * 0.6)), ast = Math.round(s.pd * (1.3 + r() * 0.6));
      posts.push({
        id: 'mate-' + m.id, accId: m.id, auto: false, date: g.date,
        flag: 'VICTOIRE', flagCls: 'win', ctx: 'EuroLeague · vs ' + opp + ' · ' + fmtDate(g.date),
        sceneCls: i ? 'scene-1' : 'scene-2', eyebrow: 'Grosse performance', score: (80 + Math.round(r() * 18)) + '<small> –</small>' + (72 + Math.round(r() * 14)), tag: m.poste,
        stats: [[pts + ' PTS', 'Points'], [reb + ' REB', 'Rebonds'], [ast + ' AST', 'Passes']],
        caption: '<b>@' + m.handle + '</b> Gros combat collectif, on prend la victoire 💚 <span style="color:var(--tq)">#Zalgiris</span>',
        likes: 90 + Math.round(r() * 120), comments: [['sylvainfrancisco', 'Énorme 🔥']],
      });
    });
    // posts club
    const r0 = tournoi.resultats[0], ts = r0.topScorer;
    posts.push({
      id: 'club-res', accId: CLUB_ACC.id, auto: false, date: r0.date,
      flag: 'RÉSULTAT', flagCls: 'gold', ctx: 'EuroLeague · ' + fmtDate(r0.date),
      sceneCls: 'scene-1', eyebrow: 'Victoire EuroLeague', score: r0.score[0] + '<small> –</small>' + r0.score[1], tag: r0.adversaire,
      stats: [[r0.score[0] + '–' + r0.score[1], 'Score'], [ts.pts + ' PTS', 'Top scoreur'], [esc((ts.nom.split(' ')[1] || ts.nom)), 'MVP match']],
      caption: '<b>@bczalgiris</b> Victoire ' + r0.score[0] + '–' + r0.score[1] + ' face à ' + r0.adversaire + ' ! 💚 <span style="color:var(--tq)">#Zalgiris #EuroLeague</span>',
      likes: 820, comments: [['fan_kaunas', 'ŽALGIRIS 💚💚'], ['sylvainfrancisco', 'Team W 🙌']],
    });
    const nm = tournoi.prochainMatch;
    posts.push({
      id: 'club-next', accId: CLUB_ACC.id, auto: false, date: '2026-03-22',
      flag: 'À VENIR', flagCls: 'gold', ctx: 'Playoffs · ' + esc(nm.lieu),
      sceneCls: 'scene-2', eyebrow: 'Prochain match · Playoffs', score: 'ZAL <small>vs</small> ' + nm.code, tag: nm.adversaire,
      stats: [['J-2', 'Countdown'], [tournoi.bilan.victoires + '-' + tournoi.bilan.defaites, 'Bilan'], ['Playoffs', 'EuroLeague']],
      caption: '<b>@bczalgiris</b> Direction ' + esc(nm.lieu) + ' pour affronter ' + esc(nm.adversaire) + ' en Playoffs 💚 <span style="color:var(--tq)">#EuroLeague</span>',
      likes: 1240, comments: [['sylvainfrancisco', 'Prêts 🔒']],
    });
    posts.sort((a, b) => (a.date < b.date ? 1 : -1));
    return posts;
  }
  const PUBLIC_POSTS = buildPublicPosts();
  const postById = (id) => PUBLIC_POSTS.find((p) => p.id === id);

  /* ---- Conversations (messagerie) ---- */
  const CONVERSATIONS = [
    { id: 'c-keenan', accId: 'keenanevans', unread: true, messages: [{ from: 'them', text: 'Yo bro, gros match hier 🔥', time: '22:10' }, { from: 'them', text: '22 et 7 passes, tu régales', time: '22:14' }] },
    { id: 'c-club', accId: 'bczalgiris', unread: true, messages: [{ from: 'them', text: 'Rappel séance de demain', time: '18:40' }, { from: 'them', text: 'Training moved to 10:30', time: '18:42' }] },
    { id: 'c-wright', accId: 'moses-wright', unread: false, messages: [{ from: 'me', text: 'On se voit à la salle ?', time: '16:02' }, { from: 'them', text: 'Ouais 10h ça marche', time: '16:20' }, { from: 'me', text: '👍', time: '16:21' }] },
    { id: 'c-lo', accId: 'maodo-lo', unread: false, messages: [{ from: 'them', text: 'Belle passe hier soir 👌', time: 'Hier' }, { from: 'me', text: 'Team effort 💚', time: 'Hier' }] },
    { id: 'c-staff', accId: 'staffzalgiris', unread: false, messages: [{ from: 'them', text: 'Bon boulot sur le pick and roll', time: 'Lun' }, { from: 'them', text: 'On revoit la vidéo demain', time: 'Lun' }] },
  ];
  const convById = (id) => CONVERSATIONS.find((c) => c.id === id);
  const REPLIES = ['👍', 'Ok ça marche !', 'Bien reçu 🙏', 'On en parle à la salle', '🔥🔥', 'Nickel, à demain'];

  /* ---- Rendu d'un post ---- */
  function postHTML(p) {
    const acc = ACC[p.accId], grad = AV_GRAD[acc.color] || AV_GRAD.orange;
    const flag = p.flag ? '<span class="post-flag ' + (p.flagCls === 'win' ? 'win' : p.flagCls === 'loss' ? 'loss' : p.flagCls) + '"' + (p.flagCls === 'gold' ? ' style="background:var(--gold-soft);color:var(--gold)"' : '') + '>' + p.flag + '</span>' : '';
    const media = '<div class="post-media" data-media><div class="scene ' + (p.sceneCls || 'scene-1') + '">' + SCENE_SVG + '<div class="scene-eyebrow">' + p.eyebrow + '</div>' + (p.score ? '<div class="scene-score mono">' + p.score + '</div>' : '') + (p.tag ? '<div class="scene-tag">' + esc(p.tag) + '</div>' : '') + '</div>' + HEART_BURST + '</div>';
    const stats = (p.stats && p.stats.length) ? '<div class="stats-carousel card">' + p.stats.map((c) => '<div class="stat-chip"><span class="sc-val mono">' + c[0] + '</span><span class="sc-label">' + c[1] + '</span></div>').join('') + '</div>' : '';
    return '<article class="post card-elevated" data-post="' + p.id + '">'
      + '<div class="post-head"><div class="post-author" data-account="' + acc.id + '"><div class="post-avatar"><div class="post-avatar-inner" style="background:' + grad + '"><span class="init">' + esc(acc.av) + '</span></div></div></div>'
      + '<div class="post-author" data-account="' + acc.id + '" style="flex:1;cursor:pointer"><div class="post-user">@' + esc(acc.handle) + (acc.verified ? ' <span class="verified">✔</span>' : '') + '</div><div class="post-ctx">' + p.ctx + '</div></div>'
      + flag + '</div>' + media + stats
      + '<div class="post-actions"><button class="pa-btn" data-like data-count="' + p.likes + '">' + HEART_ICO + '<span class="like-count mono">' + p.likes + '</span></button>'
      + '<button class="pa-btn" data-comment-focus>' + COMMENT_ICO + '<span class="mono">' + p.comments.length + '</span></button>'
      + '<button class="pa-btn pa-share" data-share="' + p.id + '">' + SHARE_ICO + '</button>'
      + (p.auto ? '<span class="id-tag" style="margin-left:auto;font-size:10px">⚡ Auto</span>' : '') + '</div>'
      + '<div class="post-caption">' + p.caption + '</div>'
      + (p.accId === ME.id && p.srcGame ? '<div class="hf-privacy-note">' + LOCK_ICO + ' Résumé public — le détail complet reste dans ton Game Center privé</div>' : '')
      + '<div class="post-comments" data-comments>' + p.comments.map((c) => '<div class="comment"><b>' + esc(c[0]) + '</b> ' + esc(c[1]) + '</div>').join('') + '</div>'
      + '<div class="comment-box card"><input type="text" placeholder="Ajouter un commentaire…" data-input><button class="btn-send" data-send>Publier</button></div></article>';
  }
  function wirePost(root) {
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

  /* ---- Onglet interne : FEED ---- */
  function storyHTML(a) { return '<div class="hf-story" data-account="' + a.id + '"><div class="st-ring"><div class="st-inner" style="color:#fff;background:' + (AV_GRAD[a.color] || AV_GRAD.orange) + '">' + esc(a.av) + '</div></div><div class="st-name">' + (a.id === ME.id ? 'Toi' : esc(a.handle)) + '</div></div>'; }
  function renderHFFeed() {
    const stories = [ME].concat(MATES).concat([CLUB_ACC, ACC.keenanevans]).map(storyHTML).join('');
    $('#hf-feed').innerHTML = '<div class="hf-stories">' + stories + '</div><div class="hf-feed">' + PUBLIC_POSTS.map(postHTML).join('') + '</div>';
    wirePost($('#hf-feed'));
  }

  /* ---- Onglet interne : PROFIL (façon Instagram) ---- */
  function renderHFProfile() {
    const posts = PUBLIC_POSTS.filter((p) => p.accId === ME.id && p.grid);
    $('#hf-profile').innerHTML =
      '<div class="igp-head"><div class="igp-avatar"><span class="init">' + initials(player.name) + '</span><span class="num">' + player.num + '</span></div>'
      + '<div class="igp-info"><div class="igp-toprow"><span class="igp-handle">@sylvainfrancisco <span class="verified">✔</span></span>'
      + '<div class="igp-actions"><button class="igp-btn ghost" data-follow>Modifier le profil</button></div></div>'
      + '<div class="igp-counts"><span class="igp-count"><b>' + posts.length + '</b><span>publications</span></span><span class="igp-count"><b>15,3k</b><span>abonnés</span></span><span class="igp-count"><b>183</b><span>abonnements</span></span></div>'
      + '<div class="igp-name">' + esc(player.name) + '</div><div class="igp-bio">' + esc(player.poste) + ' · n°' + player.num + ' · ' + esc(club.nom) + '<br>Meilleur marqueur du club · <span class="tag">#EuroLeague</span> <span class="tag">#Zalgiris</span></div></div></div>'
      + '<div class="igp-stats"><div class="igp-stat"><b>' + H.pts + '</b><span>PTS</span></div><div class="igp-stat"><b>' + H.pd + '</b><span>AST</span></div><div class="igp-stat"><b>' + H.reb + '</b><span>REB</span></div><div class="igp-stat"><b>' + H.p3 + '%</b><span>3PT</span></div></div>'
      + '<div class="igp-stat-note">' + LOCK_ICO + ' Résumé public. Les données détaillées (tirs, évaluations coach, analyses) restent dans l\'espace privé.</div>'
      + '<div class="igp-gridtab">' + GRID_ICO + ' Publications</div>'
      + '<div class="igp-grid">' + posts.map(gridCell).join('') + '</div>';
  }
  function gridCell(p) {
    return '<div class="igp-cell" data-gridpost="' + p.id + '"><div class="igp-cell-scene"><div class="igp-cell-top">' + esc(p.grid.top) + '</div>'
      + '<div><div class="igp-cell-stat">' + p.grid.stat + '<small> ' + p.grid.statLab + '</small></div><div class="igp-cell-score">' + esc(p.grid.score) + '</div></div></div>'
      + (p.grid.badge ? '<div class="igp-cell-badge">' + p.grid.badge + '</div>' : '')
      + '<div class="igp-cell-hover"><span>♥ ' + p.likes + '</span><span>💬 ' + p.comments.length + '</span></div></div>';
  }

  /* ---- Onglet interne : MESSAGES ---- */
  function convRow(c) {
    const a = ACC[c.accId], last = c.messages[c.messages.length - 1] || { text: '', time: '' };
    const lastText = last.sharedPostId ? '📎 Publication partagée' : last.text;
    return '<div class="dm-conv' + (c.unread ? ' unread' : '') + (c.id === dmOpen ? ' active' : '') + '" data-conv="' + c.id + '">' + avatar(a, 'dm-av')
      + '<div class="dm-conv-body"><div class="dm-conv-name">' + esc(a.name) + (a.verified ? ' <span class="verified" style="color:var(--orange)">✔</span>' : '') + '</div><div class="dm-conv-last">' + esc(lastText) + '</div></div>'
      + '<div class="dm-conv-meta"><span class="dm-conv-time">' + esc(last.time) + '</span>' + (c.unread ? '<span class="dm-unread-dot"></span>' : '') + '</div></div>';
  }
  function msgHTML(m) {
    if (m.sharedPostId) {
      const p = postById(m.sharedPostId); if (!p) return '';
      const pa = ACC[p.accId];
      return '<div class="dm-msg ' + (m.from === 'me' ? 'me' : 'them') + '"><div class="dm-shared" data-openpost="' + p.id + '"><div class="dm-shared-head">' + avatar(pa, 'dm-shared-av') + '<span class="dm-shared-user">@' + esc(pa.handle) + '</span></div>'
        + '<div class="dm-shared-scene"><div class="dm-shared-eyebrow">' + p.eyebrow + '</div>' + (p.score ? '<div class="dm-shared-score mono">' + p.score.replace(/<[^>]+>/g, ' ') + '</div>' : '') + (p.stats && p.stats.length ? '<div class="dm-shared-stats">' + p.stats.slice(0, 3).map((s) => s[0]).join(' · ') + '</div>' : '') + '</div>'
        + '<div class="dm-shared-cap">Publication HoopFeed</div></div><div class="dm-time">' + esc(m.time) + '</div></div>';
    }
    return '<div class="dm-msg ' + (m.from === 'me' ? 'me' : 'them') + '"><div class="dm-bubble">' + esc(m.text) + '</div><div class="dm-time">' + esc(m.time) + '</div></div>';
  }
  function threadHTML(c) {
    const a = ACC[c.accId];
    return '<div class="dm-thread-head"><button class="dm-back" data-dmback aria-label="Retour"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 6l-6 6 6 6"/></svg></button>' + avatar(a, 'dm-av')
      + '<div><div class="dm-thread-name">' + esc(a.name) + (a.verified ? ' <span class="verified" style="color:var(--orange)">✔</span>' : '') + '</div><div class="dm-thread-sub">@' + esc(a.handle) + ' · ' + esc(a.poste || '') + '</div></div></div>'
      + '<div class="dm-msgs" id="dmMsgs">' + c.messages.map(msgHTML).join('') + '</div>'
      + '<form class="dm-compose" data-dmform="' + c.id + '"><input type="text" placeholder="Message…" data-dminput autocomplete="off"><button type="submit" class="dm-send">' + SEND_ICO + '</button></form>';
  }
  function emptyThread() { return '<div class="dm-empty">' + DM_BIG_ICO + '<div style="font-size:15px;color:var(--t2)">Tes messages</div><div style="font-size:12px">Sélectionne une conversation</div></div>'; }
  function renderHFMessages() {
    const list = CONVERSATIONS.map(convRow).join('');
    const thread = dmOpen ? threadHTML(convById(dmOpen)) : emptyThread();
    $('#hf-messages').innerHTML = '<div class="dm-layout' + (dmOpen ? ' show-thread' : '') + '"><div class="dm-list"><div class="dm-list-head">Messages</div>' + list + '</div><div class="dm-thread">' + thread + '</div></div>';
    const m = $('#dmMsgs'); if (m) m.scrollTop = m.scrollHeight;
  }
  function openConv(id) { dmOpen = id; const c = convById(id); if (c) c.unread = false; renderHFMessages(); refreshDmBadges(); }
  function sendMsg(convId, text) {
    const c = convById(convId); if (!c) return;
    c.messages.push({ from: 'me', text: text, time: nowTime() }); c.unread = false;
    renderHFMessages();
    setTimeout(() => { c.messages.push({ from: 'them', text: REPLIES[c.messages.length % REPLIES.length], time: nowTime() }); if (hfSub === 'messages' && dmOpen === convId) renderHFMessages(); }, 950);
  }

  /* ---- Overlay HoopFeed : post / mini-profil / partage ---- */
  let shareState = { postId: null, sent: {} };
  function openHF() { $('#hfOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeHF() { $('#hfOverlay').classList.remove('open'); document.body.style.overflow = ''; }
  function modalHead() { return '<div class="hf-modal-head"><button class="hf-close" id="hfClose" aria-label="Fermer"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'; }
  function openPost(id) { const p = postById(id); if (!p) return; $('#hfBox').innerHTML = modalHead() + postHTML(p); wirePost($('#hfBox')); openHF(); }
  function openAccount(id) {
    if (id === ME.id) { closeHF(); showView('hoopfeed'); setHfSub('profile'); return; }
    const a = ACC[id]; if (!a) return;
    const stats = a.season ? '<div class="mini-stats"><div class="mini-stat"><b>' + a.season.pts + '</b><span>PTS</span></div><div class="mini-stat"><b>' + a.season.reb + '</b><span>REB</span></div><div class="mini-stat"><b>' + a.season.pd + '</b><span>AST</span></div></div>' : '<div style="height:8px"></div>';
    $('#hfBox').innerHTML = modalHead() + '<div class="mini-prof"><div class="mini-av" style="background:' + (AV_GRAD[a.color] || AV_GRAD.orange) + '">' + esc(a.av) + '</div>'
      + '<div class="mini-name">' + esc(a.name) + (a.verified ? ' <span class="verified" style="color:var(--orange)">✔</span>' : '') + '</div><div class="mini-handle">@' + esc(a.handle) + '</div>'
      + '<div class="mini-role">' + esc((a.poste || '') + (a.club ? ' · ' + a.club : '')) + '</div>' + stats
      + '<div class="mini-actions"><button class="igp-btn primary" data-follow>Suivre</button><button class="igp-btn ghost" data-message="' + a.id + '">Message</button></div></div>';
    openHF();
  }
  function messageAccount(accId) {
    let c = CONVERSATIONS.find((x) => x.accId === accId);
    if (!c) { c = { id: 'c-' + accId, accId: accId, unread: false, messages: [] }; CONVERSATIONS.unshift(c); }
    closeHF(); showView('hoopfeed'); setHfSub('messages'); openConv(c.id);
  }
  function openShare(postId) { shareState = { postId: postId, sent: {} }; renderShare(); openHF(); }
  function renderShare() {
    const list = CONVERSATIONS.map((c) => { const a = ACC[c.accId], sent = shareState.sent[c.id]; return '<div class="share-item' + (sent ? ' sent' : '') + '" data-shareto="' + c.id + '">' + avatar(a, 'dm-av') + '<div class="dm-conv-body"><div class="dm-conv-name">' + esc(a.name) + '</div><div class="dm-conv-last">@' + esc(a.handle) + '</div></div>' + (sent ? '<span class="share-sent-tag">Envoyé ✓</span>' : '') + '</div>'; }).join('');
    $('#hfBox').innerHTML = modalHead() + '<div class="share-head">Partager la publication</div><div class="share-list">' + list + '</div>';
  }
  function shareToConv(convId) {
    const c = convById(convId); if (!c || shareState.sent[convId]) return;
    c.messages.push({ from: 'me', sharedPostId: shareState.postId, time: nowTime() });
    shareState.sent[convId] = true; renderShare(); renderHFMessages(); refreshDmBadges();
  }
  function refreshDmBadges() {
    const un = CONVERSATIONS.filter((c) => c.unread).length;
    $$('#pane-hoopfeed .hf-nav .dm-dot, #pane-hoopfeed .hf-dm-btn .dm-dot').forEach((d) => (d.style.display = un ? '' : 'none'));
  }

  /* ---- Coquille HoopFeed + nav interne ---- */
  let hfSub = 'feed', dmOpen = null;
  function unreadCount() { return CONVERSATIONS.filter((c) => c.unread).length; }
  function renderHoopFeed() {
    const un = unreadCount(), dot = un ? '<span class="dm-dot"></span>' : '';
    $('#pane-hoopfeed').innerHTML =
      '<div class="hf-app"><div class="hf-topbar"><span class="hf-wordmark">Hoop<em>Feed</em></span><span class="hf-public-pill">Espace public</span>'
      + '<button class="hf-dm-btn" data-hfsub="messages" aria-label="Messages">' + DM_ICO + dot + '</button></div>'
      + '<div class="hf-nav"><button data-hfsub="feed">' + HOME_ICO + '<span class="lbl">Feed</span></button>'
      + '<button data-hfsub="messages">' + DM_ICO + '<span class="lbl">Messages</span>' + dot + '</button>'
      + '<button data-hfsub="profile">' + USER_ICO + '<span class="lbl">Mon profil</span></button></div>'
      + '<div class="hf-sub" id="hf-feed"></div><div class="hf-sub" id="hf-messages"></div><div class="hf-sub" id="hf-profile"></div></div>';
    renderHFFeed(); renderHFProfile(); renderHFMessages();
    setHfSub(hfSub);
  }
  function setHfSub(sub) {
    hfSub = sub;
    $$('#pane-hoopfeed .hf-nav button').forEach((b) => b.classList.toggle('active', b.dataset.hfsub === sub));
    $$('#pane-hoopfeed .hf-sub').forEach((s) => s.classList.remove('active'));
    const t = $('#hf-' + sub); if (t) t.classList.add('active');
    if (sub === 'messages') { const m = $('#dmMsgs'); if (m) m.scrollTop = m.scrollHeight; }
  }

  /* ============================================================
     10. Routage & interactions globales
     ============================================================ */
  const VIEWS = ['dashboard', 'training', 'games', 'hoopfeed'];
  const TITLES = { dashboard: 'Dashboard', training: 'Entraînements', games: 'Game Center', hoopfeed: 'HoopFeed' };
  /* La navigation principale ne compte que deux espaces : « perf » (privé —
     Vue d'ensemble, Entraînements, Game Center, réunis sous Dashboard) et
     « social » (HoopFeed). Les trois pages privées se parcourent via la
     navigation interne .pv-nav, sans repasser par la nav principale. */
  const SPACES = { dashboard: 'perf', training: 'perf', games: 'perf', hoopfeed: 'social' };
  let current = 'dashboard';
  function showView(view, opts) {
    if (VIEWS.indexOf(view) === -1) return;
    const from = VIEWS.indexOf(current), to = VIEWS.indexOf(view);
    const dir = to > from ? 'enter-right' : 'enter-left';
    current = view;
    const space = SPACES[view];
    // nav principale : active sur l'espace, pas sur la page
    $$('.ptab').forEach((t) => t.classList.toggle('active', SPACES[t.dataset.view] === space));
    $$('.bn-item').forEach((t) => t.classList.toggle('active', SPACES[t.dataset.view] === space));
    // nav interne du Dashboard : active sur la page courante
    $$('.pv-tab').forEach((t) => {
      const on = t.dataset.view === view;
      t.classList.toggle('active', on);
      if (on) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
    });
    $$('.pspace').forEach((s) => s.classList.toggle('active', s.dataset.space === space));
    $$('.pview').forEach((v) => v.classList.remove('active', 'enter-right', 'enter-left'));
    const el = document.getElementById('view-' + view);
    if (el) el.classList.add('active', dir);
    const title = $('#tbTitle'); if (title) title.textContent = TITLES[view];
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.body.classList.remove('nav-open');
    if (opts && opts.subtab) {
      if (view === 'training') setTrainCat(opts.subtab);           // « Collectif » / « Tirs » venus du Dashboard
      // Game Center : page unique — « matchs » fait défiler jusqu'à la liste des matchs
      if (view === 'games' && opts.subtab === 'matchs') {
        const m = $('#gcMatches'); if (m) m.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function init() {
    renderDashboard(); renderTraining(); renderGames(); renderHoopFeed();

    document.addEventListener('click', (e) => {
      // navigation principale
      const nav = e.target.closest('[data-view]');
      if (nav) { showView(nav.dataset.view); return; }
      const goto = e.target.closest('[data-goto]');
      if (goto) { showView(goto.dataset.goto, { subtab: goto.dataset.subtab }); return; }
      // HoopFeed : nav interne + interactions sociales
      const hfs = e.target.closest('[data-hfsub]');
      if (hfs) { if (hfs.dataset.hfsub === 'messages') { dmOpen = null; renderHFMessages(); } setHfSub(hfs.dataset.hfsub); return; }
      const conv = e.target.closest('[data-conv]');
      if (conv) { openConv(conv.dataset.conv); return; }
      if (e.target.closest('[data-dmback]')) { dmOpen = null; renderHFMessages(); return; }
      const gp = e.target.closest('[data-gridpost]');
      if (gp) { openPost(gp.dataset.gridpost); return; }
      const op = e.target.closest('[data-openpost]');
      if (op) { openPost(op.dataset.openpost); return; }
      const shto = e.target.closest('[data-shareto]');
      if (shto) { shareToConv(shto.dataset.shareto); return; }
      const sh = e.target.closest('[data-share]');
      if (sh) { openShare(sh.dataset.share); return; }
      const msg = e.target.closest('[data-message]');
      if (msg) { messageAccount(msg.dataset.message); return; }
      const acc = e.target.closest('[data-account]');
      if (acc) { openAccount(acc.dataset.account); return; }
      const fol = e.target.closest('[data-follow]');
      if (fol) { const on = fol.textContent.trim() === 'Suivre'; fol.textContent = on ? 'Abonné' : 'Suivre'; fol.classList.toggle('ghost', on); fol.classList.toggle('primary', !on); return; }
      if (e.target.closest('#hfClose')) { closeHF(); return; }
      const hov = $('#hfOverlay'); if (hov && e.target === hov) { closeHF(); return; }
      // page Entraînement : familles, période du terrain, catégories, historique, détail
      const ptc = e.target.closest('[data-ptcat]');
      if (ptc) { if (current !== 'training') showView('training'); setTrainCat(ptc.dataset.ptcat, true); return; }
      const tper = e.target.closest('[data-tirper]');
      if (tper) { tirPeriod = Number(tper.dataset.tirper); tirZone = null; paintTirCourt(); return; }
      const pth = e.target.closest('[data-ptheme]');
      if (pth) { togglePersoTheme(pth.dataset.ptheme); return; }
      const pmore = e.target.closest('[data-ptmore]');
      if (pmore) { ptMore(pmore.dataset.ptmore); return; }
      const psess = e.target.closest('[data-ptsess]');
      if (psess) { const p = psess.dataset.ptsess.split(':'); openSession(p[0], p.slice(1).join(':')); return; }
      // Dashboard : sélecteur de statistique, période et « voir plus » d'activité
      const dst = e.target.closest('[data-dstat]');
      if (dst) { dashStat = dst.dataset.dstat; paintDashChart(); return; }
      const drg = e.target.closest('[data-drange]');
      if (drg) { dashRange = Number(drg.dataset.drange); paintDashChart(); return; }
      if (e.target.closest('[data-dactmore]')) { actShown += 6; paintActivity(); return; }
      const dfl = e.target.closest('[data-dactfil]');
      if (dfl) { actFilter = dfl.dataset.dactfil; actShown = 6; paintActivity(); return; }
      // Game Center : période, statistique du graphique, secteur du terrain, « voir plus »
      const gper = e.target.closest('[data-gcper]');
      if (gper) { gcPeriod = gper.dataset.gcper; gcShown = 6; paintGames(); return; }
      const gst = e.target.closest('[data-gcstat]');
      if (gst) { gcStat = gst.dataset.gcstat; paintGcChart(); return; }
      const gz = e.target.closest('[data-gczone]');
      if (gz) { gcZone = (gcZone === gz.dataset.gczone ? null : gz.dataset.gczone); paintGcCourtSide(gcZonesOf(gcGames())); return; }
      if (e.target.closest('[data-gcmore]')) { gcShown += 6; paintGcMatches(); return; }
      const gop = e.target.closest('[data-gcopen]');
      if (gop) { const p = gop.dataset.gcopen.split('|'); openMatch(p[0], p[1]); return; }
      const mm = e.target.closest('[data-match]');
      if (mm) { openMatch(mm.dataset.match); return; }
      const pq = e.target.closest('[data-q]');
      if (pq && pq.closest('[data-pbp-q]')) { pbpQuarter = pq.dataset.q; $$('[data-pbp-q] button').forEach((b) => b.classList.toggle('on', b === pq)); renderPBP(); return; }
      const pf = e.target.closest('[data-pf]');
      if (pf && pf.closest('[data-pbp-f]')) { pbpFilter = pf.dataset.pf; $$('[data-pbp-f] button').forEach((b) => b.classList.toggle('on', b === pf)); renderPBP(); return; }
      const st = e.target.closest('[data-stab]');
      if (st) { sheetTab = st.dataset.stab; $$('.sheet-tab').forEach((b) => b.classList.toggle('active', b === st)); $$('.sheet-pane').forEach((p) => p.classList.remove('active')); const sp = $('#spane-' + sheetTab); if (sp) sp.classList.add('active'); return; }
      if (e.target.closest('#sheetClose')) { closeMatch(); return; }
      const ov = $('#sheetOverlay'); if (ov && e.target === ov) { closeMatch(); return; }
    });

    // envoi de message (Entrée ou bouton)
    document.addEventListener('submit', (e) => {
      const f = e.target.closest('[data-dmform]');
      if (f) { e.preventDefault(); const inp = $('[data-dminput]', f); const t = inp.value.trim(); if (t) sendMsg(f.dataset.dmform, t); }
    });

    // drawer mobile
    const menuBtn = $('#menuBtn'), scrim = $('#appScrim');
    if (menuBtn) menuBtn.addEventListener('click', () => { const open = document.body.classList.toggle('nav-open'); menuBtn.setAttribute('aria-expanded', open); });
    if (scrim) scrim.addEventListener('click', () => document.body.classList.remove('nav-open'));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { document.body.classList.remove('nav-open'); closeMatch(); closeHF(); } });

    console.info('[HoopBoard] Espace joueur prêt — 2 espaces : Dashboard (Vue d’ensemble/Entraînements/Game Center) + HoopFeed social. Modèle HoopStore :', LOG.length, 'matchs,', PUBLIC_POSTS.length, 'posts publics,', CONVERSATIONS.length, 'conversations.');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
