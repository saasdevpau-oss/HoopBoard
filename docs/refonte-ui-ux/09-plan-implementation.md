# HoopBoard — Plan d'implémentation de la refonte

> Sources : `docs/refonte-ui-ux/00`→`08`. Clone `HOOPBoard serieux/Stack claude/HoopBoard`, HEAD **`ad0af1d` (PR4.5)**.
> Nature : **plan**. Aucun code, aucune branche, aucun commit, aucun déploiement. Aucun fichier applicatif modifié.
> Voir la checklist associée : [`10-regression-checklist.md`](10-regression-checklist.md).

## 1. Périmètre
- Transformer les documents de conception (03→08) en **lots d'implémentation petits et indépendants**, réalisables chacun dans une session distincte.
- Ne rien inventer, ne changer aucune décision validée, aucun rôle, aucune migration de framework, aucune réécriture globale.
- **Réalité technique** (00/01) : 3 pages HTML **monolithiques** (`index.html`, `coach.html`, `joueur.html`) mêlant style+markup+JS ; **aucune CSS partagée** ; seul script externe `assets/court-analytics.js` (branché dans coach+joueur) ; `lib/match-events.js` **non branché** ; `api/*` serverless non persistants ; `*.md` exclu du déploiement (`.vercelignore`). Pas de build.

## 2. Principes d'implémentation
- **Petits lots** : un lot = un périmètre, des fichiers précis, des critères, des tests, un rollback.
- **Progressif et non destructif** : introduire la fondation visuelle **sans casser** l'architecture fonctionnelle existante ; conserver les fonctions qui marchent.
- **Pas de big-bang** : jamais toute l'app dans une PR ; jamais deux lots mélangés.
- **2D toujours disponible** ; **aucune fonction critique dépendante de la 3D**.
- **Décisions UX gelées** : 03 (IA), 05 (live), 06 (HoopFeed), 04/07/08 (visuel) sont la source de vérité.
- **Séparer docs et code** : la doc est commitée à part, avant le code.
- **Contraintes de la stack** : pas de dépendance installée sans point de décision ; toute mutualisation CSS/JS reste en HTML/CSS/JS vanilla (pas de framework).

## 3. Stratégie de branches
Convention **exacte** (aucune autre) :
```
docs/refonte-ui-ux              (documentation, avant le code)
refonte/lot-0-foundation
refonte/lot-1-navigation-today
refonte/lot-2-team
refonte/lot-3-matches
refonte/lot-4-live
refonte/lot-5-training
refonte/lot-6-analytics
refonte/lot-7-hoopfeed
refonte/lot-8-responsive-a11y
refonte/lot-9-3d
refonte/lot-10-landing
```
- **Base** : chaque branche part de la branche de base **confirmée** (voir §22 / points de décision). Une branche = un lot = une PR.
- **Sous-lots 4 (A→G) et 7 (A→G)** : **une seule branche par lot principal** (`refonte/lot-4-live`, `refonte/lot-7-hoopfeed`) — la convention n'autorise pas de nom de sous-lot. Chaque sous-lot est livré comme **un commit distinct et testable** sur cette branche, et peut faire l'objet d'une **PR incrémentale** (stackée) fusionnée dans l'ordre. Cela évite une PR massive tout en respectant la nomenclature imposée. **Sous-lot 9** : idem sur `refonte/lot-9-3d`.

## 4. Commit documentation (avant le Lot 0)
- **Branche** : `docs/refonte-ui-ux`
- **Commit** : `docs: add HoopBoard UX/UI redesign specifications`
- **Titre PR** : `docs: add HoopBoard UX/UI redesign specifications`
- Contenu : **uniquement** `docs/refonte-ui-ux/`.
- Cette PR : **ne modifie aucun fichier applicatif**, **ne déclenche aucun changement visuel**, **peut être fusionnée avant le code**, sert de **référence** aux futurs lots.
> Note d'état : les documents 00→08 sont **déjà commités** (commit `4bc469b`, branche `refactor/pr3.1-button-system`). Recréer/positionner ce commit sur `docs/refonte-ui-ux` depuis la base confirmée reste recommandé pour respecter le flux ; sinon, cette étape est considérée satisfaite par `4bc469b` (à trancher avec la branche de base, §21).

## 5. Workflow pull request
Chaque PR inclut : **objectif** · **captures avant/après** (si visuel) · **fichiers modifiés** · **tests réalisés** · **breakpoints testés** (375/768/1024/1440) · **risques** · **fonctions non modifiées** · **lien preview Vercel** · **checklist de régression** (voir `10`). Une intention par PR ; pas de mélange doc+code.

## 6. Workflow Vercel
Étape préalable **obligatoire** : **Vérifier la branche de production configurée dans Vercel avant toute fusion** (ne pas supposer quelle branche déploie la bêta).
1. Branche poussée sur GitHub.
2. PR ouverte.
3. Preview Vercel générée.
4. Tests desktop.
5. Tests mobile.
6. Tests tablette.
7. Vérification des interactions.
8. Correction.
9. Validation.
10. Fusion.
11. Vérification du déploiement cible.
Aucun déploiement dans le cadre de ce plan.

## 7. Complexité (XS/S/M/L/XL — aucune durée)
Critères :
- **XS** : un seul fichier, changement isolé, sans dépendance, test trivial.
- **S** : une section/page, peu de composants, régression faible.
- **M** : plusieurs sections ou une section complexe, dépendances modérées.
- **L** : fonctionnalité transverse, plusieurs fichiers, risque de régression notable, sous-lots utiles.
- **XL** : périmètre large multi-sous-lots, risque élevé (état partagé), séquencement strict.

| Lot | Complexité |
|---|---|
| 0 Fondation | **L** |
| 1 Navigation + Aujourd'hui | **M** |
| 2 Équipe + profils | **M** |
| 3 Matchs (hors live) | **M** |
| 4 Match live | **XL** — 4A **L** · 4B **M** · 4C **S** · 4D **M** · 4E **L** · 4F **M** · 4G **M** |
| 5 Entraînements | **S** |
| 6 Analyse + terrains 2D | **M** |
| 7 HoopFeed | **L** — 7A **M** · 7B **S** · 7C **M** · 7D **M** · 7E **S** · 7F **S** · 7G **M** |
| 8 Responsive + a11y | **M** |
| 9 3D | **L** — 9A **M** · 9B **L** · 9C **M** · 9D **S** |
| 10 Landing + finition | **M** |

## 8. Matrice de dépendances

| Lot | Dépend de | Peut démarrer en parallèle avec | Bloque | Risque de conflit de fichiers |
|---|---|---|---|---|
| 0 | — | (préparation 4A) | **tous les lots visuels** | Élevé (les 3 HTML, `<style>` de chaque page) |
| 1 | 0 | 2, 3 (préparation) | pages principales | coach.html, joueur.html |
| 2 | 0, 1 | 3 | — | coach.html (effectif/fiche), joueur.html |
| 3 | 0, 1 | 2 | — | coach.html (gamecenter/match), data.js (lecture) |
| 4 | 0 (peut être préparé en parallèle de 2/3) | 2, 3 | — | coach.html (#page-live), lib/match-events.js, court-analytics.js |
| 5 | 0, 1 | 2, 3, 6 | — | joueur.html (#view-training) |
| 6 | 0, 1 | 5 | 9 | coach.html/joueur.html (analyse), court-analytics.js |
| 7 | 0 + navigation (1) | 5, 6 | — | joueur.html (#view-feed), futur espace coach |
| 8 | lots visuels principaux (0–7) | — | — | tous les HTML (ajustements) |
| 9 | 6 | — | — | assets (module 3D isolé), landing |
| 10 | 0–9 (finition) | — | — | index.html |

Règles minimales respectées : Lot 0 bloque tous les lots visuels · Lot 1 précède les pages · Lot 4 dépend de 0 mais préparable en parallèle de 2/3 · Lot 7 dépend de 0 + navigation · Lot 8 après les lots visuels · Lot 9 après Lot 6 · Lot 10 en dernier.

**Priorité** — Critique : **0, 1, 4**. Important : **2, 3, 5, 6, 7**. Finition : **8, 9, 10**.

---

## 9. Lot 0 — Fondation visuelle

```text
Identifiant : LOT-0
Nom : Fondation visuelle
Objectif : Créer une fondation de styles réutilisable (tokens, composants de base) sans changer l'architecture fonctionnelle des pages.
Périmètre : tokens CSS, palette, typographies, espacements, rayons, ombres, bordures, états interactifs, boutons, champs, badges, cartes, modales, drawers, états vides, erreurs, indicateur données de démonstration, icônes.
Documents de référence : 04-design-system.md (tokens, composants), 08 (états, a11y de base).
Fichiers probablement concernés : index.html, coach.html, joueur.html (blocs <style> internes) ; création d'une feuille de styles partagée (ex. assets/theme.css) chargée par les 3 pages ; assets/ (icônes SVG).
Composants ou sections concernés : boutons, champs, badges, cartes, modales, drawers, états vides/erreur, badge « Données de démonstration » ; aucune section fonctionnelle refondue.
Données utilisées : aucune (présentation uniquement).
Dépendances : aucune.
Préconditions : documentation commitée ; branche de base confirmée ; branche de prod Vercel identifiée.
Étapes d'implémentation :
 1) Extraire les tokens réels existants (--void, --orange=#40E8D5 teal, --t1..t4, --hair…) et les mapper vers les tokens cibles (04 §4).
 2) Créer une feuille partagée de tokens + primitives (assets/theme.css) sans supprimer immédiatement les styles inline.
 3) Charger cette feuille dans les 3 pages (<link>) ; réconcilier les variables (conserver vs remplacer).
 4) Introduire les composants de base (boutons, champs, badges, cartes, modales, drawers, états vides, erreurs) en classes réutilisables.
 5) Définir l'accent orange (#E8722C) sans l'appliquer partout ; réserver le rouge aux erreurs/destructif/manqués.
 6) Ajouter le badge « Données de démonstration » (Option A, 04 §21) comme composant réutilisable.
 7) Adopter une bibliothèque d'icônes (Lucide) en SVG inline/sprite ; conserver les icônes custom terrain/ballon.
Fonctionnalités à préserver : rendu et comportement actuels des 3 pages ; polices auto-hébergées (Outfit) ; prefers-reduced-motion.
Éléments explicitement hors périmètre : nouvelle navigation, match live, HoopFeed, 3D, refonte complète d'une page, thème clair.
Risques : duplication CSS entre 3 fichiers ; styles inline nombreux (124 attributs style dans coach.html) ; collisions de noms de variables ; régression visuelle globale.
Mesures de réduction du risque : introduire la feuille partagée en additif (ne pas supprimer l'existant d'un coup) ; mapper avant de remplacer ; tester page par page ; conserver les anciens tokens en alias temporaires.
Tests manuels : ouvrir les 3 pages et comparer avant/après ; vérifier boutons/champs/cartes/modales/drawers/états vides/erreurs ; vérifier badge démo ; 375/768/1024/1440 ; reduced-motion.
Tests automatisables : lint CSS (si outillage ajouté ultérieurement) ; capture visuelle de référence (optionnel) — sinon À décider plus tard.
Critères d'acceptation : tokens cibles disponibles pour les 3 pages ; composants de base utilisables ; aucun changement d'architecture ; accent orange présent mais non envahissant ; badge démo disponible ; aucune régression fonctionnelle.
Condition de rollback : revert de la PR (feuille partagée additive → suppression du <link> restaure l'état antérieur).
Condition de validation : preview Vercel conforme sur les 3 pages aux 4 breakpoints, sans régression.
Branche recommandée : refonte/lot-0-foundation
Nom de commit recommandé : style: add shared design tokens and base components
Titre de pull request recommandé : Lot 0 — Fondation visuelle (tokens, composants de base)
```

## 10. Lot 1 — Navigation et Aujourd'hui

```text
Identifiant : LOT-1
Nom : Navigation et page Aujourd'hui
Objectif : Mettre en place la navigation coach (desktop/mobile/tablette) et la page « Aujourd'hui » qui remplace le dashboard.
Périmètre : sidebar desktop 8 entrées, barre basse mobile 5 + « Plus », rail tablette, états actifs ; Aujourd'hui : prochain match, dernier résultat, prochain entraînement, objectif, résumé statistique court, dernière publication HoopFeed, raccourcis autorisés.
Documents de référence : 03 (§2,§7,§8,§9,§10), 04, 08.
Fichiers probablement concernés : coach.html (topnav/tabs → nouvelle nav + #page-dashboard → Aujourd'hui) ; assets/theme.css (styles nav).
Composants ou sections concernés : navigation, carte prochain match, carte dernier résultat, carte entraînement, résumé statistique, aperçu dernière publication, raccourcis.
Données utilisées : data.js (tournoi.prochainMatch, resultats, statsEquipe) via hydratation existante ; contenus embarqués en repli.
Dépendances : Lot 0.
Préconditions : Lot 0 fusionné.
Étapes d'implémentation :
 1) Remplacer topnav/tabs par la sidebar 8 entrées (desktop) + barre basse 5 + « Plus » (mobile) + rail (tablette).
 2) Corriger l'état actif fidèle à l'écran (résout UX-P1-001) ; retirer l'ambiguïté tabMap.
 3) Construire « Aujourd'hui » avec les blocs autorisés (03 §7) et leurs états vides.
 4) Ajouter les raccourcis autorisés (Match live, Effectif, Entraînements).
 5) Masquer la navigation pendant le futur mode live (préparer le hook, sans implémenter le live).
Fonctionnalités à préserver : accès aux 7 sections existantes ; hydratation des pills.
Éléments explicitement hors périmètre : nouvelles données, backend, authentification, statistiques avancées, match live, refonte des autres sections.
Risques : casser la navigation existante (goto/tabMap) ; cul-de-sac non résolu.
Mesures de réduction du risque : conserver goto() comme moteur d'affichage ; ajouter retours explicites ; tester chaque entrée.
Tests manuels : naviguer entre les 8 entrées desktop ; barre basse + « Plus » mobile ; rail tablette ; état actif ; Aujourd'hui et états vides ; 4 breakpoints ; clavier.
Tests automatisables : À décider plus tard (pas d'outillage de test en place).
Critères d'acceptation : nav conforme 03 ; état actif correct ; Aujourd'hui affiche uniquement les blocs autorisés ; raccourcis fonctionnels ; pas de mur de stats.
Condition de rollback : revert de la PR.
Condition de validation : preview Vercel validée, navigation cohérente, aucun cul-de-sac.
Branche recommandée : refonte/lot-1-navigation-today
Nom de commit recommandé : feat: add coach navigation and Today page
Titre de pull request recommandé : Lot 1 — Navigation et page Aujourd'hui
```

## 11. Lot 2 — Équipe et profils joueurs

```text
Identifiant : LOT-2
Nom : Équipe et profils joueurs
Objectif : Regrouper effectif et fiche joueur dans la section Équipe, avec profils coach/joueur déjà prévus et responsive des tableaux/profils.
Périmètre : effectif, liste des joueurs, ligne joueur, fiche joueur, statistiques existantes, objectifs, progression, profils coach/joueur, responsive tableaux et profils.
Documents de référence : 03 (§6 Équipe), 04 (tableaux, fiche joueur compacte), 08 (§11 tableaux).
Fichiers probablement concernés : coach.html (#page-effectif, #page-joueur), joueur.html (profil).
Composants ou sections concernés : tableau statistique, ligne joueur, fiche joueur compacte, carte objectif.
Données utilisées : data.js (statsSaison demo, roster, joueurVedette) via API existante ; badge démo sur les données demo.
Dépendances : Lot 0, Lot 1.
Préconditions : Lot 1 fusionné.
Étapes d'implémentation :
 1) Reconstruire l'effectif avec le tableau du DS (colonnes prioritaires, chiffres tabulaires, colonne joueur fixe).
 2) Signaler les moyennes demo (badge, Option A).
 3) Fiche joueur : onglets Résumé/Stats/Matchs/Objectifs/Progression (données existantes).
 4) Séparer profil coach (avatar, nom, rôle, équipe, publications) et profil joueur (sportif).
 5) Responsive tableaux (scroll contrôlé mobile) et profils.
Fonctionnalités à préserver : hydratation effectif ; radar/moyennes existants.
Éléments explicitement hors périmètre : données médicales, documents, notes privées, rôles supplémentaires, fonctions administratives.
Risques : régression de l'hydratation (tbody reconstruit en innerHTML) ; illisibilité tableau mobile.
Mesures de réduction du risque : conserver la logique d'hydratation ; tester avec et sans API ; vérifier colonne fixe.
Tests manuels : effectif desktop/mobile ; fiche joueur onglets ; profils coach/joueur ; badge démo ; 4 breakpoints ; clavier.
Tests automatisables : À décider plus tard.
Critères d'acceptation : Équipe conforme 03 ; tableaux lisibles mobile sans conversion auto en cartes ; données demo signalées ; aucun ajout administratif/médical.
Condition de rollback : revert de la PR.
Condition de validation : preview Vercel validée.
Branche recommandée : refonte/lot-2-team
Nom de commit recommandé : feat: restructure team roster and player profiles
Titre de pull request recommandé : Lot 2 — Équipe et profils joueurs
```

## 12. Lot 3 — Matchs (hors mode live)

```text
Identifiant : LOT-3
Nom : Matchs hors mode live
Objectif : Regrouper la consultation des matchs (liste/états, Game Center, feuille de match, box score, récap, carte de tirs après match) et la navigation résumé/stats/tirs.
Périmètre : liste des matchs, états à venir/en cours/terminé, Game Center, prochain match, feuille de match existante, box score, récapitulatif, carte de tirs après match, navigation entre résumé/statistiques/tirs.
Documents de référence : 03 (§6 Matchs), 04, 08.
Fichiers probablement concernés : coach.html (#page-gamecenter, #page-match), joueur.html (games/recap), court-analytics.js (carte, lecture seule).
Composants ou sections concernés : liste par état, fiche match, box score, récap, carte de tirs 2D.
Données utilisées : data.js (matchHapoel, resultats, coachMatches embarqués) ; carte via shotsFromTimeline/renderSeasonCourt.
Dépendances : Lot 0, Lot 1.
Préconditions : Lot 1 fusionné.
Étapes d'implémentation :
 1) Liste/calendrier des matchs avec état (À venir/En cours/Terminé).
 2) Fiche match terminé : onglets Récap / Box score / Carte des tirs / Feuille de match.
 3) Brancher la carte de tirs après-match sur court-analytics (2D).
 4) Préparer l'entrée « Démarrer » vers le mode banc (sans implémenter le live — Lot 4).
Fonctionnalités à préserver : Game Center, feuille de match scénarisée, box score, récap.
Éléments explicitement hors périmètre : moteur live, persistance, chronomètre, rotations, système d'événements.
Risques : confusion feuille scénarisée vs live ; duplication coachMatches/data.js.
Mesures de réduction du risque : clarifier statut « exemple » ; ne pas toucher au live ; converger l'affichage vers une source.
Tests manuels : liste par état ; fiche match onglets ; carte de tirs 2D ; navigation résumé/stats/tirs ; 4 breakpoints.
Tests automatisables : À décider plus tard.
Critères d'acceptation : Matchs conforme 03 ; états simples présents ; carte de tirs après-match visible ; live non modifié.
Condition de rollback : revert de la PR.
Condition de validation : preview Vercel validée.
Branche recommandée : refonte/lot-3-matches
Nom de commit recommandé : feat: restructure matches section (list, box score, shot chart)
Titre de pull request recommandé : Lot 3 — Matchs (hors mode live)
```

## 13. Lot 4 — Match live

```text
Identifiant : LOT-4
Nom : Match live (mode banc)
Objectif : Implémenter le mode banc conforme au document 05, isolé, en 7 sous-lots séquencés.
Périmètre : voir 05 (barre de match, joueurs/lineup, actions, saisie tir Option A, terrain, score 2 équipes, chrono/période, fautes, autres stats, historique, undo transactionnel, sauvegarde/hors-ligne, sortie, mobile/tablette).
Documents de référence : 05-match-live.md (strict), 04, 08, 01/00 (match-events.js, court-analytics.js).
Fichiers probablement concernés : coach.html (#page-live), lib/match-events.js (à brancher), assets/court-analytics.js, assets/theme.css.
Composants ou sections concernés : bloc score, chronomètre, sélecteur période, sélecteur joueur, lineup, boutons stat, terrain, marqueur, feed d'actions, statut de sauvegarde, drawers.
Données utilisées : timeline d'événements (source de vérité), roster embarqué ; aucune donnée inventée.
Dépendances : Lot 0 (préparable en parallèle de 2/3).
Préconditions : Lot 0 fusionné ; décisions live (mode par défaut, durée périodes, prolongations, persistance) prises ou marquées À décider (4B/4F).
Étapes d'implémentation : livrer 4A→4G dans l'ordre (voir sous-lots).
Fonctionnalités à préserver : saisie visuelle (terrain + feed + carte 2D), réactivité immédiate.
Éléments explicitement hors périmètre : toute modification des décisions du document 05 ; stats non autorisées (ex. contre) ; tactique.
Risques : état partagé (score/feed/timeline/carte) ; régression de la saisie existante.
Mesures de réduction du risque : source de vérité unique dès 4A ; sous-lots testables ; rollback par sous-lot.
Tests manuels : voir sous-lots + `10` (points 8–13).
Tests automatisables : tests unitaires possibles sur match-events.js (aggregateStats) — À confirmer avec l'outillage.
Critères d'acceptation : conformité stricte à 05 ; undo transactionnel ; reprise après rechargement ; 4 statuts de sauvegarde ; Option A respectée.
Condition de rollback : revert par sous-lot (commits distincts) ou de la branche.
Condition de validation : preview Vercel validée par sous-lot + tests terrain de 05 §30.
Branche recommandée : refonte/lot-4-live  (branche UNIQUE ; un commit/PR incrémentale par sous-lot 4A→4G)
Nom de commit recommandé : feat: implement live bench mode (see sub-lot commits)
Titre de pull request recommandé : Lot 4 — Match live (mode banc)
```

### Sous-lots du Lot 4 (branche unique `refonte/lot-4-live`)

```text
Identifiant : LOT-4A
Nom : Modèle d'événements et undo
Objectif : Établir la timeline unique (source de vérité) et l'undo transactionnel.
Périmètre : brancher lib/match-events.js (makeEvent, timeline, aggregateStats) comme source de vérité ; undo transactionnel (score+stat+carte+historique).
Documents de référence : 05 (§18,§27,§28), 01 (§16).
Fichiers probablement concernés : coach.html (#page-live JS), lib/match-events.js, court-analytics.js (shotsFromTimeline).
Composants ou sections concernés : timeline, feed d'actions, undo.
Données utilisées : événements en mémoire (format match-events).
Dépendances : Lot 0.
Préconditions : Lot 0 fusionné.
Étapes d'implémentation : 1) remplacer le format répliqué à la main par match-events ; 2) dériver score/stats via aggregateStats ; 3) undo = retrait d'événement + recalcul de toutes les vues.
Fonctionnalités à préserver : feed, carte 2D live.
Éléments explicitement hors périmètre : UI score/chrono (4B), modes (4C+), persistance (4F).
Risques : divergence si une vue n'écoute pas la timeline.
Mesures de réduction du risque : une seule fonction de rendu dérivée de la timeline.
Tests manuels : saisir 10 actions ; annuler 3 → score/carte/feed cohérents (`10` #12).
Tests automatisables : unitaires aggregateStats (À confirmer).
Critères d'acceptation : undo corrige TOUTES les vues ; aucune divergence.
Condition de rollback : revert du commit 4A.
Condition de validation : preview + test undo.
Branche recommandée : refonte/lot-4-live
Nom de commit recommandé : refactor: use match-events timeline as single source of truth with transactional undo
Titre de pull request recommandé : Lot 4A — Modèle d'événements et undo
```
```text
Identifiant : LOT-4B
Nom : Score, période et chronomètre
Objectif : Score éditable 2 équipes, période, chronomètre avec états, correction manuelle distincte.
Périmètre : bloc score (2 équipes, plancher 0), période suivante/précédente, chrono démarrer/pause/reprendre/modifier, états (non démarré/en cours/pause/terminé/match terminé), correction manuelle (origine=manuel, sans stat joueur).
Documents de référence : 05 (§8,§13,§14).
Fichiers probablement concernés : coach.html (#page-live), theme.css.
Composants ou sections concernés : bloc score, chronomètre, sélecteur période.
Données utilisées : timeline (4A) + événements équipe/manuel.
Dépendances : 4A.
Préconditions : 4A livré.
Étapes d'implémentation : 1) score 2 équipes ; 2) chrono/période ; 3) correction manuelle marquée.
Fonctionnalités à préserver : lisibilité du score.
Éléments explicitement hors périmètre : durée périodes/prolongations (paramètre à définir), stats joueur (4C+).
Risques : correction manuelle créant une stat joueur ; score négatif.
Mesures de réduction du risque : événement manuel sans joueur ; plancher 0.
Tests manuels : corriger le score (`10` #9) ; changer de période (`10` #14) ; démarrer/pause.
Tests automatisables : À décider plus tard.
Critères d'acceptation : score 2 équipes éditable ; correction ne crée pas de stat ; états chrono corrects.
Condition de rollback : revert du commit 4B.
Condition de validation : preview + tests.
Branche recommandée : refonte/lot-4-live
Nom de commit recommandé : feat: editable two-team score, period and clock
Titre de pull request recommandé : Lot 4B — Score, période et chronomètre
```
```text
Identifiant : LOT-4C
Nom : Mode Simple
Objectif : Suivi au score sans stats joueur.
Périmètre : +1/+2/+3 HB et adverse, retirer un point, faute HB/adverse, période, chrono, undo, historique ; joueurs/terrain masqués.
Documents de référence : 05 (§5,§10,§29).
Fichiers probablement concernés : coach.html (#page-live), theme.css.
Composants ou sections concernés : actions, historique, statut sauvegarde.
Données utilisées : timeline (événements équipe).
Dépendances : 4A, 4B.
Préconditions : 4B livré.
Étapes d'implémentation : 1) actions score/faute 1 geste ; 2) masquer joueurs/terrain ; 3) historique compact.
Fonctionnalités à préserver : lisibilité, undo.
Éléments explicitement hors périmètre : stats joueur (4D), lineup (4E).
Risques : cibles < 44 px.
Mesures de réduction du risque : respecter densité compacte + 44 px.
Tests manuels : critères Mode Simple (05 §29) ; `10` #9/#12.
Tests automatisables : À décider plus tard.
Critères d'acceptation : checklist Mode Simple (05) validée.
Condition de rollback : revert du commit 4C.
Condition de validation : preview + tests.
Branche recommandée : refonte/lot-4-live
Nom de commit recommandé : feat: live Simple mode (team scoring)
Titre de pull request recommandé : Lot 4C — Mode Simple
```
```text
Identifiant : LOT-4D
Nom : Mode Standard
Objectif : Box score par joueur + saisie de tir Option A.
Périmètre : sélection joueur sticky, tir marqué/manqué (2/3), lancer franc séparé, rebond, passe, interception, perte de balle, faute ; terrain contextuel ; Option A (joueur → marqué/manqué → zone).
Documents de référence : 05 (§6,§9,§10,§11,§12,§16,§29).
Fichiers probablement concernés : coach.html (#page-live), court-analytics.js (renderLiveCourt), theme.css.
Composants ou sections concernés : sélecteur joueur, boutons stat, terrain, marqueur.
Données utilisées : timeline (événements joueur).
Dépendances : 4A, 4B, 4C.
Préconditions : 4C livré.
Étapes d'implémentation : 1) sélecteur joueur saillant ; 2) parcours Option A sans popup bloquante ; 3) zone → 2/3 pts ; 4) LF séparé ; 5) autres stats 1–2 gestes.
Fonctionnalités à préserver : carte 2D live, feed.
Éléments explicitement hors périmètre : lineup/plus-minus/substitution (4E), stats non autorisées.
Risques : parcours trop long ; mauvaise sélection.
Mesures de réduction du risque : joueur sticky ; cibles ≥ 44 ; pas de popup centrale.
Tests manuels : tir marqué/manqué (`10` #10) ; ≤ 3 gestes ; Option A ; checklist Standard (05).
Tests automatisables : unitaires stats (À confirmer).
Critères d'acceptation : checklist Mode Standard (05) validée ; Option A respectée.
Condition de rollback : revert du commit 4D.
Condition de validation : preview + tests terrain.
Branche recommandée : refonte/lot-4-live
Nom de commit recommandé : feat: live Standard mode (player stats, Option A shot entry)
Titre de pull request recommandé : Lot 4D — Mode Standard
```
```text
Identifiant : LOT-4E
Nom : Mode Avancé
Objectif : Lineup 5 joueurs, substitutions, localisation fine optionnelle, plus-minus.
Périmètre : cinq actifs, banc/substitution atomique, lineup invalide impossible, localisation x/y optionnelle, plus-minus (disponibilité À décider).
Documents de référence : 05 (§7,§9,§29).
Fichiers probablement concernés : coach.html (#page-live), court-analytics.js (x/y), theme.css.
Composants ou sections concernés : lineup, banc, panneau substitution, marqueur (x/y).
Données utilisées : timeline (lineup, x/y).
Dépendances : 4D.
Préconditions : 4D livré.
Étapes d'implémentation : 1) cinq actifs ; 2) substitution atomique (drawer) ; 3) localisation fine optionnelle ; 4) plus-minus (si activé).
Fonctionnalités à préserver : rapidité de la saisie Standard.
Éléments explicitement hors périmètre : poste/tactique/rotation auto.
Risques : lineup invalide ; ralentissement de la saisie.
Mesures de réduction du risque : contrainte 5 ; localisation non obligatoire.
Tests manuels : substitution (`10` #13) ; lineup toujours = 5 ; checklist Avancé (05).
Tests automatisables : À décider plus tard.
Critères d'acceptation : checklist Mode Avancé (05) validée.
Condition de rollback : revert du commit 4E.
Condition de validation : preview + tests.
Branche recommandée : refonte/lot-4-live
Nom de commit recommandé : feat: live Advanced mode (lineup, substitutions, plus-minus)
Titre de pull request recommandé : Lot 4E — Mode Avancé
```
```text
Identifiant : LOT-4F
Nom : Persistance locale et restauration
Objectif : Conserver la session localement, restaurer après rechargement, 4 statuts de sauvegarde.
Périmètre : conservation locale des événements, restauration au rechargement, statuts (Sauvegardé/En cours/Hors connexion/Erreur), synchro au retour réseau, sortie avec avertissement si non synchronisé.
Documents de référence : 05 (§12,§19,§20).
Fichiers probablement concernés : coach.html (#page-live), (techno de stockage NON choisie ici).
Composants ou sections concernés : statut de sauvegarde, confirmation de sortie.
Données utilisées : timeline persistée localement.
Dépendances : 4A (timeline).
Préconditions : 4A livré ; décision techno persistance (ou marquée À décider, implémentation locale minimale).
Étapes d'implémentation : 1) persister chaque événement localement ; 2) restaurer au chargement ; 3) 4 statuts ; 4) sortie/avertissement.
Fonctionnalités à préserver : saisie fluide.
Éléments explicitement hors périmètre : choix de base de données/synchronisation serveur.
Risques : perte silencieuse ; état corrompu.
Mesures de réduction du risque : écrire à chaque événement ; statut visible permanent.
Tests manuels : perdre la connexion (`10` #? via 05 §30.6) ; recharger (`10` #? via 05 §30.7) ; quitter non terminé (`10`).
Tests automatisables : À décider plus tard.
Critères d'acceptation : rechargement ne perd pas la session ; 4 statuts visibles.
Condition de rollback : revert du commit 4F.
Condition de validation : preview + tests hors ligne/rechargement.
Branche recommandée : refonte/lot-4-live
Nom de commit recommandé : feat: local persistence and session restore for live mode
Titre de pull request recommandé : Lot 4F — Persistance locale et restauration
```
```text
Identifiant : LOT-4G
Nom : Responsive mobile et tablette (live)
Objectif : Appliquer l'ordre mobile 5 zones et la tablette paysage 2 colonnes.
Périmètre : ordre vertical mobile (05 §21), tablette portrait/paysage (05 §22), cibles ≥ 44, score/chrono toujours visibles, nav masquée.
Documents de référence : 05 (§21,§22,§25), 08.
Fichiers probablement concernés : coach.html (#page-live), theme.css.
Composants ou sections concernés : toutes les zones du live.
Données utilisées : —
Dépendances : 4C/4D/4E (contenu), 4B (score/chrono).
Préconditions : modes livrés.
Étapes d'implémentation : 1) ordre mobile ; 2) paysage 2 colonnes ; 3) sticky score/actions.
Fonctionnalités à préserver : toutes les fonctions live.
Éléments explicitement hors périmètre : changement de décisions 05.
Risques : chevauchement, cibles trop petites.
Mesures de réduction du risque : tests réels 375/768/1024.
Tests manuels : live 375/768/1024 (`10` #? ; 05 §30.12/13).
Tests automatisables : À décider plus tard.
Critères d'acceptation : ordre mobile et tablette paysage conformes ; une main possible.
Condition de rollback : revert du commit 4G.
Condition de validation : preview aux 3 tailles.
Branche recommandée : refonte/lot-4-live
Nom de commit recommandé : style: responsive live mode (mobile order, tablet landscape)
Titre de pull request recommandé : Lot 4G — Responsive mobile et tablette (live)
```

## 14. Lot 5 — Entraînements

```text
Identifiant : LOT-5
Nom : Entraînements
Objectif : Structurer le Training Hub (zones, drills, objectifs, progression) et sa navigation/responsive.
Périmètre : Training Hub, exercices existants, drills, objectifs, zones à travailler, progression, navigation, responsive.
Documents de référence : 03 (§6 Entraînements), 04, 08.
Fichiers probablement concernés : joueur.html (#view-training), coach.html (accès consultation), theme.css.
Composants ou sections concernés : carte exercice, carte objectif, zones.
Données utilisées : zones/drills/objectifs embarqués (existants).
Dépendances : Lot 0, Lot 1.
Préconditions : Lot 1 fusionné.
Étapes d'implémentation : 1) zones → drills (fait/à faire) ; 2) objectifs + progression ; 3) navigation + responsive.
Fonctionnalités à préserver : lien point chaud → drills.
Éléments explicitement hors périmètre : créateur de séance (Évolution future — hors périmètre) ; historique des séances (Absent — hors périmètre).
Risques : faire croire à un suivi persistant.
Mesures de réduction du risque : signaler le statut d'exemple / non suivi.
Tests manuels : zones → drills ; objectifs ; 4 breakpoints.
Tests automatisables : À décider plus tard.
Critères d'acceptation : Entraînements conforme 03 ; pas de créateur/historique.
Condition de rollback : revert de la PR.
Condition de validation : preview Vercel validée.
Branche recommandée : refonte/lot-5-training
Nom de commit recommandé : feat: restructure training hub (zones, drills, goals)
Titre de pull request recommandé : Lot 5 — Entraînements
```

## 15. Lot 6 — Analyse et terrains 2D

```text
Identifiant : LOT-6
Nom : Analyse et terrains 2D
Objectif : Regrouper l'analyse (stats équipe/joueurs, heatmaps, carte de tirs, zones, box scores, tendances) en 2D, avec filtres existants et données demo signalées.
Périmètre : stats équipe/joueurs, heatmaps, carte de tirs, zones, box scores, tendances, court-analytics.js, filtres existants, données demo, responsive. La 2D est prioritaire. Aucune 3D.
Documents de référence : 03 (§5 Analyse), 04 (graphiques), 07 (2D référence), 08.
Fichiers probablement concernés : coach.html, joueur.html (analyse), assets/court-analytics.js, theme.css.
Composants ou sections concernés : heatmap, carte de tirs, box score, graphique de tendance.
Données utilisées : data.js (zonesTirSaison demo, box score), court-analytics (renderSeasonCourt).
Dépendances : Lot 0, Lot 1.
Préconditions : Lot 1 fusionné.
Étapes d'implémentation : 1) vue d'ensemble/équipe/joueurs/matchs/tirs&zones ; 2) heatmap+carte 2D ; 3) badges demo ; 4) responsive.
Fonctionnalités à préserver : court-analytics.js (2D), filtres.
Éléments explicitement hors périmètre : toute 3D (Lot 9).
Risques : données demo prises pour réelles ; graphiques décoratifs.
Mesures de réduction du risque : badge demo systématique ; titre/unité/période/légende.
Tests manuels : Analyse 375/1024 (`10` #? ) ; heatmap/carte ; demo signalé.
Tests automatisables : À décider plus tard.
Critères d'acceptation : Analyse conforme 03/04 ; 2D prioritaire ; demo identifiable ; aucune 3D.
Condition de rollback : revert de la PR.
Condition de validation : preview Vercel validée.
Branche recommandée : refonte/lot-6-analytics
Nom de commit recommandé : feat: analytics section with 2D shot charts and heatmaps
Titre de pull request recommandé : Lot 6 — Analyse et terrains 2D
```

## 16. Lot 7 — HoopFeed

```text
Identifiant : LOT-7
Nom : HoopFeed
Objectif : Implémenter HoopFeed conforme au document 06 en 7 sous-lots.
Périmètre : structure/cartes, filtres, likes/commentaires, création coach, création joueur conditionnelle, profils liés, états/erreurs/responsive.
Documents de référence : 06-hoopfeed.md (strict), 04, 08.
Fichiers probablement concernés : joueur.html (#view-feed), coach.html (nouvel accès HoopFeed), theme.css.
Composants ou sections concernés : carte HoopFeed, filtres, commentaire, formulaire de publication, profil compact.
Données utilisées : posts embarqués (existants) ; badge demo si applicable.
Dépendances : Lot 0 + navigation (Lot 1).
Préconditions : Lot 1 fusionné.
Étapes d'implémentation : livrer 7A→7G dans l'ordre (7E conditionnel).
Fonctionnalités à préserver : format de carte, like, commentaire, profil.
Éléments explicitement hors périmètre : Suivre visible, compteurs abonnés, média v1, Message, réseau public, >5 types, >5 filtres, commentaires multi-niveaux, réactions multiples.
Risques : réintroduire une logique de popularité ; boutons inertes.
Mesures de réduction du risque : appliquer strictement 06 (Suivre retiré, compteurs masqués, Message retiré, Partager=lien interne).
Tests manuels : voir sous-lots + `10` (#18–#20).
Tests automatisables : À décider plus tard.
Critères d'acceptation : conformité stricte à 06.
Condition de rollback : revert par sous-lot ou branche.
Condition de validation : preview Vercel + tests 06 §33.
Branche recommandée : refonte/lot-7-hoopfeed  (branche UNIQUE ; un commit/PR incrémentale par sous-lot 7A→7G)
Nom de commit recommandé : feat: implement HoopFeed (see sub-lot commits)
Titre de pull request recommandé : Lot 7 — HoopFeed
```

### Sous-lots du Lot 7 (branche unique `refonte/lot-7-hoopfeed`)

```text
Identifiant : LOT-7A
Nom : Structure et cartes
Objectif : Fil (4 zones), carte de publication (5 types), en-tête, ordre chronologique + priorité type.
Périmètre : en-tête, zone création (placeholder), liste, carte (auteur/rôle/type/texte/lien/likes/commentaires/menu minimal), ordre 06 §7.
Documents de référence : 06 (§6,§7,§9,§10).
Fichiers : joueur.html (#view-feed), coach.html (accès), theme.css.
Composants : carte HoopFeed, en-tête, liste.
Données utilisées : posts embarqués mappés vers 5 types.
Dépendances : Lot 0, Lot 1.
Préconditions : Lot 1 fusionné.
Étapes d'implémentation : 1) 4 zones ; 2) carte 5 types ; 3) ordre chronologique + priorité.
Fonctionnalités à préserver : rendu de carte.
Éléments hors périmètre : filtres (7B), likes/commentaires (7C), création (7D/E).
Risques : 6e type introduit par erreur.
Mesures de réduction du risque : liste fermée de 5 types.
Tests manuels : consulter 10 publications (`10` #18) ; ordre compréhensible.
Tests automatisables : À décider plus tard.
Critères d'acceptation : 5 types, ordre 06 respectés.
Condition de rollback : revert du commit 7A.
Condition de validation : preview.
Branche recommandée : refonte/lot-7-hoopfeed
Nom de commit recommandé : feat: HoopFeed structure and post cards
Titre de pull request recommandé : Lot 7A — Structure et cartes
```
```text
Identifiant : LOT-7B
Nom : Filtres
Objectif : Cinq filtres (Tout/Équipe/Matchs/Progression/Entraînements) sans réordonnancement opaque.
Périmètre : chips de filtre, état actif, restriction sans changement d'ordre.
Documents de référence : 06 (§8).
Fichiers : joueur.html/coach.html (feed), theme.css.
Composants : filtre HoopFeed.
Données utilisées : type de publication.
Dépendances : 7A.
Préconditions : 7A livré.
Étapes d'implémentation : 1) 5 chips ; 2) filtrage ; 3) état actif clair.
Fonctionnalités à préserver : ordre chronologique.
Éléments hors périmètre : 6e filtre.
Risques : tri opaque.
Mesures de réduction du risque : filtre = restriction seule.
Tests manuels : filtrer Matchs (`10` #? ; 06 §33.3).
Tests automatisables : À décider plus tard.
Critères d'acceptation : 5 filtres, ordre conservé.
Condition de rollback : revert du commit 7B.
Condition de validation : preview.
Branche recommandée : refonte/lot-7-hoopfeed
Nom de commit recommandé : feat: HoopFeed five-filter bar
Titre de pull request recommandé : Lot 7B — Filtres
```
```text
Identifiant : LOT-7C
Nom : Likes et commentaires
Objectif : Like (une réaction) secondaire + commentaires à un seul niveau.
Périmètre : like/retrait, compteur secondaire, liste commentaires 1 niveau, ajout/suppression de son commentaire.
Documents de référence : 06 (§11,§12).
Fichiers : joueur.html/coach.html (feed), theme.css.
Composants : actions like/commentaire, liste de commentaires, champ commentaire.
Données utilisées : likes/commentaires (persistance future À décider).
Dépendances : 7A.
Préconditions : 7A livré.
Étapes d'implémentation : 1) like secondaire ; 2) commentaires 1 niveau ; 3) suppression propre.
Fonctionnalités à préserver : interactions actuelles.
Éléments hors périmètre : réactions multiples, réponses imbriquées, mentions/GIF.
Risques : likes déterminant l'ordre.
Mesures de réduction du risque : likes n'influencent jamais l'ordre.
Tests manuels : liker/retirer (`10` #19), commenter/supprimer (`10` #20).
Tests automatisables : À décider plus tard.
Critères d'acceptation : une réaction, commentaires 1 niveau, like secondaire.
Condition de rollback : revert du commit 7C.
Condition de validation : preview.
Branche recommandée : refonte/lot-7-hoopfeed
Nom de commit recommandé : feat: HoopFeed likes and single-level comments
Titre de pull request recommandé : Lot 7C — Likes et commentaires
```
```text
Identifiant : LOT-7D
Nom : Création coach
Objectif : Formulaire de publication coach (≤ 5 étapes, 5 types, lien interne, aperçu, confirmation, erreur, état vide).
Périmètre : bouton Publier, formulaire minimal, choix du type, contenu requis, aperçu, publication, confirmation, erreur, état vide. Aucun média (v1).
Documents de référence : 06 (§16,§9).
Fichiers : coach.html (HoopFeed), theme.css.
Composants : bouton de création, formulaire de publication.
Données utilisées : nouvelle publication (persistance future À décider).
Dépendances : 7A.
Préconditions : 7A livré.
Étapes d'implémentation : 1) formulaire ≤ 5 étapes ; 2) types + lien interne ; 3) aperçu/confirmation/erreur.
Fonctionnalités à préserver : fil existant.
Éléments hors périmètre : média, sondage, ciblage, hashtags, programmation.
Risques : formulaire trop riche.
Mesures de réduction du risque : champs limités (06 §16).
Tests manuels : créer une publication coach (`10` #? ; 06 §33.9).
Tests automatisables : À décider plus tard.
Critères d'acceptation : ≤ 5 étapes, aperçu+confirmation, aucun média.
Condition de rollback : revert du commit 7D.
Condition de validation : preview.
Branche recommandée : refonte/lot-7-hoopfeed
Nom de commit recommandé : feat: HoopFeed coach post composer
Titre de pull request recommandé : Lot 7D — Création coach
```
```text
Identifiant : LOT-7E
Nom : Création joueur (conditionnelle)
Objectif : Permettre au joueur de publier une « Publication joueur » — UNIQUEMENT si l'activation est décidée.
Périmètre : formulaire joueur limité au type Publication joueur.
Documents de référence : 06 (§5,§9,§34).
Fichiers : joueur.html (HoopFeed), theme.css.
Composants : bouton de création (conditionnel), formulaire.
Données utilisées : publication joueur.
Dépendances : 7D.
Préconditions : décision « publications joueur activées ou non » PRISE = oui. Sinon NE PAS implémenter.
Étapes d'implémentation : 1) formulaire joueur (1 type) ; 2) même contraintes que 7D.
Fonctionnalités à préserver : consultation joueur.
Éléments hors périmètre : autres types côté joueur, réseau public.
Risques : activer sans décision.
Mesures de réduction du risque : garde de décision explicite (bloquant).
Tests manuels : créer une publication joueur (`10` #? ; 06 §33.10) — si activé.
Tests automatisables : À décider plus tard.
Critères d'acceptation : uniquement si activé ; 1 seul type joueur.
Condition de rollback : revert du commit 7E (ou non livré).
Condition de validation : preview — si activé.
Branche recommandée : refonte/lot-7-hoopfeed
Nom de commit recommandé : feat: HoopFeed player post composer (gated by decision)
Titre de pull request recommandé : Lot 7E — Création joueur conditionnelle
```
```text
Identifiant : LOT-7F
Nom : Profils liés
Objectif : Profil compact (joueur sportif / coach) accessible depuis une publication, sans compteurs sociaux.
Périmètre : profil joueur (avatar/nom/équipe/numéro/poste/stats/objectifs/publications) ; profil coach (avatar/nom/rôle/équipe/publications) ; Suivre retiré, compteurs masqués.
Documents de référence : 06 (§13,§14,§15).
Fichiers : joueur.html/coach.html (profil dans feed), theme.css.
Composants : profil compact.
Données utilisées : données joueur existantes.
Dépendances : 7A.
Préconditions : 7A livré.
Étapes d'implémentation : 1) profil compact sportif ; 2) retirer Suivre ; 3) masquer abonnés/abonnements.
Fonctionnalités à préserver : accès aux publications d'un auteur.
Éléments hors périmètre : badges, liens externes, galerie, classement.
Risques : compteurs réapparaissant.
Mesures de réduction du risque : masquage explicite (Option A des 06 §13/§14).
Tests manuels : ouvrir un profil (`10` #? ; 06 §33.11).
Tests automatisables : À décider plus tard.
Critères d'acceptation : Suivre absent, compteurs masqués, profil sportif.
Condition de rollback : revert du commit 7F.
Condition de validation : preview.
Branche recommandée : refonte/lot-7-hoopfeed
Nom de commit recommandé : feat: HoopFeed linked profiles (no follow, no counters)
Titre de pull request recommandé : Lot 7F — Profils liés
```
```text
Identifiant : LOT-7G
Nom : États, erreurs et responsive
Objectif : 5 états vides, chargement/erreurs, Partager=lien interne, Message retiré, mobile/tablette/desktop.
Périmètre : états vides (06 §22), chargement/erreurs (06 §23), Partager (lien interne), Message retiré, responsive (06 §24–26).
Documents de référence : 06 (§21,§22,§23,§24,§25,§26).
Fichiers : joueur.html/coach.html (feed), theme.css.
Composants : état vide, chargement, erreur.
Données utilisées : —
Dépendances : 7A–7F.
Préconditions : 7A–7F livrés (7E si activé).
Étapes d'implémentation : 1) 5 états vides ; 2) chargement/erreurs ; 3) Partager lien interne + Message retiré ; 4) responsive.
Fonctionnalités à préserver : tout HoopFeed.
Éléments hors périmètre : partage externe, messagerie.
Risques : bouton inerte restant.
Mesures de réduction du risque : Message retiré, Partager fonctionnel (lien interne) ou retiré si non prêt.
Tests manuels : fil vide (`10` #? ; 06 §33.1) ; 375/768/1024/1440.
Tests automatisables : À décider plus tard.
Critères d'acceptation : 5 états vides, aucun bouton inerte, responsive conforme.
Condition de rollback : revert du commit 7G.
Condition de validation : preview aux 4 breakpoints.
Branche recommandée : refonte/lot-7-hoopfeed
Nom de commit recommandé : feat: HoopFeed empty/error states, share-as-internal-link, responsive
Titre de pull request recommandé : Lot 7G — États, erreurs et responsive
```

## 17. Lot 8 — Responsive et accessibilité globale

```text
Identifiant : LOT-8
Nom : Responsive et accessibilité globale
Objectif : Corriger les incohérences responsive/a11y restantes après les lots précédents, sans refaire les pages.
Périmètre : 375/768/1024/1440, clavier, focus, contraste, tailles tactiles, ordre de lecture, zoom 200 %, reduced-motion, tableaux, graphiques, modales, drawers, scores, chronomètre, terrain.
Documents de référence : 08-responsive-accessibilite.md (strict), 04.
Fichiers probablement concernés : les 3 HTML, theme.css.
Composants ou sections concernés : transverse (tous).
Données utilisées : —
Dépendances : lots visuels principaux (0–7).
Préconditions : lots 0–7 pertinents fusionnés.
Étapes d'implémentation : 1) audit d'écarts par breakpoint ; 2) focus/clavier/contraste ; 3) zoom 200 % ; 4) reduced-motion ; 5) tableaux/graphiques/modales/drawers/scores/chrono/terrain.
Fonctionnalités à préserver : toutes.
Éléments explicitement hors périmètre : refonte de pages ; nouvelles fonctions.
Risques : régressions ponctuelles ; contrastes non mesurés.
Mesures de réduction du risque : checklist 08 §15 ; vérifier les contrastes au calcul.
Tests manuels : checklist 08 §16 (15 scénarios) ; `10` #25–#33.
Tests automatisables : audit axe/lighthouse (si outillage) — À décider plus tard.
Critères d'acceptation : checklist a11y (18 points) et responsive tenues ; zoom 200 % OK ; cibles ≥ 44.
Condition de rollback : revert de la PR.
Condition de validation : preview aux 4 breakpoints + clavier + reduced-motion.
Branche recommandée : refonte/lot-8-responsive-a11y
Nom de commit recommandé : fix: global responsive and accessibility corrections
Titre de pull request recommandé : Lot 8 — Responsive et accessibilité globale
```

## 18. Lot 9 — 3D

```text
Identifiant : LOT-9
Nom : 3D
Objectif : Ajouter la 3D facultative conforme au document 07, en 4 sous-lots, sans que rien de critique n'en dépende.
Périmètre : choix techno + prototype isolé, récap de match, visualisation des tirs, landing. 2D toujours disponible.
Documents de référence : 07-strategie-3d.md (strict), 08.
Fichiers probablement concernés : nouveau module 3D isolé dans assets/ ; coach.html/joueur.html (récap, tirs) ; index.html (landing).
Composants ou sections concernés : récap 3D, vue 3D des tirs, scène landing.
Données utilisées : zones/tirs existants (aucune position inventée).
Dépendances : Lot 6.
Préconditions : Lot 6 fusionné ; décisions « bibliothèque 3D » et « technologie de rendu » prises (9A).
Étapes d'implémentation : livrer 9A→9D ; ne pas implémenter tactique ni exercice (futures).
Fonctionnalités à préserver : 2D de référence.
Éléments explicitement hors périmètre : animation tactique, visualisation d'exercice.
Risques : dépendance critique à la 3D ; performances mobiles.
Mesures de réduction du risque : lazy-load, fallback 2D systématique, LOD mobile.
Tests manuels : appareil faible + 3D (`10` #? ; 07 §16) ; bascule 2D/3D.
Tests automatisables : À décider plus tard.
Critères d'acceptation : 2D toujours dispo ; 3D facultative ; aucune fonction critique dépendante.
Condition de rollback : revert par sous-lot ou branche.
Condition de validation : preview + fallback vérifié.
Branche recommandée : refonte/lot-9-3d  (branche UNIQUE ; un commit/PR par sous-lot 9A→9D)
Nom de commit recommandé : feat: optional 3D visualisations (see sub-lot commits)
Titre de pull request recommandé : Lot 9 — 3D
```

### Sous-lots du Lot 9 (branche unique `refonte/lot-9-3d`)

```text
Identifiant : LOT-9A
Nom : Choix technologique et prototype isolé
Objectif : Décider la techno de rendu et livrer un prototype 3D isolé (hors pages critiques).
Périmètre : comparaison finale (07 §15), prototype d'un demi-terrain isométrique isolé, fallback 2D.
Documents de référence : 07 (§15,§14).
Fichiers : nouveau module assets/ (isolé).
Dépendances : Lot 6.
Préconditions : décision biblio/techno 3D.
Étapes d'implémentation : 1) trancher la techno ; 2) prototype isolé ; 3) mesurer perfs.
Fonctionnalités à préserver : aucune touchée (isolé).
Éléments hors périmètre : intégration dans les pages (9B–9D).
Risques : sur-ingénierie.
Mesures de réduction du risque : prototype jetable, sans dépendance de page.
Tests manuels : charger/décharger le prototype ; perfs mobile.
Tests automatisables : À décider plus tard.
Critères d'acceptation : techno choisie, prototype démontrable, fallback prouvé.
Condition de rollback : revert du commit 9A.
Condition de validation : preview du prototype isolé.
Branche recommandée : refonte/lot-9-3d
Nom de commit recommandé : feat: isolated 3D prototype and tech decision
Titre de pull request recommandé : Lot 9A — Choix technologique et prototype isolé
```
```text
Identifiant : LOT-9B
Nom : Récapitulatif de match 3D
Objectif : Couche 3D optionnelle du récap, doublée d'un récap 2D complet.
Périmètre : récap 3D (07 §6), contrôles lecture/pause/vitesse, fallback 2D, mobile fallback.
Documents de référence : 07 (§6).
Fichiers : joueur.html (récap), module 3D.
Dépendances : 9A.
Préconditions : 9A livré.
Étapes d'implémentation : 1) récap 2D complet ; 2) couche 3D optionnelle ; 3) contrôles ; 4) fallback.
Fonctionnalités à préserver : récap actuel (2D).
Éléments hors périmètre : positions de joueurs inventées.
Risques : 3D nécessaire à la compréhension.
Mesures de réduction du risque : 2D par défaut, 3D à la demande.
Tests manuels : lecture/pause/vitesse ; reduced-motion → 2D.
Tests automatisables : À décider plus tard.
Critères d'acceptation : récap 2D complet + 3D optionnelle ; aucune position inventée.
Condition de rollback : revert du commit 9B.
Condition de validation : preview.
Branche recommandée : refonte/lot-9-3d
Nom de commit recommandé : feat: optional 3D match recap over 2D fallback
Titre de pull request recommandé : Lot 9B — Récapitulatif de match 3D
```
```text
Identifiant : LOT-9C
Nom : Visualisation des tirs 3D
Objectif : Vue 3D complémentaire de la carte de tirs, 2D restant principale.
Périmètre : bascule 2D/3D (07 §7), marqueurs point/croix, trajectoires si données, filtres existants, mobile 2D par défaut.
Documents de référence : 07 (§7).
Fichiers : coach.html/joueur.html (analyse/tirs), module 3D, court-analytics.js (2D).
Dépendances : 9A, Lot 6.
Préconditions : 9A livré, Lot 6 fusionné.
Étapes d'implémentation : 1) bascule 2D/3D ; 2) marqueurs/trajectoires ; 3) réutiliser filtres.
Fonctionnalités à préserver : carte 2D analytique (principale).
Éléments hors périmètre : remplacement de la 2D.
Risques : perfs sur beaucoup de marqueurs.
Mesures de réduction du risque : limite de marqueurs, LOD mobile.
Tests manuels : bascule 2D/3D ; mobile 2D par défaut.
Tests automatisables : À décider plus tard.
Critères d'acceptation : 2D principale toujours dispo ; 3D complément.
Condition de rollback : revert du commit 9C.
Condition de validation : preview.
Branche recommandée : refonte/lot-9-3d
Nom de commit recommandé : feat: optional 3D shot visualisation
Titre de pull request recommandé : Lot 9C — Visualisation des tirs 3D
```
```text
Identifiant : LOT-9D
Nom : Landing 3D
Objectif : Une scène 3D max sur la landing, non bloquante, avec fallback 2D.
Périmètre : une scène (terrain/carte/récap), non bloquante, non essentielle, fallback 2D, mobile fallback, reduced-motion figé (07 §10).
Documents de référence : 07 (§10).
Fichiers : index.html, module 3D.
Dépendances : 9A.
Préconditions : 9A livré.
Étapes d'implémentation : 1) scène encadrée ; 2) chargement différé ; 3) fallback 2D.
Fonctionnalités à préserver : compréhension de la landing sans 3D.
Éléments hors périmètre : caméra libre, jeu, plein écran.
Risques : blocage du chargement.
Mesures de réduction du risque : lazy-load + fallback image.
Tests manuels : landing sans/avec 3D ; mobile ; reduced-motion.
Tests automatisables : À décider plus tard.
Critères d'acceptation : scène unique, non bloquante, fallback 2D.
Condition de rollback : revert du commit 9D.
Condition de validation : preview + Lighthouse (si dispo).
Branche recommandée : refonte/lot-9-3d
Nom de commit recommandé : feat: single non-blocking 3D scene on landing
Titre de pull request recommandé : Lot 9D — Landing 3D
```

## 19. Lot 10 — Landing page et finition

```text
Identifiant : LOT-10
Nom : Landing page et finition
Objectif : Aligner la landing sur le produit refondu (positionnement, promesse, sections, démos, liens espaces, formulaire bêta, données demo, cohérence, responsive, performance, finition).
Périmètre : positionnement, promesse, sections, captures/démos, liens coach/joueur, formulaire bêta, données demo, cohérence produit, responsive, performance, finition visuelle.
Documents de référence : 03, 04, 06 (promesse), 07 (§10 landing 3D via Lot 9D), 08.
Fichiers probablement concernés : index.html, theme.css.
Composants ou sections concernés : hero, sections, formulaire bêta, liens.
Données utilisées : contenus existants ; aucun chiffre/logo/témoignage inventé.
Dépendances : lots 0–9 (finition).
Préconditions : lots précédents pertinents fusionnés.
Étapes d'implémentation : 1) aligner promesse sur capacités réelles (récap animé, pas « 3D » survendue) ; 2) sections + démos ; 3) liens espaces ; 4) formulaire bêta + états ; 5) badge demo ; 6) responsive/perf/finition.
Fonctionnalités à préserver : formulaire bêta (POST /api/beta) + états.
Éléments explicitement hors périmètre : tarification, paiement, témoignages/chiffres/logos inventés, fonctions absentes.
Risques : promesse > réalité ; README obsolète.
Mesures de réduction du risque : discours aligné sur le réel ; corriger le libellé « 3D ».
Tests manuels : landing 375/768/1024/1440 ; formulaire bêta (`10` #22/#23) ; liens espaces ; perf.
Tests automatisables : Lighthouse (si dispo) — À décider plus tard.
Critères d'acceptation : promesse cohérente avec le produit ; aucun contenu inventé ; formulaire bêta fonctionnel.
Condition de rollback : revert de la PR.
Condition de validation : preview aux 4 breakpoints.
Branche recommandée : refonte/lot-10-landing
Nom de commit recommandé : feat: align landing page with redesigned product
Titre de pull request recommandé : Lot 10 — Landing page et finition
```

## 20. Ordre final
`docs/refonte-ui-ux` (documentation) → **Lot 0** → **Lot 1** → **Lot 2** → **Lot 3** → **Lot 4** (4A→4B→4C→4D→4E→4F→4G) → **Lot 5** → **Lot 6** → **Lot 7** (7A→7B→7C→7D→7E*→7F→7G) → **Lot 8** → **Lot 9** (9A→9B→9C→9D) → **Lot 10**.
*(7E uniquement si les publications joueur sont activées.)*
Priorité : Critique **0,1,4** · Important **2,3,5,6,7** · Finition **8,9,10**.

## 21. Points de décision (décisions humaines restantes — exhaustif)
1. Branche de production Vercel.
2. Mode live par défaut.
3. Durée des périodes.
4. Prolongations.
5. Publications joueur activées ou non (bloque 7E).
6. Image HoopFeed autorisée ou non.
7. Bibliothèque graphique.
8. Bibliothèque 3D.
9. Technologie de persistance.
10. Technologie de synchronisation.
11. Thème clair futur.
12. Animation tactique future.
13. Visualisation d'exercice future.

## 22. Critères de démarrage du code
Le **Lot 0** peut commencer uniquement si :
- la documentation a été commitée ;
- la branche de base est confirmée ;
- la branche Vercel de production est identifiée ;
- les documents 00 à 10 sont présents ;
- aucun fichier applicatif n'est modifié dans le commit documentation ;
- le plan du Lot 0 est validé.

---
*Fin du plan d'implémentation. Aucune modification apportée aux fichiers applicatifs.*
