/**
 * HoopBoard — Géométrie de demi-terrain FIBA + zones de tir (Match Live)
 *
 * Objectif : fournir la VRAIE géométrie FIBA du demi-terrain offensif, pour que
 * la valeur d'un tir (2 ou 3 points) découle de la position réelle et non d'un
 * `data-pts` écrit à la main, et pour que les 18 zones de saisie épousent
 * exactement la raquette, le cercle des lancers francs, l'arc à 6,75 m et les
 * segments droits des corners.
 *
 * ⚠️ Module autonome (browser) : aucune dépendance, aucun effet de bord global,
 * aucun CSS touché, aucune API appelée. Il n'expose que des fonctions pures de
 * géométrie + des générateurs de chaînes SVG.
 *
 * DIRECTION ARTISTIQUE — le rendu reprend telle quelle la charte du terrain 3D
 * du Game Center (coach.html, `.fullcourt` / `.fc-plane`) : parquet érable
 * #CFA76A tramé, grain fractal, traits crème #EFE7D4, cercle orange ballon
 * #D96F3F, raquette sombre #10181A, reflets de vernis et bordure d'arène. La
 * perspective, elle, reste CSS (`.lm-plane`, cf. assets/live-match.css) comme
 * sur `.fc-plane` — le SVG est donc à plat et le navigateur gère le hit-test.
 *
 * COMPATIBILITÉ — ce module n'invente pas un nouveau référentiel de données :
 *  - les 18 zones analytiques sont FINES (saisie + carte de tirs live) ;
 *  - `toLegacyZone()` les projette sur les 8 clés canoniques de
 *    assets/court-analytics.js (= `zonesTirSaison` de PR4.3, exposées par
 *    /api/club sous `zonesTir`). Ces 8 clés restent la seule chose persistée
 *    dans `meta.zone`, donc rien n'est cassé côté saison / API.
 *  - `migrateZoneId()` traduit les identifiants du découpage précédent (14
 *    zones) pour qu'un match en cours dans localStorage reste lisible.
 *
 * UNITÉS — centimètres réels FIBA, panier EN BAS (même orientation que
 * court-analytics.js, où le cercle est à cy=425 sur 470, et que les cartes de
 * tirs NBA/Synergy).
 */
(function (root) {
  "use strict";

  /* -------------------------------------------------------------------------
   * 1. Cotes officielles FIBA (en cm). Source : règlement FIBA, art. 2.
   * ---------------------------------------------------------------------- */
  var W = 1500;                 // largeur du terrain : 15 m
  var H = 1400;                 // demi-terrain : 14 m
  var BASELINE = H;             // ligne de fond (en bas)
  var RING_X = W / 2;           // 750
  var RING_Y = H - 157.5;       // 1242.5 — centre du cercle à 1,575 m du fond
  var RING_R = 22.5;            // rayon du cercle : 45 cm de diamètre
  var BACKBOARD_Y = H - 120;    // planche à 1,20 m de la ligne de fond
  var BACKBOARD_HW = 90;        // demi-largeur de la planche (1,80 m)
  var RA_R = 125;               // demi-cercle de non-charge : 1,25 m
  var PAINT_L = 505;            // raquette : 4,90 m de large, centrée
  var PAINT_R = 995;
  var FT_Y = H - 580;           // ligne des lancers francs à 5,80 m → 820
  var FT_R = 180;               // cercle des lancers francs : 1,80 m
  var THREE_R = 675;            // arc à 3 points : 6,75 m du centre du cercle
  var CORNER_X = 90;            // lignes de corner à 0,90 m des lignes de touche
  var CORNER_X2 = W - CORNER_X; // 1410

  // Bas de la « tête de raquette » : bande haute de la raquette rattachée à la
  // zone des lancers francs plutôt qu'aux ailes de la raquette.
  var KEY_TOP_Y = FT_Y + 200;   // 1020

  // Ordonnée où la ligne droite du corner rejoint l'arc (tangence exacte).
  var CORNER_Y = RING_Y - Math.sqrt(THREE_R * THREE_R - (RING_X - CORNER_X) * (RING_X - CORNER_X));
  // Angle correspondant, mesuré depuis l'axe « face au panier » (≈ 77,9°).
  var CORNER_A = deg(Math.atan2(RING_X - CORNER_X, RING_Y - CORNER_Y));

  /* -------------------------------------------------------------------------
   * 2. Cadrage. Un demi-terrain FIBA fait 15 m × 14 m : affiché en entier il
   *    est presque carré, donc étroit dès qu'on veut un terrain LARGE. On
   *    cadre donc sur la zone où l'on tire réellement — de la ligne de fond
   *    jusqu'à 2,4 m derrière l'arc — ce qui donne un format ~1,4:1 exploitable
   *    en pleine largeur. `VIEW_TOP` borne aussi les zones à 3 points : elles
   *    s'arrêtent au cadre au lieu de filer jusqu'à la ligne médiane.
   * ---------------------------------------------------------------------- */
  var VIEW_TOP = 330;                       // 10,7 m de la ligne de fond
  var MARGIN = 30;                          // marge pour ne pas rogner les traits
  var VIEWBOX = -MARGIN + " " + (VIEW_TOP - MARGIN) + " "
              + (W + MARGIN * 2) + " " + (BASELINE - VIEW_TOP + MARGIN * 2);

  function deg(rad) { return rad * 180 / Math.PI; }
  function rad(d) { return d * Math.PI / 180; }

  /* -------------------------------------------------------------------------
   * 3. Repère polaire centré sur le cercle.
   *    θ = 0 → face au panier (vers le milieu de terrain) ; θ > 0 → à droite.
   *    Direction cartésienne : (sin θ, −cos θ).
   * ---------------------------------------------------------------------- */
  function angleOf(x, y) { return Math.atan2(x - RING_X, RING_Y - y); }
  function distOf(x, y) { return Math.hypot(x - RING_X, y - RING_Y); }
  function polar(th, r) { return { x: RING_X + Math.sin(th) * r, y: RING_Y - Math.cos(th) * r }; }

  /** Distance du cercle à la sortie d'une boîte, le long de θ. Le cercle doit
   *  être strictement à l'intérieur de la boîte (vrai pour la raquette et pour
   *  le terrain). */
  function rayBoxExit(th, x0, x1, y0, y1) {
    var sx = Math.sin(th), sy = -Math.cos(th), t = Infinity;
    if (sx > 1e-9) t = Math.min(t, (x1 - RING_X) / sx);
    if (sx < -1e-9) t = Math.min(t, (x0 - RING_X) / sx);
    if (sy > 1e-9) t = Math.min(t, (y1 - RING_Y) / sy);
    if (sy < -1e-9) t = Math.min(t, (y0 - RING_Y) / sy);
    return t;
  }

  /** Distance du cercle à la sortie d'un disque le long de θ (0 si le rayon ne
   *  le traverse pas). Sert au renflement du cercle des lancers francs. */
  function rayDiscExit(th, cx, cy, r) {
    var dx = Math.sin(th), dy = -Math.cos(th);
    var fx = RING_X - cx, fy = RING_Y - cy;
    var b = 2 * (dx * fx + dy * fy);
    var c = fx * fx + fy * fy - r * r;
    var disc = b * b - 4 * c;
    if (disc <= 0) return 0;
    var t = (-b + Math.sqrt(disc)) / 2;
    return t > 0 ? t : 0;
  }

  function rToCourt(th) { return rayBoxExit(th, 0, W, 0, BASELINE); }
  /** Bord extérieur affichable : le cadre, jamais au-delà. */
  function rToView(th) { return rayBoxExit(th, 0, W, VIEW_TOP, BASELINE); }

  /**
   * Sortie du bloc « près du panier » (raquette + tête de raquette) le long de
   * θ : c'est le bord INTÉRIEUR des zones à mi-distance. Le max des deux
   * sorties donne exactement l'union raquette ∪ demi-cercle des LF.
   */
  function rToNear(th) {
    var box = rayBoxExit(th, PAINT_L, PAINT_R, FT_Y, BASELINE);
    var ft = rayDiscExit(th, RING_X, FT_Y, FT_R);
    return Math.max(box, ft);
  }

  /**
   * Distance du cercle à la ligne à 3 points le long de θ.
   * C'EST le cœur de la détection 2/3 points : on teste d'abord les segments
   * DROITS des corners (une ligne à 6,75 m ne suffit pas près des lignes de
   * touche), puis on retombe sur l'arc.
   */
  function rTo3pt(th) {
    var sx = Math.sin(th), sy = -Math.cos(th), t, y;
    if (sx < -1e-9) {                       // rayon vers la gauche
      t = (CORNER_X - RING_X) / sx;
      y = RING_Y + sy * t;
      if (t > 0 && y >= CORNER_Y && y <= BASELINE) return t;
    }
    if (sx > 1e-9) {                        // rayon vers la droite
      t = (CORNER_X2 - RING_X) / sx;
      y = RING_Y + sy * t;
      if (t > 0 && y >= CORNER_Y && y <= BASELINE) return t;
    }
    return THREE_R;
  }

  /* -------------------------------------------------------------------------
   * 4. Les 18 zones de saisie. Découpage radial autour du cercle — c'est la
   *    convention des vraies cartes de tirs (NBA/Synergy), pas une grille
   *    rectangulaire posée sur le parquet.
   *
   *    `side` et `category` sont normalisés : ils décrivent la zone une fois
   *    pour toutes, donc l'enregistrement d'un tir n'a rien à recalculer.
   * ---------------------------------------------------------------------- */
  function z(label, short, value, side, category) {
    return { label: label, short: short, value: value, side: side, category: category, pts: value };
  }

  var ZONES = {
    /* --- près du panier (4) --- */
    rim:               z("Sous le panier", "Cercle", 2, "center", "rim"),
    paint_left:        z("Raquette gauche", "Raq. G", 2, "left", "paint"),
    paint_right:       z("Raquette droite", "Raq. D", 2, "right", "paint"),
    free_throw_area:   z("Lancer franc / tête de raquette", "Tête raq.", 2, "center", "paint"),

    /* --- 2 points (7) --- */
    two_corner_left:   z("2PT corner gauche", "2 Corner G", 2, "left", "midrange"),
    two_wing_left:     z("2PT aile gauche", "2 Aile G", 2, "left", "midrange"),
    two_mid_left:      z("2PT milieu gauche", "2 Mi-dist. G", 2, "left", "midrange"),
    two_center:        z("2PT axe central", "2 Axe", 2, "center", "midrange"),
    two_mid_right:     z("2PT milieu droit", "2 Mi-dist. D", 2, "right", "midrange"),
    two_wing_right:    z("2PT aile droite", "2 Aile D", 2, "right", "midrange"),
    two_corner_right:  z("2PT corner droit", "2 Corner D", 2, "right", "midrange"),

    /* --- 3 points (7) --- */
    three_corner_left: z("3PT corner gauche", "3 Corner G", 3, "left", "three_point"),
    three_wing_left:   z("3PT aile gauche", "3 Aile G", 3, "left", "three_point"),
    three_left_45:     z("3PT gauche à 45°", "3 45° G", 3, "left", "three_point"),
    three_top:         z("3PT axe central", "3 Axe", 3, "center", "three_point"),
    three_right_45:    z("3PT droite à 45°", "3 45° D", 3, "right", "three_point"),
    three_wing_right:  z("3PT aile droite", "3 Aile D", 3, "right", "three_point"),
    three_corner_right:z("3PT corner droit", "3 Corner D", 3, "right", "three_point"),
  };

  // Ordre logique : du plus proche du panier au plus lointain, gauche → droite.
  var ZONE_KEYS = [
    "rim", "paint_left", "paint_right", "free_throw_area",
    "two_corner_left", "two_wing_left", "two_mid_left", "two_center",
    "two_mid_right", "two_wing_right", "two_corner_right",
    "three_corner_left", "three_wing_left", "three_left_45", "three_top",
    "three_right_45", "three_wing_right", "three_corner_right",
  ];

  // Secteurs angulaires (en degrés) des 14 zones tracées en polaire.
  // `mid` = entre le bloc raquette et l'arc ; `three` = derrière l'arc.
  var SECTORS = {
    two_corner_left:  { a0: -180, a1: -72, band: "mid" },
    two_wing_left:    { a0: -72,  a1: -45, band: "mid" },
    two_mid_left:     { a0: -45,  a1: -16, band: "mid" },
    two_center:       { a0: -16,  a1:  16, band: "mid" },
    two_mid_right:    { a0:  16,  a1:  45, band: "mid" },
    two_wing_right:   { a0:  45,  a1:  72, band: "mid" },
    two_corner_right: { a0:  72,  a1: 180, band: "mid" },

    three_corner_left:  { a0: -180, a1: -CORNER_A, band: "three" },
    three_wing_left:    { a0: -CORNER_A, a1: -52, band: "three" },
    three_left_45:      { a0: -52,  a1: -18, band: "three" },
    three_top:          { a0: -18,  a1:  18, band: "three" },
    three_right_45:     { a0:  18,  a1:  52, band: "three" },
    three_wing_right:   { a0:  52,  a1:  CORNER_A, band: "three" },
    three_corner_right: { a0:  CORNER_A, a1: 180, band: "three" },
  };

  function inPaintBox(x, y) { return x >= PAINT_L && x <= PAINT_R && y >= FT_Y && y <= BASELINE; }

  /**
   * Zone d'un point du terrain (coordonnées cm, panier en bas).
   * L'ordre des tests EST l'ordre de priorité visuelle : cercle > tête de
   * raquette > ailes de raquette > mi-distance > 3 points. Il doit rester
   * cohérent avec l'ordre d'empilement de `zonesSVG()`, sinon la zone
   * surlignée ne serait pas celle réellement enregistrée.
   */
  function zoneAt(x, y) {
    var dx = x - RING_X, r = distOf(x, y), th = angleOf(x, y), a = deg(th);

    // Cercle restreint : demi-cercle de non-charge + prolongement vers le fond.
    if (r <= RA_R) return "rim";
    if (Math.abs(dx) <= RA_R && y >= RING_Y && y <= BASELINE) return "rim";

    // Tête de raquette : bande haute de la raquette + demi-cercle des LF.
    if (inPaintBox(x, y) && y <= KEY_TOP_Y) return "free_throw_area";
    if (y < FT_Y && Math.hypot(dx, y - FT_Y) <= FT_R) return "free_throw_area";

    // Ailes de la raquette, de part et d'autre du cercle restreint.
    if (inPaintBox(x, y)) return x < RING_X ? "paint_left" : "paint_right";

    // En deçà de la ligne à 3 points → mi-distance (secteur angulaire).
    if (r < rTo3pt(th)) {
      if (a <= -72) return "two_corner_left";
      if (a <= -45) return "two_wing_left";
      if (a < -16) return "two_mid_left";
      if (a <= 16) return "two_center";
      if (a < 45) return "two_mid_right";
      if (a < 72) return "two_wing_right";
      return "two_corner_right";
    }

    // Au-delà : corner si sous la tangence, sinon aile / 45° / axe.
    if (y > CORNER_Y) return x < RING_X ? "three_corner_left" : "three_corner_right";
    if (a <= -CORNER_A) return "three_corner_left";
    if (a >= CORNER_A) return "three_corner_right";
    if (a <= -52) return "three_wing_left";
    if (a < -18) return "three_left_45";
    if (a <= 18) return "three_top";
    if (a < 52) return "three_right_45";
    return "three_wing_right";
  }

  function zoneMeta(key) { return ZONES[key] || null; }
  /** Valeur d'un tir depuis sa zone : 3 pts derrière l'arc, 2 pts sinon. */
  function pointsForZone(key) { return ZONES[key] ? ZONES[key].value : 2; }
  function labelForZone(key) { return ZONES[key] ? ZONES[key].label : "Zone inconnue"; }
  function shortForZone(key) { return ZONES[key] ? ZONES[key].short : "?"; }

  /** Distance approximative du tir au cercle, en mètres (1 décimale). */
  function distanceMeters(x, y) {
    return Math.max(0, (distOf(x, y) - RING_R)) / 100;
  }

  /** Côté du terrain, utile pour les descriptions accessibles. */
  function sideOf(x) {
    if (x < RING_X - 60) return "gauche";
    if (x > RING_X + 60) return "droite";
    return "centre";
  }

  /* -------------------------------------------------------------------------
   * 5. Coordonnées normalisées 0..1 — le format persisté (indépendant de la
   *    taille d'affichage ET du cadrage ci-dessus, puisqu'on normalise sur le
   *    terrain entier). On ne remplace aucun format existant : `meta.zone`
   *    reste la clé legacy, `meta.x`/`meta.y` sont des ajouts optionnels.
   * ---------------------------------------------------------------------- */
  function normalize(x, y) { return { x: clamp01(x / W), y: clamp01(y / H) }; }
  function denormalize(nx, ny) { return { x: nx * W, y: ny * H }; }
  function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  /**
   * Résout un point (coordonnées cm) en tout ce dont la saisie a besoin.
   * @returns {{zone,legacyZone,points,label,short,side,category,distance,x,y,nx,ny}}
   */
  function resolvePoint(x, y) {
    x = Math.max(0, Math.min(W, x));
    y = Math.max(0, Math.min(H, y));
    var key = zoneAt(x, y), m = ZONES[key], n = normalize(x, y);
    return {
      zone: key,
      legacyZone: toLegacyZone(key, x),
      points: m ? m.value : 2,
      label: m ? m.label : "Zone inconnue",
      short: m ? m.short : "?",
      side: m ? m.side : sideOf(x),
      category: m ? m.category : "midrange",
      distance: distanceMeters(x, y),
      x: x, y: y, nx: n.x, ny: n.y,
    };
  }

  /**
   * Convertit un événement pointer/souris en point terrain.
   *
   * Voie exacte : matrice écran → repère SVG. Elle reste juste tant que la
   * transformation appliquée au conteneur est représentable en 2D ; sous la
   * perspective CSS 3D de `.lm-plane`, les navigateurs l'aplatissent et le
   * résultat peut dériver. L'appelant DOIT donc valider le point obtenu avec
   * `zoneAt()` contre la zone réellement cliquée (le hit-test du navigateur,
   * lui, est toujours correct) et se rabattre sur `zoneAnchor()` sinon.
   */
  function pointFromEvent(ev, svgEl) {
    try {
      var m = svgEl.getScreenCTM();
      if (m && typeof svgEl.createSVGPoint === "function") {
        var p = svgEl.createSVGPoint();
        p.x = ev.clientX; p.y = ev.clientY;
        var q = p.matrixTransform(m.inverse());
        if (isFinite(q.x) && isFinite(q.y)) return { x: q.x, y: q.y };
      }
    } catch (e) { /* repli ci-dessous */ }

    // Repli : rectangle englobant + viewBox (exact uniquement à plat).
    var r = svgEl.getBoundingClientRect();
    var vb = VIEWBOX.split(" ").map(Number);        // [minX, minY, w, h]
    var scale = Math.min(r.width / vb[2], r.height / vb[3]);
    var offX = (r.width - vb[2] * scale) / 2;
    var offY = (r.height - vb[3] * scale) / 2;
    return {
      x: (ev.clientX - r.left - offX) / scale + vb[0],
      y: (ev.clientY - r.top - offY) / scale + vb[1],
    };
  }

  /* -------------------------------------------------------------------------
   * 6. Correspondance 18 zones fines → 8 clés canoniques (court-analytics.js).
   *    C'est la couche de compatibilité : on ne renomme rien de ce qui est
   *    déjà consommé par /api/club → zonesTir.
   * ---------------------------------------------------------------------- */
  var LEGACY = {
    rim: "RAQUETTE",
    paint_left: "RAQUETTE",
    paint_right: "RAQUETTE",
    free_throw_area: "RAQUETTE",
    two_corner_left: "MI_DISTANCE_GAUCHE",
    two_wing_left: "MI_DISTANCE_GAUCHE",
    two_mid_left: "MI_DISTANCE_GAUCHE",
    two_center: "MI_DISTANCE_CENTRE",
    two_mid_right: "MI_DISTANCE_DROITE",
    two_wing_right: "MI_DISTANCE_DROITE",
    two_corner_right: "MI_DISTANCE_DROITE",
    three_corner_left: "CORNER_3_GAUCHE",
    three_corner_right: "CORNER_3_DROIT",
    three_wing_left: "TOP_KEY_GAUCHE",
    three_left_45: "TOP_KEY_GAUCHE",
    three_wing_right: "TOP_KEY_DROIT",
    three_right_45: "TOP_KEY_DROIT",
    // three_top est réparti selon le côté (les 8 clés n'ont pas de « top » seul).
  };

  function toLegacyZone(key, x) {
    if (key === "three_top") return (x == null || x < RING_X) ? "TOP_KEY_GAUCHE" : "TOP_KEY_DROIT";
    return LEGACY[key] || "RAQUETTE";
  }

  /** Découpage précédent (14 zones) → découpage actuel, pour un match déjà
   *  commencé et retrouvé dans localStorage. */
  var MIGRATE = {
    "restricted-area": "rim",
    "paint-left": "paint_left",
    "paint-center": "free_throw_area",
    "paint-right": "paint_right",
    "midrange-left-baseline": "two_corner_left",
    "midrange-left-wing": "two_wing_left",
    "midrange-center": "two_center",
    "midrange-right-wing": "two_wing_right",
    "midrange-right-baseline": "two_corner_right",
    "three-left-corner": "three_corner_left",
    "three-left-wing": "three_wing_left",
    "three-top": "three_top",
    "three-right-wing": "three_wing_right",
    "three-right-corner": "three_corner_right",
  };
  function migrateZoneId(key) {
    if (!key) return key;
    if (ZONES[key]) return key;
    return MIGRATE[key] || null;
  }

  /* -------------------------------------------------------------------------
   * 7. Contours des zones, en listes de points (cm). Les zones radiales sont
   *    échantillonnées sur leur bord intérieur et leur bord extérieur — les
   *    limites épousent donc exactement la raquette, le cercle des LF, l'arc à
   *    3 points, les corners et les lignes de fond.
   * ---------------------------------------------------------------------- */
  var STEPS = 72;

  /** Points d'un arc de cercle, angles en degrés « écran » (0 = droite, 90 = bas). */
  function arcPts(cx, cy, r, f0, f1, steps) {
    var out = [], i, f;
    steps = steps || 20;
    for (i = 0; i <= steps; i++) {
      f = rad(f0 + (f1 - f0) * i / steps);
      out.push({ x: cx + Math.cos(f) * r, y: cy + Math.sin(f) * r });
    }
    return out;
  }

  /** Contour d'une zone radiale entre deux bords donnés en fonction de θ. */
  function bandPts(a0deg, a1deg, rInner, rOuter) {
    var pts = [], i, th, ri, ro;
    var a0 = rad(a0deg), a1 = rad(a1deg);
    for (i = 0; i <= STEPS; i++) {                       // bord extérieur, aller
      th = a0 + (a1 - a0) * i / STEPS;
      ri = rInner(th); ro = Math.max(rOuter(th), ri);
      pts.push(polar(th, ro));
    }
    for (i = STEPS; i >= 0; i--) {                       // bord intérieur, retour
      th = a0 + (a1 - a0) * i / STEPS;
      pts.push(polar(th, rInner(th)));
    }
    return pts;
  }

  var RA_TOP = RING_Y - RA_R;      // 1117,5 — sommet du demi-cercle de non-charge

  /** Contour d'une zone, en points (cm). */
  function zonePoints(key) {
    if (key === "rim") {
      return [{ x: RING_X - RA_R, y: RING_Y }]
        .concat(arcPts(RING_X, RING_Y, RA_R, 180, 360, 24))
        .concat([{ x: RING_X + RA_R, y: BASELINE }, { x: RING_X - RA_R, y: BASELINE }]);
    }
    if (key === "paint_left") {
      return [{ x: RING_X, y: KEY_TOP_Y }, { x: RING_X, y: RA_TOP }]
        .concat(arcPts(RING_X, RING_Y, RA_R, 270, 180, 14))
        .concat([
          { x: RING_X - RA_R, y: BASELINE },
          { x: PAINT_L, y: BASELINE },
          { x: PAINT_L, y: KEY_TOP_Y },
        ]);
    }
    if (key === "paint_right") {
      return [{ x: RING_X, y: KEY_TOP_Y }, { x: PAINT_R, y: KEY_TOP_Y },
              { x: PAINT_R, y: BASELINE }, { x: RING_X + RA_R, y: BASELINE }]
        .concat(arcPts(RING_X, RING_Y, RA_R, 360, 270, 14))
        .concat([{ x: RING_X, y: RA_TOP }]);
    }
    if (key === "free_throw_area") {
      return [{ x: PAINT_L, y: KEY_TOP_Y }, { x: PAINT_L, y: FT_Y }, { x: RING_X - FT_R, y: FT_Y }]
        .concat(arcPts(RING_X, FT_Y, FT_R, 180, 360, 24))
        .concat([{ x: RING_X + FT_R, y: FT_Y }, { x: PAINT_R, y: FT_Y }, { x: PAINT_R, y: KEY_TOP_Y }]);
    }
    // Corners à 3 points : bande DROITE de 90 cm entre la ligne de touche et la
    // ligne de corner, jusqu'à la tangence avec l'arc. Tracée en cartésien et
    // non en polaire — un échantillonnage angulaire arrondirait l'angle du
    // terrain et y laisserait une bande morte, non cliquable.
    // L'arête haute suit le rayon θ = ∓CORNER_A, qui est exactement la
    // frontière testée par `zoneAt()` : elle part de la tangence (CORNER_X,
    // CORNER_Y) et rejoint la ligne de touche. C'est aussi l'arête basse de la
    // zone d'aile voisine, donc les deux tracés coïncident sans jour ni
    // recouvrement.
    if (key === "three_corner_left") {
      var tl = rad(-CORNER_A);
      return [polar(tl, rToView(tl)), { x: CORNER_X, y: CORNER_Y },
              { x: CORNER_X, y: BASELINE }, { x: 0, y: BASELINE }];
    }
    if (key === "three_corner_right") {
      var tr = rad(CORNER_A);
      return [{ x: CORNER_X2, y: CORNER_Y }, polar(tr, rToView(tr)),
              { x: W, y: BASELINE }, { x: CORNER_X2, y: BASELINE }];
    }
    var s = SECTORS[key];
    if (!s) return [];
    if (s.band === "mid") {
      return bandPts(s.a0, s.a1, rToNear, function (th) {
        return Math.min(rTo3pt(th), rToView(th));
      });
    }
    return bandPts(s.a0, s.a1, function (th) {
      return Math.min(rTo3pt(th), rToView(th));
    }, rToView);
  }

  function ptsToPath(pts) {
    if (!pts.length) return "";
    return "M" + pts.map(function (p) {
      return p.x.toFixed(1) + "," + p.y.toFixed(1);
    }).join("L") + "Z";
  }

  /** Tracé SVG d'une zone. */
  function zonePath(key) { return ptsToPath(zonePoints(key)); }

  /* -------------------------------------------------------------------------
   * 8. Ancre d'une zone — le point où poser un marqueur de tir quand on ne
   *    dispose que de l'identifiant de zone (saisie « zone d'abord », ou point
   *    exact non fiable sous la perspective 3D).
   *
   *    On prend le centroïde d'aire du contour ; s'il tombe hors de la zone
   *    (contour non convexe, secteur dégénéré derrière la ligne de fond), on
   *    balaye la boîte englobante et on retient le point valide le plus proche
   *    du centroïde. Résultat mémoïsé : stable d'un rendu à l'autre.
   * ---------------------------------------------------------------------- */
  var anchorCache = {};

  function polyCentroid(pts) {
    var a = 0, cx = 0, cy = 0, n = pts.length, i, j, f;
    for (i = 0, j = n - 1; i < n; j = i++) {
      f = pts[j].x * pts[i].y - pts[i].x * pts[j].y;
      a += f; cx += (pts[j].x + pts[i].x) * f; cy += (pts[j].y + pts[i].y) * f;
    }
    if (Math.abs(a) < 1) return null;
    return { x: cx / (3 * a), y: cy / (3 * a) };
  }

  function computeAnchor(key) {
    var pts = zonePoints(key);
    if (!pts.length) return { x: RING_X, y: RING_Y };
    var c = polyCentroid(pts);
    if (c && zoneAt(c.x, c.y) === key) return c;

    // Balayage de la boîte englobante : point valide le plus proche du centroïde.
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    pts.forEach(function (p) {
      if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x;
      if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y;
    });
    var target = c || { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    var best = null, bestD = Infinity, N = 24, i, j, x, y, d;
    for (i = 1; i < N; i++) {
      for (j = 1; j < N; j++) {
        x = x0 + (x1 - x0) * i / N;
        y = y0 + (y1 - y0) * j / N;
        if (zoneAt(x, y) !== key) continue;
        d = Math.hypot(x - target.x, y - target.y);
        if (d < bestD) { bestD = d; best = { x: x, y: y }; }
      }
    }
    return best || target;
  }

  function zoneAnchor(key) {
    if (!ZONES[key]) return { x: RING_X, y: RING_Y };
    if (!anchorCache[key]) anchorCache[key] = computeAnchor(key);
    return { x: anchorCache[key].x, y: anchorCache[key].y };
  }

  /**
   * Point de dépôt d'un marqueur dans une zone : l'ancre, dispersée de façon
   * DÉTERMINISTE selon `seed` pour que deux tirs de la même zone ne se
   * superposent pas. Le point retourné appartient toujours à la zone.
   */
  function scatterInZone(key, seed) {
    var a = zoneAnchor(key);
    if (seed == null) return a;
    // Spirale de Vogel : répartition régulière, sans hasard, reproductible.
    var n = Math.abs(Math.floor(seed)) % 64;
    if (n === 0) return a;
    var ang = n * 2.39996323, rad0 = Math.sqrt(n) * 26;
    for (var k = 0; k < 5; k++) {
      var r = rad0 * (1 - k * 0.2);
      var p = { x: a.x + Math.cos(ang) * r, y: a.y + Math.sin(ang) * r * 0.8 };
      if (zoneAt(p.x, p.y) === key) return p;
    }
    return a;
  }

  /* -------------------------------------------------------------------------
   * 9. Rendu SVG — parquet, marquages, zones.
   *    Palette et effets repris à l'identique du terrain 3D du Game Center
   *    (`.fullcourt` dans coach.html) : même DA, un seul langage visuel.
   * ---------------------------------------------------------------------- */
  var SKIN = {
    wood: "#CFA76A",            // érable
    ink: "#EFE7D4",             // crème : traits et textes
    hoop: "#D96F3F",            // orange ballon : le cercle
    board: "#E8E2D2",           // planche
    paint: "#10181A",           // raquette sombre
    arena: "#0B1011",           // pourtour d'arène
  };

  /**
   * Défs + parquet + reflets de vernis + bordure d'arène.
   * @param {{ids:string, sheen:boolean}} [opts] `ids` préfixe les identifiants
   *        SVG (deux terrains coexistent dans coach.html) ; `sheen` active le
   *        balayage lumineux animé (à couper si prefers-reduced-motion).
   */
  function courtSkinSVG(opts) {
    opts = opts || {};
    var p = opts.ids || "lmc";
    var x0 = -MARGIN, y0 = VIEW_TOP - MARGIN;
    var fw = W + MARGIN * 2, fh = BASELINE - VIEW_TOP + MARGIN * 2;
    var m = "";

    m += '<defs>'
      // Parquet : lames dans le sens de la longueur du terrain (verticales ici,
      // panier en bas), joints de bout décalés — comme sur `#fc-planks`.
      + '<pattern id="' + p + '-planks" width="46" height="300" patternUnits="userSpaceOnUse">'
        + '<rect width="46" height="300" fill="' + SKIN.wood + '"/>'
        + '<rect width="7" height="300" x="9" fill="rgba(255,241,214,0.26)"/>'
        + '<rect width="4" height="300" x="29" fill="rgba(150,105,55,0.20)"/>'
        + '<rect width="3" height="300" x="43" fill="rgba(118,80,38,0.46)"/>'
        + '<rect width="46" height="3" y="146" fill="rgba(118,80,38,0.34)"/>'
      + '</pattern>'
      + '<filter id="' + p + '-grain" x="0%" y="0%" width="100%" height="100%">'
        + '<feTurbulence type="fractalNoise" baseFrequency="0.06 0.0016" numOctaves="2" seed="7" result="n"/>'
        + '<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.29  0 0 0 0 0.14  0 0 0 0.22 0"/>'
        + '<feComposite operator="in" in2="SourceGraphic"/>'
      + '</filter>'
      + '<radialGradient id="' + p + '-refl" cx="0.5" cy="0.5" r="0.5">'
        + '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0.30"/>'
        + '<stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0.09"/>'
        + '<stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>'
      + '</radialGradient>'
      + '<linearGradient id="' + p + '-sheen" x1="0" y1="0" x2="1" y2="0">'
        + '<stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/>'
        + '<stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0.14"/>'
        + '<stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>'
      + '</linearGradient>'
      // Le parquet s'arrête aux limites du terrain : le vernis aussi.
      + '<clipPath id="' + p + '-floor"><rect x="0" y="' + VIEW_TOP + '" width="' + W + '" height="' + (BASELINE - VIEW_TOP) + '"/></clipPath>'
    + '</defs>';

    // Pourtour d'arène (hors limites) + liseré.
    m += '<rect x="' + x0 + '" y="' + y0 + '" width="' + fw + '" height="' + fh + '" rx="26" fill="' + SKIN.arena + '"/>';
    m += '<rect x="' + (x0 + 2) + '" y="' + (y0 + 2) + '" width="' + (fw - 4) + '" height="' + (fh - 4) + '" rx="24" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="3"/>';

    // Parquet érable + grain.
    m += '<rect x="0" y="' + VIEW_TOP + '" width="' + W + '" height="' + (BASELINE - VIEW_TOP) + '" fill="url(#' + p + '-planks)"/>';
    m += '<rect x="0" y="' + VIEW_TOP + '" width="' + W + '" height="' + (BASELINE - VIEW_TOP) + '" fill="' + SKIN.wood + '" filter="url(#' + p + '-grain)"/>';

    // Reflets de vernis (statiques) + balayage lumineux (optionnel).
    m += '<g clip-path="url(#' + p + '-floor)" pointer-events="none">';
    m += '<ellipse cx="430" cy="560" rx="430" ry="150" fill="url(#' + p + '-refl)"/>';
    m += '<ellipse cx="1120" cy="740" rx="360" ry="120" fill="url(#' + p + '-refl)" opacity="0.7"/>';
    m += '<ellipse cx="760" cy="1330" rx="520" ry="105" fill="url(#' + p + '-refl)" opacity="0.4"/>';
    if (opts.sheen) {
      m += '<g opacity="0.6"><rect x="-460" y="' + (VIEW_TOP - 120) + '" width="300" height="' + (fh + 240) + '"'
        + ' fill="url(#' + p + '-sheen)" transform="rotate(12 750 900)">'
        + '<animateTransform attributeName="transform" type="translate" values="-200 0; 2200 0" dur="9s" repeatCount="indefinite" additive="sum"/>'
        + '</rect></g>';
    }
    m += '</g>';
    return m;
  }

  /** Marquages officiels du demi-terrain (non interactifs). */
  function courtLinesSVG() {
    var L = 'fill="none" stroke="' + SKIN.ink + '" stroke-linecap="square"';
    var m = '<g class="lm-lines" pointer-events="none">';

    // Raquette : fond sombre puis contour, comme sur le terrain du Game Center.
    m += '<rect x="' + PAINT_L + '" y="' + FT_Y + '" width="' + (PAINT_R - PAINT_L) + '" height="' + (BASELINE - FT_Y) + '" fill="' + SKIN.paint + '" opacity="0.55"/>';
    m += '<rect ' + L + ' x="' + PAINT_L + '" y="' + FT_Y + '" width="' + (PAINT_R - PAINT_L) + '" height="' + (BASELINE - FT_Y) + '" stroke-width="6"/>';

    // Cercle des lancers francs : plein côté terrain, pointillé côté raquette
    // (convention FIBA de la moitié non visible).
    m += '<path ' + L + ' stroke-width="5" d="M' + (RING_X - FT_R) + ',' + FT_Y
      + 'A' + FT_R + ',' + FT_R + ' 0 0 1 ' + (RING_X + FT_R) + ',' + FT_Y + '"/>';
    m += '<path ' + L + ' stroke-width="4" stroke-dasharray="30 22" d="M' + (RING_X - FT_R) + ',' + FT_Y
      + 'A' + FT_R + ',' + FT_R + ' 0 0 0 ' + (RING_X + FT_R) + ',' + FT_Y + '"/>';

    // Ligne à 3 points : segments droits des corners + arc à 6,75 m.
    m += '<path ' + L + ' stroke-width="7" d="M' + CORNER_X + ',' + BASELINE + 'V' + CORNER_Y.toFixed(1)
      + 'A' + THREE_R + ',' + THREE_R + ' 0 0 1 ' + CORNER_X2 + ',' + CORNER_Y.toFixed(1)
      + 'V' + BASELINE + '"/>';

    // Demi-cercle de non-charge.
    m += '<path ' + L + ' stroke-width="4" d="M' + (RING_X - RA_R) + ',' + RING_Y
      + 'A' + RA_R + ',' + RA_R + ' 0 0 1 ' + (RING_X + RA_R) + ',' + RING_Y + '"/>';

    // Limites du terrain : lignes de fond et de touche.
    m += '<path ' + L + ' stroke-width="7" d="M0,' + VIEW_TOP + 'V' + BASELINE + 'H' + W + 'V' + VIEW_TOP + '"/>';

    // Planche, tige et cercle.
    m += '<line x1="' + (RING_X - BACKBOARD_HW) + '" y1="' + BACKBOARD_Y + '" x2="' + (RING_X + BACKBOARD_HW) + '" y2="' + BACKBOARD_Y + '" stroke="' + SKIN.board + '" stroke-width="9" stroke-linecap="round"/>';
    m += '<line x1="' + RING_X + '" y1="' + BACKBOARD_Y + '" x2="' + RING_X + '" y2="' + (RING_Y - RING_R) + '" stroke="' + SKIN.board + '" stroke-width="5"/>';
    m += '<circle cx="' + RING_X + '" cy="' + RING_Y + '" r="' + RING_R + '" fill="none" stroke="' + SKIN.hoop + '" stroke-width="7"/>';

    m += "</g>";
    return m;
  }

  /**
   * Ordre d'empilement SVG, du dessous vers le dessus. En SVG le dernier tracé
   * capte le pointeur en premier : cet ordre doit donc être exactement
   * l'inverse de l'ordre des tests de `zoneAt()`, sinon la zone surlignée au
   * survol ne serait pas celle réellement enregistrée (le cercle restreint est
   * recouvert par la raquette, qui est plus large).
   */
  var PAINT_ORDER = [
    "three_left_45", "three_top", "three_right_45",
    "three_wing_left", "three_wing_right",
    "three_corner_left", "three_corner_right",
    "two_mid_left", "two_center", "two_mid_right",
    "two_wing_left", "two_wing_right",
    "two_corner_left", "two_corner_right",
    "paint_left", "paint_right",
    "free_throw_area",
    "rim",
  ];

  /**
   * Les 18 zones interactives. Chaque zone porte son `<title>` (infobulle
   * native + nom accessible) et les attributs a11y attendus d'un bouton.
   */
  function zonesSVG() {
    return PAINT_ORDER.map(function (k) {
      var m = ZONES[k];
      var name = m.label + " — " + m.value + " points";
      return '<path class="lm-zone" data-zone="' + k + '" data-value="' + m.value + '"'
        + ' data-category="' + m.category + '" data-side="' + m.side + '"'
        + ' role="button" tabindex="-1" aria-pressed="false"'
        + ' aria-label="' + name + '" d="' + zonePath(k) + '">'
        + "<title>" + name + "</title></path>";
    }).join("");
  }

  var API = {
    W: W, H: H, VIEWBOX: VIEWBOX, VIEW_TOP: VIEW_TOP, SKIN: SKIN,
    RING_X: RING_X, RING_Y: RING_Y, THREE_R: THREE_R, CORNER_Y: CORNER_Y,
    ZONES: ZONES, ZONE_KEYS: ZONE_KEYS, PAINT_ORDER: PAINT_ORDER,
    angleOf: angleOf, distOf: distOf,
    zoneAt: zoneAt, zoneMeta: zoneMeta,
    pointsForZone: pointsForZone, labelForZone: labelForZone, shortForZone: shortForZone,
    distanceMeters: distanceMeters, sideOf: sideOf,
    normalize: normalize, denormalize: denormalize,
    resolvePoint: resolvePoint, pointFromEvent: pointFromEvent,
    toLegacyZone: toLegacyZone, migrateZoneId: migrateZoneId,
    zonePoints: zonePoints, zonePath: zonePath,
    zoneAnchor: zoneAnchor, scatterInZone: scatterInZone,
    courtSkinSVG: courtSkinSVG, courtLinesSVG: courtLinesSVG, zonesSVG: zonesSVG,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.HoopBoardLiveCourt = API;
})(typeof window !== "undefined" ? window : this);
