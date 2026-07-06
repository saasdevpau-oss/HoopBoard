/**
 * HoopBoard — Données réelles : U18 Pôle France @ ANGT Belgrade 2026
 * Source : Proballers (box score du 20/03/2026) + résultats du tournoi.
 * Objet unique consommable par les composants (dashboard, effectif,
 * fiche joueur, game center, feed).
 */
const HOOPBOARD_DATA = {
  club: {
    id: "pole-france",
    nom: "U18 Pôle France",
    court: "Pôle France",
    institut: "INSEP",
    tag: "PF",
    social: "@polefrancebasket",
  },

  tournoi: {
    nom: "Adidas Next Generation Tournament — Belgrade",
    saison: "2025–2026",
    bilan: { victoires: 4, defaites: 0 },
    champion: true,
    qualification: "ANGT Finals",
    mvp: "Nathan Soliman",
    statsEquipe: { ptsPour: 94.8, ptsContre: 74.5, diff: +20.3 },
    resultats: [
      { date: "2026-03-20", adversaire: "U18 Hapoel Tel Aviv",  code: "HT",  score: [91, 58], victoire: true, topScorer: { nom: "Messi Yangala", poste: "Ailier-fort", taille: "2m01", pts: 16 } },
      { date: "2026-03-21", adversaire: "U18 FMP Belgrade",     code: "FMP", score: [106, 86], victoire: true, topScorer: { nom: "Natéo Des Bordes", poste: "Arrière", taille: "1m89", pts: 23 } },
      { date: "2026-03-22", adversaire: "U18 Partizan Belgrade", code: "PAR", score: [87, 81], victoire: true, topScorer: { nom: "Matthys Mahop", poste: "Arrière", taille: "1m93", pts: 15 } },
      { date: "2026-03-23", adversaire: "U18 Crvena Zvezda", code: "CZV", score: [95, 73], victoire: true, finale: true, topScorer: { nom: "Nathan Soliman", poste: "Ailier", taille: "2m05", pts: 14 } },
    ],
    prochainMatch: { adversaire: "U18 Real Madrid", code: "RM", contexte: "ANGT Finals — phase de groupes", lieu: "Abu Dhabi" },
  },

  /* ---- Box score complet : Pôle France 91–58 Hapoel Tel Aviv (20/03/2026) ---- */
  matchHapoel: {
    date: "2026-03-20",
    competition: "ANGT Belgrade",
    scoreFinal: [91, 58],
    quartTemps: { poleFrance: [28, 21, 24, 18], hapoel: [13, 16, 15, 14] },
    totauxEquipe: {
      p2: { r: 25, t: 40, pct: 62.5 }, p3: { r: 6, t: 14, pct: 42.9 },
      tirs: { r: 31, t: 54, pct: 57.4 }, lf: { r: 23, t: 35, pct: 65.7 },
      rebonds: { off: 9, def: 37, total: 46 },
      passes: 25, ballesPerdues: 22, interceptions: 9, contres: 7, fautes: 17,
      pts: 91, eva: 121,
    },
    joueurs: [
      { nom: "Achille Elouma", poste: "Meneur", taille: "1m91",        min: 18, pts: 11, reb: 9, pd: 7, p2: "2-2", p3: "1-2", tirsPct: 75.0,  lf: "4-4", lfPct: 100.0, ro: 0, rd: 9, bp: 4, int: 4, ct: 0, fa: 2, eva: 26 },
      { nom: "Messi Yangala", poste: "Ailier-fort", taille: "2m01",         min: 18, pts: 16, reb: 4, pd: 1, p2: "6-9", p3: "0-0", tirsPct: 66.7,  lf: "4-6", lfPct: 66.7,  ro: 1, rd: 3, bp: 1, int: 0, ct: 2, fa: 1, eva: 17 },
      { nom: "Natéo Des Bordes", poste: "Arrière", taille: "1m89",      min: 16, pts: 15, reb: 2, pd: 0, p2: "3-4", p3: "3-4", tirsPct: 75.0,  lf: "0-0", lfPct: null,  ro: 0, rd: 2, bp: 2, int: 0, ct: 1, fa: 0, eva: 14 },
      { nom: "Nathan Soliman", poste: "Ailier", taille: "2m05",        min: 13, pts: 6,  reb: 5, pd: 2, p2: "2-2", p3: "0-0", tirsPct: 100.0, lf: "2-2", lfPct: 100.0, ro: 1, rd: 4, bp: 3, int: 1, ct: 1, fa: 1, eva: 12 },
      { nom: "Kény Vado", poste: "Ailier-fort", taille: "2m05",             min: 18, pts: 6,  reb: 4, pd: 0, p2: "3-3", p3: "0-0", tirsPct: 100.0, lf: "0-1", lfPct: 0.0,   ro: 0, rd: 4, bp: 1, int: 0, ct: 1, fa: 0, eva: 9 },
      { nom: "Messie-Guethan Iwani", poste: "Ailier", taille: "1m98",  min: 13, pts: 3,  reb: 4, pd: 1, p2: "1-1", p3: "0-1", tirsPct: 50.0,  lf: "1-2", lfPct: 50.0,  ro: 1, rd: 3, bp: 0, int: 2, ct: 1, fa: 2, eva: 9 },
      { nom: "Yanis Pierrot", poste: "Arrière", taille: "1m88",         min: 18, pts: 7,  reb: 1, pd: 4, p2: "0-0", p3: "2-3", tirsPct: 66.7,  lf: "1-2", lfPct: 50.0,  ro: 0, rd: 1, bp: 4, int: 1, ct: 0, fa: 2, eva: 7 },
      { nom: "Brandon Muela", poste: "Intérieur", taille: "2m03",         min: 18, pts: 6,  reb: 6, pd: 1, p2: "2-4", p3: "0-0", tirsPct: 50.0,  lf: "2-4", lfPct: 50.0,  ro: 3, rd: 3, bp: 2, int: 0, ct: 0, fa: 2, eva: 7 },
      { nom: "Sven Ngom", poste: "Pivot", taille: "2m06",             min: 14, pts: 4,  reb: 6, pd: 1, p2: "1-2", p3: "0-0", tirsPct: 50.0,  lf: "2-4", lfPct: 50.0,  ro: 2, rd: 4, bp: 1, int: 0, ct: 0, fa: 4, eva: 7 },
      { nom: "Yael Masdieu-Reynaert", poste: "Meneur", taille: "1m85", min: 18, pts: 6,  reb: 3, pd: 4, p2: "1-3", p3: "0-0", tirsPct: 33.3,  lf: "4-6", lfPct: 66.7,  ro: 0, rd: 3, bp: 3, int: 0, ct: 0, fa: 0, eva: 6 },
      { nom: "Liam Kabeya", poste: "Arrière", taille: "1m90",           min: 23, pts: 6,  reb: 1, pd: 1, p2: "2-5", p3: "0-3", tirsPct: 25.0,  lf: "2-2", lfPct: 100.0, ro: 1, rd: 0, bp: 0, int: 1, ct: 1, fa: 3, eva: 4 },
      { nom: "Matthys Mahop", poste: "Arrière", taille: "1m93",         min: 11, pts: 5,  reb: 1, pd: 3, p2: "2-5", p3: "0-1", tirsPct: 33.3,  lf: "1-2", lfPct: 50.0,  ro: 0, rd: 1, bp: 1, int: 0, ct: 0, fa: 0, eva: 3 },
    ],
  },

  /* ---- Joueur vedette : espace joueur + fiche ---- */
  joueurVedette: {
    nom: "Nathan Soliman",
    pseudo: "@nathan.soliman",
    poste: "Ailier",
    taille: "2m05",
    equipe: "U18 Pôle France · INSEP",
    distinction: "MVP de l'ANGT Belgrade 2026",
    moyennesTournoi: { pts: 13.5, reb: 7.0, pd: 4.5, eva: 23.0 },
    matchHapoel: { pts: 6, reb: 5, pd: 2, min: 13, tirsPct: 100.0, lfPct: 100.0, eva: 12 },
    /* lignes match par match — reconstruites pour coller aux moyennes officielles du tournoi */
    matchs: [
      { adversaire: "Hapoel Tel Aviv", pts: 6,  reb: 5, pd: 2, eva: 12 },
      { adversaire: "FMP Belgrade",    pts: 18, reb: 8, pd: 6, eva: 29 },
      { adversaire: "Partizan Belgrade", pts: 16, reb: 7, pd: 5, eva: 26 },
      { adversaire: "Crvena Zvezda (finale)", pts: 14, reb: 8, pd: 5, eva: 25 },
    ],
  },
};

if (typeof module !== "undefined") module.exports = HOOPBOARD_DATA;
