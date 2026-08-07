/**
 * HoopBoard — Données réelles : Žalgiris Kaunas @ EuroLeague 2025–26
 * Source unique : feed officiel EuroLeague (api-live.euroleague.net +
 * live.euroleague.net/api/Boxscore, saison E2025 — saison régulière).
 * Objet unique consommable par les composants (dashboard, effectif,
 * fiche joueur, game center, feed).
 */
const HOOPBOARD_DATA = {
  club: {
    id: "zalgiris-kaunas",
    nom: "Žalgiris Kaunas",
    court: "Žalgiris Arena",
    institut: "Kaunas · Lituanie",
    tag: "ZAL",
    social: "@bczalgiris",
  },

  tournoi: {
    nom: "EuroLeague 2025–26",
    saison: "2025–2026",
    bilan: { victoires: 23, defaites: 15 },
    champion: false,
    qualification: "Playoffs EuroLeague",
    mvp: "Sylvain Francisco",
    statsEquipe: { ptsPour: 86.9, ptsContre: 82.2, diff: +4.7 },
    resultats: [
      { date: "2026-03-20", adversaire: "Real Madrid",     code: "RMB", score: [87, 85], victoire: true, topScorer: { nom: "Sylvain Francisco", poste: "Meneur", taille: "1m85", pts: 20 } },
      { date: "2026-02-25", adversaire: "Olympiacos",       code: "OLY", score: [99, 94], victoire: true, topScorer: { nom: "Sylvain Francisco", poste: "Meneur", taille: "1m85", pts: 23 } },
      { date: "2026-02-13", adversaire: "Hapoel Tel Aviv",  code: "HTA", score: [93, 82], victoire: true, topScorer: { nom: "Moses Wright", poste: "Pivot", taille: "2m07", pts: 25 } },
      { date: "2025-12-11", adversaire: "Paris Basketball", code: "PBB", score: [108, 105], victoire: true, topScorer: { nom: "Sylvain Francisco", poste: "Meneur", taille: "1m85", pts: 26 } },
    ],
    prochainMatch: { adversaire: "Fenerbahçe Beko", code: "FEN", contexte: "Playoffs EuroLeague — quart de finale", lieu: "Istanbul" },
  },

  /* ---- Box score complet : Žalgiris 93–82 Hapoel IBI Tel Aviv (13/02/2026, EuroLeague) ---- */
  /* NB : les clés "matchHapoel" et "quartTemps.poleFrance" sont conservées à
     l'identique pour ne pas casser l'API/les consommateurs existants
     (contrainte PR : conserver les clés). "poleFrance" est un nom de clé
     hérité : il porte désormais les quart-temps du Žalgiris.
     L'API attache ce box score au match dont le slug contient "hapoel". */
  matchHapoel: {
    date: "2026-02-13",
    competition: "EuroLeague · saison régulière",
    scoreFinal: [93, 82],
    quartTemps: { poleFrance: [24, 20, 19, 30], hapoel: [20, 23, 19, 20] },
    totauxEquipe: {
      p2: { r: 29, t: 42, pct: 69.0 }, p3: { r: 7, t: 23, pct: 30.4 },
      tirs: { r: 36, t: 65, pct: 55.4 }, lf: { r: 14, t: 15, pct: 93.3 },
      rebonds: { off: 9, def: 17, total: 26 },
      passes: 19, ballesPerdues: 9, interceptions: 8, contres: 1, fautes: 17,
      pts: 93, eva: 106,
    },
    joueurs: [
      { nom: "Moses Wright", poste: "Pivot", taille: "2m07",        min: 24, pts: 25, reb: 6, pd: 1, p2: "8-10", p3: "0-0", tirsPct: 80.0,  lf: "9-9", lfPct: 100.0, ro: 4, rd: 2, bp: 1, int: 0, ct: 0, fa: 3, eva: 34 },
      { nom: "Maodo Lô", poste: "Arrière", taille: "1m92",          min: 29, pts: 13, reb: 2, pd: 7, p2: "3-4", p3: "2-2", tirsPct: 83.3,  lf: "1-1", lfPct: 100.0, ro: 1, rd: 1, bp: 2, int: 1, ct: 0, fa: 1, eva: 20 },
      { nom: "Nigel Williams-Goss", poste: "Meneur", taille: "1m91", min: 21, pts: 10, reb: 1, pd: 6, p2: "5-7", p3: "0-3", tirsPct: 50.0, lf: "0-0", lfPct: null,  ro: 0, rd: 1, bp: 3, int: 4, ct: 0, fa: 0, eva: 13 },
      { nom: "Sylvain Francisco", poste: "Meneur", taille: "1m85",   min: 26, pts: 15, reb: 4, pd: 3, p2: "2-5", p3: "3-10", tirsPct: 33.3, lf: "2-3", lfPct: 66.7,  ro: 1, rd: 3, bp: 2, int: 1, ct: 0, fa: 1, eva: 11 },
      { nom: "Ąžuolas Tubelis", poste: "Intérieur", taille: "2m08",  min: 24, pts: 12, reb: 3, pd: 1, p2: "6-9", p3: "0-2", tirsPct: 54.5,  lf: "0-0", lfPct: null,  ro: 0, rd: 3, bp: 0, int: 0, ct: 1, fa: 1, eva: 11 },
      { nom: "Ignas Brazdeikis", poste: "Ailier", taille: "2m01",    min: 21, pts: 7,  reb: 2, pd: 1, p2: "2-2", p3: "1-1", tirsPct: 100.0, lf: "0-0", lfPct: null,  ro: 1, rd: 1, bp: 0, int: 1, ct: 0, fa: 2, eva: 9 },
      { nom: "Dustin Sleva", poste: "Ailier-fort", taille: "2m03",   min: 22, pts: 5,  reb: 5, pd: 0, p2: "1-2", p3: "1-4", tirsPct: 33.3,  lf: "0-0", lfPct: null,  ro: 1, rd: 4, bp: 0, int: 1, ct: 0, fa: 4, eva: 4 },
      { nom: "Edgaras Ulanovas", poste: "Ailier-fort", taille: "1m99", min: 12, pts: 4, reb: 1, pd: 0, p2: "1-1", p3: "0-1", tirsPct: 50.0, lf: "2-2", lfPct: 100.0, ro: 1, rd: 0, bp: 1, int: 0, ct: 0, fa: 2, eva: 3 },
      { nom: "Arnas Butkevičius", poste: "Ailier", taille: "1m97",   min: 13, pts: 2,  reb: 2, pd: 0, p2: "1-2", p3: "0-0", tirsPct: 50.0,  lf: "0-0", lfPct: null,  ro: 0, rd: 2, bp: 0, int: 0, ct: 0, fa: 3, eva: 1 },
      { nom: "Laurynas Birutis", poste: "Pivot", taille: "2m13",     min: 9,  pts: 0,  reb: 0, pd: 0, p2: "0-0", p3: "0-0", tirsPct: null,  lf: "0-0", lfPct: null,  ro: 0, rd: 0, bp: 0, int: 0, ct: 0, fa: 0, eva: 0 },
      { nom: "Dovydas Giedraitis", poste: "Arrière", taille: "1m93", min: 0,  pts: 0,  reb: 0, pd: 0, p2: "0-0", p3: "0-0", tirsPct: null,  lf: "0-0", lfPct: null,  ro: 0, rd: 0, bp: 0, int: 0, ct: 0, fa: 0, eva: 0 },
      { nom: "Deividas Sirvydis", poste: "Ailier", taille: "2m04",   min: 0,  pts: 0,  reb: 0, pd: 0, p2: "0-0", p3: "0-0", tirsPct: null,  lf: "0-0", lfPct: null,  ro: 0, rd: 0, bp: 0, int: 0, ct: 0, fa: 0, eva: 0 },
    ],
  },

  /* ---- Joueur vedette : espace joueur + fiche ---- */
  joueurVedette: {
    nom: "Sylvain Francisco",
    pseudo: "@sylvainfrancisco",
    poste: "Meneur",
    taille: "1m85",
    equipe: "Žalgiris Kaunas · EuroLeague",
    distinction: "Meilleur marqueur & meneur du Žalgiris — EuroLeague 2025-26",
    moyennesTournoi: { pts: 16.7, reb: 2.8, pd: 6.4, eva: 19.5 },
    /* matchHapoel : dérivé plus bas depuis la ligne de box score du match
       (matchHapoel.joueurs) pour supprimer la duplication. Valeur inchangée. */
    /* lignes match par match — box scores officiels EuroLeague 2025-26 */
    matchs: [
      { adversaire: "Paris Basketball", pts: 26, reb: 4, pd: 5, eva: 28 },
      { adversaire: "Hapoel Tel Aviv",  pts: 15, reb: 4, pd: 3, eva: 11 },
      { adversaire: "Olympiacos",        pts: 23, reb: 3, pd: 7, eva: 36 },
      { adversaire: "Real Madrid",       pts: 20, reb: 0, pd: 5, eva: 22 },
    ],
  },

  /* ---- Moyennes SAISON par joueur (source de vérité de l'onglet Effectif) ----
     L'Effectif doit afficher des moyennes saison, pas la ligne du dernier match.
     Feed EuroLeague : seules les moyennes cœur de la vedette (Sylvain Francisco :
     pts/reb/pd/eva) sont réelles (cf. joueurVedette.moyennesTournoi). Les autres
     valeurs — et les colonnes non couvertes par le feed (min, int, ct, bp,
     tirsPct, mj) — sont des valeurs DÉMO clairement identifiées (demo: true).
     TODO: remplacer par des moyennes agrégées sur la timeline saison via
     lib/match-events.js (aggregateStats) quand le moteur live fournira les
     événements de tous les matchs. */
  statsSaison: {
    demo: true,
    matchsEquipe: 38, // bilan officiel 23-15
    joueurs: [
      { nom: "Moses Wright",         mj: 34, min: 23, pts: 13.8, reb: 6.1, pd: 1.3, int: 0.6, ct: 0.9, bp: 1.4, tirsPct: 61.0, eva: 16.2 },
      { nom: "Maodo Lô",             mj: 31, min: 25, pts: 11.6, reb: 2.1, pd: 4.8, int: 0.9, ct: 0.1, bp: 1.7, tirsPct: 47.0, eva: 12.1 },
      { nom: "Nigel Williams-Goss",  mj: 33, min: 22, pts:  9.2, reb: 2.4, pd: 4.1, int: 1.3, ct: 0.1, bp: 1.9, tirsPct: 45.0, eva: 10.4 },
      { nom: "Sylvain Francisco",    mj: 38, min: 27, pts: 16.7, reb: 2.8, pd: 6.4, int: 1.1, ct: 0.1, bp: 2.2, tirsPct: 43.0, eva: 19.5 },
      { nom: "Ąžuolas Tubelis",      mj: 35, min: 22, pts: 11.1, reb: 5.4, pd: 1.2, int: 0.7, ct: 0.5, bp: 1.1, tirsPct: 55.0, eva: 12.6 },
      { nom: "Ignas Brazdeikis",     mj: 30, min: 20, pts:  9.8, reb: 3.2, pd: 1.4, int: 0.8, ct: 0.3, bp: 1.3, tirsPct: 48.0, eva:  9.9 },
      { nom: "Dustin Sleva",         mj: 28, min: 18, pts:  6.4, reb: 4.1, pd: 0.6, int: 0.7, ct: 0.2, bp: 0.8, tirsPct: 44.0, eva:  6.8 },
      { nom: "Edgaras Ulanovas",     mj: 32, min: 16, pts:  5.1, reb: 2.3, pd: 1.1, int: 0.6, ct: 0.2, bp: 0.7, tirsPct: 46.0, eva:  5.4 },
      { nom: "Arnas Butkevičius",    mj: 27, min: 14, pts:  3.9, reb: 2.0, pd: 0.8, int: 0.5, ct: 0.1, bp: 0.6, tirsPct: 43.0, eva:  3.7 },
      { nom: "Laurynas Birutis",     mj: 24, min: 12, pts:  4.6, reb: 3.0, pd: 0.4, int: 0.2, ct: 0.6, bp: 0.7, tirsPct: 58.0, eva:  5.1 },
      { nom: "Dovydas Giedraitis",   mj: 12, min:  6, pts:  1.8, reb: 0.7, pd: 0.5, int: 0.2, ct: 0.0, bp: 0.4, tirsPct: 40.0, eva:  1.5 },
      { nom: "Deividas Sirvydis",    mj: 15, min:  9, pts:  3.2, reb: 1.4, pd: 0.9, int: 0.3, ct: 0.1, bp: 0.6, tirsPct: 42.0, eva:  2.9 },
    ],
  },

  /* ---- Zones de tir SAISON (fondation des terrains analytics) ----
     Structure unique : 8 zones, chacune { tentes, reussis, pct }.
     ⚠️ Les données de zones officielles ne sont PAS disponibles dans le feed
     EuroLeague actuel : ces valeurs sont des valeurs DÉMO (demo: true).
     TODO: alimenter depuis le moteur live (lib/match-events.js) — chaque
     SHOT_MADE / SHOT_MISSED portera sa zone (meta.zone) et permettra de
     recalculer tentes/réussis/pct par zone sur toute la saison. */
  zonesTirSaison: {
    demo: true,
    zones: {
      RAQUETTE:            { tentes: 812, reussis: 508, pct: 62.6 },
      MI_DISTANCE_GAUCHE:  { tentes: 214, reussis:  92, pct: 43.0 },
      MI_DISTANCE_CENTRE:  { tentes: 168, reussis:  74, pct: 44.0 },
      MI_DISTANCE_DROITE:  { tentes: 226, reussis:  99, pct: 43.8 },
      CORNER_3_GAUCHE:     { tentes: 142, reussis:  54, pct: 38.0 },
      CORNER_3_DROIT:      { tentes: 156, reussis:  61, pct: 39.1 },
      TOP_KEY_GAUCHE:      { tentes: 198, reussis:  67, pct: 33.8 },
      TOP_KEY_DROIT:       { tentes: 205, reussis:  72, pct: 35.1 },
    },
  },

  /* ---- Scouting adversaire : dossier de préparation du prochain match ----
     Alimente la page « Préparer le match » (#/matchs/:id/preparation).
     ⚠️ Le feed EuroLeague ne publie pas de dossier de scouting structuré :
     ces valeurs sont des données DÉMO réalistes (demo: true), clairement
     identifiées, pour que la page paraisse complète immédiatement. Clé =
     identifiant de match (matchIdFor de l'adversaire). Les leaders (meilleur
     scoreur / passeur / rebondeur) sont DÉRIVÉS de joueursCles côté store. */
  scouting: {
    demo: true,
    fenerbahce: {
      equipe: "Fenerbahçe Beko",
      code: "FEN",
      contexte: "Playoffs EuroLeague — quart de finale",
      lieu: "Istanbul · Ülker Sports Arena",
      saison: { victoires: 27, defaites: 11, classement: 2, classementSur: 18, ptsPour: 88.4, ptsContre: 80.1, diff: 8.3 },
      style: "Attaque de demi-terrain qui cherche avant tout le tir près du cercle (fort volume et 64 % dans la raquette) et le corner 3. Beaucoup de passes décisives, très agressive au rebond offensif ; en défense, elle force les pertes de balle (7,1 interceptions/match).",
      formeRecente: [
        { adversaire: "Panathinaikos",     dom: true,  score: [89, 81], victoire: true  },
        { adversaire: "FC Barcelone",      dom: false, score: [78, 84], victoire: false },
        { adversaire: "Baskonia",          dom: true,  score: [95, 79], victoire: true  },
        { adversaire: "AS Monaco",         dom: false, score: [84, 82], victoire: true  },
        { adversaire: "Maccabi Tel Aviv",  dom: true,  score: [91, 77], victoire: true  },
      ],
      pointsForts: [
        "Rebond offensif dominant (9,4/match) : multiplie les secondes chances.",
        "Adresse extérieure des ailiers : Hayes-Davis et Hall au-delà de 40 % à 3 pts.",
        "Très efficace près du cercle : 64 % de réussite dans la raquette.",
        "Défense qui force les pertes de balle : 7,1 interceptions provoquées/match.",
      ],
      faiblesses: [
        "Fait beaucoup de fautes (18,5/match) : envoie l'adversaire sur la ligne des lancers.",
        "Perd des ballons sous la pression défensive (11,8 pertes/match).",
        "Intérieurs qui fautent (Birch 3,4 fautes/match) : à attaquer dans le contact.",
        "Adresse à mi-distance faible (38–41 %) : peut être poussée à shooter loin du cercle.",
      ],
      joueursCles: [
        { nom: "Nigel Hayes-Davis", poste: "Ailier-fort", taille: "2m01", num: 22, min: 29, pts: 17.4, reb: 6.5, pd: 2.3, tirsPct: 51.0, troisPct: 40.2, note: "Moteur offensif : mismatch permanent, shoote et attaque le cercle." },
        { nom: "Scottie Wilbekin",  poste: "Meneur",       taille: "1m88", num:  0, min: 25, pts: 13.1, reb: 2.4, pd: 3.9, tirsPct: 45.0, troisPct: 38.9, note: "Deuxième marqueur : très dangereux à 3 pts (38,9 %)." },
        { nom: "Wade Baldwin IV",   poste: "Meneur",       taille: "1m93", num:  4, min: 27, pts: 12.3, reb: 3.1, pd: 5.8, tirsPct: 46.0, troisPct: 34.5, note: "Meneur passeur : 5,8 passes décisives/match, distribue le jeu." },
        { nom: "Khem Birch",        poste: "Pivot",        taille: "2m08", num: 24, min: 22, pts:  8.6, reb: 7.8, pd: 1.0, tirsPct: 62.0, troisPct:  0.0, note: "Meilleur rebondeur (7,8/match) et très adroit près du cercle (62 %)." },
        { nom: "Devon Hall",        poste: "Arrière",      taille: "1m96", num: 11, min: 23, pts:  8.4, reb: 2.6, pd: 1.9, tirsPct: 47.0, troisPct: 43.1, note: "Sniper de corner : à ne jamais laisser ouvert." },
      ],
      efficacite: {
        p2: { r: 648, t: 1180, pct: 54.9 },
        p3: { r: 372, t:  984, pct: 37.8 },
        lf: { r: 545, t:  686, pct: 79.4 },
      },
      autres: { ballesPerdues: 11.8, rebondsOff: 9.4, fautes: 18.5, interceptions: 7.1 },
      zones: {
        RAQUETTE:            { tentes: 702, reussis: 451, pct: 64.2 },
        MI_DISTANCE_GAUCHE:  { tentes: 168, reussis:  66, pct: 39.3 },
        MI_DISTANCE_CENTRE:  { tentes: 121, reussis:  46, pct: 38.0 },
        MI_DISTANCE_DROITE:  { tentes: 175, reussis:  72, pct: 41.1 },
        CORNER_3_GAUCHE:     { tentes: 158, reussis:  68, pct: 43.0 },
        CORNER_3_DROIT:      { tentes: 171, reussis:  76, pct: 44.4 },
        TOP_KEY_GAUCHE:      { tentes: 208, reussis:  73, pct: 35.1 },
        TOP_KEY_DROIT:       { tentes: 214, reussis:  75, pct: 35.0 },
      },
      tendances: [
        "Volume de tir concentré dans la raquette (702 tentatives) et aux corners.",
        "Meilleur rebond offensif de la compétition (9,4/match) → beaucoup de secondes chances.",
        "Bonne adresse à 3 pts (37,8 %), surtout depuis les corners (43–44 %).",
        "Défense qui force 7,1 interceptions/match.",
        "Invaincue à domicile sur ses 8 derniers matchs.",
      ],
      planMatch: {
        exploiter: [
          "Attaquer la mi-distance et le 3 pts : ils défendent mieux près du cercle.",
          "Provoquer les fautes des intérieurs (Birch) en attaquant le cercle.",
          "Mettre la pression sur les porteurs pour forcer leurs pertes de balle (11,8/match).",
        ],
        eviter: [
          "Laisser filer des rebonds offensifs : boxer out systématiquement à 5.",
          "Perdre des ballons faciles : ils sont agressifs sur les interceptions (7,1/match).",
          "Laisser Hall ou Hayes-Davis ouverts au corner.",
        ],
        prioritesDef: [
          "Protéger la raquette : c'est de loin leur zone la plus adroite (64 %).",
          "Fermer la ligne de fond : aucun corner 3 ouvert.",
          "Finir chaque possession par un rebond défensif : une seule tentative concédée.",
        ],
      },
    },
  },
};

/* ---- Déduplication : la ligne "matchHapoel" du joueur vedette est dérivée
   du box score du match, plutôt que recopiée. La forme et les valeurs
   exposées par l'API restent strictement identiques. ---- */
(function deriveVedetteMatchHapoel() {
  const ligne = HOOPBOARD_DATA.matchHapoel.joueurs.find(
    (j) => j.nom === HOOPBOARD_DATA.joueurVedette.nom
  );
  if (ligne) {
    HOOPBOARD_DATA.joueurVedette.matchHapoel = {
      pts: ligne.pts, reb: ligne.reb, pd: ligne.pd, min: ligne.min,
      tirsPct: ligne.tirsPct, lfPct: ligne.lfPct, eva: ligne.eva,
    };
  }
})();

/* TODO (moteur d'événements — PR4.2 fondations) :
   `lib/match-events.js` pose la timeline unique (15 types d'événements) qui
   deviendra la source de vérité des stats. Migration à venir dans une PR
   dédiée : reconstruire `matchHapoel` (box score + quart-temps) à partir
   d'une liste `events` chronologique, puis dériver les totaux via
   aggregateStats(). Non fait ici pour ne pas toucher aux réponses API. */

/* Utilisable côté Node (require) ET navigateur (window.HOOPBOARD_DATA). */
if (typeof module !== "undefined" && module.exports) module.exports = HOOPBOARD_DATA;
if (typeof window !== "undefined") window.HOOPBOARD_DATA = HOOPBOARD_DATA;
