# HoopBoard — Audit UX priorisé

> Suite de [`00-audit-technique.md`](00-audit-technique.md) et [`01-inventaire-ecrans.md`](01-inventaire-ecrans.md).
> Clone : `HOOPBoard serieux/Stack claude/HoopBoard`, branche `refactor/pr3.1-button-system`, HEAD **`ad0af1d` (PR4.5)**.
> Utilisateur prioritaire : **coach de basket amateur**, sur téléphone/tablette, au bord du terrain, sans statisticien.
> Périmètre : expérience, compréhension, navigation, hiérarchie, interactions, lisibilité, charge cognitive, cohérence, mobile/tablette. **Pas** un audit backend.
> Aucun fichier applicatif ni document 00/01 modifié.

---

## 1. Résumé exécutif

- **État global** : une démo **visuellement très aboutie** mais dont l'**expérience réelle** est incomplète et parfois **trompeuse** pour un coach. Le soin graphique (terrains, jauges, animations, feed social) crée une promesse « produit fini » que le fonctionnement ne tient pas.
- **Principal point fort** : la **lisibilité par zones du terrain** (landing/coach/joueur) et le module analytics 2D (`assets/court-analytics.js`) — une direction produit claire, cohérente et différenciante.
- **Principal problème** : le **match live** — cœur de la promesse « saisie en direct sur le terrain » — est **non persistant, incohérent après annulation, et trop coûteux en attention** pour un coach qui doit regarder le jeu.
- **Niveau de maturité UX** : **prototype haute-fidélité** (design mûr, logique d'usage immature). Bon pour convaincre, insuffisant pour être utilisé un soir de match.
- **Adéquation au coach amateur** : **faible à moyenne**. La consultation (stats, zones, récaps) est agréable ; la **tâche opérationnelle** (saisir un match seul, sur téléphone, sans perdre ses données) n'est pas encore tenable.

---

## 2. Méthode et périmètre

- **Documents utilisés** : `00-audit-technique.md` (stack) et `01-inventaire-ecrans.md` (inventaire fonctionnel + classifications INT/CLIENT/STATIC/MOCK/DEMO/FONDATION/ABSENTE). Ces documents sont la source principale ; ils ont été produits sur le même clone PR4.5.
- **Fichiers reconsultés ponctuellement** : aucun nouvel écran ré-inspecté intégralement. Les preuves citées (numéros de ligne) proviennent de l'inspection de l'inventaire 01 : `coach.html` (JS 1984-2401), `joueur.html` (JS 1210-1555 + markup 951-1125), `index.html` (682-756), `assets/court-analytics.js`, `lib/match-events.js`.
- **Limites** : audit **statique / par lecture de code**, sans exécution mesurée (voir §17). Les notes de contraste, de taille de cible et de comportement responsive sont **inférées** de la structure et des `@media`, non mesurées au pixel.
- **UX vs technique** : on n'évalue pas ici l'architecture backend. L'absence de persistance n'est traitée que par son **effet perçu** sur le coach (confiance, perte de données), pas comme défaut d'infrastructure.

---

## 3. Scores globaux par zone

| Zone | Score /10 | Principal point fort | Principal problème | Priorité dominante |
|---|--:|---|---|---|
| 1. Landing | 7 | Terrain démo signature, CTA clair | Promesse > réalité (données démo non signalées) | P2 |
| 2. Navigation coach | 5 | Onglets lisibles au repos | Dense, cul-de-sac, `tabMap` ambigu (3 sections → 1 onglet) | P1 |
| 3. Navigation joueur | 7 | Transitions directionnelles nettes | 3 vues seulement, pas d'ancrage | P2 |
| 4. Dashboard coach | 5 | Accès rapide aux sections | Info clé noyée, peu d'hydratation | P1 |
| 5. Game Center | 6 | Cartes de match lisibles, jauges | Duplication `data.js`, pseudo-3D gadget | P2 |
| 6. Effectif | 6 | Tableau clair, mise en avant maxima | Moyennes `demo:true` non signalées à l'écran | P1 |
| 7. Fiches joueurs | 6 | Radar + moyennes lisibles | Statique, non relié à l'effectif hydraté | P2 |
| 8. Statistiques | 5 | Format « pro » crédible | Semblent réelles/calculées alors que mockées | P1 |
| 9. Analyse du terrain | 7 | Lecture par zones + conseils | Données inventées présentées comme analyse | P2 |
| 10. Entraînements | 6 | Lien point chaud → drills | Aucun suivi, scores figés | P2 |
| 11. Objectifs | 5 | Barres de progression parlantes | 100 % statique, aucune mise à jour | P2 |
| 12. **Match live** | **3** | Terrain + feed + carte en direct | **Non persistant, undo partiel, coûteux en attention** | **P0** |
| 13. Sélection joueur | 4 | Chips avec fautes visibles | Joueur actif peu saillant, 5 joueurs figés, « Banc » inerte | P1 |
| 14. Saisie des tirs | 3 | Popup contextuel au point de clic | Trop d'étapes, cibles/zones imprécises | P0 |
| 15. Score | 3 | Grand, lisible | Adverse figé, pas de chrono → tableau trompeur | P0 |
| 16. Fautes | 6 | Points de faute clairs | Pas d'undo dédié, plafond silencieux à 5 | P2 |
| 17. Annulation | 3 | Bouton undo présent | **Partiel** : score/carte/feed divergent | P0 |
| 18. Rotations | 2 | Timeline visuelle | **Inerte** (aucune substitution) | P1 |
| 19. Feuille de match scénarisée | 5 | Marqueur terrain élégant | Déconnectée du live, scénarisée | P2 |
| 20. HoopFeed | 4 | Rendu social soigné | Modèle réseau social inadapté (mineurs, popularité) | P1 |
| 21. Profil social | 5 | Carte profil complète | Compteurs figés, « Message » inerte | P2 |
| 22. Commentaires & likes | 4 | Interactions fluides | Non persistés, logique de popularité | P1 |
| 23. Récap pseudo-3D | 6 | Rejeu narratif agréable | Positions inventées, pas de contrôle | P2 |
| 24. Responsive mobile | 4 | Base fluide (unités relatives) | Tableaux larges + terrain + saisie une main non pensés | P1 |
| 25. Responsive tablette | 4 | Hérite du desktop | Pas de breakpoint dédié (zone 780–1024) | P2 |
| 26. États vides | 5 | Feed live vide géré | Rares ailleurs | P2 |
| 27. États de chargement | 3 | Feedback sur formulaire bêta | Hydratation API **silencieuse** | P1 |
| 28. Erreurs | 3 | Message d'erreur bêta | Aucune erreur visible côté coach/joueur | P1 |
| 29. Accessibilité | 5 | `reduced-motion`, quelques `aria-label`, croix pour manqués | Dépendance couleur, focus, cibles, labels partiels | P1 |
| 30. Cohérence coach-joueur | 5 | Langage visuel commun | Composants dupliqués, feed asymétrique | P2 |

---

## 4. Score général du produit

**Score UX global : 4,6 / 10.**

Calcul : moyenne **pondérée** des zones, avec surpondération des tâches critiques pour le coach amateur.

| Bloc | Zones | Poids | Score bloc /10 |
|---|---|--:|--:|
| Match live (12,14,15,17,13,16,18) | cœur opérationnel | **35 %** | 3,3 |
| Navigation (2,3) | orientation | **15 %** | 6,0 |
| Dashboard + stats (4,8,6) | pilotage coach | **15 %** | 5,3 |
| Mobile/tablette (24,25) | contexte d'usage | **15 %** | 4,0 |
| Cohérence & confiance (30,27,28, promesse) | crédibilité | **10 %** | 4,3 |
| Consultation (5,7,9,10,11,19,20,23) | valeur secondaire | **10 %** | 5,6 |

Total pondéré ≈ **4,6/10**. Le score est tiré vers le bas par le **match live** (35 % du poids) et le **mobile**, précisément les deux contextes où le coach a le plus besoin du produit. La couche de **consultation** est nettement meilleure (5,5–7) mais pèse peu car ce n'est pas la promesse centrale.

---

## 5. Problèmes P0 (bloquants)

```text
Identifiant : UX-P0-001
Zone : Match live — sauvegarde / confiance
Priorité : P0
Score actuel : 3/10 (confiance dans la sauvegarde)
Problème actuel : La saisie live (score, feed, tirs, fautes) vit uniquement en mémoire ; un rechargement, un verrouillage d'écran ou une perte d'onglet efface tout. Aucun statut de sauvegarde n'est affiché, et le contexte (gymnase, connexion instable, téléphone) rend la perte probable.
Preuve dans le projet : coach.html — variables in-memory `feed`, `liveTimeline`, `scoreHome`, `players[].fouls` (coach.html:2060-2062, 2173) ; aucun localStorage/sessionStorage ; `/api/events` non appelé et non persistant (api/events.js).
Scénario utilisateur : Un coach saisit un quart-temps entier debout au bord du terrain ; son téléphone met l'écran en veille ; à la reprise, la page s'est rechargée et tout est perdu.
Impact utilisateur : Perte de travail irrécupérable + perte de confiance définitive dans l'outil. C'est un défaut « une seule fois suffit à abandonner ».
Cause probable : Prototype conçu pour la démonstration visuelle, sans couche de session ni indicateur d'état.
Recommandation : La future conception DOIT (a) persister la session live localement au minimum (reprise après rechargement), (b) afficher en permanence un statut explicite (« enregistré », « hors ligne — en attente »), (c) proposer une reprise de match. Ne pas concevoir ici l'implémentation ; poser l'exigence.
Fonctionnalités à préserver : Le flux de saisie visuel (terrain + feed + carte 2D) et la réactivité immédiate.
Fichiers probablement concernés : coach.html (#page-live), lib/match-events.js (déjà prêt comme modèle d'état), api/events.js.
Risque de régression : Élevé — toucher à l'état live peut casser le score, le feed et la carte 2D simultanément.
Critères d'acceptation : Après rechargement volontaire en plein match, le score, le feed et la carte reflètent l'état d'avant ; un indicateur de sauvegarde est visible à tout moment ; aucune action saisie n'est silencieusement perdue.
```

```text
Identifiant : UX-P0-002
Zone : Match live — annulation / intégrité des données
Priorité : P0
Score actuel : 3/10 (possibilité d'annuler)
Problème actuel : L'undo ne retire que le dernier élément du feed (et retranche les points d'un panier), mais ne supprime ni le tir de la timeline, ni le point déposé sur le terrain. Après annulation, feed, carte 2D live et score peuvent diverger durablement.
Preuve dans le projet : coach.html:2202 (`undoBtn` agit sur `feed` seul) vs coach.html:2180 (`recordShot` pousse séparément dans `liveTimeline`) et `dropMarker` (coach.html:2150) qui pose un point non retiré.
Scénario utilisateur : Le coach se trompe de joueur, annule ; le score se corrige mais la carte des tirs continue d'afficher le tir annulé et le total « x/y tirs » reste faux.
Impact utilisateur : Statistiques fausses présentées comme fiables → décisions de coaching biaisées, perte de confiance.
Cause probable : Trois sous-états (feed, timeline, marqueurs) gérés indépendamment, sans source de vérité unique.
Recommandation : Poser comme exigence une source de vérité unique de la timeline dont dérivent score, feed et carte ; l'undo doit défaire l'événement complet. `lib/match-events.js`/`aggregateStats` est le bon socle conceptuel.
Fonctionnalités à préserver : Le bouton undo et le retour visuel immédiat.
Fichiers probablement concernés : coach.html (#page-live), lib/match-events.js, assets/court-analytics.js.
Risque de régression : Élevé — la carte 2D et le score partagent l'état à réunifier.
Critères d'acceptation : Annuler un tir met à jour simultanément score, feed ET carte ; les totaux affichés restent exacts après une série d'annulations.
```

```text
Identifiant : UX-P0-003
Zone : Saisie des tirs — charge d'attention pendant le match
Priorité : P0
Score actuel : 3/10 (rapidité, usage une main, lisibilité en match)
Problème actuel : Enregistrer un tir demande au minimum sélectionner le joueur → viser une zone du terrain → viser le popup ouvert au point de clic → choisir Marqué/Manqué. Le popup s'ouvre aux coordonnées exactes du doigt (souvent sous le doigt), les zones du terrain sont petites et proches, et le joueur actif est peu saillant. Tout cela oblige à quitter le jeu des yeux plusieurs secondes.
Preuve dans le projet : coach.html:2120-2148 (zone → popup positionné en x/y du clic → btnMake/btnMiss) ; joueur actif signalé seulement par un libellé texte (coach.html:2083, `selectedPlayerLabel`).
Scénario utilisateur : Contre-attaque rapide ; le coach veut noter un 3-points ; il cherche le joueur, tape une petite zone, un popup apparaît sous son pouce, il doit encore viser « Marqué » — l'action de jeu suivante est déjà passée.
Impact utilisateur : Saisie trop lente et faillible en conditions réelles ; risque élevé de mauvaise sélection ; l'outil détourne du terrain (anti-promesse « saisie sur le terrain »).
Cause probable : Interaction pensée pour la démonstration à la souris sur desktop, pas pour le pouce en situation de match.
Recommandation : Exiger pour la refonte une saisie « gros doigts / une main » : cibles ≥ 44 px, joueur actif dominant à l'écran, réduction du nombre d'étapes (ex. mode rapide points d'abord), popup jamais masqué par le doigt. Ne pas maquetter ici.
Fonctionnalités à préserver : La saisie spatiale par zone (valeur différenciante) et la carte de tirs.
Fichiers probablement concernés : coach.html (#page-live, .zone, #shotPopup).
Risque de régression : Moyen — refonte d'interaction sans toucher au calcul.
Critères d'acceptation : Un tir courant se saisit en ≤ 2 gestes, cibles ≥ 44 px, joueur actif identifiable sans lire un libellé, popup toujours visible.
```

---

## 6. Problèmes P1 (importants)

```text
Identifiant : UX-P1-001
Zone : Navigation coach
Priorité : P1
Score actuel : 5/10 (cohérence de navigation)
Problème actuel : 7 sections pour un seul onglet-barre, avec une correspondance onglet↔section ambiguë : effectif, joueur et match partagent l'onglet « Effectif ». Aucun lien retour vers la landing ni passage coach↔joueur ; navigation non adressable (pas d'URL/état).
Preuve dans le projet : coach.html:1990 (`tabMap` regroupe effectif/joueur/match) ; audit 00 §10 (cul-de-sac).
Scénario utilisateur : Le coach ouvre une fiche joueur, veut « revenir aux matchs » et ne sait plus quel onglet est actif ni comment remonter.
Impact utilisateur : Désorientation, charge cognitive, sentiment de se perdre.
Cause probable : Onglets calqués sur un regroupement technique, pas sur les tâches.
Recommandation : Clarifier la relation onglet↔écran (état actif fidèle), offrir un retour explicite et une logique de tâches. Déplacer/renommer plutôt que supprimer.
Fonctionnalités à préserver : Les 7 sections et leur contenu.
Fichiers probablement concernés : coach.html (topnav/tabs, `goto`).
Risque de régression : Moyen.
Critères d'acceptation : L'onglet actif correspond toujours à l'écran visible ; un retour est possible depuis chaque sous-écran.
```

```text
Identifiant : UX-P1-002
Zone : Boutons inertes (Banc, Message, Partager)
Priorité : P1
Score actuel : 4/10 (cohérence promesse/réel, prévention des erreurs)
Problème actuel : Des contrôles visibles n'ont aucun effet : « Banc » (rotations), « Message » (profil), « Partager » (post). Ils suggèrent des capacités inexistantes.
Preuve dans le projet : coach.html:2087-2092 (chip « Banc » sans handler) ; joueur.html profil « Message » et `.pa-share` sans gestionnaire (inventaire 01).
Scénario utilisateur : Le coach tape « Banc » pour faire une substitution ; rien ne se passe ; il croit à un bug.
Impact utilisateur : Perte de confiance, clics morts, confusion démo/réel.
Cause probable : Éléments d'habillage laissés actifs visuellement.
Recommandation : Tant que la fonction n'existe pas, désactiver/masquer visuellement ou marquer « bientôt » — distinguer désactiver vs supprimer.
Fonctionnalités à préserver : L'emplacement, pour la future fonction.
Fichiers probablement concernés : coach.html, joueur.html.
Risque de régression : Faible.
Critères d'acceptation : Aucun bouton cliquable sans effet ; les fonctions à venir sont signalées comme telles.
```

```text
Identifiant : UX-P1-003
Zone : Score & chronomètre (match live)
Priorité : P1
Score actuel : 3/10 (clarté des données, confiance)
Problème actuel : Le score adverse est figé (40) et non éditable ; aucun chronomètre de jeu réel (le seul compte à rebours vise le prochain match). Le tableau de score paraît officiel mais ne peut pas suivre un vrai match.
Preuve dans le projet : coach.html:1656 (`scoreAway=40` en dur) ; coach.html:2214-2229 (`cdState` = décompte MOCK J-2, pas une horloge de match).
Scénario utilisateur : L'adversaire marque ; le coach ne peut pas mettre à jour le score adverse ; l'écart affiché devient faux.
Impact utilisateur : Score non fiable → l'écran live perd sa fonction première.
Cause probable : Scénarisation de la démo.
Recommandation : Exiger un score des deux équipes éditable et une horloge de période réelle (ou l'assumer explicitement comme non suivie).
Fonctionnalités à préserver : L'affichage grand et lisible du score.
Fichiers probablement concernés : coach.html (#page-live scoreboard).
Risque de régression : Moyen.
Critères d'acceptation : Les deux scores évoluent ; le temps affiché correspond au match, ou son absence est explicite.
```

```text
Identifiant : UX-P1-004
Zone : Confiance — démo vs réel (données mockées / scénarisées)
Priorité : P1
Score actuel : 4/10 (cohérence promesse/réel)
Problème actuel : Des statistiques `demo:true` et des contenus scénarisés (moyennes saison, splits par zone, feed) s'affichent sans marquage visible côté coach/joueur, avec un format « pro » qui les fait passer pour des données réelles/calculées. Seul le terrain analytics 2D affiche « données démo ».
Preuve dans le projet : data.js `statsSaison`/`zonesTirSaison` (`demo:true`) affichés dans l'effectif (coach.html:2372) sans mention ; court-analytics.js:174 est le seul à afficher « données démo ».
Scénario utilisateur : Le coach lit des moyennes saison et prend une décision, croyant qu'elles viennent de ses matchs.
Impact utilisateur : Décisions fondées sur des données fictives ; crédibilité entamée quand la supercherie est comprise.
Cause probable : Données de démonstration nécessaires au rendu, non étiquetées à l'écran.
Recommandation : Généraliser un marquage discret mais clair « démo / exemple » partout où la donnée n'est pas réelle. Améliorer, ne pas supprimer.
Fonctionnalités à préserver : La richesse d'affichage.
Fichiers probablement concernés : coach.html, joueur.html, index.html.
Risque de régression : Faible.
Critères d'acceptation : Toute donnée non réelle est visuellement identifiable ; aucun chiffre fictif n'est présenté comme mesuré.
```

```text
Identifiant : UX-P1-005
Zone : Responsive mobile (usage réel du coach)
Priorité : P1
Score actuel : 4/10 (adaptation mobile, usage une main)
Problème actuel : L'app repose sur un même DOM adapté par media queries, avec tableaux larges (effectif, box score), terrain SVG dense et saisie live à cibles rapprochées — peu compatibles avec un pouce, debout, en gymnase.
Preuve dans le projet : breakpoints coach 1080/780, joueur 1000/720 (audit 00) ; saisie live à coordonnées de clic (coach.html:2120).
Scénario utilisateur : Le coach tient son téléphone d'une main et tente de saisir un tir de l'autre, en surveillant le jeu.
Impact utilisateur : Erreurs de saisie, lenteur, fatigue, abandon en situation réelle.
Cause probable : Conception desktop-first, mobile traité par adaptation.
Recommandation : Poser le principe mobile-first pour le live et une stratégie tableaux (cartes empilées, colonnes essentielles) sur petit écran. Ne pas maquetter ici.
Fonctionnalités à préserver : Le contenu des tableaux et du terrain.
Fichiers probablement concernés : coach.html, joueur.html (CSS + structure live).
Risque de régression : Moyen.
Critères d'acceptation : Les tâches clés (saisie, lecture score, effectif) sont réalisables à une main sur 375 px sans zoom horizontal.
```

```text
Identifiant : UX-P1-006
Zone : Dashboard coach & statistiques — hiérarchie
Priorité : P1
Score actuel : 5/10 (hiérarchie, charge cognitive)
Problème actuel : L'information décisive (prochain match, forme, alerte) n'émerge pas au-dessus des nombreuses statistiques et cartes ; le dashboard sert surtout de menu.
Preuve dans le projet : #page-dashboard (2 pills hydratées, reste figé, coach.html:2367) ; format stat « pro » uniforme.
Scénario utilisateur : Le coach ouvre l'app avant l'entraînement et cherche « quoi préparer » sans réponse immédiate.
Impact utilisateur : Temps perdu, message produit dilué.
Cause probable : Densité homogène, pas de hiérarchie de tâches.
Recommandation : Prioriser 1 information/action principale par écran (divulgation progressive du reste).
Fonctionnalités à préserver : Les données existantes.
Fichiers probablement concernés : coach.html (#page-dashboard).
Risque de régression : Faible.
Critères d'acceptation : Chaque écran expose une action/information dominante identifiable en < 3 s.
```

```text
Identifiant : UX-P1-007
Zone : HoopFeed — pertinence pour une équipe amateur avec mineurs
Priorité : P1
Score actuel : 4/10 (adaptation au public, confidentialité)
Problème actuel : HoopFeed calque un réseau social généraliste (abonnés 15,3k, likes, « Suivre », profil unique de vedette) sans rôle clair pour une équipe amateur, et sans considération des joueurs mineurs (confidentialité, responsabilité coach/parent) ni distinction info d'équipe / contenu social.
Preuve dans le projet : joueur.html:968 (compteurs abonnés), 1487 (likes), 1475 (Suivre) ; feed mono-auteur @sylvainfrancisco ; pas de HoopFeed coach (inventaire 01).
Scénario utilisateur : Un joueur mineur voit une logique de popularité (likes/abonnés) au lieu d'un espace d'équipe sûr ; le coach n'a aucun canal pour diffuser une info.
Impact utilisateur : Motivation par popularité inadaptée, risques de confidentialité, feature sans utilité d'équipe claire.
Cause probable : Inspiration réseau social grand public.
Recommandation : Exiger de recentrer HoopFeed sur l'équipe (partage encadré, motivation non basée sur la popularité, séparation info coach / social, cadre mineurs). Ne pas concevoir le nouveau feed ici.
Fonctionnalités à préserver : L'idée d'un fil d'équipe motivant et les récaps de match.
Fichiers probablement concernés : joueur.html (#view-feed), futur espace coach.
Risque de régression : Faible (feature isolée).
Critères d'acceptation : Le rôle du feed est explicite ; aucune métrique de popularité imposée ; cadre adapté aux mineurs.
```

```text
Identifiant : UX-P1-008
Zone : États de chargement et d'erreur
Priorité : P1
Score actuel : 3/10 (feedback, confiance)
Problème actuel : L'hydratation API (effectif, profil, terrains) est silencieuse : ni squelette, ni message si l'API échoue (seulement console.info). Le coach ne sait pas si les données sont fraîches, en cours, ou en repli.
Preuve dans le projet : coach.html:2392 / joueur.html:1543 (`catch` → console.info uniquement) ; feedback visible seulement sur le formulaire bêta (index.html:735-753).
Scénario utilisateur : Connexion instable au gymnase : l'app affiche les données embarquées sans dire qu'elles ne sont pas à jour.
Impact utilisateur : Incertitude sur la fraîcheur/fiabilité, confiance érodée.
Cause probable : Repli conçu pour ne jamais « casser » visuellement.
Recommandation : Exiger des états chargement/erreur/hors-ligne visibles et cohérents sur toutes les zones hydratées.
Fonctionnalités à préserver : Le repli gracieux sur données embarquées.
Fichiers probablement concernés : coach.html, joueur.html.
Risque de régression : Faible.
Critères d'acceptation : Chaque zone hydratée montre un état pendant/à l'échec du chargement ; l'origine des données (live/repli) est signalée.
```

---

## 7. Problèmes P2 (améliorations)

```text
Identifiant : UX-P2-001
Zone : Feuille de match scénarisée
Priorité : P2
Score actuel : 5/10
Problème actuel : Le replay (#page-match, 9 actions en dur) n'a aucun lien avec la saisie live ni avec data.js, ce qui brouille la compréhension du parcours « saisir → consulter ».
Preuve dans le projet : coach.html:2000 (`matchActions` MOCK), déconnecté de #page-live.
Scénario utilisateur : Le coach saisit un match puis ouvre « Feuille de match » et n'y retrouve pas ses actions.
Impact utilisateur : Confusion sur ce qui est enregistré.
Cause probable : Écran de démonstration indépendant.
Recommandation : À terme, relier la feuille de match à la timeline réelle ; en attendant, clarifier son statut d'exemple.
Fonctionnalités à préserver : Le marqueur terrain + liste d'actions (bon patron d'affichage).
Fichiers probablement concernés : coach.html (#page-match).
Risque de régression : Faible.
Critères d'acceptation : Le lien (ou l'absence de lien) entre saisie et feuille est explicite.
```

```text
Identifiant : UX-P2-002
Zone : Cohérence des données (duplication)
Priorité : P2
Score actuel : 5/10
Problème actuel : Les matchs sont codés en dur dans coach.html (`coachMatches`) et joueur.html (`matches`) en plus de data.js, avec risque de divergence d'affichage entre pages.
Preuve dans le projet : coach.html:2231, joueur.html:1317, lib/data.js.
Impact utilisateur : Chiffres incohérents d'un écran à l'autre → doute.
Cause probable : Duplication assumée du prototype.
Recommandation : Converger vers une source unique consommée par les écrans (amélioration, pas réécriture).
Fichiers probablement concernés : coach.html, joueur.html, lib/data.js.
Risque de régression : Moyen (touche l'affichage multi-pages).
Critères d'acceptation : Un même match affiche les mêmes chiffres partout.
```

```text
Identifiant : UX-P2-003
Zone : Responsive tablette
Priorité : P2
Score actuel : 4/10
Problème actuel : Aucun breakpoint dédié à la zone 780–1024 px ; la tablette hérite d'un layout desktop condensé, sans optimisation pour un usage tactile fréquent chez les coachs.
Preuve dans le projet : breakpoints 1080/780 (coach), 1000/720 (joueur) — trou tablette (audit 00).
Impact utilisateur : Interface ni vraiment desktop ni mobile sur tablette (le support probable au bord du terrain).
Recommandation : Prévoir un palier tablette (cibles tactiles, colonnes). NB : l'absence de breakpoint ne prouve pas l'inutilisabilité — cf. §10.
Fichiers probablement concernés : CSS coach.html/joueur.html.
Risque de régression : Faible.
Critères d'acceptation : Sur 768–1024 px, cibles tactiles et lisibilité validées.
```

```text
Identifiant : UX-P2-004
Zone : Accessibilité (couleur, focus, labels)
Priorité : P2
Score actuel : 5/10
Problème actuel : Statuts distingués surtout par la couleur (victoire/défaite, marqué/manqué côté teamZones ; « hot » vs « work »), focus clavier non explicitement stylé, labels absents sur certains SVG interactifs et sur les champs.
Preuve dans le projet : couleurs `#40E8D5`/`#CE8B8B` (coach.html:2258) ; bon point : la carte live utilise une croix pour les manqués (court-analytics.js:232) ; aria-label présent sur quelques SVG seulement (coach.html:1066, 1477).
Impact utilisateur : Utilisateurs daltoniens / lecteurs d'écran / navigation clavier pénalisés.
Recommandation : Redondance forme+texte, focus visible, labels systématiques (améliorations ciblées).
Fichiers probablement concernés : coach.html, joueur.html, index.html.
Risque de régression : Faible.
Critères d'acceptation : Aucune information portée par la seule couleur ; focus visible ; contrôles labellisés.
```

```text
Identifiant : UX-P2-005
Zone : Entraînements & objectifs
Priorité : P2
Score actuel : 5/10
Problème actuel : Drills et objectifs sont figés (statuts done/todo, barres `data-w`), sans possibilité de cocher, mettre à jour ou dater une séance ; « Historique des séances » est absent.
Preuve dans le projet : joueur.html:1234 (zones/drills MOCK), 852 (objectifs statiques) ; historique absent (inventaire 01 §12).
Impact utilisateur : Section motivante mais sans boucle d'usage réelle.
Recommandation : À terme, rendre les objectifs suivables ; clarifier pour l'instant leur nature d'exemple.
Fichiers probablement concernés : joueur.html (#view-training).
Risque de régression : Faible.
Critères d'acceptation : L'utilisateur comprend si un objectif est réel/suivable ou illustratif.
```

```text
Identifiant : UX-P2-006
Zone : Récap pseudo-3D
Priorité : P2
Score actuel : 6/10
Problème actuel : Le rejeu enchaîne les paniers avec un timing fixe (~1 s), sans contrôle de vitesse ni pause, et positions de tir inventées ; agréable en démo, peu informatif comme analyse.
Preuve dans le projet : joueur.html:1425-1461 (setTimeout fixes) ; baskets illustratifs (joueur.html:1315).
Impact utilisateur : Perçu comme animation marketing plus que comme outil.
Recommandation : Clarifier son statut narratif ; contrôles de lecture optionnels ; ne pas présenter la pseudo-3D comme une capacité d'analyse.
Fichiers probablement concernés : joueur.html (modal récap).
Risque de régression : Faible.
Critères d'acceptation : L'utilisateur comprend qu'il s'agit d'un récap narratif, pas de données de tir mesurées.
```

```text
Identifiant : UX-P2-007
Zone : Promesse landing vs produit (et README)
Priorité : P2
Score actuel : 6/10
Problème actuel : La landing (et le README) survendent des capacités (« récaps 3D », données « réelles ») que le produit livre en pseudo-3D et en partie en démo ; le README évoque encore l'ancien club (Pôle France) alors que le produit affiche Žalgiris.
Preuve dans le projet : README (audit 00 §10, dette #6) ; « 3D » = transforms CSS (audit 00 §9).
Impact utilisateur : Écart attente/réalité → déception à l'usage.
Recommandation : Aligner le discours sur les capacités réelles (améliorer les libellés, pas les features).
Fichiers probablement concernés : index.html, README.md (doc).
Risque de régression : Faible.
Critères d'acceptation : Les promesses affichées correspondent au comportement réel.
```

---

## 8. Audit détaillé du match live

**Forces**
- Concept juste : terrain + feed d'actions + carte de tirs 2D **en direct** (coach.html:2174) — la bonne idée produit.
- Retour visuel immédiat par tir (dépôt de point animé, coach.html:2158) et feed anti-chronologique lisible.
- Fautes matérialisées par points (chip joueur), plafonnées à 5.
- La carte de tirs réutilise un vrai module (`court-analytics.js`), avec croix pour les manqués (lisible sans couleur).

**Problèmes**
- **Parcours coûteux** : joueur → zone → popup (au point de clic) → Marqué/Manqué (UX-P0-003).
- **Joueur actif peu saillant** (libellé texte seul, coach.html:2083) → risque de mauvaise attribution.
- **Cibles rapprochées** et popup potentiellement sous le doigt → erreurs de sélection.
- **Score adverse figé / pas de chrono réel** (UX-P1-003) → tableau de score non fonctionnel pour un vrai match.
- **Undo partiel** → divergence feed/carte/score (UX-P0-002).
- **Rotations inertes** + « Banc » mort (UX-P1-002) → pas de gestion réelle du 5 majeur.
- **Aucune persistance** → tout perdu au rechargement (UX-P0-001).
- **Actions rapides** (rebond/passe/interception…) n'alimentent que le feed, sans agrégation stat.

**Risques**
- Le coach fait **confiance** à un score/des stats **potentiellement faux** (après undo ou score adverse non tenu).
- **Perte de session** en plein match (veille écran, connexion).
- **Attention détournée du jeu** au moment le plus critique.

**Exigences minimales pour la future refonte** (ne pas maquetter ici)
1. Persistance de session + reprise après rechargement + **statut de sauvegarde visible**.
2. **Source de vérité unique** (timeline) d'où dérivent score, feed et carte ; undo qui défait l'événement complet.
3. Saisie **une main / gros doigts** : cibles ≥ 44 px, joueur actif dominant, ≤ 2 gestes par tir, popup jamais masqué.
4. **Deux scores éditables** + statut clair du temps (horloge réelle ou absence assumée).
5. Rotations réelles **ou** retrait des contrôles inertes en attendant.
6. Confirmation non intrusive après chaque action (le coach doit savoir « c'est enregistré » sans lire).

---

## 9. Audit détaillé de HoopFeed

**Forces**
- Rendu social **soigné et cohérent** avec le reste (cartes, médias décoratifs, jauges de profil).
- Micro-interactions agréables : like, double-clic « burst », ajout de commentaire fluide, échappement basique de `<` (anti-XSS naïf, joueur.html:1513).
- Les **récaps de match** rattachés au feed sont une bonne passerelle vers la valeur sportive.

**Problèmes**
- **Rôle flou** : ni journal d'équipe, ni messagerie, ni tableau d'annonces — un profil unique de vedette (mono-auteur @sylvainfrancisco).
- **Logique de réseau social généraliste** : abonnés (15,3k), abonnements, likes → **popularité** peu pertinente pour une équipe amateur.
- **Actions inertes** : « Message », « Partager » (UX-P1-002).
- **Pas de composition de publication** : on ne peut que commenter, pas publier.
- **Pas de HoopFeed côté coach** : aucun canal pour diffuser une info d'équipe.
- **Aucune persistance** (likes/commentaires perdus).
- **Aucune distinction** information d'équipe (convocation, horaire) vs contenu social.

**Risques**
- **Joueurs mineurs** exposés à une mécanique de popularité et à des interactions publiques ; **confidentialité** et **responsabilités** (coach/joueur/parent) non cadrées.
- Feature perçue comme **gadget** détournant de la valeur sportive.
- Confusion **démo/réel** (compteurs figés crédibles).

**Exigences minimales pour la future refonte** (ne pas concevoir ici)
1. **Définir le rôle** : journal d'équipe motivant, pas réseau social de popularité.
2. **Retirer/atténuer les métriques de popularité** imposées (abonnés/likes) au profit d'encouragements d'équipe.
3. **Cadre mineurs** : visibilité restreinte à l'équipe, modération coach, consentement parental.
4. **Séparer** info d'équipe (officielle) et contenu social.
5. Aucune **action visible sans effet** ; composition de contenu si le rôle le justifie.
6. Décider explicitement d'un **équivalent coach** (diffusion) ou de l'absence assumée.

---

## 10. Audit responsive

**Desktop** — Cible d'origine, la plus soignée : layouts larges, terrains et jauges à l'aise. Score le plus élevé. Peu de risques, mais ce n'est **pas** le contexte prioritaire du coach.

**Mobile (≤ 720–780 px)** — Base fluide (unités relatives, `max-width`), media queries présentes, mais **trois points durs** : tableaux larges (effectif/box score) qui débordent ou se compressent, terrain SVG dense, et surtout **saisie live à cibles rapprochées** peu tactile (UX-P1-005 / UX-P0-003). C'est le contexte le plus critique et l'un des moins aboutis.

**Tablette (≈ 768–1024 px)** — **Aucun breakpoint dédié** (trou entre 720/780 et 1000/1080). La tablette hérite donc d'un rendu proche du desktop condensé. **Important** : l'absence de breakpoint dédié **ne prouve pas** que la tablette est inutilisable — le layout fluide peut rester correct ; cela signale un **risque d'ergonomie tactile** (cibles, densité) à **vérifier en exécution**, pas un échec certain (UX-P2-003).

**Synthèse** : priorité mobile pour le live ; palier tablette à ajouter ; desktop déjà bon.

---

## 11. Audit accessibilité

- **Contraste** : thème sombre avec accents saturés (teal/orange) ; textes secondaires (`--t3/--t4`) potentiellement faibles sur fond sombre — **à mesurer** (non vérifié au ratio).
- **Taille du texte** : nombreux petits libellés (jauges, chips, légendes ~10–12 px) — risque de lisibilité en match/mobile.
- **Focus** : pas de style de focus clavier explicite repéré → navigation clavier peu visible.
- **Clavier** : interactions basées sur `click`/`dblclick` sur des `div`/`svg` (zones, média) → activation clavier probablement impossible pour la saisie live et le like par double-clic.
- **Cibles tactiles** : zones du terrain et popup potentiellement < 44 px (UX-P0-003).
- **Dépendance à la couleur** : statuts victoire/défaite et zones chaud/froid distingués surtout par couleur (UX-P2-004) — **bon contre-exemple** : la carte live différencie marqué (point) / manqué (croix).
- **Labels** : `aria-label` présents sur certains SVG (terrain coach.html:1066, radar :1477) mais pas systématiques ; champs de commentaire avec `placeholder` seul (pas de `<label>`).
- **États interactifs** : `aria-pressed` géré sur le switch néon (coach.html:2332) — bonne pratique isolée, à généraliser.
- **Animations** : nombreuses (jauges, récap, parallaxe) — **`prefers-reduced-motion: reduce` respecté sur les 3 pages** (bon point).
- **Lisibilité des graphiques** : jauges SVG lisibles ; heatmap froid→chaud à doubler d'une valeur chiffrée (déjà partiellement fait dans `renderSeasonCourt`).

**Priorité accessibilité** : P1 (focus/clavier/cibles/labels), P2 pour couleur/contraste.

---

## 12. Dix problèmes les plus importants

| # | Identifiant | Priorité | Zone | Raison du classement |
|--:|---|---|---|---|
| 1 | UX-P0-001 | P0 | Match live | Perte totale de la saisie au rechargement, sans avertissement — casse la tâche cœur et la confiance. |
| 2 | UX-P0-002 | P0 | Annulation | Undo partiel → score/stats faux présentés comme fiables. |
| 3 | UX-P0-003 | P0 | Saisie des tirs | Trop d'étapes/cibles fines → détourne du terrain, erreurs de saisie. |
| 4 | UX-P1-003 | P1 | Score/chrono | Score adverse figé + pas d'horloge → tableau live non fonctionnel. |
| 5 | UX-P1-001 | P1 | Navigation coach | Onglets ambigus + cul-de-sac → désorientation récurrente. |
| 6 | UX-P1-005 | P1 | Mobile | Contexte d'usage n°1 du coach, le moins abouti. |
| 7 | UX-P1-002 | P1 | Boutons inertes | Contrôles morts (Banc/Message/Partager) → confusion démo/réel. |
| 8 | UX-P1-004 | P1 | Confiance démo/réel | Stats mockées non signalées → décisions sur données fictives. |
| 9 | UX-P1-007 | P1 | HoopFeed | Modèle réseau social inadapté à une équipe amateur avec mineurs. |
| 10 | UX-P1-008 | P1 | Chargement/erreur | Hydratation silencieuse → doute sur la fraîcheur des données. |

---

## 13. Gains rapides (ne pas implémenter ici)

- **Désactiver visuellement** les boutons inertes (Banc, Message, Partager) ou les marquer « bientôt » (UX-P1-002).
- **Étiqueter « démo / exemple »** les blocs de données `demo:true` et scénarisés côté coach/joueur (UX-P1-004).
- **Rendre le joueur actif dominant** dans la saisie live (couleur/taille), au-delà du libellé texte (UX-P0-003).
- **Ajouter un micro-feedback « enregistré »** après chaque action live (toast/anim discrète) (UX-P0-001, partiel).
- **Fiabiliser l'état actif** des onglets coach (correspondance écran↔onglet) (UX-P1-001).
- **Afficher un squelette/mention de repli** quand l'API échoue (UX-P1-008).
- **Grossir les libellés critiques** du live (score, joueur actif, boutons Marqué/Manqué) pour la lecture mobile.
- **Doubler la couleur d'un signe** sur victoire/défaite et zones chaud/froid (UX-P2-004).
- **Aligner les libellés** landing/README sur les capacités réelles (« récap animé » plutôt que « 3D ») (UX-P2-007).

*Aucun de ces gains ne modifie la logique métier.*

---

## 14. Fonctionnalités à préserver

- **La lecture par zones du terrain** (landing/coach/joueur) et le module `court-analytics.js` (heatmap, carte de tirs, croix pour manqués) — direction produit forte et réutilisable.
- **La carte de tirs 2D en direct** pendant la saisie live (bon concept, à fiabiliser).
- **Le feed d'actions live** anticronologique et le retour visuel par tir.
- **Les récaps de match** (narratif) comme passerelle vers la valeur sportive.
- **Le langage visuel commun** coach/joueur (cartes, jauges, thème) — cohérent.
- **Le repli gracieux** sur données embarquées quand l'API est absente (à rendre visible).
- **`prefers-reduced-motion`** déjà respecté.
- **Le lien point chaud → drills** (Training Hub) comme logique produit.

---

## 15. Risques de régression (zones fragiles pour une refonte)

- **État partagé du live** (score + feed + `liveTimeline` + carte 2D) : trois sous-états couplés — toute refonte de l'un peut casser les autres (UX-P0-002).
- **`goto()` + `tabMap`** : la navigation par affichage/masquage de `.page` est fragile ; changer la structure d'onglets peut désynchroniser l'état actif.
- **Hydratation API** : le tbody de l'effectif est reconstruit en innerHTML avec ré-attachement d'écouteurs (coach.html:2377-2389) — sensible aux changements de markup.
- **Duplication de données** (coach.html/joueur.html/data.js) : modifier un chiffre à un seul endroit laisse les autres obsolètes (UX-P2-002).
- **Fichiers monolithiques** (coach.html ~2 340 lignes, style+markup+JS mêlés) : forte surface de régression à chaque édition.
- **Dépendance au format `match-events` répliqué à la main** dans le live : si le module réel est un jour branché, les deux formats doivent rester alignés.

---

## 16. Principes UX obligatoires pour la suite

1. **Une action/information principale par écran** (hiérarchie explicite, divulgation progressive).
2. **Mobile-first pour le match live** (pouce, une main, gros doigts, lecture à distance).
3. **Feedback immédiat et non intrusif** après chaque action critique (« c'est enregistré »).
4. **Aucune fonction critique uniquement décorative** : ce qui est cliquable agit, sinon c'est désactivé/masqué.
5. **Persistance et statut clairement communiqués** (jamais de perte silencieuse).
6. **Source de vérité unique** pour les données d'un match (score/feed/carte dérivés).
7. **Honnêteté démo/réel** : toute donnée non mesurée est signalée.
8. **Distinguer les rôles** coach / joueur / (parent) et cadrer les mineurs.
9. **Accessibilité par défaut** : forme + couleur, focus visible, cibles ≥ 44 px, labels.
10. **Réduire les étapes** des tâches fréquentes avant d'ajouter des fonctions.

---

## 17. Limites de l'audit

- **Aucune exécution mesurée** : pas de rendu réel testé en navigateur, pas de mesure de **contraste**, de **taille de cible en px**, ni de **comportement responsif** réel (mobile/tablette). Les constats correspondants sont **inférés** de la structure, des `@media` et du code.
- **Pas de test clavier / lecteur d'écran** réel : les points d'accessibilité sont des **hypothèses fondées sur le code**, à valider en exécution.
- **Pas de test terrain** avec un vrai coach (le jugement « usage en gymnase » est un raisonnement, pas une observation).
- **Parité prod non vérifiée** : audit sur PR4.5 local ; le déploiement `hoopboardbeta.vercel.app` n'a pas été comparé.
- **HoopFeed / mineurs / confidentialité** : analyse UX et produit, **pas** un avis juridique.
- Les scores /10 sont des **jugements experts** destinés à prioriser, non des mesures.

---

*Fin de l'audit UX. Aucune modification apportée aux fichiers applicatifs.*
