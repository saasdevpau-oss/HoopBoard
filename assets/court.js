/**
 * HoopBoard — Composant terrain unique : BasketballCourt
 * ------------------------------------------------------------------
 * Demi-terrain FIBA, géométrie RÉELLE en mètres. Source de vérité unique
 * du terrain pour : Match Live, analyse d'un match, carte de tir joueur,
 * Game Center, entraînements de tir, récapitulatifs et heatmaps.
 *
 * Aucun écran ne doit recréer son propre terrain : tout passe par ce module.
 *
 * Repère public (normalisé, comme demandé par le brief) :
 *   CourtPosition = { x: 0..100, y: 0..100 }
 *     x : 0 = ligne de touche gauche, 100 = ligne de touche droite
 *     y : 0 = ligne de fond (sous le panier), 100 = milieu de terrain
 *
 * Deux fonctions centrales, testées unitairement (scripts/court.test.js) :
 *   getShotValue(pos)  -> 2 | 3   (règle : sur la ligne = 2 pts)
 *   getCourtZone(pos)  -> { id, label, value, group }   (18 zones)
 *
 * Expose `window.HoopCourt` (navigateur) ET `module.exports` (tests Node).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.HoopCourt = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  /* ================================================================
     1. GÉOMÉTRIE FIBA (mètres) — un seul panier, origine des calculs
     ================================================================ */
  const G = {
    W: 15,                       // largeur du terrain (ligne de fond)
    L: 14,                       // profondeur du demi-terrain
    basket: { x: 7.5, y: 1.575 },// centre du cercle (origine des distances)
    rimR: 0.225,                 // rayon du cercle
    backboardY: 1.20,            // panneau : distance à la ligne de fond
    backboardHalf: 0.9,          // demi-largeur du panneau (1,80 m)
    restrictedR: 1.25,           // demi-cercle de non-charge
    lane: { x0: 5.05, x1: 9.95, yLine: 5.80 }, // raquette + ligne de lancer franc
    ftCircleR: 1.80,             // cercle de lancer franc
    threeR: 6.75,                // arc à trois points
    cornerInset: 0.90,           // ligne droite corner : distance à la touche
    shortCornerY: 2.40           // limite haute des "short corners"
  };
  // Lignes droites des corners
  G.cornerLeftX = G.cornerInset;         // 0.90
  G.cornerRightX = G.W - G.cornerInset;  // 14.10
  // Jonction corner/arc : y où la ligne droite (x = cornerInset) rencontre l'arc
  G.cornerJunctionY = G.basket.y +
    Math.sqrt(G.threeR * G.threeR - Math.pow(G.basket.x - G.cornerLeftX, 2));

  const EPS = 1e-9;
  const SCALE = 40;                    // px SVG par mètre
  const SVG_W = G.W * SCALE;           // 600
  const SVG_H = G.L * SCALE;           // 560
  const MARGIN = 16;                   // marge SVG (traits non rognés)

  /* ---- conversions ---- */
  function toMeters(pos) { return { x: pos.x / 100 * G.W, y: pos.y / 100 * G.L }; }
  function toPercent(m) { return { x: m.x / G.W * 100, y: m.y / G.L * 100 }; }
  // normalisé -> unités SVG (le contenu occupe exactement [0,600]x[0,560])
  function toSvg(pos) { return { x: pos.x / 100 * SVG_W, y: pos.y / 100 * SVG_H }; }
  function mToSvg(m) { return { x: m.x * SCALE, y: m.y * SCALE }; }

  function distM(m) { return Math.hypot(m.x - G.basket.x, m.y - G.basket.y); }
  // bearing : 0 = axe vers le milieu (top), + = droite, - = gauche, ±180 = fond
  function bearingDeg(m) {
    return Math.atan2(m.x - G.basket.x, m.y - G.basket.y) * 180 / Math.PI;
  }

  function inCourt(pos) {
    return pos.x >= 0 && pos.x <= 100 && pos.y >= 0 && pos.y <= 100;
  }

  /* ================================================================
     2. VALEUR DU TIR : 2 ou 3 points
     ---------------------------------------------------------------
     - Les corners utilisent des LIGNES DROITES (pas un rayon circulaire).
     - Un tir doit être CLAIREMENT derrière l'arc pour valoir 3.
     - Un clic exactement sur la ligne fait partie de la zone à 2 points.
     ================================================================ */
  function getShotValue(pos) {
    const m = toMeters(pos);
    // Au-delà des lignes droites des corners = 3 pts (quel que soit y)
    if (m.x < G.cornerLeftX - EPS) return 3;
    if (m.x > G.cornerRightX + EPS) return 3;
    // Sinon l'arc décide ; strictement au-delà pour valoir 3 (ligne = 2)
    return distM(m) > G.threeR + EPS ? 3 : 2;
  }

  /* ================================================================
     3. ZONES DE TIR : 18 zones, fonction FAISANT AUTORITÉ
     ---------------------------------------------------------------
     La classification est une fonction pure -> chaque point du demi-terrain
     appartient à UNE seule zone, sans trou ni chevauchement (garanti par
     construction : arbre de décision exhaustif). Les formes SVG affichées
     (highlight / debug) sont échantillonnées à partir de cette fonction,
     donc toujours cohérentes avec elle.
     ================================================================ */
  const ZONES = {
    // Près du cercle
    'restricted-area-left':    { label: 'Cercle gauche',        value: 2, group: 'rim' },
    'restricted-area-center':  { label: 'Sous le cercle',       value: 2, group: 'rim' },
    'restricted-area-right':   { label: 'Cercle droit',         value: 2, group: 'rim' },
    // Raquette & courte distance
    'paint-left':              { label: 'Raquette gauche',      value: 2, group: 'paint' },
    'paint-center':            { label: 'Raquette axe',         value: 2, group: 'paint' },
    'paint-right':             { label: 'Raquette droite',      value: 2, group: 'paint' },
    'short-corner-left':       { label: 'Short corner gauche',  value: 2, group: 'paint' },
    'short-corner-right':      { label: 'Short corner droit',   value: 2, group: 'paint' },
    // Mi-distance
    'midrange-baseline-left':  { label: 'Baseline gauche',      value: 2, group: 'mid' },
    'midrange-wing-left':      { label: 'Aile gauche 2 pts',    value: 2, group: 'mid' },
    'midrange-center':         { label: 'Axe central 2 pts',    value: 2, group: 'mid' },
    'midrange-wing-right':     { label: 'Aile droite 2 pts',    value: 2, group: 'mid' },
    'midrange-baseline-right': { label: 'Baseline droite',      value: 2, group: 'mid' },
    // Trois points
    'three-corner-left':       { label: 'Corner gauche 3 pts',  value: 3, group: 'three' },
    'three-wing-left':         { label: 'Aile gauche 3 pts',    value: 3, group: 'three' },
    'three-top':               { label: 'Axe central 3 pts',    value: 3, group: 'three' },
    'three-wing-right':        { label: 'Aile droite 3 pts',    value: 3, group: 'three' },
    'three-corner-right':      { label: 'Corner droit 3 pts',   value: 3, group: 'three' }
  };
  const ZONE_IDS = Object.keys(ZONES);
  const OUT_OF_BOUNDS = { id: 'out-of-bounds', label: 'Hors terrain', value: null, group: 'out' };

  // Découpage angulaire (bearing) commun aux 3 pts et à la mi-distance
  function angularBand5(b) {
    if (b < -66) return 'baseline-left';
    if (b < -24) return 'wing-left';
    if (b <= 24) return 'center';
    if (b <= 66) return 'wing-right';
    return 'baseline-right';
  }

  function getCourtZone(pos) {
    if (!inCourt(pos)) return Object.assign({ id: OUT_OF_BOUNDS.id }, OUT_OF_BOUNDS);
    const m = toMeters(pos);
    const d = distM(m);
    const b = bearingDeg(m);
    const val = getShotValue(pos);
    let id;

    if (val === 3) {
      const band = angularBand5(b);
      id = band === 'baseline-left' ? 'three-corner-left'
        : band === 'wing-left' ? 'three-wing-left'
        : band === 'center' ? 'three-top'
        : band === 'wing-right' ? 'three-wing-right'
        : 'three-corner-right';
    } else if (d <= G.restrictedR) {
      id = m.x < G.basket.x - 0.35 ? 'restricted-area-left'
        : m.x > G.basket.x + 0.35 ? 'restricted-area-right'
        : 'restricted-area-center';
    } else if (m.x >= G.lane.x0 && m.x <= G.lane.x1 && m.y <= G.lane.yLine) {
      const third = (G.lane.x1 - G.lane.x0) / 3;
      id = m.x < G.lane.x0 + third ? 'paint-left'
        : m.x < G.lane.x0 + 2 * third ? 'paint-center'
        : 'paint-right';
    } else if ((m.x < G.lane.x0 || m.x > G.lane.x1) && m.y <= G.shortCornerY) {
      id = m.x < G.basket.x ? 'short-corner-left' : 'short-corner-right';
    } else {
      const band = angularBand5(b);
      id = band === 'baseline-left' ? 'midrange-baseline-left'
        : band === 'wing-left' ? 'midrange-wing-left'
        : band === 'center' ? 'midrange-center'
        : band === 'wing-right' ? 'midrange-wing-right'
        : 'midrange-baseline-right';
    }
    return Object.assign({ id }, ZONES[id]);
  }

  /* ================================================================
     4. RENDU SVG DU TERRAIN (toutes les lignes FIBA)
     ================================================================ */
  const NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  // Chaîne de path pour l'arc à trois points (jonction gauche -> top -> droite)
  function threeArcPath() {
    const jL = mToSvg({ x: G.cornerLeftX, y: G.cornerJunctionY });
    const jR = mToSvg({ x: G.cornerRightX, y: G.cornerJunctionY });
    const r = G.threeR * SCALE;
    return `M ${jL.x} ${jL.y} A ${r} ${r} 0 0 0 ${jR.x} ${jR.y}`;
  }

  function buildCourtLines(svg) {
    const g = el('g', { class: 'hbc-lines', fill: 'none' });
    const basket = mToSvg(G.basket);

    // Limites : ligne de fond (haut), lignes latérales, milieu (bas)
    g.appendChild(el('rect', { class: 'hbc-ln hbc-bounds', x: 0, y: 0, width: SVG_W, height: SVG_H, rx: 2 }));

    // Raquette + ligne de lancer franc (bord supérieur de la raquette)
    const lane = { x: G.lane.x0 * SCALE, w: (G.lane.x1 - G.lane.x0) * SCALE, h: G.lane.yLine * SCALE };
    g.appendChild(el('rect', { class: 'hbc-ln', x: lane.x, y: 0, width: lane.w, height: lane.h }));

    // Cercle de lancer franc : moitié haute pleine, moitié basse pointillée
    const ftc = mToSvg({ x: G.basket.x, y: G.lane.yLine });
    const ftr = G.ftCircleR * SCALE;
    g.appendChild(el('path', { class: 'hbc-ln', d: `M ${ftc.x - ftr} ${ftc.y} A ${ftr} ${ftr} 0 0 1 ${ftc.x + ftr} ${ftc.y}` }));
    g.appendChild(el('path', { class: 'hbc-ln hbc-dash', d: `M ${ftc.x - ftr} ${ftc.y} A ${ftr} ${ftr} 0 0 0 ${ftc.x + ftr} ${ftc.y}` }));

    // Demi-cercle de non-charge (restricted area) + montants vers le panneau
    const rr = G.restrictedR * SCALE;
    g.appendChild(el('path', { class: 'hbc-ln', d: `M ${basket.x - rr} ${basket.y} A ${rr} ${rr} 0 0 0 ${basket.x + rr} ${basket.y}` }));
    const bbY = G.backboardY * SCALE;
    g.appendChild(el('line', { class: 'hbc-ln', x1: basket.x - rr, y1: basket.y, x2: basket.x - rr, y2: bbY }));
    g.appendChild(el('line', { class: 'hbc-ln', x1: basket.x + rr, y1: basket.y, x2: basket.x + rr, y2: bbY }));

    // Ligne à trois points : deux droites (corners) + arc
    const jY = G.cornerJunctionY * SCALE;
    g.appendChild(el('line', { class: 'hbc-ln', x1: G.cornerLeftX * SCALE, y1: 0, x2: G.cornerLeftX * SCALE, y2: jY }));
    g.appendChild(el('line', { class: 'hbc-ln', x1: G.cornerRightX * SCALE, y1: 0, x2: G.cornerRightX * SCALE, y2: jY }));
    g.appendChild(el('path', { class: 'hbc-ln', d: threeArcPath() }));

    // Panneau + cercle (rim)
    g.appendChild(el('line', { class: 'hbc-ln hbc-board', x1: (G.basket.x - G.backboardHalf) * SCALE, y1: bbY, x2: (G.basket.x + G.backboardHalf) * SCALE, y2: bbY }));
    g.appendChild(el('line', { class: 'hbc-ln hbc-rim', x1: basket.x, y1: bbY, x2: basket.x, y2: basket.y - G.rimR * SCALE }));
    g.appendChild(el('circle', { class: 'hbc-ln hbc-rim', cx: basket.x, cy: basket.y, r: G.rimR * SCALE }));

    // Demi rond central (milieu de terrain, en bas)
    const cc = G.ftCircleR * SCALE;
    g.appendChild(el('path', { class: 'hbc-ln hbc-soft', d: `M ${SVG_W / 2 - cc} ${SVG_H} A ${cc} ${cc} 0 0 1 ${SVG_W / 2 + cc} ${SVG_H}` }));

    svg.appendChild(g);
  }

  /* ---- échantillonnage : zones (highlight) & debug ---- */
  const GROUP_COLORS = { rim: '#E4682A', paint: '#C25B45', mid: '#7BA6C9', three: '#6FBF8B', out: '#888' };
  const DEBUG_PALETTE = [
    '#e4682a', '#f0913f', '#c25b45', '#a8443a', '#d98a6b', '#b5654a', '#8c5a3c',
    '#7ba6c9', '#5f8bb0', '#9fc0d8', '#4a789e', '#6f9cc0',
    '#6fbf8b', '#4fa873', '#8fd0a5', '#3d8f60', '#5fb37f', '#7cc596'
  ];
  function zoneColor(id, debug) {
    if (debug) { const i = ZONE_IDS.indexOf(id); return i < 0 ? '#888' : DEBUG_PALETTE[i % DEBUG_PALETTE.length]; }
    const z = ZONES[id]; return z ? GROUP_COLORS[z.group] : '#888';
  }

  // Construit un <g> de cellules colorées ; si `only` fourni, ne peint que cette zone.
  function buildSampleLayer(opts) {
    const step = opts.step || 1.8;                 // pas en unités normalisées
    const only = opts.only || null;
    const debug = !!opts.debug;
    const g = el('g', { class: 'hbc-sample', 'pointer-events': 'none' });
    const cw = step / 100 * SVG_W, ch = step / 100 * SVG_H;
    for (let ny = step / 2; ny < 100; ny += step) {
      for (let nx = step / 2; nx < 100; nx += step) {
        const z = getCourtZone({ x: nx, y: ny });
        if (z.id === OUT_OF_BOUNDS.id) continue;
        if (only && z.id !== only) continue;
        const p = toSvg({ x: nx - step / 2, y: ny - step / 2 });
        g.appendChild(el('rect', {
          x: p.x.toFixed(2), y: p.y.toFixed(2), width: (cw + 0.6).toFixed(2), height: (ch + 0.6).toFixed(2),
          fill: zoneColor(z.id, debug), opacity: debug ? 0.42 : 0.24
        }));
      }
    }
    return g;
  }

  // Heatmap : colore chaque zone selon une valeur 0..1 (rouge -> or -> vert).
  function heatColor(t) {
    t = Math.max(0, Math.min(1, t));
    const stops = [[192, 86, 69], [201, 158, 99], [127, 160, 95]]; // loss, gold, win (charte)
    const seg = t < 0.5 ? 0 : 1, f = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
    const a = stops[seg], b = stops[seg + 1], c = (k) => Math.round(a[k] + (b[k] - a[k]) * f);
    return `rgb(${c(0)},${c(1)},${c(2)})`;
  }
  function buildHeatLayer(heatmap) {
    const step = 1.8, g = el('g', { class: 'hbc-heat', 'pointer-events': 'none' });
    const cw = step / 100 * SVG_W, ch = step / 100 * SVG_H;
    for (let ny = step / 2; ny < 100; ny += step) {
      for (let nx = step / 2; nx < 100; nx += step) {
        const z = getCourtZone({ x: nx, y: ny });
        if (z.id === OUT_OF_BOUNDS.id) continue;
        const h = heatmap[z.id]; if (h == null) continue;
        const v = typeof h === 'object' ? h.value : h; if (v == null) continue;
        const p = toSvg({ x: nx - step / 2, y: ny - step / 2 });
        g.appendChild(el('rect', { x: p.x.toFixed(2), y: p.y.toFixed(2), width: (cw + 0.6).toFixed(2), height: (ch + 0.6).toFixed(2), fill: heatColor(v), opacity: 0.5 }));
      }
    }
    return g;
  }

  function buildDebugLabels() {
    const g = el('g', { class: 'hbc-debug-labels', 'pointer-events': 'none' });
    // libellé au centroïde approximatif de chaque zone (moyenne des échantillons)
    const acc = {};
    const step = 1.2;
    for (let ny = step / 2; ny < 100; ny += step) {
      for (let nx = step / 2; nx < 100; nx += step) {
        const z = getCourtZone({ x: nx, y: ny });
        if (z.id === OUT_OF_BOUNDS.id) continue;
        (acc[z.id] || (acc[z.id] = { sx: 0, sy: 0, n: 0 }));
        acc[z.id].sx += nx; acc[z.id].sy += ny; acc[z.id].n++;
      }
    }
    Object.keys(acc).forEach(id => {
      const a = acc[id], p = toSvg({ x: a.sx / a.n, y: a.sy / a.n });
      const t = el('text', { x: p.x.toFixed(1), y: p.y.toFixed(1), 'text-anchor': 'middle', class: 'hbc-debug-id' });
      t.textContent = id;
      g.appendChild(t);
    });
    return g;
  }

  /* ---- marqueurs de tir ---- */
  function buildShots(shots, opts) {
    const g = el('g', { class: 'hbc-shots' });
    (shots || []).forEach(s => {
      if (s.x == null || s.y == null) return;
      const p = toSvg(s);
      const made = s.result === 'made' || s.made === true;
      const r = opts.markerRadius || 7;
      if (made) {
        g.appendChild(el('circle', { cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: r, class: 'hbc-shot made', 'data-id': s.id || '' }));
      } else {
        const d = r * 0.8;
        const cross = el('g', { class: 'hbc-shot miss', 'data-id': s.id || '' });
        cross.appendChild(el('line', { x1: (p.x - d).toFixed(1), y1: (p.y - d).toFixed(1), x2: (p.x + d).toFixed(1), y2: (p.y + d).toFixed(1) }));
        cross.appendChild(el('line', { x1: (p.x + d).toFixed(1), y1: (p.y - d).toFixed(1), x2: (p.x - d).toFixed(1), y2: (p.y + d).toFixed(1) }));
        g.appendChild(cross);
      }
    });
    return g;
  }

  /* ================================================================
     5. render(container, props) — composant réutilisable
     ================================================================
     props (BasketballCourtProps, adapté vanilla) :
       mode: 'live'|'analysis'|'training'|'readonly'
       shots: [{x,y,result|made,id}]
       highlightZones: [zoneId] | zoneId
       selectedZoneId, showZoneLabels, showShotMarkers (défaut true si shots)
       debug: bool  (mode développeur : zones colorées + ids + lecture du clic)
       onCourtClick(pos, info), onZoneSelect(zone)
     Retourne une petite API { svg, update, setDebug, destroy }.
  */
  function render(container, props) {
    if (typeof document === 'undefined') throw new Error('HoopCourt.render nécessite un DOM');
    props = props || {};
    const state = {
      mode: props.mode || 'readonly',
      debug: !!props.debug,
      shots: props.shots || [],
      selectedZoneId: props.selectedZoneId || null,
      highlightZones: normalizeZones(props.highlightZones),
      heatmap: props.heatmap || null
    };

    container.innerHTML = '';
    container.classList.add('hbc-root');
    const svg = el('svg', {
      class: 'hbc-svg', viewBox: `${-MARGIN} ${-MARGIN} ${SVG_W + 2 * MARGIN} ${SVG_H + 2 * MARGIN}`,
      role: 'img', 'aria-label': 'Demi-terrain de basket FIBA'
    });
    const layerZones = el('g', { class: 'hbc-layer-zones' });
    const layerLines = el('g', { class: 'hbc-layer-lines' });
    const layerShots = el('g', { class: 'hbc-layer-shots' });
    const layerDebug = el('g', { class: 'hbc-layer-debug' });
    buildCourtLines(layerLines);
    svg.appendChild(layerZones); svg.appendChild(layerLines);
    svg.appendChild(layerShots); svg.appendChild(layerDebug);

    // zone d'interaction (capte les clics du terrain)
    const hit = el('rect', { class: 'hbc-hit', x: 0, y: 0, width: SVG_W, height: SVG_H, fill: 'transparent' });
    if (state.mode === 'live' || state.mode === 'analysis' || state.mode === 'training' || props.onCourtClick || props.onZoneSelect) {
      hit.style.cursor = 'crosshair';
      hit.addEventListener('click', onClick);
    }
    svg.appendChild(hit);
    container.appendChild(svg);

    const readout = el('div', { class: 'hbc-readout' }); // debug : lecture du clic
    if (state.debug) container.appendChild(readout);

    function eventToPos(evt) {
      const pt = svg.createSVGPoint();
      const t = (evt.changedTouches && evt.changedTouches[0]) || evt;
      pt.x = t.clientX; pt.y = t.clientY;
      const m = svg.getScreenCTM(); if (!m) return null;
      const p = pt.matrixTransform(m.inverse());
      return { x: clamp(p.x / SVG_W * 100, 0, 100), y: clamp(p.y / SVG_H * 100, 0, 100) };
    }

    function onClick(evt) {
      const pos = eventToPos(evt); if (!pos) return;
      const value = getShotValue(pos);
      const zone = getCourtZone(pos);
      if (state.debug) {
        readout.textContent = `x=${pos.x.toFixed(1)} y=${pos.y.toFixed(1) } · ${value} pts · ${zone.id}`;
      }
      if (typeof props.onZoneSelect === 'function') props.onZoneSelect(zone, pos);
      if (typeof props.onCourtClick === 'function') props.onCourtClick(pos, { value: value, zone: zone });
    }

    function draw() {
      // zones : highlight / sélection / debug
      layerZones.innerHTML = '';
      if (state.debug) {
        layerZones.appendChild(buildSampleLayer({ step: 1.6, debug: true }));
      } else {
        if (state.heatmap) layerZones.appendChild(buildHeatLayer(state.heatmap));
        const hl = state.highlightZones.slice();
        if (state.selectedZoneId) hl.push(state.selectedZoneId);
        hl.forEach(id => layerZones.appendChild(buildSampleLayer({ only: id, step: 1.6 })));
      }
      // marqueurs
      layerShots.innerHTML = '';
      const showMarkers = props.showShotMarkers !== false;
      if (showMarkers && state.shots.length) layerShots.appendChild(buildShots(state.shots, props));
      // labels debug
      layerDebug.innerHTML = '';
      if (state.debug && props.showZoneLabels !== false) layerDebug.appendChild(buildDebugLabels());
    }
    draw();

    const apiObj = {
      svg: svg,
      update: function (patch) {
        if (!patch) return;
        if ('shots' in patch) state.shots = patch.shots || [];
        if ('highlightZones' in patch) state.highlightZones = normalizeZones(patch.highlightZones);
        if ('selectedZoneId' in patch) state.selectedZoneId = patch.selectedZoneId || null;
        if ('heatmap' in patch) state.heatmap = patch.heatmap || null;
        draw();
      },
      setDebug: function (on) {
        state.debug = !!on;
        if (state.debug && !readout.isConnected) container.appendChild(readout);
        if (!state.debug && readout.isConnected) readout.remove();
        draw();
      },
      destroy: function () { container.innerHTML = ''; }
    };
    return apiObj;
  }

  function normalizeZones(z) { return z == null ? [] : (Array.isArray(z) ? z.slice() : [z]); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ================================================================
     5b. renderFull(container, props) — TERRAIN COMPLET (deux moitiés)
     ----------------------------------------------------------------
     Terrain paysage complet = deux demi-terrains FIBA en miroir autour de
     la ligne médiane. Réutilise EXACTEMENT la même logique de zones et de
     valeur des tirs (getCourtZone / getShotValue) que le demi-terrain :
     chaque clic est ramené au repère local (0..100) de la moitié touchée,
     puis classé. Les deux côtés sont donc parfaitement symétriques.

       props:
         active: 'home' | 'away'        (moitié « armée » pour la saisie)
         onZone(info, evt)              (clic sur la moitié active)
         onInactive(info, evt)          (clic sur l'autre moitié — optionnel)
       info = { side, pos:{x,y}, zoneId, zoneName, value, group }
              pos = repère normalisé LOCAL de la moitié (comme le demi-terrain)

     API : { svg, setActiveSide, highlight(info), renderMarks(shots),
             screenToInfo, destroy }
       shots = [{ side, x, y, result:'made'|'missed', subKind? }]
     ================================================================ */
  function renderFull(container, props) {
    if (typeof document === 'undefined') throw new Error('HoopCourt.renderFull nécessite un DOM');
    props = props || {};
    const SC = 32, MG = 16, LEN = 2 * G.L, WID = G.W;      // 28m × 15m
    const FW = LEN * SC, FH = WID * SC, MID = LEN / 2;
    const B = G.basket;                                     // { x:7.5, y:1.575 }
    const state = { active: props.active === 'away' ? 'away' : 'home' };

    // repère interne (cx = largeur 0..15, cy = profondeur 0..14) -> écran
    function TS(cx, cy, side) { return { x: (side === 'home' ? cy : (LEN - cy)) * SC, y: cx * SC }; }
    function screenToInfo(sx, sy) {
      const fx = sx / SC, fy = sy / SC, side = fx <= MID ? 'home' : 'away';
      const cy = side === 'home' ? fx : (LEN - fx), cx = fy;
      const pos = { x: clamp(cx / WID * 100, 0, 100), y: clamp(cy / G.L * 100, 0, 100) };
      const z = getCourtZone(pos);
      return { side: side, pos: pos, zoneId: z.id, zoneName: z.label, value: getShotValue(pos), group: z.group };
    }
    // échantillonnage d'arcs (repère interne)
    function arcCS(bx, by, r, t0, t1, n) { const p = []; for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n; p.push([bx + r * Math.cos(t), by + r * Math.sin(t)]); } return p; }
    function arcPhi(bx, by, r, f0, f1, n) { const p = []; for (let i = 0; i <= n; i++) { const f = f0 + (f1 - f0) * i / n; p.push([bx + r * Math.sin(f), by + r * Math.cos(f)]); } return p; }
    function seg(cx1, cy1, cx2, cy2, side, cls) { const a = TS(cx1, cy1, side), b = TS(cx2, cy2, side); return el('line', { class: cls || 'hbcf-ln', x1: a.x.toFixed(1), y1: a.y.toFixed(1), x2: b.x.toFixed(1), y2: b.y.toFixed(1) }); }
    function poly(pts, side, cls) { const d = pts.map((p) => { const s = TS(p[0], p[1], side); return s.x.toFixed(1) + ',' + s.y.toFixed(1); }).join(' '); return el('polyline', { class: cls || 'hbcf-ln', points: d }); }
    function circM(cx, cy, r, side, cls) { const c = TS(cx, cy, side); return el('circle', { class: cls || 'hbcf-ln', cx: c.x.toFixed(1), cy: c.y.toFixed(1), r: (r * SC).toFixed(1) }); }

    const PHI = Math.acos((G.cornerJunctionY - B.y) / G.threeR);   // ½ ouverture de l'arc 3 pts
    function buildHalf(g, side) {
      // raquette (3 côtés + ligne des lancers)
      g.appendChild(poly([[G.lane.x0, 0], [G.lane.x0, G.lane.yLine], [G.lane.x1, G.lane.yLine], [G.lane.x1, 0]], side));
      // demi-cercle de non-charge + montants
      g.appendChild(poly(arcCS(B.x, B.y, G.restrictedR, 0, Math.PI, 22), side));
      g.appendChild(seg(B.x - G.restrictedR, B.y, B.x - G.restrictedR, G.backboardY, side));
      g.appendChild(seg(B.x + G.restrictedR, B.y, B.x + G.restrictedR, G.backboardY, side));
      // cercle des lancers : moitié pleine (côté fond) + moitié pointillée
      g.appendChild(poly(arcCS(B.x, G.lane.yLine, G.ftCircleR, Math.PI, 2 * Math.PI, 26), side));
      g.appendChild(poly(arcCS(B.x, G.lane.yLine, G.ftCircleR, 0, Math.PI, 26), side, 'hbcf-ln hbcf-dash'));
      // ligne à 3 points : corners droits + arc
      g.appendChild(seg(G.cornerLeftX, 0, G.cornerLeftX, G.cornerJunctionY, side));
      g.appendChild(seg(G.cornerRightX, 0, G.cornerRightX, G.cornerJunctionY, side));
      g.appendChild(poly(arcPhi(B.x, B.y, G.threeR, -PHI, PHI, 44), side));
      // panneau + cercle
      g.appendChild(seg(B.x - G.backboardHalf, G.backboardY, B.x + G.backboardHalf, G.backboardY, side, 'hbcf-ln hbcf-board'));
      g.appendChild(seg(B.x, G.backboardY, B.x, B.y - G.rimR, side, 'hbcf-ln hbcf-rim'));
      g.appendChild(circM(B.x, B.y, G.rimR, side, 'hbcf-ln hbcf-rim'));
      // guides de zones (repères d'ailes/corners, très discrets)
      [24, 66, -24, -66].forEach((deg) => {
        const b = deg * Math.PI / 180, r0 = 2.0, r1 = G.threeR;
        g.appendChild(seg(B.x + r0 * Math.sin(b), B.y + r0 * Math.cos(b), B.x + r1 * Math.sin(b), B.y + r1 * Math.cos(b), side, 'hbcf-ln hbcf-guide'));
      });
    }

    container.innerHTML = '';
    container.classList.add('hbcf-root');
    const svg = el('svg', { class: 'hbcf-svg hbcf-' + state.active, viewBox: (-MG) + ' ' + (-MG) + ' ' + (FW + 2 * MG) + ' ' + (FH + 2 * MG), role: 'img', 'aria-label': 'Terrain de basket complet — notre moitié et celle de l’adversaire' });
    svg.appendChild(el('rect', { class: 'hbcf-bg', x: 0, y: 0, width: FW, height: FH, rx: 16 }));
    const gl = el('g', { class: 'hbcf-lines', fill: 'none' });
    gl.appendChild(el('rect', { class: 'hbcf-ln hbcf-bounds', x: 0, y: 0, width: FW, height: FH, rx: 16 }));
    gl.appendChild(el('line', { class: 'hbcf-ln hbcf-mid', x1: MID * SC, y1: 0, x2: MID * SC, y2: FH }));
    gl.appendChild(el('circle', { class: 'hbcf-ln hbcf-soft', cx: MID * SC, cy: (WID / 2) * SC, r: G.ftCircleR * SC }));
    buildHalf(gl, 'home'); buildHalf(gl, 'away');
    svg.appendChild(gl);
    const marks = el('g', { class: 'hbcf-marks' }); svg.appendChild(marks);
    const dimHome = el('rect', { class: 'hbcf-dim hbcf-dim-home', x: 0, y: 0, width: FW / 2, height: FH });
    const dimAway = el('rect', { class: 'hbcf-dim hbcf-dim-away', x: FW / 2, y: 0, width: FW / 2, height: FH });
    svg.appendChild(dimHome); svg.appendChild(dimAway);
    const zonehi = el('circle', { class: 'hbcf-zonehi', r: 42, cx: -300, cy: -300 }); svg.appendChild(zonehi);
    const hit = el('rect', { class: 'hbcf-hit', x: -MG, y: -MG, width: FW + 2 * MG, height: FH + 2 * MG, fill: 'transparent' });
    svg.appendChild(hit);
    container.appendChild(svg);

    function eventToSvg(evt) { const pt = svg.createSVGPoint(), t = (evt.changedTouches && evt.changedTouches[0]) || evt; pt.x = t.clientX; pt.y = t.clientY; const m = svg.getScreenCTM(); if (!m) return null; const p = pt.matrixTransform(m.inverse()); return { x: p.x, y: p.y }; }
    hit.addEventListener('click', (evt) => {
      const p = eventToSvg(evt); if (!p) return;
      const info = screenToInfo(p.x, p.y);
      if (info.side !== state.active) { if (typeof props.onInactive === 'function') props.onInactive(info, evt); return; }
      if (typeof props.onZone === 'function') props.onZone(info, evt);
    });

    function applyActive() { svg.setAttribute('class', 'hbcf-svg hbcf-' + state.active); }
    applyActive();

    const api = {
      svg: svg,
      screenToInfo: screenToInfo,
      setActiveSide: function (side) { state.active = side === 'away' ? 'away' : 'home'; applyActive(); },
      highlight: function (info) {
        const cx = info.pos.x / 100 * WID, cy = info.pos.y / 100 * G.L, s = TS(cx, cy, info.side);
        zonehi.setAttribute('cx', s.x.toFixed(1)); zonehi.setAttribute('cy', s.y.toFixed(1));
        zonehi.classList.remove('on'); void zonehi.getBBox; requestAnimationFrame(() => zonehi.classList.add('on'));
        clearTimeout(api._hl); api._hl = setTimeout(() => zonehi.classList.remove('on'), 620);
      },
      renderMarks: function (shots) {
        marks.innerHTML = '';
        (shots || []).forEach((sh) => {
          if (sh.x == null || sh.y == null) return;
          const cx = sh.x / 100 * WID, cy = sh.y / 100 * G.L, s = TS(cx, cy, sh.side || 'home');
          if (sh.result === 'made') {
            const gmk = el('g', { class: 'mkf mkf-made' });
            gmk.appendChild(el('circle', { class: 'ring', cx: s.x.toFixed(1), cy: s.y.toFixed(1), r: 7 }));
            gmk.appendChild(el('circle', { class: 'core', cx: s.x.toFixed(1), cy: s.y.toFixed(1), r: 2.6 }));
            marks.appendChild(gmk);
          } else if (sh.subKind === 'shooting-foul') {
            const gmk = el('g', { class: 'mkf mkf-foul' }); gmk.appendChild(el('circle', { cx: s.x.toFixed(1), cy: s.y.toFixed(1), r: 5.5 })); marks.appendChild(gmk);
          } else {
            const gmk = el('g', { class: 'mkf mkf-miss' }), d = 5.2;
            gmk.appendChild(el('line', { x1: (s.x - d).toFixed(1), y1: (s.y - d).toFixed(1), x2: (s.x + d).toFixed(1), y2: (s.y + d).toFixed(1) }));
            gmk.appendChild(el('line', { x1: (s.x + d).toFixed(1), y1: (s.y - d).toFixed(1), x2: (s.x - d).toFixed(1), y2: (s.y + d).toFixed(1) }));
            marks.appendChild(gmk);
          }
        });
      },
      destroy: function () { container.innerHTML = ''; },
    };
    return api;
  }

  /* ================================================================
     6. API publique
     ================================================================ */
  return {
    GEOMETRY: G,
    ZONES: ZONES,
    ZONE_IDS: ZONE_IDS,
    OUT_OF_BOUNDS: OUT_OF_BOUNDS,
    getShotValue: getShotValue,
    getCourtZone: getCourtZone,
    inCourt: inCourt,
    toMeters: toMeters,
    toPercent: toPercent,
    render: render,
    renderFull: renderFull,
    _internals: { distM: distM, bearingDeg: bearingDeg, toSvg: toSvg, SVG_W: SVG_W, SVG_H: SVG_H }
  };
});
