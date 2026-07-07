/**
 * HoopBoard — Terrain analytics 2D (PR4.4)
 *
 * Objectif : UNE seule structure de terrain 2D, réutilisable pour deux usages :
 *   1. Terrain SAISON  → volume de tirs + % de réussite par zone.
 *   2. Terrain LIVE     → tirs du match en cours (réussi / manqué).
 *
 * ⚠️ PR4.4 = fondation. Ce module est autonome (browser), sans dépendance et
 * sans effet de bord global : il n'auto-exécute rien, ne modifie aucune page,
 * aucun CSS global, aucune API. Il se contente d'exposer des fonctions pures
 * de rendu SVG. Le branchement dans coach.html / joueur.html est laissé aux PR
 * suivantes (voir TODO en bas).
 *
 * Source de données SAISON : la structure UNIQUE `zonesTirSaison` (PR4.3),
 * exposée telle quelle par GET /api/club sous la clé `zonesTir`. Aucune
 * seconde structure concurrente n'est créée ici — on consomme la forme :
 *   { demo:boolean, zones:{ RAQUETTE:{tentes,reussis,pct}, ... } }
 *
 * Source de données LIVE : la timeline de `lib/match-events.js` (PR4.2). Chaque
 * événement SHOT_MADE / SHOT_MISSED porte sa zone dans `meta.zone`. La fonction
 * `shotFromEvent()` fait le pont event → tir sans coupler ce module au moteur.
 */
(function (root) {
  "use strict";

  /* -------------------------------------------------------------------------
   * 1. Les 8 zones canoniques — clés IDENTIQUES à zonesTirSaison (PR4.3).
   *    Chaque zone = un rectangle schématique dans un demi-terrain (panier en
   *    bas, viewBox 0 0 500 470). Les 8 zones pavent le demi-terrain sans
   *    chevauchement. `label` sert d'affichage court.
   * ---------------------------------------------------------------------- */
  var ZONES = {
    RAQUETTE:           { label: "Raquette",        rect: { x: 190, y: 250, w: 120, h: 210 } },
    MI_DISTANCE_GAUCHE: { label: "Mi-dist. gauche", rect: { x:  95, y: 250, w:  95, h: 210 } },
    MI_DISTANCE_CENTRE: { label: "Mi-dist. centre", rect: { x: 190, y:  15, w: 120, h: 235 } },
    MI_DISTANCE_DROITE: { label: "Mi-dist. droite", rect: { x: 310, y: 250, w:  95, h: 210 } },
    CORNER_3_GAUCHE:    { label: "Corner 3 G",      rect: { x:  15, y: 250, w:  80, h: 210 } },
    CORNER_3_DROIT:     { label: "Corner 3 D",      rect: { x: 405, y: 250, w:  80, h: 210 } },
    TOP_KEY_GAUCHE:     { label: "Top / aile G",    rect: { x:  15, y:  15, w: 175, h: 235 } },
    TOP_KEY_DROIT:      { label: "Top / aile D",    rect: { x: 310, y:  15, w: 175, h: 235 } },
  };

  // Ordre canonique (= ordre de déclaration dans data.js).
  var ZONE_KEYS = [
    "RAQUETTE",
    "MI_DISTANCE_GAUCHE",
    "MI_DISTANCE_CENTRE",
    "MI_DISTANCE_DROITE",
    "CORNER_3_GAUCHE",
    "CORNER_3_DROIT",
    "TOP_KEY_GAUCHE",
    "TOP_KEY_DROIT",
  ];

  var VIEWBOX = "0 0 500 470";

  // Palette (valeurs de repli alignées sur le design PR3 — on ne lit ni ne
  // modifie aucune variable CSS globale). Froid → chaud.
  var COLD = [64, 232, 213];   // teal
  var HOT  = [217, 111, 63];   // orange
  var INK  = "#EFE7D4";        // crème (traits/textes)

  /* -------------------------------------------------------------------------
   * 2. Helpers géométriques / couleur (pures).
   * ---------------------------------------------------------------------- */
  function centroid(key) {
    var r = ZONES[key].rect;
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  /** Couleur de chauffe pour un pct (0..100) → rgba froid→chaud. */
  function heatColor(pct, alpha) {
    var t = clamp01((Number(pct) || 0) / 100);
    var r = Math.round(COLD[0] + (HOT[0] - COLD[0]) * t);
    var g = Math.round(COLD[1] + (HOT[1] - COLD[1]) * t);
    var b = Math.round(COLD[2] + (HOT[2] - COLD[2]) * t);
    return "rgba(" + r + "," + g + "," + b + "," + (alpha == null ? 1 : alpha) + ")";
  }

  /** Jitter déterministe (repro d'un rendu à l'autre) à partir d'une graine. */
  function jitter(seed, spread) {
    var s = 0;
    for (var i = 0; i < String(seed).length; i++) s = (s * 31 + String(seed).charCodeAt(i)) % 1000;
    return ((s / 1000) - 0.5) * 2 * spread;
  }

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* -------------------------------------------------------------------------
   * 3. Fond de terrain : marquages décoratifs (non interactifs) + rectangles
   *    de zones (interactifs, data-zone). Retourne une string SVG.
   * ---------------------------------------------------------------------- */
  function courtMarkupSVG() {
    var m = "";
    // Bordure du demi-terrain.
    m += rect(15, 15, 470, 445, { fill: "none", stroke: INK, sw: 1.4, opacity: 0.55 });
    // Raquette (contour) + cercle des lancers-francs.
    m += rect(190, 250, 120, 210, { fill: "none", stroke: INK, sw: 1.2, opacity: 0.5 });
    m += '<circle cx="250" cy="250" r="40" fill="none" stroke="' + INK + '" stroke-width="1.2" opacity="0.5"/>';
    // Ligne à 3 points (approx : corners droits + arc).
    m += '<path d="M95,460 L95,318 A 175,175 0 0 0 405,318 L405,460" fill="none" stroke="' + INK + '" stroke-width="1.2" opacity="0.5"/>';
    // Panier + planche.
    m += '<line x1="228" y1="440" x2="272" y2="440" stroke="' + INK + '" stroke-width="1.6" opacity="0.6"/>';
    m += '<circle cx="250" cy="425" r="8" fill="none" stroke="' + INK + '" stroke-width="1.6" opacity="0.7"/>';
    return m;
  }

  function rect(x, y, w, h, o) {
    o = o || {};
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"'
      + ' fill="' + (o.fill || "none") + '"'
      + (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="' + (o.sw || 1) + '"' : "")
      + (o.opacity != null ? ' opacity="' + o.opacity + '"' : "")
      + (o.rx ? ' rx="' + o.rx + '"' : "")
      + (o.dataZone ? ' data-zone="' + o.dataZone + '"' : "")
      + (o.cls ? ' class="' + o.cls + '"' : "")
      + "/>";
  }

  function text(x, y, str, o) {
    o = o || {};
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle"'
      + ' font-size="' + (o.size || 13) + '"'
      + ' font-family="inherit"'
      + ' font-weight="' + (o.weight || 600) + '"'
      + ' fill="' + (o.fill || INK) + '"'
      + (o.opacity != null ? ' opacity="' + o.opacity + '"' : "")
      + '>' + esc(str) + "</text>";
  }

  /** Enveloppe SVG racine avec un contenu interne. `cls` distingue les modes. */
  function svgWrap(inner, cls) {
    return '<svg class="hbc-court ' + (cls || "") + '" viewBox="' + VIEWBOX + '"'
      + ' xmlns="http://www.w3.org/2000/svg" role="img"'
      + ' aria-label="Terrain analytics HoopBoard" style="display:block;width:100%;height:auto;">'
      + inner + "</svg>";
  }

  /* -------------------------------------------------------------------------
   * 4. TERRAIN SAISON — volume + % de réussite par zone.
   *    @param container  élément DOM cible
   *    @param zonesTir   la forme exposée par /api/club → { demo, zones:{...} }
   *                      (c.-à-d. DATA.zonesTirSaison de PR4.3, inchangée)
   * ---------------------------------------------------------------------- */
  function renderSeasonCourt(container, zonesTir, opts) {
    opts = opts || {};
    var zones = zonesTir && zonesTir.zones ? zonesTir.zones : {};
    var inner = courtMarkupSVG();

    ZONE_KEYS.forEach(function (key) {
      var z = zones[key] || {};
      var tentes = Number(z.tentes) || 0;
      var pct = z.pct != null ? Number(z.pct) : (tentes ? (Number(z.reussis) || 0) / tentes * 100 : 0);
      var c = centroid(key);
      var r = ZONES[key].rect;

      // Remplissage chauffé par le pct, opacité modulée par le volume relatif.
      inner += rect(r.x, r.y, r.w, r.h, {
        fill: heatColor(pct, tentes ? 0.42 : 0.08),
        stroke: INK, sw: 1, opacity: 0.9, dataZone: key, cls: "hbc-zone",
      });
      inner += text(c.x, c.y - 4, ZONES[key].label, { size: 12, weight: 700 });
      inner += text(c.x, c.y + 14, pct.toFixed(0) + "%", { size: 16, weight: 800 });
      inner += text(c.x, c.y + 30, tentes + " tirs", { size: 11, weight: 500, opacity: 0.8 });
    });

    if (zonesTir && zonesTir.demo) {
      inner += text(250, 470, "données démo", { size: 10, weight: 500, opacity: 0.6 });
    }

    setHTML(container, svgWrap(inner, "hbc-season"));
    return container;
  }

  /* -------------------------------------------------------------------------
   * 5. Pont match-events → tir (compatibilité PR4.2, sans couplage).
   *    Un « tir » HoopBoard : { joueur, zone, reussi, points, periode, temps }.
   * ---------------------------------------------------------------------- */
  function shotFromEvent(ev) {
    if (!ev || (ev.type !== "SHOT_MADE" && ev.type !== "SHOT_MISSED")) return null;
    return {
      joueur: ev.player != null ? String(ev.player) : null,
      zone: ev.meta && ev.meta.zone ? ev.meta.zone : null,
      reussi: ev.type === "SHOT_MADE",
      points: Number.isFinite(ev.points) ? ev.points : 0,
      periode: Number.isFinite(ev.period) ? ev.period : null,
      temps: ev.clock != null ? String(ev.clock) : null,
    };
  }

  /** Extrait tous les tirs d'une timeline `{ events:[...] }` (PR4.2). */
  function shotsFromTimeline(timeline) {
    var events = timeline && Array.isArray(timeline.events) ? timeline.events : [];
    return events.map(shotFromEvent).filter(Boolean);
  }

  /* -------------------------------------------------------------------------
   * 6. TERRAIN LIVE — tirs du match en cours (réussi / manqué). 2D uniquement.
   *    @param shots  liste de tirs { joueur, zone, reussi, points, periode,
   *                  temps, [x], [y] }. Sans x/y, le tir est placé au centre
   *                  de sa zone (les events ne fournissent que meta.zone).
   * ---------------------------------------------------------------------- */
  function renderLiveCourt(container, shots, opts) {
    opts = opts || {};
    shots = Array.isArray(shots) ? shots : [];
    var inner = courtMarkupSVG();

    // Rectangles de zones neutres (repères cliquables pour la saisie future).
    ZONE_KEYS.forEach(function (key) {
      var r = ZONES[key].rect;
      inner += rect(r.x, r.y, r.w, r.h, {
        fill: "rgba(255,255,255,0.015)", stroke: INK, sw: 0.8, opacity: 0.35,
        dataZone: key, cls: "hbc-zone",
      });
    });

    var made = 0, att = 0;
    shots.forEach(function (s, i) {
      att++;
      if (s.reussi) made++;
      var pos = shotPos(s, i);
      var col = s.reussi ? "#3FBF7A" : "#E0563F";
      if (s.reussi) {
        inner += '<circle cx="' + pos.x + '" cy="' + pos.y + '" r="6" fill="' + col + '" opacity="0.9"/>';
      } else {
        // Manqué = croix (lisible sans couleur).
        var d = 5;
        inner += '<g stroke="' + col + '" stroke-width="2" opacity="0.9">'
          + '<line x1="' + (pos.x - d) + '" y1="' + (pos.y - d) + '" x2="' + (pos.x + d) + '" y2="' + (pos.y + d) + '"/>'
          + '<line x1="' + (pos.x - d) + '" y1="' + (pos.y + d) + '" x2="' + (pos.x + d) + '" y2="' + (pos.y - d) + '"/>'
          + "</g>";
      }
    });

    if (opts.showTotals !== false) {
      var pct = att ? Math.round((made / att) * 100) : 0;
      inner += text(250, 470, made + "/" + att + " tirs · " + pct + "%", { size: 11, weight: 600, opacity: 0.75 });
    }

    setHTML(container, svgWrap(inner, "hbc-live"));
    return container;
  }

  /** Position d'un tir : x/y explicites (0..1 normalisés ou coords viewBox),
   *  sinon centre de la zone + léger jitter déterministe. */
  function shotPos(s, i) {
    if (Number.isFinite(s.x) && Number.isFinite(s.y)) {
      var nx = s.x <= 1 ? s.x * 500 : s.x;
      var ny = s.y <= 1 ? s.y * 470 : s.y;
      return { x: nx, y: ny };
    }
    var key = s.zone && ZONES[s.zone] ? s.zone : "RAQUETTE";
    var c = centroid(key);
    var seed = (s.joueur || "") + (s.temps || "") + i;
    return { x: c.x + jitter(seed, 26), y: c.y + jitter(seed + "y", 26) };
  }

  /* -------------------------------------------------------------------------
   * 7. Utilitaire DOM tolérant (accepte élément ou sélecteur). Aucun style
   *    global touché : le SVG porte ses styles inline.
   * ---------------------------------------------------------------------- */
  function setHTML(container, html) {
    var el = typeof container === "string"
      ? (typeof document !== "undefined" && document.querySelector(container))
      : container;
    if (el && "innerHTML" in el) el.innerHTML = html;
    return el;
  }

  /* -------------------------------------------------------------------------
   * 8. Export : global browser + CommonJS (tests Node) si dispo.
   * ---------------------------------------------------------------------- */
  var API = {
    ZONES: ZONES,
    ZONE_KEYS: ZONE_KEYS,
    VIEWBOX: VIEWBOX,
    centroid: centroid,
    heatColor: heatColor,
    courtMarkupSVG: courtMarkupSVG,
    renderSeasonCourt: renderSeasonCourt,
    renderLiveCourt: renderLiveCourt,
    shotFromEvent: shotFromEvent,
    shotsFromTimeline: shotsFromTimeline,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  root.HoopBoardCourt = API;
})(typeof window !== "undefined" ? window : this);

/* ---------------------------------------------------------------------------
 * TODO (PR suivantes — hors périmètre PR4.4) :
 *  - Brancher renderSeasonCourt() dans coach.html à partir de la réponse
 *    /api/club (clé `zonesTir`), à côté du terrain 3D existant (ne pas le
 *    remplacer).
 *  - Brancher renderLiveCourt() sur la page match live, alimenté par la
 *    timeline de lib/match-events.js via shotsFromTimeline().
 *  - Ajouter x/y réels au moment de la saisie live (touch sur le terrain) ;
 *    tant qu'ils manquent, le placement par centre de zone suffit.
 *  - Remplacer les données démo de zonesTirSaison par un recalcul agrégé des
 *    SHOT_MADE/SHOT_MISSED (meta.zone) sur la saison.
 * ------------------------------------------------------------------------ */
