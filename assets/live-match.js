/**
 * HoopBoard — Match Live : contrôleur de saisie au bord du terrain.
 *
 * PRINCIPE — une seule source de vérité : la liste chronologique `state.events`,
 * au format de lib/match-events.js (les 15 EVENT_TYPES, pas un de plus ; les
 * variantes de faute passent par `meta.kind`). Le score, les fautes d'équipe,
 * le box score et la carte de tirs sont TOUS dérivés de cette liste — donc une
 * annulation ou une correction met forcément tout à jour d'un coup.
 *
 * PÉRIMÈTRE — ce script ne s'exécute que si `#page-live` existe et ne touche
 * qu'à ce sous-arbre. Aucune autre page, aucun composant partagé, aucune route
 * API modifiée. `/api/events` (qui existait sans jamais être appelé) est
 * consommé tel quel, en best-effort : un échec réseau ne bloque ni ne perd
 * jamais une action (file d'attente + sauvegarde locale).
 *
 * Dépend de : assets/live-court.js (géométrie FIBA + zones).
 */
(function () {
  "use strict";

  var root = document.getElementById("page-live");
  if (!root) return;                       // inerte sur les autres pages
  var Court = window.HoopBoardLiveCourt;
  if (!Court) { console.warn("[HoopBoard] live-court.js absent — Match Live non initialisé."); return; }

  var T = {                                 // les 15 types autorisés (PR4.2)
    SHOT_MADE: "SHOT_MADE", SHOT_MISSED: "SHOT_MISSED",
    FREE_THROW_MADE: "FREE_THROW_MADE", FREE_THROW_MISSED: "FREE_THROW_MISSED",
    REBOUND_OFF: "REBOUND_OFF", REBOUND_DEF: "REBOUND_DEF",
    ASSIST: "ASSIST", STEAL: "STEAL", BLOCK: "BLOCK", TURNOVER: "TURNOVER",
    FOUL: "FOUL", SUBSTITUTION: "SUBSTITUTION", TIMEOUT: "TIMEOUT",
    START_PERIOD: "START_PERIOD", END_PERIOD: "END_PERIOD",
  };

  var STORAGE_KEY = "hb.live.v1";
  var PERIOD_MS = 10 * 60 * 1000;           // 10 min FIBA
  var OT_MS = 5 * 60 * 1000;                // 5 min prolongation
  var FOUL_LIMIT = 5;                       // sortie à la 5e faute (FIBA)
  var TEAM_FOUL_BONUS = 5;                  // bonus à partir de la 5e faute d'équipe

  /* =========================================================================
   * 1. ÉTAT
   * ====================================================================== */
  var ROSTER_FALLBACK = [
    { nom: "Sylvain Francisco", num: 3, poste: "Meneur" },
    { nom: "Nigel Williams-Goss", num: 1, poste: "Meneur" },
    { nom: "Maodo Lô", num: 12, poste: "Arrière" },
    { nom: "Moses Wright", num: 7, poste: "Pivot" },
    { nom: "Ąžuolas Tubelis", num: 10, poste: "Intérieur" },
    { nom: "Ignas Brazdeikis", num: 8, poste: "Ailier" },
    { nom: "Dustin Sleva", num: 15, poste: "Ailier-fort" },
    { nom: "Edgaras Ulanovas", num: 92, poste: "Ailier-fort" },
    { nom: "Arnas Butkevičius", num: 5, poste: "Ailier" },
    { nom: "Laurynas Birutis", num: 11, poste: "Pivot" },
    { nom: "Dovydas Giedraitis", num: 22, poste: "Arrière" },
    { nom: "Deividas Sirvydis", num: 9, poste: "Ailier" },
  ];

  var state = {
    status: "scheduled",      // scheduled | live | paused | period-break | finished
    period: 1,
    clockMs: PERIOD_MS,
    running: false,
    possession: null,         // 'home' | 'away' | null
    home: { name: "Žalgiris Kaunas", code: "ZAL", timeouts: 2 },
    away: { name: "Hapoel Tel Aviv", code: "HTA", timeouts: 2 },
    roster: [],               // { id, name, num, pos, onCourt }
    events: [],
    selectedPlayer: null,     // id
    armed: null,              // null | 'SHOT_MADE' | 'SHOT_MISSED'
    aimZone: null,            // zone retenue sur le terrain, en attente de validation
    courtView: "3d",          // '3d' | 'flat' — inclinaison du terrain
    showShots: true,
    pendingSync: [],
    conn: "idle",             // idle | synced | pending | offline
  };

  function slug(s) {
    return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function setRoster(list) {
    state.roster = list.map(function (p, i) {
      return { id: slug(p.nom), name: p.nom, num: p.num != null ? p.num : i + 1, pos: p.poste || "", onCourt: i < 5 };
    });
  }
  setRoster(ROSTER_FALLBACK);

  /* =========================================================================
   * 2. SÉLECTEURS DÉRIVÉS — rien n'est stocké en double.
   * ====================================================================== */
  function isAway(ev) { return ev.meta && ev.meta.team === "away"; }

  function scoreOf(team) {
    return state.events.reduce(function (n, ev) {
      if ((team === "away") !== !!isAway(ev)) return n;
      return n + (ev.points || 0);
    }, 0);
  }

  function playerStats(id) {
    var s = { pts: 0, fouls: 0, reb: 0, ast: 0, fgm: 0, fga: 0 };
    state.events.forEach(function (ev) {
      if (ev.player !== id) return;
      s.pts += ev.points || 0;
      if (ev.type === T.FOUL && (!ev.meta || ev.meta.kind !== "drawn")) s.fouls++;
      if (ev.type === T.REBOUND_OFF || ev.type === T.REBOUND_DEF) s.reb++;
      if (ev.type === T.ASSIST) s.ast++;
      if (ev.type === T.SHOT_MADE) { s.fgm++; s.fga++; }
      if (ev.type === T.SHOT_MISSED) s.fga++;
    });
    return s;
  }

  function teamFouls(team, period) {
    return state.events.filter(function (ev) {
      if (ev.type !== T.FOUL) return false;
      if (ev.meta && ev.meta.kind === "drawn") return false;
      if ((team === "away") !== !!isAway(ev)) return false;
      return ev.period === period;
    }).length;
  }

  function onCourt() { return state.roster.filter(function (p) { return p.onCourt; }); }
  function bench() { return state.roster.filter(function (p) { return !p.onCourt; }); }
  function playerById(id) { return state.roster.filter(function (p) { return p.id === id; })[0] || null; }

  /** Tirs de terrain avec position, pour la carte de tirs. */
  function shots() {
    return state.events.filter(function (ev) {
      return (ev.type === T.SHOT_MADE || ev.type === T.SHOT_MISSED) && !isAway(ev) && ev.meta && ev.meta.nx != null;
    });
  }

  /**
   * Statistiques d'une zone sur le match en cours. Dérivées de `state.events`
   * comme tout le reste : une annulation les corrige automatiquement.
   */
  function zoneStats(zoneId) {
    var made = 0, att = 0;
    state.events.forEach(function (ev) {
      if (isAway(ev) || !ev.meta || ev.meta.fineZone !== zoneId) return;
      if (ev.type === T.SHOT_MADE) { made++; att++; }
      else if (ev.type === T.SHOT_MISSED) att++;
    });
    return { made: made, attempts: att, pct: att ? Math.round(made / att * 100) : null };
  }

  /* =========================================================================
   * 3. PERSISTANCE LOCALE — un rafraîchissement ne doit rien perdre.
   * ====================================================================== */
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: 1, status: state.status, period: state.period, clockMs: state.clockMs,
        possession: state.possession, home: state.home, away: state.away,
        roster: state.roster, events: state.events, pendingSync: state.pendingSync,
        courtView: state.courtView,
      }));
    } catch (e) { /* quota / mode privé : la session continue en mémoire */ }
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (!d || d.v !== 1 || !Array.isArray(d.events)) return false;
      state.status = d.status; state.period = d.period; state.clockMs = d.clockMs;
      state.possession = d.possession; state.home = d.home; state.away = d.away;
      state.roster = d.roster; state.events = d.events;
      state.pendingSync = d.pendingSync || [];
      if (d.courtView === "flat" || d.courtView === "3d") state.courtView = d.courtView;
      state.running = false;                 // on ne redémarre jamais le chrono seul
      if (state.status === "live") state.status = "paused";

      // Un match commencé avant le découpage en 18 zones garde des
      // identifiants de l'ancien jeu : on les traduit, sinon ses tirs
      // perdraient leur libellé et leur valeur.
      state.events.forEach(function (ev) {
        if (!ev.meta || !ev.meta.fineZone) return;
        var next = Court.migrateZoneId(ev.meta.fineZone);
        if (next) ev.meta.fineZone = next;
      });
      return true;
    } catch (e) { return false; }
  }

  /* =========================================================================
   * 4. SYNCHRONISATION /api/events — best-effort, jamais bloquante.
   *    Le vocabulaire de l'API (make2/make3/miss/reb/…) est celui qui existe
   *    déjà : on s'y conforme, on ne le modifie pas.
   * ====================================================================== */
  var API_TYPE = {
    SHOT_MADE: function (ev) { return ev.points === 3 ? "make3" : "make2"; },
    SHOT_MISSED: function () { return "miss"; },
    FREE_THROW_MADE: function () { return "make2"; },   // pas de type LF côté API
    FREE_THROW_MISSED: function () { return "miss"; },
    REBOUND_OFF: function () { return "reb"; }, REBOUND_DEF: function () { return "reb"; },
    ASSIST: function () { return "ast"; }, STEAL: function () { return "stl"; },
    BLOCK: function () { return "blk"; }, TURNOVER: function () { return "to"; },
    FOUL: function () { return "foul"; },
  };

  function queueSync(ev) {
    if (!API_TYPE[ev.type] || !ev.player) return;         // l'API exige un joueur
    state.pendingSync.push({
      type: API_TYPE[ev.type](ev),
      player: playerById(ev.player) ? playerById(ev.player).name : ev.player,
      zone: ev.meta && ev.meta.zone ? ev.meta.zone : null,
      clock: ev.clock || null,
    });
    flushSync();
  }

  var flushing = false;
  function flushSync() {
    if (flushing || !state.pendingSync.length) return;
    if (location.protocol.indexOf("http") !== 0) return;   // ouvert en file:// → pas d'API
    flushing = true;
    var batch = state.pendingSync.slice(0, 1);
    fetch("/api/events", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch[0]),
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      state.pendingSync.shift();
      state.conn = state.pendingSync.length ? "pending" : "synced";
      flushing = false; save(); renderConn();
      if (state.pendingSync.length) flushSync();
    }).catch(function () {
      state.conn = "offline"; flushing = false; renderConn();
    });
  }
  window.addEventListener("online", function () { state.conn = "pending"; renderConn(); flushSync(); });
  window.addEventListener("offline", function () { state.conn = "offline"; renderConn(); });

  /* =========================================================================
   * 5. MUTATIONS
   * ====================================================================== */
  var seq = 0;
  function push(type, attrs) {
    attrs = attrs || {};
    var ev = {
      id: "e" + Date.now().toString(36) + (seq++).toString(36),
      type: type,
      player: attrs.player != null ? String(attrs.player) : null,
      points: Number.isFinite(attrs.points) ? attrs.points : 0,
      period: state.period,
      clock: fmtClock(state.clockMs),
      meta: attrs.meta || null,
    };
    state.events.push(ev);
    queueSync(ev);
    save();
    return ev;
  }

  function removeEvent(id) {
    var i = state.events.map(function (e) { return e.id; }).indexOf(id);
    if (i < 0) return null;
    var ev = state.events.splice(i, 1)[0];
    // Une substitution annulée doit rendre le terrain cohérent.
    if (ev.type === T.SUBSTITUTION && ev.meta) {
      var pin = playerById(ev.meta.in), pout = playerById(ev.meta.out);
      if (pin) pin.onCourt = false;
      if (pout) pout.onCourt = true;
    }
    save();
    return ev;
  }

  /* =========================================================================
   * 6. CHRONOMÈTRE
   * ====================================================================== */
  var tickHandle = null, lastTick = 0;
  function startClock() {
    if (state.running) return;
    // Un match terminé par erreur doit pouvoir être repris : on ne piège
    // jamais l'utilisateur dans un état sans issue.
    if (state.status === "scheduled") { push(T.START_PERIOD, {}); }
    state.status = "live"; state.running = true; lastTick = Date.now();
    tickHandle = setInterval(tick, 100);
    render();
  }
  function stopClock(nextStatus) {
    state.running = false;
    if (tickHandle) { clearInterval(tickHandle); tickHandle = null; }
    if (nextStatus) state.status = nextStatus;
    save(); render();
  }
  function tick() {
    var now = Date.now();
    state.clockMs = Math.max(0, state.clockMs - (now - lastTick));
    lastTick = now;
    if (state.clockMs === 0) { stopClock("period-break"); save(); announce("Fin du quart-temps " + periodLabel(state.period)); return; }
    renderClock();
  }
  function fmtClock(ms) {
    var s = Math.ceil(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  function periodLabel(p) { return p <= 4 ? "Q" + p : "P" + (p - 4); }
  function periodDuration(p) { return p <= 4 ? PERIOD_MS : OT_MS; }

  function endPeriod() {
    push(T.END_PERIOD, {});
    stopClock("period-break");
  }
  function nextPeriod() {
    state.period += 1;
    state.clockMs = periodDuration(state.period);
    push(T.START_PERIOD, {});
    state.status = "paused";                 // le chrono attend l'entre-deux
    save(); render();
  }
  function finishMatch() { stopClock("finished"); }

  /* =========================================================================
   * 7. SAISIE
   * ====================================================================== */
  function selectPlayer(id) {
    state.selectedPlayer = state.selectedPlayer === id ? null : id;
    // Changer de joueur annule toujours un tir armé : sans cela, la position
    // touchée serait attribuée au mauvais joueur. La zone visée, elle, reste :
    // c'est souvent le même tir attribué à un autre joueur.
    state.armed = null;
    render();
  }

  function arm(type) {
    if (!state.selectedPlayer) { announce("Sélectionnez d'abord un joueur."); return; }
    state.armed = state.armed === type ? null : type;
    render();
  }
  function disarm() { state.armed = null; state.aimZone = null; render(); }

  /** Retient une zone du terrain ; un second appui sur la même la relâche. */
  function selectZone(zoneId) {
    if (!Court.ZONES[zoneId]) return;
    state.aimZone = state.aimZone === zoneId ? null : zoneId;
    if (state.aimZone) {
      var m = Court.ZONES[zoneId];
      announce(m.label + ", " + m.value + " points. Choisissez réussi ou manqué.");
    }
    render();
  }

  /**
   * Point à mémoriser pour un tir dans une zone donnée.
   *
   * Si l'on dispose de l'événement pointeur, on tente le point EXACT — mais on
   * ne le garde que s'il retombe bien dans la zone effectivement cliquée : sous
   * la perspective CSS 3D, la matrice écran→SVG est aplatie par le navigateur et
   * peut dériver (cf. `pointFromEvent`). Sinon (et pour toute saisie « zone
   * d'abord », clavier ou tactile), on retient l'ancre de la zone, dispersée de
   * façon déterministe pour que deux tirs voisins ne se superposent pas.
   */
  function pointForZone(zoneId, ev) {
    if (ev && els.court) {
      var raw = Court.pointFromEvent(ev, els.court);
      if (Court.zoneAt(raw.x, raw.y) === zoneId) return Court.resolvePoint(raw.x, raw.y);
    }
    var s = Court.scatterInZone(zoneId, zoneStats(zoneId).attempts);
    return Court.resolvePoint(s.x, s.y);
  }

  /** Enregistre un tir de terrain à partir d'un point du terrain. */
  function recordShot(made, pt) {
    var p = playerById(state.selectedPlayer);
    if (!p) { announce("Sélectionnez d'abord un joueur."); return; }
    var pts = made ? pt.points : 0;
    push(made ? T.SHOT_MADE : T.SHOT_MISSED, {
      player: p.id, points: pts,
      meta: {
        team: "home", zone: pt.legacyZone, fineZone: pt.zone,
        nx: pt.nx, ny: pt.ny, distance: Math.round(pt.distance * 10) / 10,
      },
    });
    state.armed = null;
    state.aimZone = null;
    feedback(made
      ? "Tir à " + pt.points + " points réussi — " + pt.label
      : "Tir à " + pt.points + " points manqué — " + pt.label, made);
    render();
  }

  /** Valide la zone retenue en tir réussi / manqué. */
  function commitAimedShot(made) {
    if (!state.aimZone || !state.selectedPlayer) return;
    recordShot(made, pointForZone(state.aimZone, null));
  }

  /** Action simple : joueur sélectionné → un appui → enregistré. */
  function recordSimple(type, opts) {
    opts = opts || {};
    var p = playerById(state.selectedPlayer);
    if (!p && !opts.noPlayer) { announce("Sélectionnez d'abord un joueur."); return; }
    var ev = push(type, {
      player: p ? p.id : null,
      points: opts.points || 0,
      meta: Object.assign({ team: "home" }, opts.meta || {}),
    });
    state.armed = null;                    // toute autre action sort du mode visée
    feedback(labelOf(ev) + (p ? " — " + p.name : ""), opts.positive);
    render();
  }

  function undoLast() {
    if (!state.events.length) return;
    var ev = state.events[state.events.length - 1];
    removeEvent(ev.id);
    // Retire l'envoi correspondant s'il n'est pas encore parti.
    if (state.pendingSync.length) state.pendingSync.pop();
    feedback("Annulé : " + labelOf(ev));
    render();
  }

  /* =========================================================================
   * 8. LIBELLÉS
   * ====================================================================== */
  var LABEL = {};
  LABEL[T.SHOT_MADE] = function (e) { return "Tir à " + (e.points || 2) + " points réussi" + zoneSuffix(e); };
  LABEL[T.SHOT_MISSED] = function (e) { return "Tir à " + zonePts(e) + " points manqué" + zoneSuffix(e); };
  LABEL[T.FREE_THROW_MADE] = function () { return "Lancer franc réussi"; };
  LABEL[T.FREE_THROW_MISSED] = function () { return "Lancer franc manqué"; };
  LABEL[T.REBOUND_OFF] = function () { return "Rebond offensif"; };
  LABEL[T.REBOUND_DEF] = function () { return "Rebond défensif"; };
  LABEL[T.ASSIST] = function () { return "Passe décisive"; };
  LABEL[T.STEAL] = function () { return "Interception"; };
  LABEL[T.BLOCK] = function () { return "Contre"; };
  LABEL[T.TURNOVER] = function () { return "Perte de balle"; };
  LABEL[T.FOUL] = function (e) {
    var k = e.meta && e.meta.kind;
    return k === "offensive" ? "Faute offensive" : k === "drawn" ? "Faute provoquée" : "Faute personnelle";
  };
  LABEL[T.SUBSTITUTION] = function (e) {
    var i = playerById(e.meta && e.meta.in), o = playerById(e.meta && e.meta.out);
    return "Changement : " + (i ? i.name : "?") + " entre, " + (o ? o.name : "?") + " sort";
  };
  LABEL[T.TIMEOUT] = function (e) { return "Temps mort " + (isAway(e) ? "adversaire" : "HoopBoard"); };
  LABEL[T.START_PERIOD] = function (e) { return "Début " + periodLabel(e.period); };
  LABEL[T.END_PERIOD] = function (e) { return "Fin " + periodLabel(e.period); };

  function zonePts(e) { return e.meta && e.meta.fineZone ? Court.pointsForZone(e.meta.fineZone) : 2; }
  /** La zone fait partie de la description du tir : sans elle, une ligne du fil
   *  ne suffit pas à retrouver ce qui s'est passé. */
  function zoneSuffix(e) {
    var k = e.meta && e.meta.fineZone;
    return k && Court.ZONES[k] ? " · " + Court.ZONES[k].label : "";
  }
  function labelOf(e) { return (LABEL[e.type] || function () { return e.type; })(e); }

  function eventKind(e) {
    if (e.type === T.SHOT_MADE || e.type === T.FREE_THROW_MADE) return "made";
    if (e.type === T.SHOT_MISSED || e.type === T.FREE_THROW_MISSED) return "missed";
    if (e.type === T.FOUL) return "foul";
    return "neutral";
  }
  var TAG = {};
  TAG[T.SHOT_MADE] = "+"; TAG[T.SHOT_MISSED] = "✗"; TAG[T.FREE_THROW_MADE] = "LF+";
  TAG[T.FREE_THROW_MISSED] = "LF✗"; TAG[T.REBOUND_OFF] = "RO"; TAG[T.REBOUND_DEF] = "RD";
  TAG[T.ASSIST] = "PD"; TAG[T.STEAL] = "INT"; TAG[T.BLOCK] = "CT"; TAG[T.TURNOVER] = "BP";
  TAG[T.FOUL] = "FA"; TAG[T.SUBSTITUTION] = "CHG"; TAG[T.TIMEOUT] = "TM";
  TAG[T.START_PERIOD] = "▶"; TAG[T.END_PERIOD] = "■";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* =========================================================================
   * 9. RETOUR UTILISATEUR
   * ====================================================================== */
  var toastEl, liveRegion, toastTimer;
  function feedback(msg, positive) {
    announce(msg);
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 1600);
    if (positive != null && navigator.vibrate && !prefersReducedMotion()) {
      try { navigator.vibrate(positive ? 18 : [10, 40, 10]); } catch (e) {}
    }
    flashScore();
  }
  function announce(msg) { if (liveRegion) liveRegion.textContent = msg; }
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  function flashScore() {
    var el = root.querySelector("#lmScoreHome");
    if (!el || prefersReducedMotion()) return;
    el.classList.add("is-flash");
    setTimeout(function () { el.classList.remove("is-flash"); }, 260);
  }

  /* =========================================================================
   * 10. RENDU
   * ====================================================================== */
  var els = {};

  function render() {
    renderScoreboard();
    renderClock();
    renderLineup();
    renderPrompt();
    renderActions();
    renderCourt();
    renderShotPad();
    renderFeed();
    renderConn();
    root.setAttribute("data-aiming", state.armed ? "true" : "false");
    root.setAttribute("data-court-view", state.courtView);
  }

  function renderScoreboard() {
    els.scoreHome.textContent = scoreOf("home");
    els.scoreAway.textContent = scoreOf("away");
    els.homeName.textContent = state.home.name;
    els.awayName.textContent = state.away.name;
    els.homeCrest.textContent = state.home.code;
    els.awayCrest.textContent = state.away.code;

    ["home", "away"].forEach(function (t) {
      var f = teamFouls(t, state.period);
      var el = els[t + "Fouls"];
      el.textContent = "Fautes " + f;
      el.setAttribute("data-bonus", f >= TEAM_FOUL_BONUS ? "true" : "false");
      if (f >= TEAM_FOUL_BONUS) el.textContent = "Fautes " + f + " · bonus";
      els[t + "Team"].setAttribute("data-possession", state.possession === t ? "true" : "false");
      els[t + "To"].textContent = "TM " + state[t].timeouts;
    });

    var STATUS = {
      scheduled: "Match non commencé", live: "En cours", paused: "En pause",
      "period-break": "Fin de " + periodLabel(state.period), finished: "Match terminé",
    };
    els.status.textContent = STATUS[state.status] || state.status;
    els.status.setAttribute("data-status", state.status);
    els.period.textContent = periodLabel(state.period);

    var live = state.status === "live";
    els.btnPlay.textContent = live ? "⏸ Pause"
      : state.status === "scheduled" ? "▶ Démarrer"
      : state.status === "finished" ? "▶ Reprendre le match"
      : "▶ Reprendre";
    els.btnPlay.disabled = false;
    els.btnNextPeriod.hidden = state.status !== "period-break";
    els.btnNextPeriod.textContent = state.period >= 4
      ? (scoreOf("home") === scoreOf("away") ? "Prolongation" : "Quart-temps suivant")
      : "Passer en " + periodLabel(state.period + 1);
  }

  function renderClock() {
    els.clock.textContent = fmtClock(state.clockMs);
    els.clock.classList.toggle("is-running", state.running);
  }

  function renderLineup() {
    var five = onCourt();
    els.lineup.innerHTML = five.map(function (p) {
      var s = playerStats(p.id);
      var lvl = s.fouls >= FOUL_LIMIT ? "out" : s.fouls === 4 ? "danger" : s.fouls === 3 ? "warn" : "ok";
      var foulTitle = s.fouls >= FOUL_LIMIT ? "Exclu (5 fautes)" : s.fouls + " faute(s)";
      return '<button type="button" class="lm-player" data-player="' + esc(p.id) + '"'
        + ' aria-pressed="' + (state.selectedPlayer === p.id ? "true" : "false") + '">'
        + '<span class="lm-player-num" aria-hidden="true">' + esc(p.num) + "</span>"
        + '<span class="lm-player-name">' + esc(p.name) + "</span>"
        + '<span class="lm-player-stats">'
        + '<span title="Points">' + s.pts + " pt</span>"
        + '<span class="lm-fouls" data-level="' + lvl + '" title="' + esc(foulTitle) + '">'
        + (lvl === "out" ? "⚠ " : "") + s.fouls + " f</span>"
        + "</span></button>";
    }).join("");
    els.lineupWarn.hidden = five.length === 5;
    if (five.length !== 5) {
      els.lineupWarn.textContent = "⚠ " + five.length + " joueur(s) sur le terrain — il en faut 5.";
    }
    els.lineupCount.textContent = five.length + "/5";
  }

  function renderPrompt() {
    var p = playerById(state.selectedPlayer);
    var zone = state.aimZone ? Court.ZONES[state.aimZone] : null;
    var mode = state.armed ? "aiming" : (zone || p) ? "player" : "idle";
    els.prompt.setAttribute("data-mode", mode);
    var txt;
    if (mode === "aiming") {
      txt = "Touchez l'emplacement du tir de #" + p.num + " " + p.name
          + " — " + (state.armed === T.SHOT_MADE ? "réussi" : "manqué");
    } else if (zone && p) {
      txt = zone.label + " · " + zone.value + " pts — validez pour #" + p.num + " " + p.name;
    } else if (zone) {
      txt = zone.label + " · " + zone.value + " pts — sélectionnez le joueur qui a tiré.";
    } else if (p) {
      txt = "Action pour #" + p.num + " — " + p.name
          + " · touchez une zone du terrain pour un tir";
    } else {
      txt = "Sélectionnez un joueur, puis une zone du terrain.";
    }
    els.promptText.textContent = txt;
    els.btnCancel.hidden = mode === "idle";
    els.btnCancel.textContent = state.armed ? "Annuler le tir"
      : zone ? "Annuler la zone" : "Désélectionner";
  }

  function renderActions() {
    var hasPlayer = !!state.selectedPlayer;
    root.querySelectorAll("[data-action]").forEach(function (b) {
      var needsPlayer = b.getAttribute("data-needs-player") !== "false";
      b.disabled = needsPlayer && !hasPlayer;
    });
    root.querySelectorAll("[data-arm]").forEach(function (b) {
      b.setAttribute("aria-pressed", state.armed === b.getAttribute("data-arm") ? "true" : "false");
    });
  }

  /* Rayon des marqueurs, en cm terrain : ~24 px à l'écran quel que soit le
     format, puisqu'ils vivent dans le repère du SVG. */
  var SHOT_R = 34;

  function renderCourt() {
    els.court.setAttribute("data-aiming", state.armed ? "true" : "false");
    els.btnView.textContent = state.courtView === "flat" ? "Vue 3D" : "Vue à plat";
    els.btnView.setAttribute("aria-pressed", state.courtView === "flat" ? "true" : "false");

    // Zone retenue + tabindex mobile (un seul point d'entrée au clavier).
    var zones = els.zones.querySelectorAll("[data-zone]");
    var focusKey = state.aimZone || Court.PAINT_ORDER[Court.PAINT_ORDER.length - 1];
    zones.forEach(function (n) {
      var k = n.getAttribute("data-zone");
      var on = k === state.aimZone;
      n.classList.toggle("is-selected", on);
      n.setAttribute("aria-pressed", on ? "true" : "false");
      n.setAttribute("tabindex", k === focusKey ? "0" : "-1");
    });

    var list = state.showShots ? shots() : [];
    els.shotLayer.innerHTML = list.map(function (ev, i) {
      var pos = Court.denormalize(ev.meta.nx, ev.meta.ny);
      var x = +pos.x.toFixed(1), y = +pos.y.toFixed(1);
      var val = zonePts(ev);
      var isLast = i === list.length - 1;
      var cls = "lm-shot" + (isLast && !prefersReducedMotion() ? " lm-shot-new" : "");
      var who = playerById(ev.player);
      var lbl = esc((who ? "#" + who.num + " " + who.name + " — " : "") + labelOf(ev));

      // Réussi : disque plein chiffré. Manqué : croix. La forme porte
      // l'information, la couleur ne fait que la renforcer.
      if (ev.type === T.SHOT_MADE) {
        return '<g class="' + cls + ' lm-shot--made"><title>' + lbl + "</title>"
          + '<circle class="lm-shot-disc" cx="' + x + '" cy="' + y + '" r="' + SHOT_R + '"/>'
          + '<text class="lm-shot-val" x="' + x + '" y="' + y + '">' + val + "</text></g>";
      }
      var d = SHOT_R * 0.72;
      return '<g class="' + cls + ' lm-shot--missed"><title>' + lbl + "</title>"
        + '<circle class="lm-shot-ring" cx="' + x + '" cy="' + y + '" r="' + SHOT_R + '"/>'
        + '<line class="lm-shot-cross" x1="' + (x - d) + '" y1="' + (y - d) + '" x2="' + (x + d) + '" y2="' + (y + d) + '"/>'
        + '<line class="lm-shot-cross" x1="' + (x - d) + '" y1="' + (y + d) + '" x2="' + (x + d) + '" y2="' + (y - d) + '"/>'
        + '<text class="lm-shot-val" x="' + x + '" y="' + (y + SHOT_R * 1.7) + '">' + val + "</text></g>";
      }).join("");

    var made = list.filter(function (e) { return e.type === T.SHOT_MADE; }).length;
    els.shotSummary.textContent = list.length
      ? made + "/" + list.length + " tirs (" + Math.round(made / list.length * 100) + " %)"
      : "Aucun tir enregistré";
    els.legendCount.textContent = list.length
      ? made + " réussi(s) · " + (list.length - made) + " manqué(s)"
      : "Aucun tir sur le terrain";
    els.court.setAttribute("aria-label",
      "Demi-terrain de basket, " + Court.ZONE_KEYS.length + " zones de tir. "
      + els.shotSummary.textContent
      + (state.armed ? ". Mode saisie : touchez l'emplacement du tir." : ""));
  }

  function renderShotPad() {
    var zone = state.aimZone ? Court.ZONES[state.aimZone] : null;
    var p = playerById(state.selectedPlayer);
    var ready = !!(zone && p);

    els.shotpad.setAttribute("data-state", zone ? "zone" : "empty");
    els.zoneName.textContent = zone ? zone.label : "Touchez une zone du terrain";
    els.zoneValue.hidden = !zone;
    if (zone) {
      els.zoneValue.textContent = zone.value + " PTS";
      els.zoneValue.setAttribute("data-value", zone.value);
    }

    if (!zone) {
      els.zoneMeta.innerHTML = "";
      els.zoneStat.textContent = "";
    } else {
      var s = zoneStats(state.aimZone);
      var SIDE = { left: "côté gauche", right: "côté droit", center: "axe central" };
      els.zoneMeta.innerHTML =
        "<span>" + esc(SIDE[zone.side] || zone.side) + " · "
        + (zone.value === 3 ? "derrière l'arc" : "dans l'arc") + "</span>"
        + "<span>" + (p
            ? "Tireur : <b>#" + esc(p.num) + " " + esc(p.name) + "</b>"
            : "<b>Sélectionnez le joueur qui a tiré</b>") + "</span>"
        + "<span>Sur cette zone ce match : <b>" + s.made + "/" + s.attempts
        + (s.pct != null ? " · " + s.pct + " %" : "") + "</b></span>";
      els.zoneStat.textContent = s.attempts ? s.made + "/" + s.attempts : "0/0";
    }

    els.btnMade.disabled = !ready;
    els.btnMissed.disabled = !ready;
    els.btnMade.querySelector(".lm-shotbtn-label").textContent =
      zone ? "Réussi +" + zone.value : "Réussi";
    els.btnClearZone.hidden = !zone;
  }

  function renderFeed() {
    var list = state.events.slice(-60).reverse();
    if (!list.length) {
      els.feed.innerHTML = '<p class="lm-empty">Aucune action enregistrée. Sélectionnez un joueur puis une action.</p>';
    } else {
      // Score courant après chaque événement, calculé une seule fois.
      var runH = 0, runA = 0, running = [];
      state.events.forEach(function (ev) {
        if (isAway(ev)) runA += ev.points || 0; else runH += ev.points || 0;
        running.push(runH + "–" + runA);
      });
      els.feed.innerHTML = list.map(function (ev, i) {
        var idx = state.events.length - 1 - i;
        var p = playerById(ev.player);
        var who = p ? "#" + p.num + " " + p.name : (isAway(ev) ? state.away.name : "");
        // Le score du moment fait partie de la trace d'un tir, réussi OU manqué.
        var isShot = ev.type === T.SHOT_MADE || ev.type === T.SHOT_MISSED
          || ev.type === T.FREE_THROW_MADE || ev.type === T.FREE_THROW_MISSED;
        var showScore = isShot || (ev.points || 0) > 0;
        return '<button type="button" class="lm-event' + (i === 0 ? " is-latest" : "") + '"'
          + ' data-event="' + esc(ev.id) + '">'
          + '<span class="lm-event-time">' + esc(periodLabel(ev.period) + " · " + (ev.clock || "--:--")) + "</span>"
          + '<span class="lm-event-label">'
          + (who ? '<span class="lm-event-who">' + esc(who) + "</span> — " : "")
          + esc(labelOf(ev)) + "</span>"
          + '<span class="lm-event-score">' + (showScore ? esc(running[idx]) : "") + "</span>"
          + '<span class="lm-event-tag" data-kind="' + eventKind(ev) + '">' + esc(TAG[ev.type] || "") + "</span>"
          + "</button>";
      }).join("");
    }
    var last = state.events[state.events.length - 1];
    els.undoWhat.textContent = last ? "Dernière action : " + labelOf(last) : "Aucune action à annuler";
    els.btnUndo.disabled = !last;
    els.btnUndo.classList.toggle("is-boosted", !!last);
  }

  function renderConn() {
    var s = state.conn;
    els.conn.setAttribute("data-state", s === "idle" ? "synced" : s);
    var n = state.pendingSync.length;
    els.connText.textContent =
      s === "offline" ? "Hors ligne — " + n + " action(s) en attente, rien n'est perdu"
      : n ? n + " action(s) en attente d'envoi"
      : "Enregistré localement";
  }

  /* =========================================================================
   * 11. GABARIT
   * ====================================================================== */
  root.innerHTML = [
    '<div class="lm-scoreboard" role="group" aria-label="Tableau de marque">',
      '<div class="lm-team lm-team--home" id="lmTeamHome">',
        '<span class="lm-team-crest" id="lmCrestHome"></span>',
        '<span class="lm-team-block"><span class="lm-team-name" id="lmNameHome"></span>',
        '<span class="lm-team-meta"><span class="lm-bonus" id="lmFoulsHome"></span>',
        '<span id="lmToHome"></span><span class="lm-poss" role="img" aria-label="Possession"></span></span></span>',
      "</div>",
      '<div class="lm-scorebox">',
        '<div class="lm-score"><span class="lm-score-value" id="lmScoreHome">0</span>',
        '<span class="lm-score-sep" aria-hidden="true">–</span>',
        '<span class="lm-score-value" id="lmScoreAway">0</span></div>',
        '<div class="lm-clockrow"><span class="lm-period" id="lmPeriod">Q1</span>',
        '<span class="lm-clock" id="lmClock">10:00</span></div>',
        '<div class="lm-status" id="lmStatus"></div>',
      "</div>",
      '<div class="lm-team lm-team--away" id="lmTeamAway">',
        '<span class="lm-team-block"><span class="lm-team-name" id="lmNameAway"></span>',
        '<span class="lm-team-meta"><span class="lm-poss" role="img" aria-label="Possession"></span>',
        '<span id="lmToAway"></span><span class="lm-bonus" id="lmFoulsAway"></span></span></span>',
        '<span class="lm-team-crest" id="lmCrestAway"></span>',
      "</div>",
      '<div class="lm-scoreboard-actions">',
        '<button type="button" class="lm-btn lm-btn--primary" id="lmBtnPlay">▶ Démarrer</button>',
        '<button type="button" class="lm-btn" id="lmBtnNextPeriod" hidden></button>',
        '<button type="button" class="lm-btn lm-btn--quiet lm-btn--sm" id="lmBtnPoss">Possession</button>',
        '<button type="button" class="lm-btn lm-btn--quiet lm-btn--sm" id="lmBtnAway">Score adverse</button>',
        '<span style="flex:1"></span>',
        '<span class="lm-conn" id="lmConn"><span class="lm-conn-dot"></span><span id="lmConnText"></span></span>',
      "</div>",
    "</div>",

    '<div class="lm-layout">',
      '<section class="lm-panel lm-col--lineup" aria-labelledby="lmLineupTitle">',
        '<div class="lm-section-head"><h3 class="lm-section-title" id="lmLineupTitle">Cinq sur le terrain</h3>',
        '<span class="lm-section-title" id="lmLineupCount">5/5</span></div>',
        '<div class="lm-lineup" id="lmLineup" role="group" aria-label="Joueurs en jeu"></div>',
        '<p class="lm-lineup-warn" id="lmLineupWarn" hidden></p>',
        '<div class="lm-undobar"><button type="button" class="lm-btn lm-btn--sm" id="lmBtnSub">Changement</button></div>',
      "</section>",

      '<section class="lm-panel lm-col--court" aria-labelledby="lmCourtTitle">',
        '<div class="lm-section-head"><h3 class="lm-section-title" id="lmCourtTitle">Terrain — zone de tir</h3>',
        '<span class="lm-section-title" id="lmShotSummary"></span>',
        '<button type="button" class="lm-btn lm-btn--quiet lm-btn--sm" id="lmBtnView" aria-pressed="false">Vue à plat</button>',
        "</div>",
        '<div class="lm-prompt" id="lmPrompt" data-mode="idle">',
          '<span class="lm-prompt-text" id="lmPromptText"></span>',
          '<button type="button" class="lm-btn lm-btn--quiet lm-btn--sm" id="lmBtnCancel" hidden>Annuler</button>',
          '<span class="lm-prompt-kbd" aria-hidden="true">Échap</span>',
        "</div>",
        // La perspective est portée par .lm-stage / .lm-plane (CSS), comme sur
        // le terrain 3D du Game Center : le SVG reste à plat, donc le hit-test
        // des 18 zones est celui du navigateur.
        '<div class="lm-court-wrap"><div class="lm-courtbox">',
          '<div class="lm-stage"><div class="lm-plane">',
            '<svg class="lm-court" id="lmCourt" viewBox="' + Court.VIEWBOX + '"',
            ' xmlns="http://www.w3.org/2000/svg" role="group">',
              Court.courtSkinSVG({ ids: "lmc", sheen: !prefersReducedMotion() }),
              Court.courtLinesSVG(),
              '<g id="lmZones">' + Court.zonesSVG() + "</g>",
              '<g id="lmShotLayer"></g>',
            "</svg>",
          "</div></div>",
          '<div class="lm-tip" id="lmTip" aria-hidden="true"></div>',
        "</div></div>",
        '<div class="lm-legend">',
          '<span class="lm-legend-item"><span class="lm-legend-glyph lm-legend-glyph--made" aria-hidden="true"></span>Réussi</span>',
          '<span class="lm-legend-item"><span class="lm-legend-glyph lm-legend-glyph--missed" aria-hidden="true">✕</span>Manqué</span>',
          '<span class="lm-legend-sep"></span>',
          '<span id="lmLegendCount"></span>',
        "</div>",
      "</section>",

      '<section class="lm-panel lm-col--shotpad" aria-labelledby="lmShotpadTitle">',
        '<div class="lm-section-head"><h3 class="lm-section-title" id="lmShotpadTitle">Tir</h3>',
        '<span class="lm-section-title" id="lmZoneStat"></span></div>',
        '<div class="lm-shotpad" id="lmShotpad" data-state="empty">',
          '<div class="lm-shotpad-zone">',
            '<span class="lm-shotpad-name" id="lmZoneName"></span>',
            '<span class="lm-shotpad-value" id="lmZoneValue" hidden></span>',
          "</div>",
          '<div class="lm-shotpad-meta" id="lmZoneMeta"></div>',
          '<div class="lm-shotpad-grid">',
            '<button type="button" class="lm-shotbtn lm-shotbtn--made" id="lmBtnMade" disabled>',
              '<span class="lm-shotbtn-glyph" aria-hidden="true">●</span>',
              '<span class="lm-shotbtn-label">Réussi</span>',
              '<span class="lm-shotbtn-kbd" aria-hidden="true">M</span>',
            "</button>",
            '<button type="button" class="lm-shotbtn lm-shotbtn--missed" id="lmBtnMissed" disabled>',
              '<span class="lm-shotbtn-glyph" aria-hidden="true">✕</span>',
              '<span class="lm-shotbtn-label">Manqué</span>',
              '<span class="lm-shotbtn-kbd" aria-hidden="true">X</span>',
            "</button>",
          "</div>",
          '<button type="button" class="lm-btn lm-btn--quiet lm-btn--sm" id="lmBtnClearZone" hidden>Changer de zone</button>',
        "</div>",
      "</section>",

      '<section class="lm-panel lm-col--actions" aria-labelledby="lmActionsTitle">',
        '<div class="lm-section-head"><h3 class="lm-section-title" id="lmActionsTitle">Actions rapides</h3></div>',
        '<div class="lm-actions">',
          group("Tirs", [
            act("Tir réussi", { arm: T.SHOT_MADE, cls: "lm-action--made", glyph: "●" }),
            act("Tir manqué", { arm: T.SHOT_MISSED, cls: "lm-action--missed", glyph: "✕" }),
            act("LF réussi", { action: "ftm", cls: "lm-action--made" }),
            act("LF manqué", { action: "ftx", cls: "lm-action--missed" }),
          ]),
          group("Actions positives", [
            act("Rebond déf.", { action: "rd" }), act("Rebond off.", { action: "ro" }),
            act("Passe décisive", { action: "ast" }), act("Interception", { action: "stl" }),
            act("Contre", { action: "blk" }),
          ]),
          group("Erreurs et sanctions", [
            act("Perte de balle", { action: "to" }), act("Faute personnelle", { action: "foul" }),
          ]),
          group("Gestion du match", [
            act("Changement", { action: "sub", needsPlayer: false }),
            act("Temps mort", { action: "timeout", needsPlayer: false }),
          ]),
          '<button type="button" class="lm-btn lm-btn--quiet lm-btn--sm" id="lmBtnMore" aria-expanded="false" aria-controls="lmMore">Plus d\'actions ▾</button>',
          '<div class="lm-more" id="lmMore" hidden>',
            group("Moins fréquent", [
              act("Faute offensive", { action: "foul-off" }),
              act("Faute provoquée", { action: "foul-drawn" }),
              act("Série de LF", { action: "ft-series" }),
            ]),
            group("Administratif", [
              act("Fin du quart-temps", { action: "end-period", needsPlayer: false }),
              act("Terminer le match", { action: "finish", needsPlayer: false, danger: true }),
              act("Réinitialiser", { action: "reset", needsPlayer: false, danger: true }),
            ]),
          "</div>",
        "</div>",
      "</section>",

      '<section class="lm-panel lm-col--feed" aria-labelledby="lmFeedTitle">',
        '<div class="lm-section-head"><h3 class="lm-section-title" id="lmFeedTitle">Fil du match</h3>',
        '<span class="lm-section-title">Cliquez une ligne pour corriger</span></div>',
        '<div class="lm-feed" id="lmFeed"></div>',
        '<div class="lm-undobar">',
          '<span class="lm-undo-what" id="lmUndoWhat"></span>',
          '<button type="button" class="lm-btn lm-btn--undo lm-btn--danger" id="lmBtnUndo">↶ Annuler la dernière action</button>',
        "</div>",
      "</section>",
    "</div>",

    '<div class="lm-toast" id="lmToast" role="status"></div>',
    '<div id="lmLive" class="hb-visually-hidden" aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"></div>',

    '<dialog class="lm-dialog" id="lmDialog">',
      '<form method="dialog"><div class="lm-dialog-head"><h2 class="lm-dialog-title" id="lmDialogTitle"></h2>',
      '<button class="lm-btn lm-btn--quiet lm-btn--sm" value="close" aria-label="Fermer">✕</button></div></form>',
      '<div class="lm-dialog-body" id="lmDialogBody"></div>',
      '<div class="lm-dialog-foot" id="lmDialogFoot"></div>',
    "</dialog>",
  ].join("");

  function group(label, buttons) {
    return '<div class="lm-group"><span class="lm-group-label">' + esc(label) + "</span>"
      + '<div class="lm-group-grid' + (buttons.length === 1 ? " lm-group-grid--1" : "") + '">'
      + buttons.join("") + "</div></div>";
  }
  function act(label, o) {
    o = o || {};
    return '<button type="button" class="lm-action ' + (o.cls || "") + (o.danger ? " lm-btn--danger" : "") + '"'
      + (o.arm ? ' data-arm="' + o.arm + '" data-action="arm"' : ' data-action="' + o.action + '"')
      + ' data-needs-player="' + (o.needsPlayer === false ? "false" : "true") + '"'
      + (o.arm ? ' aria-pressed="false"' : "")
      + ">" + (o.glyph ? '<span class="lm-action-glyph" aria-hidden="true">' + o.glyph + "</span>" : "")
      + "<span>" + esc(label) + "</span></button>";
  }

  // Références DOM
  var $ = function (id) { return root.querySelector("#" + id); };
  els = {
    scoreHome: $("lmScoreHome"), scoreAway: $("lmScoreAway"),
    homeName: $("lmNameHome"), awayName: $("lmNameAway"),
    homeCrest: $("lmCrestHome"), awayCrest: $("lmCrestAway"),
    homeFouls: $("lmFoulsHome"), awayFouls: $("lmFoulsAway"),
    homeTeam: $("lmTeamHome"), awayTeam: $("lmTeamAway"),
    homeTo: $("lmToHome"), awayTo: $("lmToAway"),
    period: $("lmPeriod"), clock: $("lmClock"), status: $("lmStatus"),
    btnPlay: $("lmBtnPlay"), btnNextPeriod: $("lmBtnNextPeriod"),
    lineup: $("lmLineup"), lineupWarn: $("lmLineupWarn"), lineupCount: $("lmLineupCount"),
    prompt: $("lmPrompt"), promptText: $("lmPromptText"), btnCancel: $("lmBtnCancel"),
    court: $("lmCourt"), zones: $("lmZones"), shotLayer: $("lmShotLayer"),
    shotSummary: $("lmShotSummary"), legendCount: $("lmLegendCount"),
    tip: $("lmTip"), courtbox: root.querySelector(".lm-courtbox"), btnView: $("lmBtnView"),
    shotpad: $("lmShotpad"), zoneName: $("lmZoneName"), zoneValue: $("lmZoneValue"),
    zoneMeta: $("lmZoneMeta"), zoneStat: $("lmZoneStat"),
    btnMade: $("lmBtnMade"), btnMissed: $("lmBtnMissed"), btnClearZone: $("lmBtnClearZone"),
    feed: $("lmFeed"), undoWhat: $("lmUndoWhat"), btnUndo: $("lmBtnUndo"),
    conn: $("lmConn"), connText: $("lmConnText"),
    dialog: $("lmDialog"), dialogTitle: $("lmDialogTitle"),
    dialogBody: $("lmDialogBody"), dialogFoot: $("lmDialogFoot"),
  };
  toastEl = $("lmToast");
  liveRegion = $("lmLive");

  /* =========================================================================
   * 12. DIALOGUES
   * ====================================================================== */
  function openDialog(title, bodyHTML, footHTML) {
    els.dialogTitle.textContent = title;
    els.dialogBody.innerHTML = bodyHTML;
    els.dialogFoot.innerHTML = footHTML || '<button type="button" class="lm-btn" data-close>Fermer</button>';
    if (typeof els.dialog.showModal === "function") els.dialog.showModal();
    else els.dialog.setAttribute("open", "");
  }
  function closeDialog() {
    if (typeof els.dialog.close === "function") els.dialog.close();
    else els.dialog.removeAttribute("open");
  }

  var subOut = null;
  function openSub() {
    subOut = null;
    renderSub();
  }
  function renderSub() {
    var five = onCourt(), bn = bench();
    var body = '<p class="lm-sub-hint">'
      + (subOut ? "Qui entre à la place de <strong>" + esc(playerById(subOut).name) + "</strong> ?"
                : "Quel joueur sort du terrain ?") + "</p>"
      + '<div class="lm-subgrid">'
      + (subOut ? bn : five).map(function (p) {
          var s = playerStats(p.id);
          return '<button type="button" class="lm-action" data-sub="' + esc(p.id) + '">'
            + "<span>#" + esc(p.num) + " " + esc(p.name) + " · " + s.pts + " pt · " + s.fouls + " f</span></button>";
        }).join("")
      + "</div>";
    openDialog("Changement", body,
      (subOut ? '<button type="button" class="lm-btn lm-btn--quiet" data-sub-back>← Choisir un autre sortant</button>' : "")
      + '<button type="button" class="lm-btn" data-close>Annuler</button>');
  }

  var ftState = null;
  function openFtSeries() {
    var p = playerById(state.selectedPlayer);
    if (!p) { announce("Sélectionnez d'abord un joueur."); return; }
    ftState = { total: 2, done: [] };
    renderFt();
  }
  function renderFt() {
    var p = playerById(state.selectedPlayer);
    var body = '<p class="lm-sub-hint">Série pour <strong>#' + esc(p.num) + " " + esc(p.name) + "</strong></p>"
      + '<div style="display:flex;gap:6px;margin-bottom:12px">'
      + [1, 2, 3].map(function (n) {
          return '<button type="button" class="lm-action" data-ft-total="' + n + '"'
            + ' aria-pressed="' + (ftState.total === n ? "true" : "false") + '"><span>' + n + " LF</span></button>";
        }).join("") + "</div>";
    for (var i = 0; i < ftState.total; i++) {
      var r = ftState.done[i];
      body += '<div class="lm-ft-row"><span class="lm-ft-label">Lancer franc ' + (i + 1) + "</span>"
        + '<span class="lm-ft-state">' + (r === true ? "✓ Réussi" : r === false ? "✗ Manqué" : "—") + "</span>"
        + '<button type="button" class="lm-action lm-action--made" data-ft="' + i + '" data-made="1"><span>Réussi</span></button>'
        + '<button type="button" class="lm-action lm-action--missed" data-ft="' + i + '" data-made="0"><span>Manqué</span></button>'
        + "</div>";
    }
    var filled = ftState.done.filter(function (x) { return x != null; }).length;
    openDialog("Série de lancers francs", body,
      '<button type="button" class="lm-btn" data-close>Annuler</button>'
      + '<button type="button" class="lm-btn lm-btn--primary" data-ft-confirm ' + (filled === ftState.total ? "" : "disabled") + ">Enregistrer "
      + ftState.done.filter(Boolean).length + "/" + ftState.total + "</button>");
  }

  function openCorrect(id) {
    var ev = state.events.filter(function (e) { return e.id === id; })[0];
    if (!ev) return;
    var p = playerById(ev.player);
    var isShot = ev.type === T.SHOT_MADE || ev.type === T.SHOT_MISSED
      || ev.type === T.FREE_THROW_MADE || ev.type === T.FREE_THROW_MISSED;
    var body = '<p class="lm-sub-hint">' + esc(periodLabel(ev.period) + " · " + (ev.clock || "--:--")) + "<br><strong>"
      + esc(labelOf(ev)) + "</strong>" + (p ? " — " + esc("#" + p.num + " " + p.name) : "") + "</p>";
    if (p) {
      body += '<p class="lm-group-label" style="margin-bottom:6px">Réattribuer à</p><div class="lm-subgrid">'
        + onCourt().map(function (q) {
            return '<button type="button" class="lm-action" data-reassign="' + esc(q.id) + '"'
              + ' aria-pressed="' + (q.id === ev.player ? "true" : "false") + '">'
              + "<span>#" + esc(q.num) + " " + esc(q.name) + "</span></button>";
          }).join("") + "</div>";
    }
    var foot = "";
    if (isShot) foot += '<button type="button" class="lm-btn" data-toggle-shot>Basculer réussi / manqué</button>';
    foot += '<button type="button" class="lm-btn lm-btn--danger" data-delete>Supprimer cette action</button>'
      + '<button type="button" class="lm-btn" data-close>Fermer</button>';
    els.dialog.setAttribute("data-event", id);
    openDialog("Corriger une action", body, foot);
  }

  function openAwayScore() {
    var body = '<p class="lm-sub-hint">Ajouter des points à <strong>' + esc(state.away.name) + "</strong>.</p>"
      + '<div class="lm-subgrid">'
      + [1, 2, 3].map(function (n) {
          return '<button type="button" class="lm-action" data-away-pts="' + n + '"><span>+' + n + " point" + (n > 1 ? "s" : "") + "</span></button>";
        }).join("")
      + '<button type="button" class="lm-action" data-away-foul><span>Faute adverse</span></button>'
      + '<button type="button" class="lm-action" data-away-timeout><span>Temps mort adverse</span></button>'
      + "</div>";
    openDialog("Score adverse", body);
  }

  /* =========================================================================
   * 13. ÉVÉNEMENTS
   * ====================================================================== */
  root.addEventListener("click", function (e) {
    var t = e.target.closest("button");
    if (!t) return;

    if (t.hasAttribute("data-close")) return closeDialog();
    if (t.id === "lmBtnPlay") return state.running ? stopClock("paused") : startClock();
    if (t.id === "lmBtnNextPeriod") return nextPeriod();
    if (t.id === "lmBtnPoss") {
      state.possession = state.possession === "home" ? "away" : state.possession === "away" ? null : "home";
      save(); return render();
    }
    if (t.id === "lmBtnAway") return openAwayScore();
    if (t.id === "lmBtnCancel") {
      if (state.armed || state.aimZone) return disarm();
      return selectPlayer(state.selectedPlayer);
    }
    if (t.id === "lmBtnUndo") return undoLast();

    // --- Pavé de tir ---------------------------------------------------------
    if (t.id === "lmBtnMade") return commitAimedShot(true);
    if (t.id === "lmBtnMissed") return commitAimedShot(false);
    if (t.id === "lmBtnClearZone") { state.aimZone = null; return render(); }
    if (t.id === "lmBtnView") {
      state.courtView = state.courtView === "3d" ? "flat" : "3d";
      announce(state.courtView === "flat" ? "Terrain à plat" : "Terrain en perspective");
      save(); return render();
    }
    if (t.id === "lmBtnSub") return openSub();
    if (t.id === "lmBtnMore") {
      var m = $("lmMore"), open = m.hidden;
      m.hidden = !open;
      t.setAttribute("aria-expanded", String(open));
      t.textContent = open ? "Moins d'actions ▴" : "Plus d'actions ▾";
      return;
    }

    if (t.dataset.player) return selectPlayer(t.dataset.player);
    if (t.dataset.event) return openCorrect(t.dataset.event);

    // --- Dialogue changement -------------------------------------------------
    if (t.hasAttribute("data-sub-back")) { subOut = null; return renderSub(); }
    if (t.dataset.sub) {
      if (!subOut) { subOut = t.dataset.sub; return renderSub(); }
      var pin = playerById(t.dataset.sub), pout = playerById(subOut);
      pin.onCourt = true; pout.onCourt = false;
      push(T.SUBSTITUTION, { meta: { team: "home", in: pin.id, out: pout.id } });
      if (state.selectedPlayer === pout.id) state.selectedPlayer = pin.id;
      closeDialog(); feedback("Changement : " + pin.name + " entre"); return render();
    }

    // --- Dialogue lancers francs --------------------------------------------
    if (t.dataset.ftTotal) { ftState.total = +t.dataset.ftTotal; ftState.done = ftState.done.slice(0, ftState.total); return renderFt(); }
    if (t.dataset.ft != null) { ftState.done[+t.dataset.ft] = t.dataset.made === "1"; return renderFt(); }
    if (t.hasAttribute("data-ft-confirm")) {
      var pl = playerById(state.selectedPlayer);
      ftState.done.forEach(function (made) {
        push(made ? T.FREE_THROW_MADE : T.FREE_THROW_MISSED, {
          player: pl.id, points: made ? 1 : 0, meta: { team: "home" },
        });
      });
      var okN = ftState.done.filter(Boolean).length;
      closeDialog(); feedback(okN + "/" + ftState.total + " lancers francs enregistrés", okN > 0); return render();
    }

    // --- Dialogue correction -------------------------------------------------
    if (t.dataset.reassign) {
      var evId = els.dialog.getAttribute("data-event");
      var ev = state.events.filter(function (x) { return x.id === evId; })[0];
      if (ev) { ev.player = t.dataset.reassign; save(); }
      closeDialog(); feedback("Action réattribuée"); return render();
    }
    if (t.hasAttribute("data-toggle-shot")) {
      var eid = els.dialog.getAttribute("data-event");
      var e2 = state.events.filter(function (x) { return x.id === eid; })[0];
      if (e2) {
        if (e2.type === T.SHOT_MADE) { e2.type = T.SHOT_MISSED; e2.points = 0; }
        else if (e2.type === T.SHOT_MISSED) { e2.type = T.SHOT_MADE; e2.points = zonePts(e2); }
        else if (e2.type === T.FREE_THROW_MADE) { e2.type = T.FREE_THROW_MISSED; e2.points = 0; }
        else { e2.type = T.FREE_THROW_MADE; e2.points = 1; }
        save();
      }
      closeDialog(); feedback("Tir corrigé : " + (e2 ? labelOf(e2) : "")); return render();
    }
    if (t.hasAttribute("data-delete")) {
      var did = els.dialog.getAttribute("data-event");
      var removed = removeEvent(did);
      closeDialog(); feedback("Supprimé : " + (removed ? labelOf(removed) : "")); return render();
    }

    // --- Dialogue score adverse ---------------------------------------------
    if (t.dataset.awayPts) {
      push(T.SHOT_MADE, { points: +t.dataset.awayPts, meta: { team: "away" } });
      feedback(state.away.name + " +" + t.dataset.awayPts); return render();
    }
    if (t.hasAttribute("data-away-foul")) { push(T.FOUL, { meta: { team: "away" } }); feedback("Faute adverse"); return render(); }
    if (t.hasAttribute("data-away-timeout")) {
      if (state.away.timeouts > 0) state.away.timeouts--;
      push(T.TIMEOUT, { meta: { team: "away" } }); feedback("Temps mort adverse"); return render();
    }

    // --- Actions rapides ------------------------------------------------------
    var a = t.dataset.action;
    if (!a) return;
    // « Tir réussi / manqué » : si une zone est déjà retenue, on enregistre
    // directement ; sinon on arme la visée, comme avant.
    if (a === "arm") {
      if (state.aimZone && state.selectedPlayer) return commitAimedShot(t.dataset.arm === T.SHOT_MADE);
      return arm(t.dataset.arm);
    }
    switch (a) {
      case "ftm": return recordSimple(T.FREE_THROW_MADE, { points: 1, positive: true });
      case "ftx": return recordSimple(T.FREE_THROW_MISSED, { positive: false });
      case "rd": return recordSimple(T.REBOUND_DEF, { positive: true });
      case "ro": return recordSimple(T.REBOUND_OFF, { positive: true });
      case "ast": return recordSimple(T.ASSIST, { positive: true });
      case "stl": return recordSimple(T.STEAL, { positive: true });
      case "blk": return recordSimple(T.BLOCK, { positive: true });
      case "to": return recordSimple(T.TURNOVER, { positive: false });
      case "foul": return recordSimple(T.FOUL, { positive: false, meta: { kind: "personal" } });
      case "foul-off": return recordSimple(T.FOUL, { positive: false, meta: { kind: "offensive" } });
      case "foul-drawn": return recordSimple(T.FOUL, { positive: true, meta: { kind: "drawn" } });
      case "ft-series": return openFtSeries();
      case "sub": return openSub();
      case "timeout":
        if (state.home.timeouts > 0) state.home.timeouts--;
        stopClock("paused");
        return recordSimple(T.TIMEOUT, { noPlayer: true });
      case "end-period": return endPeriod();
      case "finish":
        return confirmDanger("Terminer le match ?", "Le chronomètre sera arrêté. Les actions restent modifiables.", finishMatch);
      case "reset":
        return confirmDanger("Réinitialiser le match ?",
          "Toutes les actions enregistrées (" + state.events.length + ") seront définitivement supprimées.", resetMatch);
      default: return;
    }
  });

  function confirmDanger(title, msg, fn) {
    openDialog(title, '<p class="lm-sub-hint">' + esc(msg) + "</p>",
      '<button type="button" class="lm-btn" data-close>Annuler</button>'
      + '<button type="button" class="lm-btn lm-btn--danger" id="lmConfirmYes">Confirmer</button>');
    $("lmConfirmYes").addEventListener("click", function () { closeDialog(); fn(); }, { once: true });
  }

  function resetMatch() {
    stopClock();
    state.events = []; state.pendingSync = []; state.period = 1;
    state.clockMs = PERIOD_MS; state.status = "scheduled"; state.possession = null;
    state.selectedPlayer = null; state.armed = null; state.aimZone = null;
    state.home.timeouts = 2; state.away.timeouts = 2;
    state.roster.forEach(function (p, i) { p.onCourt = i < 5; });
    save(); feedback("Match réinitialisé"); render();
  }

  /* --- Saisie sur le terrain ------------------------------------------------
     Deux chemins, tous deux conservés :
      · ZONE D'ABORD (nouveau, et le seul possible au doigt) — on touche une
        zone, elle est retenue et nommée, puis on valide réussi / manqué.
      · TIR ARMÉ (comportement existant) — on presse « Tir réussi » ou « Tir
        manqué » dans les actions rapides, puis un seul appui sur le terrain
        enregistre directement.
     Le clic est délégué aux tracés `[data-zone]` : c'est le hit-test du
     navigateur qui tranche, donc il reste exact sous la perspective 3D. */
  els.court.addEventListener("click", function (e) {
    var z = e.target.closest("[data-zone]");
    if (!z) return;
    var key = z.getAttribute("data-zone");
    if (state.armed) {
      if (!state.selectedPlayer) { announce("Sélectionnez d'abord un joueur."); return; }
      recordShot(state.armed === T.SHOT_MADE, pointForZone(key, e));
      return;
    }
    selectZone(key);
  });

  // Survol : éclairage de la zone (CSS) + nom suivi à la position du pointeur.
  // On se place sur les coordonnées écran, donc l'infobulle reste juste quelle
  // que soit l'inclinaison du plan.
  els.court.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch" || !els.tip || !els.courtbox) return;
    var z = e.target.closest("[data-zone]");
    if (!z) { els.tip.classList.remove("is-visible"); return; }
    var m = Court.ZONES[z.getAttribute("data-zone")];
    if (!m) return;
    var r = els.courtbox.getBoundingClientRect();
    els.tip.innerHTML = esc(m.label) + " <b>" + m.value + " pts</b>";
    // Bornée dans le cadre : centrée sur le pointeur elle sortirait du panneau
    // près des lignes de touche, et s'y ferait rogner.
    var half = els.tip.offsetWidth / 2 + 4;
    var x = e.clientX - r.left;
    els.tip.style.left = Math.max(half, Math.min(r.width - half, x)) + "px";
    els.tip.style.top = (e.clientY - r.top) + "px";
    els.tip.classList.add("is-visible");
  });
  els.court.addEventListener("pointerleave", function () {
    if (els.tip) els.tip.classList.remove("is-visible");
  });

  /* --- Zones au clavier -----------------------------------------------------
     Tabindex tournant : une seule zone dans l'ordre de tabulation, les flèches
     circulent entre les 18, Entrée / Espace retient la zone. */
  els.zones.addEventListener("keydown", function (e) {
    var z = e.target.closest("[data-zone]");
    if (!z) return;
    var key = z.getAttribute("data-zone");
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectZone(key);
      var again = els.zones.querySelector('[data-zone="' + key + '"]');
      if (again) again.focus();
      return;
    }
    var STEP = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    if (STEP[e.key] == null) return;
    e.preventDefault();
    var order = Court.ZONE_KEYS;
    var i = order.indexOf(key);
    var next = order[(i + STEP[e.key] + order.length) % order.length];
    var el = els.zones.querySelector('[data-zone="' + next + '"]');
    if (!el) return;
    els.zones.querySelectorAll("[data-zone]").forEach(function (n) { n.setAttribute("tabindex", "-1"); });
    el.setAttribute("tabindex", "0");
    el.focus();
    announce(Court.labelForZone(next) + ", " + Court.pointsForZone(next) + " points");
  });

  /* --- Clavier : vitesse sur portable --------------------------------------- */
  var KEYS = {
    r: "rd", o: "ro", a: "ast", s: "stl", b: "blk", t: "to", f: "foul",
    l: "ftm", k: "ftx", c: "sub",
  };
  document.addEventListener("keydown", function (e) {
    if (!root.classList.contains("active")) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    // Échap relâche la visée, qu'elle vienne d'un tir armé ou d'une zone retenue.
    if (e.key === "Escape") {
      if (state.armed || state.aimZone) { disarm(); e.preventDefault(); }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); return undoLast(); }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key >= "1" && e.key <= "5") {
      var p = onCourt()[+e.key - 1];
      if (p) { e.preventDefault(); selectPlayer(p.id); }
      return;
    }
    if (e.key === " ") { e.preventDefault(); return state.running ? stopClock("paused") : startClock(); }
    var k = e.key.toLowerCase();
    // Zone déjà retenue → M / X valident le tir. Sinon ils arment la visée.
    if (k === "m") {
      e.preventDefault();
      return state.aimZone && state.selectedPlayer ? commitAimedShot(true) : arm(T.SHOT_MADE);
    }
    if (k === "x") {
      e.preventDefault();
      return state.aimZone && state.selectedPlayer ? commitAimedShot(false) : arm(T.SHOT_MISSED);
    }
    if (KEYS[k]) {
      e.preventDefault();
      var btn = root.querySelector('[data-action="' + KEYS[k] + '"]');
      if (btn && !btn.disabled) btn.click();
    }
  });

  // Le chrono ne doit pas continuer si l'onglet est masqué longtemps.
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && state.running) stopClock("paused");
  });

  /* =========================================================================
   * 14. DÉMARRAGE
   * ====================================================================== */
  load();

  // Hydratation de l'effectif depuis l'API existante (12 joueurs au lieu de 5
  // codés en dur). Sans réseau, le repli embarqué s'applique — jamais bloquant.
  if (location.protocol.indexOf("http") === 0 && !state.events.length) {
    fetch("/api/players").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !Array.isArray(d.players) || !d.players.length) return;
      var prev = state.roster.slice(0, 5).map(function (p) { return p.name; });
      setRoster(d.players.map(function (p, i) { return { nom: p.nom, num: p.num != null ? p.num : i + 1, poste: p.poste }; }));
      // On conserve le cinq de départ précédent si les joueurs existent toujours.
      state.roster.forEach(function (p) { p.onCourt = prev.indexOf(p.name) >= 0; });
      if (onCourt().length !== 5) state.roster.forEach(function (p, i) { p.onCourt = i < 5; });
      save(); render();
    }).catch(function () { /* repli embarqué déjà en place */ });
  }

  state.conn = "synced";
  render();
  if (state.pendingSync.length) { state.conn = "pending"; renderConn(); flushSync(); }
})();
