# HoopBoard — Conception UX du Match Live (Mode banc)

> Suite de [`00`](00-audit-technique.md) · [`01`](01-inventaire-ecrans.md) · [`02`](02-audit-ux.md) · [`03`](03-information-architecture.md).
> Clone : `HOOPBoard serieux/Stack claude/HoopBoard`, HEAD **`ad0af1d` (PR4.5)**.
> Nature : **spécification UX** du futur Mode banc, prête à implémenter. **Aucun code, aucune couleur, aucun fichier applicatif modifié.**
> Périmètre strict : **le match live uniquement**. Tout ce qui sort du match live est marqué `Hors périmètre`. Tout point non tranché est marqué `À décider plus tard`.

---

## 1. Périmètre strict

- On conçoit **le Mode banc** (match live isolé, défini en `03` §11), à partir des fonctions existantes (`coach.html#page-live`, `court-analytics.js`, `lib/match-events.js`) et des évolutions **explicitement autorisées** par cette mission : score adverse éditable, chronomètre/période, substitutions (mode Avancé), persistance/hors-ligne, undo transactionnel, trois modes de saisie.
- **Trois modes** exactement : Simple, Standard, Avancé. **Aucune statistique hors des listes autorisées.**
- **Interdits** (non conçus, non mentionnés comme recommandations) : convocation, tactique avancée, arbitres, salle, vidéo, IA/caméra/GPS, notes vocales, messagerie, administratif, nouveau rôle, HoopFeed, design system global, 3D, toute stat non demandée. → `Hors périmètre`.
- Le fichier `lib/match-events.js` **n'est pas modifié** ; on évalue seulement comment il servirait de fondation (§28).

---

## 2. Problèmes actuels à résoudre (confirmés en `02`)

1. Aucune persistance → perte totale au rechargement (UX-P0-001).
2. Undo partiel → score/feed/carte divergent (UX-P0-002).
3. Parcours de tir trop coûteux : joueur → zone → popup → marqué/manqué (UX-P0-003).
4. Score adverse figé, pas de chronomètre réel (UX-P1-003).
5. Rotations inertes, bouton « Banc » mort (UX-P1-002 / P0 §8 audit).
6. Cibles potentiellement < 44 px, popup sous le doigt.
7. Joueur actif peu saillant (libellé texte seul).
8. Mobile/tablette insuffisamment adaptés (UX-P1-005).

---

## 3. Principes UX (cadre de conception)

- **Regard sur le terrain, pas sur l'écran** : action fréquente en **1–2 gestes**, cibles ≥ 44 px, feedback perceptible sans lecture.
- **Une source de vérité unique** (timeline d'événements) d'où dérivent score, box score, carte et historique → l'undo devient fiable.
- **Rien ne se perd** : persistance locale + statut de sauvegarde permanent + reprise après rechargement.
- **Isolation** : pendant le match, la navigation principale disparaît ; HoopFeed / Analyse / Équipe / Entraînements **inaccessibles** (`03` §11).
- **Progressivité** : Simple → Standard → Avancé ; un mode plus riche ne ralentit jamais les actions fréquentes.
- **Honnêteté** : aucune fonction inactive présentée comme utilisable (corrige les boutons inertes).
- **Accessibilité par défaut** : forme + couleur, focus visible desktop, `prefers-reduced-motion` respecté.

---

## 4. Architecture générale

**Cinq zones maximum, permanentes :**

1. **Barre de match** (score, période, chrono, sauvegarde, quitter).
2. **Joueurs / lineup** (sélection du joueur actif).
3. **Actions principales** (statistiques, zone pouce).
4. **Terrain / carte de tirs** (localisation + tirs enregistrés).
5. **Historique récent** (dernières actions + undo).

**Panneaux temporaires / drawers** autorisés uniquement pour : **substitution**, **historique complet**, **paramètres du match**, **confirmation de sortie**. Aucun 6ᵉ module permanent.

Le **sélecteur de mode** (Simple/Standard/Avancé) est un paramètre du match (drawer paramètres), pas une zone permanente.

---

## 5. Mode Simple

**But** : suivre un match au score, sans statistique joueur détaillée.
- **Zones actives** : barre de match, actions, historique. **Joueurs/lineup masqués.** Terrain masqué.
- **Actions** : `+1`, `+2`, `+3` (HoopBoard), score adverse (`+1/+2/+3`), retirer un point, faute HoopBoard, faute adverse (si utile au suivi du score), undo.
- **Aucun joueur requis** : tous les événements sont au niveau **équipe**.
- **Gestes** : chaque action = **1 geste**.

---

## 6. Mode Standard

**But** : box score par joueur, saisie rapide.
- **Inclut** le Mode Simple, plus la **sélection d'un joueur** et les statistiques : tir marqué, tir manqué, tir 2 pts, tir 3 pts, lancer franc, rebond, passe décisive, interception, perte de balle, faute.
- **Zones actives** : les cinq. Terrain **contextuel** (apparaît à la saisie d'un tir).
- **Joueur** : sélectionné une fois, **persistant (sticky)** jusqu'au changement → la plupart des actions retombent à **1–2 gestes**.
- *Note* : le **contre** existe dans l'app actuelle (`qa-btn` « Contre ») mais **n'est pas** dans la liste autorisée de cette mission → `Hors périmètre` pour cette spécification (non retiré du produit, simplement non spécifié ici).

---

## 7. Mode Avancé

**But** : Standard + contexte de lineup.
- **Inclut** le Standard, plus : **localisation précise du tir** (x/y sur le terrain, pas seulement la zone), **cinq joueurs sur le terrain**, **substitutions**, **lineup actif**, **plus-minus**.
- La localisation précise et le lineup **ne doivent pas ralentir** la saisie Standard : la localisation fine reste optionnelle (le centre de zone suffit par défaut, comme aujourd'hui via `court-analytics.js shotPos`).
- **Disponibilité du plus-minus** : `À décider plus tard`.
- Aucune notion de poste, système tactique, rotation automatique. → `Hors périmètre`.

---

## 8. Barre de match

**Contenu (uniquement)** : abréviation HoopBoard · score HoopBoard · abréviation adverse · score adverse · période · chronomètre · état du chrono · statut de sauvegarde · menu minimal · bouton **Quitter**.

- **Hiérarchie visuelle** : les deux **scores** dominent (plus gros éléments lisibles à distance) ; **période + chrono** au centre, secondaires ; **statut de sauvegarde** discret mais toujours présent ; **Quitter** isolé pour éviter le clic accidentel.
- **Toujours visibles** : scores, période, chrono, statut de sauvegarde (sticky en haut, mobile comme tablette).
- **Mobile** : barre compacte sur une ligne (abréviations + scores + chrono) ; le menu et Quitter derrière un contrôle discret.
- **Tablette** : barre pleine largeur, chrono central plus grand.
- **Modification rapide du score** : un appui sur un score ouvre un micro-contrôle `+/‑` (correction manuelle, §13) — jamais un plein écran.
- **Modifier la période** : contrôle « période suivante / précédente » dans la barre ou son menu.
- **Démarrer/pause du chrono** : un contrôle unique bascule Démarrer ⇄ Pause (§14).
- **Prévention des clics accidentels** : Quitter exige une **confirmation** (§20) ; les contrôles de score/chrono ont des cibles ≥ 44 px espacées.
- Aucune information secondaire ajoutée.

---

## 9. Joueurs et lineup

**Mode Simple** : zone masquée (aucun joueur).

**Mode Standard**
- **Emplacement** : bande horizontale défilable, proche des actions (accessible au pouce).
- **Taille de cible** : chaque joueur ≥ 44 px ; libellé numéro + nom court.
- **État sélectionné** : joueur actif **fortement saillant** (contour + fond + numéro), pas seulement un libellé texte (corrige UX-P0-003).
- **Changer de joueur** : 1 geste (appui sur un autre joueur).
- **Joueur actif** : rappelé aussi au-dessus des actions (« Action pour : #3 Francisco »).
- **Nombre visible** : autant que la largeur le permet ; le reste accessible par défilement.
- **Accès au banc** : si la liste dépasse l'espace, un contrôle « Banc / tous » ouvre un drawer listant tout l'effectif.

**Mode Avancé**
- **Affichage du cinq** : cinq emplacements « sur le terrain » distincts du banc.
- **Accès au banc** : drawer de substitution.
- **Substitution** : sortant → entrant (2 gestes) dans le panneau de substitution (§9/§17 micro-interactions).
- **Prévention d'un lineup invalide** : jamais plus ni moins de cinq actifs ; une substitution est atomique (un sort, un entre).
- **Retour visuel** après changement : le nouveau cinq est confirmé brièvement (150–250 ms).
- **Lien plus-minus** : chaque événement de score est attribué au **lineup actif** au moment de l'action (`À décider plus tard` pour l'exposition du plus-minus).
- Aucun système de poste/rotation automatique.

---

## 10. Actions principales

**Disposition** : grille de boutons dans la **zone pouce** (bas d'écran mobile), actions fréquentes au premier plan, **sans sous-menu** pour les actions courantes.

**Mode Simple** : `+1` · `+2` · `+3` · `Retirer un point` · `Faute HoopBoard` · `Faute adverse` (si utile au score) · `Undo`.

**Mode Standard** (actions principales) : `Tir marqué` · `Tir manqué` · `Lancer franc` · `Rebond` · `Passe décisive` · `Interception` · `Perte de balle` · `Faute` · `Undo`.

**Mode Avancé** : mêmes actions ; localisation + lineup n'ajoutent pas d'étape obligatoire.

**Spécification par action :**

| Action | Gestes max | Joueur requis | Zone requise | Feedback | Annulable | Si info manque |
|---|---|---|---|---|---|---|
| +1 / +2 / +3 (équipe) | 1 | Non | Non | Score s'incrémente + micro-anim | Oui | — |
| Retirer un point | 1 | Non | Non | Score décrémente (jamais < 0) | Oui | — |
| Faute HoopBoard / adverse | 1 | Non (Simple) | Non | Compteur faute + tick | Oui | — |
| Tir marqué (Standard) | 2–3 | Oui | Oui (donne 2/3) | Point sur terrain + score + « enregistré » | Oui | Joueur manquant → invite à sélectionner |
| Tir manqué (Standard) | 2–3 | Oui | Oui (localisation) | Croix sur terrain + « enregistré » | Oui | idem |
| Lancer franc | 1–2 | Oui | Non | +1 si marqué, tick | Oui | Joueur manquant → invite |
| Rebond / Passe / Interception / Perte de balle | 1–2 | Oui | Non | Ligne d'historique + tick | Oui | Joueur manquant → invite |
| Faute joueur | 1–2 | Oui | Non | Compteur faute joueur + tick | Oui | idem |
| Undo | 1 | Non | Non | Restaure toutes les vues (§18) | — | Historique vide → inactif |

Règle : si un joueur est déjà sélectionné (sticky), toute action « joueur » retombe à **1 geste** (l'action) ou **2 gestes** pour un tir (action + zone).

---

## 11. Saisie d'un tir — parcours cible

Le parcours actuel (joueur → zone → **popup central** → marqué/manqué) est trop lent. On compare **exactement deux options** (aucune troisième autorisée).

### Option A — joueur → marqué/manqué → zone
- **Avantages** : capture d'abord la donnée la plus importante (résultat + joueur) ; si l'action est interrompue, marqué/manqué est déjà enregistré ; « Marqué » / « Manqué » sont deux **grands boutons pouce** toujours visibles (pas de popup) ; la **zone** ne sert qu'à préciser 2/3 pts et la localisation.
- **Risques** : la valeur 2/3 pts dépend de la **dernière** étape (zone) ; si le coach n'indique pas la zone, il faut un **défaut** (`Marqué` → 2 pts par défaut, corrigeable). Zone posée après coup.

### Option B — joueur → zone → marqué/manqué
- **Avantages** : la zone fixe le contexte 2/3 avant le résultat ; ordre « spatial puis binaire ».
- **Risques** : oblige à viser d'abord une **petite cible** (zone) en quittant le jeu des yeux, avant la décision binaire facile ; si interrompu après la zone, on ignore encore marqué/manqué (donnée cruciale perdue) ; plus proche du parcours actuel jugé coûteux.

### ✅ Recommandation finale : **Option A** (joueur → marqué/manqué → zone)
Raisons : elle sécurise en premier le couple **résultat + joueur** (l'information décisive), transforme l'étape la plus fréquente en **deux grands boutons au pouce**, et relègue la cible fine (zone) en dernier, optionnelle et défautable. Elle supprime la **popup centrale bloquante**.

**Détail du parcours retenu :**
- **Sélection du joueur** : sticky ; changement = 1 geste (§9).
- **Marqué / Manqué** : deux boutons primaires ; 1 geste. Enregistre immédiatement l'événement (résultat + joueur), score mis à jour provisoirement (défaut 2 pts si marqué).
- **Zone** : un tap sur le terrain (contextuel) affine la localisation ; **détection 2/3 pts** = déduite de la zone tapée (zones 3 pts vs 2 pts, cf. `court-analytics.js` ZONES). Ajuste le score si 3 pts.
- **Lancer franc** : **flux séparé** (bouton dédié), **sans zone**, +1/0 — jamais mélangé au terrain.
- **Erreur de zone** : re-tap sur une autre zone avant validation, ou Undo après.
- **Changement de joueur** en cours : re-sélection avant « Marqué/Manqué ».
- **Feedback visuel** : bouton pressé + point/croix qui apparaît sur le terrain + micro-« enregistré ».
- **Ajout historique** : une ligne (résultat, joueur, zone, valeur).
- **Mise à jour du score** : immédiate à « Marqué » ; réajustée si la zone impose 3 pts.
- **Mise à jour de la carte** : point (marqué) / croix (manqué) via `court-analytics.js renderLiveCourt`.
- Contraintes respectées : **≤ 3 gestes** (souvent 2, joueur sticky), pas de popup bloquante, 2/3 distincts, LF séparé, terrain utilisable mobile.

---

## 12. Terrain et carte de tirs

**Rôle strict** : localiser un tir · voir les tirs enregistrés · distinguer réussite/échec. **Pas de heatmap avancée pendant le live** (elle reste dans Analyse, `03` §5).

- **Vue mobile** : terrain **contextuel** — masqué par défaut, il **glisse au-dessus des actions** lors de l'étape « zone » d'un tir, puis se réduit. Un accès rapide (onglet/pastille) permet de le rappeler en Standard.
- **Vue tablette** : terrain **plus large**, permanent en portrait et en colonne dédiée en paysage (§15).
- **Taille des zones** : chaque zone cliquable ≥ 44 px ; 8 zones canoniques (`court-analytics.js` ZONE_KEYS).
- **Zoom** : `À décider plus tard` (par défaut pas de zoom ; le centre de zone suffit).
- **Marqueurs** : **point plein** = marqué, **croix** = manqué (redondance forme + couleur, déjà présent `court-analytics.js:232`).
- **État sélectionné** : la zone en cours de saisie est mise en évidence jusqu'à validation.
- **Terrain non affiché** : les tirs restent enregistrés ; la carte se reconstruit à l'ouverture (dérivée de la timeline).
- **Accès rapide (Standard)** : bouton « Terrain » près des actions.
- **Présence** : permanent sur tablette, **contextuel sur mobile**.
- La vue analytique complète (heatmap, %) = **après match**, section Analyse.

---

## 13. Score

**Éditable pour les deux équipes.**
- **Ajout** : `+1/+2/+3` (HoopBoard et adverse).
- **Correction / retrait** : micro-contrôle `+/‑` en tapant un score dans la barre.
- **Distinction origine** : un point issu d'une **action joueur** (tir marqué) crée un événement joueur ; une **correction manuelle** crée un événement **équipe, origine=manuelle**, **sans** statistique joueur.
- **Historique** : toute variation de score (action ou correction) apparaît dans l'historique, marquée selon son origine.
- **Undo** : score inclus dans la transaction (§18).
- **Score négatif** : impossible (plancher 0).
- **Feedback** : incrément visible + micro-anim (150–250 ms).

---

## 14. Chronomètre et période

Prévoir : démarrer · pause · reprendre · modifier le temps · période suivante · période précédente · fin de match.

**États** : `Non démarré` · `En cours` · `En pause` · `Période terminée` · `Match terminé`.

- Contrôle unique Démarrer ⇄ Pause ; « modifier le temps » via un contrôle explicite (correction manuelle du chrono).
- Passage de période : « suivante » / « précédente » ; chaque changement journalise un événement de période (cf. `match-events` START_PERIOD/END_PERIOD).
- **Fin de match** : bascule l'état global → ouvre l'accès au résumé (§20).
- Les **règles sportives complètes** ne sont **pas** définies ici.
- **Durées de période & prolongations** : `Paramètre du match — à définir lors de la configuration` (drawer paramètres). Voir §31.

---

## 15. Fautes

Défini uniquement : faute joueur · total de fautes du joueur · faute d'équipe (si calculable par agrégation) · correction · undo.

- Faute joueur : 1–2 gestes (joueur sticky) ; incrémente le compteur du joueur.
- Total joueur : affiché sur le joueur (points de faute, comme aujourd'hui, plafond visuel à 5).
- Faute d'équipe : **dérivée** de la somme des fautes joueurs par période (si calculable) ; sinon `À décider plus tard`.
- Correction / undo : via l'historique (transactionnel).
- **Exclus** (`Hors périmètre`) : type de faute, antisportive, technique, disqualification, lancer automatique associé.

---

## 16. Rebonds et autres statistiques (Standard/Avancé)

| Action | Joueur requis | Gestes | Feedback | Historique | Undo |
|---|---|---|---|---|---|
| Rebond | Oui | 1–2 | Tick + ligne | Oui | Oui |
| Passe décisive | Oui | 1–2 | Tick + ligne | Oui | Oui |
| Interception | Oui | 1–2 | Tick + ligne | Oui | Oui |
| Perte de balle | Oui | 1–2 | Tick + ligne | Oui | Oui |
| Faute | Oui | 1–2 | Compteur + tick | Oui | Oui |

- **Rebond** : **pas** de distinction offensif/défensif dans cette mission (une seule action « Rebond »). Le mapping vers un type sous-jacent (`REBOUND_OFF`/`REBOUND_DEF` de `match-events.js`) est `À décider plus tard`.
- Aucune nouvelle catégorie statistique.

---

## 17. Historique récent

- **Nombre visible** : **3 à 5** dernières actions (limite exacte `À décider plus tard`).
- **Ordre** : anti-chronologique (plus récent en haut), comme l'app actuelle.
- **Contenu d'une ligne** : horodatage/temps de jeu · joueur (ou « Équipe ») · action · valeur (ex. « Q2 06:12 · #3 Francisco · 3 pts marqué · Corner »).
- **Distinction origine** : action joueur vs **correction manuelle** visuellement marquée (icône/label « manuel »).
- **Undo** : bouton undo attaché à l'historique (annule la dernière ligne, §18).
- **Historique complet** : drawer temporaire (n'occupe pas d'espace permanent).
- **Mobile** : historique **réduit** (2–3 lignes) ; ne prend jamais plus de place que les actions principales.
- **Tablette** : historique plus long dans sa colonne.

---

## 18. Undo (transactionnel)

**Une transaction = un événement métier complet** et **tous ses effets dérivés**.

- **Composition d'une transaction** : score + statistique(s) joueur + carte de tirs + ligne d'historique + (lineup/plus-minus si concerné). Un « tir marqué à 3 pts » annulé retire simultanément : les 3 points, la stat du joueur, le point sur la carte, la ligne d'historique.
- **Annulation d'une seule action** : undo retire la dernière transaction.
- **Annulations successives** : possibles en chaîne (dernière → précédente…).
- **Feedback** : toutes les vues se mettent à jour ensemble (aucune divergence — corrige UX-P0-002) + micro-« annulé ».
- **Restauration** : `À décider plus tard` (redo non requis par cette mission).
- **Limite** : `À décider plus tard` (profondeur d'undo).
- **Après synchronisation** : l'undo reste possible tant que la session est ouverte ; le comportement post-sync détaillé = `À décider plus tard`.
- **Correction manuelle** : est aussi une transaction annulable (retire la variation de score, sans stat joueur).
- Pas de versioning complexe.

---

## 19. Sauvegarde et hors connexion

**Quatre statuts exactement** : `Sauvegardé` · `Sauvegarde en cours` · `Hors connexion` · `Erreur de synchronisation`.

- **Emplacement** : dans la **barre de match**, discret mais permanent.
- **Feedback** : changement d'état visible (icône + libellé court) ; jamais bloquant.
- **Hors connexion** : la saisie **continue** normalement ; les événements sont conservés **localement** ; statut `Hors connexion` affiché.
- **Conservation locale** : chaque événement est persistué localement dès sa création (exigence, technologie non choisie).
- **Reprise après rechargement** : au rechargement en plein match, la session est **restaurée** (score, timeline, carte, historique, joueur/lineup) — corrige UX-P0-001.
- **Synchronisation au retour réseau** : rejoue les événements en attente ; statut repasse à `Sauvegardé`.
- **Erreur de synchronisation** : statut explicite + **action proposée** (« Réessayer ») ; les données locales ne sont jamais perdues silencieusement.
- **Choix technologique de stockage/sync** : **non tranché ici** — exigences UX/fonctionnelles seulement. Voir §31.

---

## 20. Sortie du Mode banc

- **Match non terminé** : **confirmation requise** (drawer/pop de confirmation) avant de quitter.
- **Match terminé** : accès direct au **résumé** (récap/box score, section Matchs `03` §6).
- **Données non synchronisées** : la sortie affiche un **avertissement clair** (« des actions ne sont pas encore synchronisées ») + option rester/quitter quand même (données conservées localement).
- **Rechargement / fermeture accidentelle** : session **restaurable** (§19).
- Aucun autre workflow de sortie.

---

## 21. Mobile (~375 px)

Contraintes respectées : score/chrono toujours visibles, joueur actif identifiable (Standard/Avancé), actions au pouce, terrain contextuel, historique réduit, **aucune table large**, **aucune navigation principale**, aucune popup bloquante inutile.

**Ordre vertical exact des cinq zones (haut → bas) :**
1. **Barre de match** (sticky top) — scores + période + chrono + statut sauvegarde.
2. **Joueurs / lineup** (bande horizontale défilable) — joueur actif saillant *(masquée en Mode Simple)*.
3. **Historique récent** (2–3 lignes compactes).
4. **Terrain / carte** *(contextuel : glisse au-dessus des actions pendant l'étape « zone » d'un tir, sinon réduit/accessible via bouton)*.
5. **Actions principales** (sticky bottom, zone pouce) — incluant **Undo**.

> Rationale : les deux extrémités (barre en haut, actions en bas) sont fixes et toujours atteignables au pouce ; le terrain n'apparaît que quand il sert.

---

## 22. Tablette

### Portrait (ordre imposé)
1. Score (barre de match)
2. Joueurs
3. Actions
4. Terrain
5. Historique

### Paysage (deux colonnes maximum — meilleure expérience au bord du terrain)
- **Barre de match** : pleine largeur en haut.
- **Colonne gauche (large)** : **Terrain / carte de tirs** (permanent, grand).
- **Colonne droite** : **Joueurs / lineup** (haut) → **Actions principales** (centre, zone pouce côté droit) → **Historique récent** (bas).

> Répartition : terrain ≈ 55–60 % de largeur, colonne droite ≈ 40–45 %. Le terrain grand + actions à portée de pouce = saisie rapide en regardant peu l'écran.

---

## 23. Desktop

Fonctionnel pour démonstration, saisie par un assistant, test — **ne guide pas** les décisions mobile.
- **Barre de match** pleine largeur en haut.
- **Trois colonnes maximum** : **gauche** = Joueurs / lineup ; **centre** = Terrain / carte ; **droite** = Actions + Historique.
- Aucune fonction ajoutée par rapport au mobile.

---

## 24. Micro-interactions (150–250 ms, `prefers-reduced-motion` respecté)

| Évènement | Retour | 
|---|---|
| Action enregistrée | Flash bref du bouton + tick « enregistré » |
| Tir marqué | Point apparaît sur le terrain + incrément score |
| Tir manqué | Croix apparaît sur le terrain |
| Faute | Compteur faute pulse une fois |
| Changement de joueur | Nouveau joueur devient saillant (transition courte) |
| Substitution | Confirmation brève du nouveau cinq |
| Undo | Vues se réajustent ensemble + tick « annulé » |
| Sauvegarde | Statut change (Sauvegarde en cours → Sauvegardé) |
| Erreur | Statut d'erreur + invite « Réessayer » |

Interdits : animation longue, célébration, particules, effet 3D.

---

## 25. Accessibilité

- **Cibles tactiles** : ≥ 44 px (joueurs, actions, zones du terrain, contrôles de score/chrono).
- **Contraste** : scores et chrono à fort contraste, lisibles à distance en gymnase (ratios exacts `À décider plus tard`, à mesurer).
- **États sélectionnés** : joueur/zone actifs distingués par **forme + fond**, pas seulement la couleur.
- **Réussi/manqué** : **point vs croix** (indépendant de la couleur).
- **Labels** : chaque bouton d'action et chaque contrôle a un label accessible ; champs et icônes nommés.
- **Focus clavier (desktop)** : ordre logique, focus visible.
- **Retour visuel** : chaque action confirmée visuellement (voir §24).
- **Réduction des mouvements** : `prefers-reduced-motion` désactive les transitions.
- **Taille des scores** : dominante dans la barre.
- Pas d'audit juridique.

---

## 26. Composants à spécifier

| Composant | Responsabilité | Données reçues | Actions émises | États | Variantes M/T/D |
|---|---|---|---|---|---|
| Barre de match | Cadre d'état du match | scores, période, chrono, statut sauvegarde | ouvrir menu, quitter | normal / confirmation sortie | compacte (M) / large (T) / pleine (D) |
| Scoreboard | Afficher + éditer scores | score HB, score adverse | +1/+2/+3, corriger, retirer | normal / édition / plancher 0 | M/T/D |
| Chronomètre | Temps de jeu | temps, état | démarrer, pause, reprendre, modifier | non démarré/en cours/pause/terminé | M/T/D |
| Sélecteur de période | Naviguer les périodes | période courante | suivante, précédente, fin | 1..N / terminée | M/T/D |
| Liste joueurs | Sélection joueur actif | effectif, joueur actif | sélectionner, ouvrir banc | vide (Simple) / sélection | strip (M) / colonne (T/D) |
| Lineup actif | Cinq sur le terrain (Avancé) | 5 joueurs, plus-minus | ouvrir substitution | valide (5) uniquement | M/T/D |
| Banc | Effectif hors cinq | joueurs banc | choisir entrant | — | drawer (M) / panneau (T/D) |
| Bouton statistique | Émettre un évènement | type, joueur, contexte | créer évènement | actif / requiert joueur | grille pouce M/T/D |
| Terrain | Localiser + afficher tirs | tirs (timeline) | choisir zone, poser tir | zone sélectionnée / neutre | contextuel (M) / permanent (T/D) |
| Marqueur de tir | Représenter un tir | résultat, position | — | marqué (point) / manqué (croix) | M/T/D |
| Historique | Dernières actions + undo | timeline récente | undo, ouvrir complet | vide / rempli | réduit (M) / long (T/D) |
| Statut de sauvegarde | Communiquer la persistance | statut | réessayer (si erreur) | Sauvegardé/En cours/Hors ligne/Erreur | M/T/D |
| Confirmation de sortie | Éviter sortie accidentelle | état match, sync | rester, quitter | non terminé / non synchronisé | overlay M/T/D |
| Panneau de substitution | Échanger deux joueurs | cinq + banc | valider substitution | atomique (1 sort/1 entre) | drawer M / panneau T/D |
| Sélecteur de mode | Choisir Simple/Standard/Avancé | mode courant | changer de mode | 3 valeurs | drawer paramètres |

Pas de CSS ni de couleurs définis.

---

## 27. Modèle conceptuel d'événement

Un événement porte **seulement** les champs nécessaires :

| Champ | Rôle | Nécessaire pour |
|---|---|---|
| `id` | identifiant unique | tous (undo, sync) |
| `type` | nature de l'action | tous |
| `equipe` | HoopBoard / adverse | score équipe, correction manuelle |
| `joueur` | auteur (ou null) | actions Standard/Avancé (null pour équipe/manuel) |
| `valeur` | points / +1 faute / etc. | score, LF, fautes |
| `zone` | zone du terrain | tirs (Standard) |
| `periode` | numéro de période | tous (contexte) |
| `temps` | horloge de jeu | tous (contexte) |
| `lineup` | cinq actif au moment T | Avancé (plus-minus) |
| `timestamp` | instant réel de saisie | ordre, sync |
| `origine` | `action_joueur` \| `manuel` | distinction score/correction |
| `statut_sync` | Sauvegardé/En cours/Hors ligne/Erreur | persistance |

**Champs requis par action (indicatif) :**
- Score équipe / correction manuelle : `type, equipe, valeur, periode, temps, origine=manuel, timestamp, statut_sync`.
- Tir marqué/manqué (Standard) : `type, joueur, valeur(0/2/3), zone, periode, temps, origine=action_joueur, timestamp, statut_sync` (+ `lineup` en Avancé, + x/y en Avancé).
- Lancer franc : `type, joueur, valeur(0/1), periode, temps, timestamp, statut_sync`.
- Rebond/Passe/Interception/Perte/Faute : `type, joueur, periode, temps, timestamp, statut_sync`.
- Période : `type(START/END_PERIOD), periode, temps, timestamp`.
- Substitution (Avancé) : `type(SUBSTITUTION), joueur(entrant/sortant), lineup, periode, temps, timestamp`.

Pas de schéma backend complet.

---

## 28. Lien possible avec `lib/match-events.js`

`match-events.js` (déjà présent, **non modifié**) est une **fondation adéquate** :
- Il définit une **timeline unique** `{ meta, events }` et `makeEvent(type, {player, points, period, clock, meta})` — exactement le modèle « source de vérité unique » requis (§3, §18).
- Ses **15 types** couvrent la majorité des actions : `SHOT_MADE/MISSED`, `FREE_THROW_MADE/MISSED`, `REBOUND_OFF/DEF`, `ASSIST`, `STEAL`, `BLOCK`, `TURNOVER`, `FOUL`, `SUBSTITUTION`, `TIMEOUT`, `START/END_PERIOD`.
- `aggregateStats(events)` **dérive le box score** depuis la timeline → permet score, stats joueur, undo cohérent (recalcul après retrait d'un événement).
- Le pont vers la carte existe déjà : `court-analytics.js` `shotsFromTimeline()` / `shotFromEvent()` consomment cette timeline (`meta.zone`).

**Écarts à couvrir (sans modifier le fichier maintenant, `À décider plus tard` pour l'implémentation) :**
- **Score adverse / correction manuelle** : pas de type dédié → à porter via un événement équipe `origine=manuel` (extension conceptuelle, non codée ici).
- **Rebond unique** (sans distinction off/def) : mapping vers un des deux types existants.
- **`origine`, `statut_sync`, `lineup`, x/y** : champs supplémentaires par rapport au `meta` actuel → extension future du modèle, hors de cette mission.
- **plus-minus** : dérivable de `lineup` + événements de score.

> Recommandation : **brancher** ce moteur comme source de vérité (aujourd'hui la page live réplique le format à la main, `01` §16) — c'est le socle de l'undo transactionnel et de la persistance. L'implémentation est laissée à une session dédiée.

---

## 29. Critères d'acceptation par mode

### Mode Simple
- [ ] Score des deux équipes modifiable ; jamais négatif.
- [ ] Chaque action de score = **1 geste**.
- [ ] Score et chrono **toujours visibles**.
- [ ] Undo corrige score **et** historique.
- [ ] Rechargement **ne perd pas** la session.
- [ ] Statut de sauvegarde visible en permanence ; `Hors connexion` visible quand hors ligne.
- [ ] Aucune zone joueur/terrain affichée (non requise).

### Mode Standard
- [ ] Tous les critères Simple.
- [ ] Joueur sélectionnable en **1 geste**, joueur actif **clairement identifiable**.
- [ ] Tir enregistrable en **≤ 3 gestes** (≤ 2 si joueur sticky), **sans popup bloquante**.
- [ ] Distinction 2 pts / 3 pts claire ; lancer franc **séparé** du terrain.
- [ ] Undo corrige **score + stat joueur + carte + historique** ensemble.
- [ ] Carte de tirs : point (marqué) / croix (manqué).
- [ ] Aucune action fréquente derrière un sous-menu.

### Mode Avancé
- [ ] Tous les critères Standard.
- [ ] Exactement **cinq joueurs actifs** ; lineup invalide impossible.
- [ ] Substitution atomique (1 sort / 1 entre) avec retour visuel.
- [ ] Localisation fine **optionnelle** : n'allonge pas la saisie standard.
- [ ] Undo couvre aussi lineup/plus-minus quand concerné.
- [ ] Aucune fonction inactive présentée comme utilisable.

---

## 30. Tests terrain (checklist manuelle — 13 scénarios imposés)

1. Saisir **dix actions consécutives** → toutes enregistrées, historique cohérent.
2. Enregistrer un **tir marqué** → score +2/+3, point sur carte, ligne d'historique.
3. Enregistrer un **tir manqué** → croix sur carte, pas de point, historique.
4. **Corriger le score manuellement** → variation appliquée, marquée « manuel », **aucune** stat joueur créée.
5. **Annuler trois actions** → score, stats, carte, historique reviennent tous à l'état antérieur.
6. **Perdre la connexion** → statut `Hors connexion`, saisie toujours possible, données conservées.
7. **Recharger la page** → session restaurée (score, timeline, carte, historique, joueur/lineup).
8. **Changer de période** → période incrémentée, contexte des évènements correct.
9. **Faire une substitution** (Avancé) → cinq mis à jour, atomique, retour visuel.
10. **Quitter un match non terminé** → confirmation demandée ; avertissement si non synchronisé.
11. **Terminer un match** → état `Match terminé`, accès au résumé.
12. **Interface à une main sur téléphone** → actions principales atteignables au pouce, cibles ≥ 44 px.
13. **Tablette paysage** → terrain large à gauche, joueurs/actions/historique à droite, saisie rapide.

Aucun autre scénario.

---

## 31. Éléments `À décider plus tard`

Limité aux sujets autorisés :
- **Durée des périodes** → `Paramètre du match — à définir lors de la configuration`.
- **Prolongations** → `À décider plus tard`.
- **Limite exacte de l'historique** (nombre de lignes / profondeur d'undo) → `À décider plus tard`.
- **Technologie de persistance** → `À décider plus tard` (exigences UX seulement, §19).
- **Technologie de synchronisation** → `À décider plus tard`.
- **Disponibilité du plus-minus** → `À décider plus tard`.
- **Mode sélectionné par défaut** (Simple / Standard / Avancé) → `À décider plus tard`.

---

*Fin de la spécification Match Live. Aucune modification apportée aux fichiers applicatifs.*
