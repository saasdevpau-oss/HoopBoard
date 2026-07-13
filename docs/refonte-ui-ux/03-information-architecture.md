# HoopBoard — Architecture de l'information (IA)

> Suite de [`00-audit-technique.md`](00-audit-technique.md), [`01-inventaire-ecrans.md`](01-inventaire-ecrans.md), [`02-audit-ux.md`](02-audit-ux.md).
> Clone : `HOOPBoard serieux/Stack claude/HoopBoard`, branche `refactor/pr3.1-button-system`, HEAD **`ad0af1d` (PR4.5)**.
> Objet : **réorganiser** les fonctions existantes, sans en inventer, sans design visuel, sans code.
> Deux expériences seulement : **Coach** (prioritaire) et **Joueur**. Aucun autre rôle.
> Aucun fichier applicatif ni document 00/01/02 modifié.

---

## 1. Règles de périmètre

- **On réorganise l'existant.** Toute fonction citée ici est déjà présente dans le produit (voir inventaire 01) ou explicitement demandée par cette mission.
- **Deux rôles, pas plus** : Coach, Joueur. Aucun parent, responsable, staff, statisticien, manager, arbitre.
- **Actions autorisées sur une fonction** : conserver, déplacer, regrouper, renommer, masquer par défaut, rendre contextuel, désactiver visuellement, séparer. **Jamais** créer une logique métier nouvelle.
- **Interdits** (non ajoutés, non recommandés) : administratif, juridique, médical/blessures, licences, documents, présence/convocations si absentes, messagerie privée, contrôle parental, réseau social public, gestion financière, billetterie, boutique, installations, personnel de club.
- **Absences** : signalées **uniquement** si indispensables à une fonction déjà prévue, et marquées `Évolution future — absente actuellement` ou `À décider plus tard`. Jamais présentées comme existantes.
- **Aucune décision visuelle** (couleurs, typo, composants, animations) n'est prise ici.

---

## 2. Architecture Coach

Huit sections principales, **structure imposée**, non extensible :

1. **Aujourd'hui** (remplace le dashboard)
2. **Équipe**
3. **Matchs**
4. **Entraînements**
5. **Analyse**
6. **HoopFeed**
7. **Club**
8. **Paramètres**

Principe directeur (issu de l'audit 02 §16) : **une action/information principale par écran**, divulgation progressive, match live isolé, HoopFeed distinct du dashboard et des stats.

---

## 3. Architecture Joueur

Espace de **consultation** (plus interaction HoopFeed déjà prévue). Huit entrées imposées :

- **Accueil**
- **Profil**
- **Matchs**
- **Entraînements**
- **Objectifs**
- **Statistiques**
- **HoopFeed**
- **Paramètres**

Le joueur ne dispose **ni** de saisie live, **ni** d'effectif, **ni** de dashboard d'équipe (cohérent avec l'asymétrie actuelle, inventaire 01).

---

## 4. Sitemap Coach

```text
Coach
├── Aujourd'hui
│   ├── Prochain match (raccourci)
│   ├── Dernier résultat
│   ├── Prochain entraînement (raccourci)
│   ├── Objectif actuel
│   ├── Résumé statistique court
│   ├── Priorité sportive (issue des stats existantes)
│   └── Dernière publication HoopFeed
├── Équipe
│   ├── Effectif (liste des joueurs)
│   └── Fiche joueur
│       ├── Résumé
│       ├── Statistiques individuelles
│       ├── Matchs du joueur
│       ├── Objectifs du joueur
│       └── Progression
├── Matchs
│   ├── Liste / calendrier (À venir · En cours · Terminé)
│   ├── Prochain match (Game Center)
│   ├── Match — à venir → [Démarrer le mode banc]
│   ├── Match — en cours → Mode banc (isolé, voir §11)
│   └── Match — terminé
│       ├── Récapitulatif
│       ├── Box score
│       ├── Carte des tirs
│       ├── Feuille de match (événements)
│       └── Analyse du match
├── Entraînements
│   ├── Training Hub (zones à travailler)
│   ├── Exercice / drill
│   ├── Objectifs
│   ├── Progression
│   └── Historique des séances  (À décider plus tard — absent actuellement)
│   └── Créateur de séance      (Évolution future — absente actuellement)
├── Analyse
│   ├── Vue d'ensemble
│   ├── Équipe
│   ├── Joueurs
│   ├── Matchs
│   └── Tirs & zones (court-analytics.js)
├── HoopFeed
│   ├── Fil (publications)
│   ├── Publication → likes · commentaires
│   └── Profil social (Suivre)
├── Club
│   ├── Identité du club (nom, saison, logo)
│   └── Changer d'équipe  (À décider plus tard)
└── Paramètres
    ├── Profil
    ├── Préférences d'affichage
    ├── Langue
    ├── Accessibilité
    ├── Préférences du match live
    ├── Notifications simples  (À décider plus tard)
    └── Déconnexion  (Évolution future — quand l'authentification existera)
```

---

## 5. Sitemap Joueur

```text
Joueur
├── Accueil
│   ├── Prochain match
│   ├── Objectif actuel
│   ├── Résumé stats court
│   └── Dernière publication HoopFeed
├── Profil
│   ├── Résumé / profil social
│   └── Jauges & moyennes (déjà présentes)
├── Matchs
│   ├── Liste des matchs
│   └── Match → récapitulatif (pseudo-3D) · box score joueur
├── Entraînements
│   ├── Zones à travailler
│   └── Exercices / drills (consultation)
├── Objectifs
│   └── Objectifs & progression
├── Statistiques
│   └── Statistiques individuelles (match / moyennes)
├── HoopFeed
│   └── Publication → like · commentaire
└── Paramètres
    ├── Profil
    ├── Langue
    ├── Accessibilité
    └── Préférences d'affichage
```

> Note : « Accueil », « Profil », « Statistiques », « Objectifs » regroupent les vues actuelles du joueur (Training Hub, Game Center, HoopFeed, profil). Aucune fonction nouvelle.

---

## 6. Détail des huit sections Coach

### 2. Équipe
Organise **uniquement** : effectif, liste des joueurs, fiche joueur, statistiques individuelles, profil, objectifs, progression.
- **Fiche joueur** = résumé · statistiques · matchs · objectifs · progression (rien d'autre). Pas de notes privées, documents, médical, autorisations.
- Source actuelle : `coach.html#page-effectif` (tableau hydraté) + `coach.html#page-joueur` (fiche + radar) + données joueur de `joueur.html`.
- Divulgation : voir §14.

### 3. Matchs
Regroupe : liste/calendrier, prochain match, Game Center, feuille de match, match live, score, événements, carte des tirs, box score, récapitulatif, analyse du match.
- **États d'un match** (simples) : `À venir` · `En cours` · `Terminé`.
- **Accès à un match** : depuis la liste/calendrier ou depuis « Aujourd'hui » (prochain match).
- **Démarrer le mode live** : depuis un match `À venir` (ou `En cours`) → bouton **Démarrer** → entre en **Mode banc** (§11).
- **Quitter le mode live** : bouton **Quitter** du Mode banc → retour à la fiche du match.
- **Résultats** : sur le match `Terminé` → Récapitulatif.
- **Carte des tirs / box score** : onglets de la fiche du match `Terminé`.
- Exclus (non créés) : validation administrative, archivage métier, convocations, composition avancée, arbitres, salle, logistique.
- Sources actuelles : `coach.html#page-gamecenter` (cartes), `#page-match` (feuille scénarisée), `#page-live` (saisie), `data.js.matchHapoel` (box score), `court-analytics.js` (carte).

### 4. Entraînements
Organise : Training Hub, exercices/drills, objectifs, zones à travailler.
- Parcours simple : consulter une séance → consulter un exercice → voir une zone/objectif → suivre la progression.
- **Créateur de séance** : `Évolution future — absente actuellement` (évolution directe du Training Hub, ne pas présenter comme existante).
- **Historique des séances** : `À décider plus tard — absent actuellement` (l'audit 01 §12 confirme l'absence).
- Source actuelle : `joueur.html#view-training` (zones/drills), objectifs `joueur.html:852`. (Cette valeur est aujourd'hui côté joueur ; côté coach elle est **consultée/préparée** — pas de nouvelle logique.)

### 5. Analyse
Regroupe : statistiques d'équipe, statistiques individuelles, cartes de tirs, zones du terrain, heatmaps, box scores, tendances, comparaison joueur/match **si les données le permettent**, éléments de `court-analytics.js`.
- Organisation en 5 niveaux d'entrée : **Vue d'ensemble · Équipe · Joueurs · Matchs · Tirs & zones**.
- Pour chacun : information principale / secondaire / avancée (voir §14).
- **Comparaison** joueur/match : `À décider plus tard` tant que les données réelles ne couvrent qu'un match détaillé (audit 01 : un seul box score complet).
- **3D** : non détaillée ici ; **où** une future vue 3D pourrait compléter → sur `Tirs & zones` et sur le `Récapitulatif` d'un match, en complément de la vue 2D existante. `Évolution future`.
- Source actuelle : `court-analytics.js` (renderSeasonCourt/renderLiveCourt), `teamZones`/`showTeamZone`, box score `data.js`.

### 6. HoopFeed
Reste basé sur l'existant : publications, auteurs, likes, commentaires, bouton Suivre, profil social, contenu de match/joueur.
- **Où il apparaît** : section principale dédiée (jamais fusionné avec « Aujourd'hui » ni « Analyse »).
- **Coach vs Joueur** : le coach **consulte et publie** (publication déjà prévue) ; le joueur **consulte et interagit** (like/commentaire déjà prévus). Pas de nouveau type de publication inventé.
- **Ne pas remplacer le dashboard** : « Aujourd'hui » n'affiche que **la dernière publication** en raccourci, pas le fil.
- **Priorités** : le contenu de match/joueur (récap, perf) est prioritaire ; les mécaniques sociales (likes, abonnés, Suivre) sont **secondaires** (traitées comme accessoires, cf. audit 02 UX-P1-007).
- **Comptes rendus de match** : intégration **future** possible sans toucher la logique maintenant → `À décider plus tard`.
- Exclus : messagerie, modération complexe, rôles, contrôle parental, réseau public, algorithme social.
- Source actuelle : `joueur.html#view-feed` (posts, likes, commentaires, Suivre, profil).

### 7. Club
Minimal : identité du club, nom d'équipe, saison, logo, informations générales déjà présentes ; **changement d'équipe** seulement si nécessaire plus tard (`À décider plus tard`).
- Aucun outil de gestion (personnel, licences, installations, documents, contacts, catégories, paiements) — non mentionnés comme recommandations.
- Source actuelle : `data.js.club` (nom, court, tag, social), `data.js.tournoi` (saison).

### 8. Paramètres
Uniquement : profil, préférences d'affichage, notifications simples, langue, accessibilité, préférences du match live, déconnexion (quand l'authentification existera).
- Toute fonction absente = marquée **future** sans en concevoir le détail (ex. déconnexion : `Évolution future`, l'authentification n'existe pas — audit 00 §8).

---

## 7. Dashboard « Aujourd'hui »

Répond à **trois questions seulement** : prochain match ? prochain entraînement ? information importante à consulter ? **Pas un mur de statistiques.**

| Bloc | Information affichée | Action principale | Source dans le produit actuel | Priorité | État vide |
|---|---|---|---|---|---|
| Prochain match | Adversaire, date, lieu | Ouvrir le match / Démarrer | `data.js.tournoi.prochainMatch` | 1 | « Aucun match à venir — planifiez votre prochaine rencontre » + lien Matchs |
| Dernier résultat | Score, V/D du dernier match | Voir le récap | `data.js.tournoi.resultats` / `coachMatches` | 2 | « Aucun match joué pour l'instant » |
| Prochain entraînement | Zone/thème prioritaire | Ouvrir l'entraînement | `joueur.html#view-training` (zones) | 2 | « Aucun entraînement prévu » + lien Entraînements |
| Objectif actuel | Objectif en cours + progression | Voir les objectifs | `joueur.html:852` (objectifs) | 3 | « Aucun objectif défini » |
| Résumé statistique court | 2-3 chiffres clés d'équipe | Voir l'analyse | `data.js.tournoi.statsEquipe` | 3 | « Statistiques indisponibles » |
| Priorité sportive | 1 zone à travailler (point chaud/froid) | Ouvrir l'analyse des zones | `teamZones` / `zonesTirSaison` | 2 | « Pas encore assez de données » |
| Dernière publication HoopFeed | Aperçu d'1 post | Ouvrir HoopFeed | `joueur.html#view-feed` | 4 | « Aucune publication » |
| Raccourci Match live | Bouton d'accès rapide | Démarrer le mode banc | `coach.html#page-live` | 1 (contextuel) | (masqué si aucun match) |
| Raccourci Effectif | Accès liste joueurs | Ouvrir Équipe | `coach.html#page-effectif` | 4 | — |
| Raccourci Entraînements | Accès Training Hub | Ouvrir Entraînements | `joueur.html#view-training` | 4 | — |

> Non ajoutés : tâches administratives, documents, alertes médicales, licences, convocations/présence (absentes), notifications complexes.

---

## 8. Navigation desktop

Barre latérale (ordre imposé) :

```text
[Logo HoopBoard]
• Aujourd'hui        (actif par défaut)
• Équipe
• Matchs
• Entraînements
• Analyse
• HoopFeed
• Club
• Paramètres
────────────
[Profil utilisateur]  (bas de barre)
[Créer]  (optionnel — voir ci-dessous)
```

- **État actif** : l'entrée de la section courante est mise en évidence de façon persistante et fidèle à l'écran affiché (corrige l'ambiguïté `tabMap` de l'audit 02 UX-P1-001). Un seul élément actif à la fois.
- **Navigation réduite** : la barre peut se réduire en icônes seules (rail) ; les libellés restent accessibles au survol/focus. `À décider plus tard` pour le déclencheur exact.
- **Pendant le match live** : la barre latérale **disparaît** (Mode banc plein écran, §11). Retour via **Quitter** uniquement.
- **Accès au profil** : entrée dédiée en bas de barre → ouvre Paramètres › Profil.
- **Bouton « Créer »** (facultatif) : s'il existe, contenu **limité** à : **Match**, **Entraînement**, **Publication**. Aucune autre action.

---

## 9. Navigation mobile

Barre inférieure — **exactement 5 entrées** :

```text
[ Aujourd'hui ] [ Équipe ] [ Matchs ] [ HoopFeed ] [ Plus ]
```

Menu **Plus** (uniquement) : Entraînements · Analyse · Club · Paramètres · Profil.

- **Retour** : chaque écran de niveau 2/3 dispose d'un retour explicite vers son parent (corrige le cul-de-sac, audit 02). Le retour matériel/navigateur reste cohérent avec la hiérarchie.
- **Titre d'écran** : chaque écran affiche son titre (section ou sous-page) en en-tête.
- **État actif** : l'onglet de la section courante est mis en évidence ; « Plus » devient actif quand on est dans une de ses sous-sections.
- **Pendant le match live** : la barre inférieure **disparaît** (Mode banc plein écran).
- **Accès rapide au démarrage du match** : depuis « Aujourd'hui » (raccourci Match live) et depuis « Matchs » (match à venir → Démarrer).

---

## 10. Navigation tablette

- **Paysage** : barre latérale **réduite** (rail d'icônes), plus d'espace pour le terrain et les cartes.
- **Portrait** : navigation mobile **élargie** ou **drawer** latéral. `À décider plus tard` pour le choix exact selon largeur.
- **Terrain** : bénéficie d'un espace accru (analyse et mode banc).
- **Liste + détail** : affichage combiné quand pertinent (ex. Effectif → fiche joueur ; Matchs → détail match).
- **Mode match plein écran** : identique au principe mobile (navigation masquée).
- Aucune fonctionnalité spécifique tablette ajoutée.

---

## 11. Mode banc (match live isolé)

Mode **plein écran, séparé** du reste. La navigation principale (barre latérale / barre inférieure) **disparaît**.

Contient **uniquement** :
- Nom des équipes
- Score
- Période
- Chronomètre *(futur — `À décider plus tard`, audit 02 UX-P1-003)*
- Joueur sélectionné
- Actions statistiques (tir marqué/manqué, rebond, passe, interception, contre, perte de balle, faute)
- Carte des tirs
- Feed récent
- Undo
- Statut de sauvegarde *(futur — audit 02 UX-P0-001)*
- Bouton **Quitter**

Aucun autre module. Entrée : depuis un match `À venir`/`En cours` → **Démarrer**. Sortie : **Quitter** → fiche du match.
Sources actuelles : `coach.html#page-live` (strip joueurs, zones, popup make/miss, feed, undo, fautes) + `court-analytics.js` (carte live).

---

## 12. Parcours imposés

**Coach — consulter l'équipe**
`Aujourd'hui` → (raccourci Effectif ou onglet) `Équipe` → sélection joueur → fiche joueur → `Statistiques` ou `Objectifs`.

**Coach — démarrer un match**
`Aujourd'hui` (prochain match) *ou* `Matchs` → match `À venir` → **Démarrer** → **Mode banc**.

**Coach — enregistrer un tir**
`Mode banc` → sélectionner le joueur → sélectionner la zone → **Marqué** ou **Manqué** → **confirmation** (retour visuel « enregistré », exigence audit 02 UX-P0-001/003).

**Coach — consulter l'analyse d'un match**
`Matchs` → match `Terminé` → `Résumé` → `Statistiques` (box score) → `Carte des tirs`.

**Coach — consulter un entraînement**
`Entraînements` → séance ou exercice → objectif ou zone travaillée.

**Coach — consulter HoopFeed**
`HoopFeed` → publication → commentaire ou like.

**Joueur — consulter sa progression**
`Accueil joueur` → `Profil` ou `Objectifs` → `Statistiques` → `Progression`.

**Joueur — consulter HoopFeed**
`Accueil joueur` → `HoopFeed` → publication → like ou commentaire.

*Aucun autre parcours ajouté.*

---

## 13. Correspondance avec l'existant

| Élément actuel | Emplacement actuel | Nouvel emplacement | Action | Fonction préservée | Limite actuelle |
|---|---|---|---|---|---|
| Dashboard coach | `coach.html#page-dashboard` | **Aujourd'hui** | Renommer + simplifier | Raccourcis, 2 pills hydratées | Mur potentiel, info clé noyée (02 UX-P1-006) |
| Game Center | `coach.html#page-gamecenter` | **Matchs** (liste + prochain match) | Déplacer + regrouper | Cartes de match, compte à rebours | Données dupliquées (`coachMatches`) |
| Match live | `coach.html#page-live` | **Matchs › Mode banc** | Séparer + isoler | Saisie tir/action, feed, undo | Non persistant, undo partiel (02 P0) |
| Terrain (interactif/3D) | `coach.html#fullCourt`, `index.html` | **Analyse › Tirs & zones** (+ Mode banc pour le live) | Déplacer + regrouper | Lecture par zones, conseils | `teamZones` mockées ; pseudo-3D |
| Feed d'actions (match) | `coach.html#page-live` feedList | **Mode banc › Feed récent** | Conserver (contextuel) | Historique de session | En mémoire, non persisté |
| Box score | `data.js.matchHapoel` | **Matchs › match terminé › Box score** + **Analyse** | Déplacer + regrouper | Totaux + lignes joueurs | Un seul match détaillé |
| Effectif | `coach.html#page-effectif` | **Équipe › Effectif** | Déplacer | Tableau roster hydraté | Moyennes `demo:true` non signalées |
| Profil joueur | `coach.html#page-joueur`, `joueur.html` profil | **Équipe › Fiche joueur** (coach) / **Joueur › Profil** | Regrouper + séparer par rôle | Résumé, radar, moyennes | Statique |
| Training Hub | `joueur.html#view-training` | **Entraînements** (coach) / **Joueur › Entraînements** | Déplacer + séparer | Zones → drills | Aucun suivi persistant |
| Objectifs | `joueur.html:852` | **Entraînements › Objectifs** / **Joueur › Objectifs** | Déplacer | Barres de progression | 100 % statique |
| Analyse des zones | `court-analytics.js`, `showTeamZone` | **Analyse › Tirs & zones** | Regrouper | Heatmap, carte de tirs 2D | Alimentée en `demo:true` |
| HoopFeed | `joueur.html#view-feed` | **HoopFeed** (coach + joueur) | Conserver + séparer par rôle | Posts, profil social | Mono-auteur, non persisté |
| Likes | `joueur.html` `setLiked` | **HoopFeed › publication** (secondaire) | Conserver + rendre secondaire | Like/compteur | Non persisté, logique popularité |
| Commentaires | `joueur.html` `addComment` | **HoopFeed › publication** | Conserver | Ajout commentaire | Non persisté |
| Bouton Suivre | `joueur.html#btnFollow` | **HoopFeed › profil social** (secondaire) | Conserver + rendre secondaire | Toggle suivre | Non persisté |
| Récapitulatif pseudo-3D | `joueur.html` `playRecap` | **Matchs › match terminé › Récapitulatif** / **Joueur › Matchs** | Déplacer | Rejeu narratif des paniers | Positions illustratives |
| Formulaire bêta | `index.html#betaForm` | **Hors app** (landing publique, inchangée) | Conserver (séparé) | Inscription + états | Non persistée |
| Données `demo:true` | `data.js` (`statsSaison`, `zonesTirSaison`) | Partout où affichées | Conserver + **signaler « démo »** | Rendu riche | Non étiquetées à l'écran (02 UX-P1-004) |
| Boutons inertes (Banc/Message/Partager) | `coach.html`, `joueur.html` | Emplacements respectifs | **Désactiver visuellement** | Emplacement futur | Cliquables sans effet (02 UX-P1-002) |
| Feuille de match scénarisée | `coach.html#page-match` | **Matchs › match terminé › Feuille de match** | Déplacer + rendre contextuel | Marqueur terrain + liste | Scénarisée, déconnectée du live |

---

## 14. Divulgation progressive

Appliquée à **Aujourd'hui, Équipe, Matchs, Entraînements, Analyse** uniquement. Aucune donnée nouvelle créée.

### Aujourd'hui
- **N1** : prochain match, dernier résultat, raccourci Match live.
- **N2** : prochain entraînement, objectif actuel, dernière publication HoopFeed.
- **N3** : résumé statistique court, priorité sportive (ouvre l'Analyse).

### Équipe
- **N1** : liste des joueurs (nom, poste, 1-2 chiffres clés).
- **N2** : fiche joueur — résumé + statistiques + matchs.
- **N3** : objectifs & progression détaillés du joueur.

### Matchs
- **N1** : liste/calendrier avec état (À venir · En cours · Terminé) et score.
- **N2** : fiche match — récapitulatif, box score, carte des tirs, feuille de match.
- **N3** : analyse du match (tendances, zones), Mode banc pour le live.

### Entraînements
- **N1** : zones à travailler (points chauds/froids) + objectif courant.
- **N2** : séance / liste d'exercices (drills, statut fait/à faire).
- **N3** : progression détaillée par zone/objectif.

### Analyse
- **N1** (Vue d'ensemble) : information **principale** — 2-3 indicateurs d'équipe.
- **N2** (Équipe / Joueurs / Matchs) : information **secondaire** — box scores, comparaisons possibles.
- **N3** (Tirs & zones) : information **avancée** — heatmaps, cartes de tirs (`court-analytics.js`), emplacement d'une future vue 3D.

---

## 15. États vides

| État vide | Message | Explication | Action simple |
|---|---|---|---|
| Aucun joueur | « Votre effectif est vide » | Aucun joueur n'est encore enregistré dans l'équipe | Ouvrir Équipe |
| Aucun match | « Aucun match pour le moment » | Aucune rencontre à venir ni jouée | Ouvrir Matchs |
| Aucun entraînement | « Aucun entraînement prévu » | Aucune séance n'est planifiée | Ouvrir Entraînements |
| Aucune statistique | « Pas encore de statistiques » | Les stats apparaîtront après le premier match saisi | Ouvrir Matchs |
| Aucune publication HoopFeed | « Le fil est vide » | Aucune publication n'a encore été partagée | Ouvrir HoopFeed |

*Aucun autre état vide ajouté.*

---

## 16. Fonctions existantes préservées

- Lecture par **zones du terrain** + module `court-analytics.js` (heatmap, carte de tirs 2D, croix pour manqués).
- **Saisie live** (sélection joueur, zone, marqué/manqué, actions rapides, fautes, undo) — isolée en Mode banc.
- **Feed d'actions** de match (session).
- **Box score** et **récapitulatif** pseudo-3D.
- **Effectif** hydraté + **fiche joueur** (résumé, radar, moyennes).
- **Training Hub** (zones → drills) et **objectifs** (progression).
- **HoopFeed** (posts, likes, commentaires, Suivre, profil social) — social rendu secondaire.
- **Compte à rebours** vers le prochain match (Aujourd'hui / Matchs).
- **Repli gracieux** sur données embarquées + respect `prefers-reduced-motion`.
- **Landing + formulaire bêta** conservés hors application.

---

## 17. Fonctions absentes — à ne pas inventer

Signalées **uniquement** parce qu'elles touchent des fonctions déjà prévues ; **non conçues** ici :
- **Persistance / statut de sauvegarde** du match live → `Évolution future` (indispensable au Mode banc, audit 02 UX-P0-001).
- **Chronomètre de match réel** + **score adverse éditable** → `Évolution future` (Mode banc, UX-P1-003).
- **Rotations / substitutions fonctionnelles** → `À décider plus tard` (le bouton « Banc » reste désactivé visuellement).
- **Historique des séances** d'entraînement → `À décider plus tard`.
- **Créateur de séance** → `Évolution future — absente actuellement`.
- **Comparaison joueur/match avancée** → `À décider plus tard` (dépend de données réelles multi-matchs).
- **Vue 3D d'analyse** → `Évolution future` (complément de la 2D).
- **Composition de publication côté coach** au-delà de l'existant, **comptes rendus de match dans HoopFeed** → `À décider plus tard`.
- **Authentification / déconnexion / multi-équipe** → `Évolution future` (Paramètres/Club).

**Jamais ajoutés** (hors périmètre, non recommandés) : rôles supplémentaires, administratif, juridique, médical, licences, documents, présence/convocations, messagerie, contrôle parental, réseau public, finances, boutique, billetterie, gestion de club.

---

## 18. Décisions strictement nécessaires

1. **Le dashboard devient « Aujourd'hui »** et se limite à 3 questions (prochain match / prochain entraînement / info importante).
2. **Le match live est isolé en Mode banc**, navigation principale masquée, entrée par « Démarrer », sortie par « Quitter ».
3. **HoopFeed est une section distincte**, jamais fusionnée avec Aujourd'hui ni Analyse ; social secondaire.
4. **L'Analyse regroupe** stats + zones + `court-analytics.js` en 5 niveaux (Vue d'ensemble/Équipe/Joueurs/Matchs/Tirs & zones).
5. **Équipe** porte effectif + fiche joueur (coach) ; le joueur garde un espace de consultation séparé.
6. **Navigation** : latérale 8 entrées (desktop) ; barre 5 entrées + « Plus » (mobile) ; rail/drawer (tablette).
7. **Boutons inertes désactivés visuellement** en attendant leur fonction.
8. **Données `demo:true` signalées** partout où affichées.
9. Tout le reste non défini est marqué **`À décider plus tard`** (pas d'invention).

---

## 19. Critères d'acceptation

- ✅ Aucun nouveau rôle (seulement Coach, Joueur).
- ✅ Aucune fonction administrative, juridique ou médicale créée.
- ✅ Chaque section correspond à une fonction déjà présente ou explicitement demandée.
- ✅ Toutes les fonctions actuelles importantes ont un emplacement (voir §13).
- ✅ Le coach reste l'utilisateur prioritaire ; le joueur conserve un espace cohérent.
- ✅ Le dashboard « Aujourd'hui » reste simple (pas un mur de stats).
- ✅ Le match live est isolé (Mode banc plein écran).
- ✅ HoopFeed reste distinct des statistiques et du dashboard.
- ✅ Aucune décision visuelle détaillée (couleurs/typo/composants/animations) prise.
- ✅ Aucun fichier applicatif ni route ni dépendance modifié.
- ✅ Structure Coach = 8 sections imposées, non étendue.
- ✅ Éléments non définis marqués `À décider plus tard` / `Évolution future`.

---

*Fin de l'architecture de l'information. Aucune modification apportée aux fichiers applicatifs.*
