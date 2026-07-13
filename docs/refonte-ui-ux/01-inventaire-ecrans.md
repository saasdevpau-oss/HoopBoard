# HoopBoard — Inventaire des écrans, modules et fonctionnalités

> Suite de [`00-audit-technique.md`](00-audit-technique.md). Ce document inventorie **ce qui est réellement présent et opérationnel** dans la version actuelle, écran par écran.
> Clone audité : `HOOPBoard serieux/Stack claude/HoopBoard`, branche `refactor/pr3.1-button-system`, HEAD **`ad0af1d` (PR4.5)**.
> Fichiers inspectés en profondeur : `index.html` (JS 682-756), `coach.html` (JS 1984-2401), `joueur.html` (JS 1210-1555 + markup HoopFeed/profil/objectifs), `assets/court-analytics.js` (intégral), `lib/match-events.js` (intégral), `lib/data.js`, `api/*.js`.
> Vérifié : le dossier `maquettes/` (cité par `.vercelignore`) **n'existe pas** dans ce clone.
> Aucun fichier applicatif n'a été modifié.

## Légende des classifications

| Code | Signification |
|---|---|
| **INT** | `Implémentée et interactive` (réagit à l'utilisateur, effet visible) |
| **CLIENT** | `Implémentée mais uniquement côté client` (fonctionne mais rien n'est persisté / pas de vrai backend) |
| **STATIC** | `Démo visuelle statique` (affichage figé, aucune interaction réelle) |
| **MOCK** | `Donnée mockée` (valeurs en dur dans le code, non issues d'une vraie source) |
| **DEMO** | `Donnée explicitement marquée demo` (`demo: true` dans `data.js`) |
| **FONDATION** | `Fondation technique non branchée` (code prêt mais non utilisé) |
| **ABSENTE** | `Absente` |
| **INCERTAINE** | `Incertaine` |

> Rappel : une section **visible** n'est pas une fonctionnalité **opérationnelle**. La quasi-totalité des « données réelles » est **codée en dur** dans le HTML et/ou `lib/data.js` ; aucune donnée n'est écrite ni relue durablement.

---

## Tableau principal

| Zone | Fichier ou section | Utilisateur | Fonction visible | Niveau réel d'implémentation | Source des données | Interactions disponibles | Problème principal | Risque de régression |
|---|---|---|---|---|---|---|---|---|
| Landing | `index.html` | Public | Présentation + CTA | STATIC + INT (terrain démo) | MOCK (`demoZones` 686) | Clic zones, néon, parallaxe souris | Marketing figé | Faible |
| Formulaire bêta | `index.html:729` `#betaForm` | Public | Inscription | CLIENT (fetch réel, **non persisté**) | POST `/api/beta` | Saisie + envoi + états | Inscriptions perdues (`api/beta.js`) | Moyen |
| Navigation inter-pages | `index.html` `href="/coach"`,`/joueur` | Tous | Accès espaces | INT | — | Liens | Aucun retour ni lien croisé | Faible |
| Navigation intra-page (coach) | `coach.html` `goto()` 1986 | Coach | Onglets 7 sections | INT (client) | DOM | Clic onglets/boutons profonds | 1 seul fichier monolithique | Moyen |
| Navigation intra-page (joueur) | `joueur.html` `.ptab` 1214 | Joueur | 3 vues animées | INT (client) | DOM | Clic onglets | — | Faible |
| Dashboard coach | `coach.html#page-dashboard` | Coach | KPI/pills | CLIENT (2 pills hydratées) | `/api/players`+`/api/club` (sinon MOCK) | Boutons `data-goto` | Reste du dashboard figé | Faible |
| Game Center coach | `coach.html#page-gamecenter` | Coach | Cartes matchs + compte à rebours | MOCK + INT (jauges/rebours) | `coachMatches` 2231 (en dur) | Clic « Feuille de match » | Dupliqué de `data.js` | Moyen |
| Terrain central « 3D » coach | `coach.html#fullCourt` `showTeamZone` 2306 | Coach | Terrain zones + conseils | INT (client) / MOCK | `teamZones` 2292 (en dur) | Clic zone, néon, parallaxe | Pseudo-3D CSS, données inventées | Moyen |
| Terrain analytics saison (2D) | `coach.html#seasonCourt` via `court-analytics.js` | Coach | Heatmap % par zone | CLIENT + DEMO | `/api/club` → `zonesTir` (`demo:true`) | — (rendu seul) | Données démo | Faible |
| Feuille de match (replay) | `coach.html#page-match` `matchActions` 2000 | Coach | Liste d'actions + marqueur terrain | STATIC + INT (sélection) | MOCK (9 actions en dur) | Clic action → marqueur | Replay scénarisé, non relié au live | Moyen |
| **Match live (saisie)** | `coach.html#page-live` | Coach | Saisie tirs/actions temps réel | CLIENT (in-memory) | MOCK (`players` 2053) | Sélection joueur, zone, +/–, undo, faute, actions | **Rien ne survit au rechargement** | Élevé |
| Score live | `coach.html#scoreHome` 1656 | Coach | Score domicile | INT (client) | Départ `66` en dur ; `scoreAway=40` figé | +2/+3 sur panier, undo | Score adverse non éditable | Moyen |
| Chronomètre | `coach.html` `cdState` 2214 / `joueur.html` `cd` 1298 | Tous | Compte à rebours | INT (client) | MOCK (J-2 07:42:18) | Aucune (auto) | **Décompte vers le prochain match, pas d'horloge de jeu** | Moyen |
| Rotations | `coach.html:1601` timeline + `Banc` 2087 | Coach | Alternance terrain/banc | STATIC | MOCK | Bouton « Banc » **inerte** | Aucune substitution réelle | Élevé |
| Statistiques d'équipe | `data.js` `matchHapoel.totauxEquipe` | Coach | Totaux match | MOCK (réel revendiqué) | `data.js` | — | Un seul match couvert | Faible |
| Statistiques individuelles | `data.js` `matchHapoel.joueurs` / `statsSaison` | Tous | Lignes joueurs | MOCK réel (match) + **DEMO** (saison) | `data.js` | — | Colonnes saison `demo:true` | Moyen |
| Effectif | `coach.html#page-effectif` (hydraté 2372) | Coach | Tableau roster | CLIENT + DEMO | `/api/players` (← `statsSaison demo`) | Clic « Fiche » | Moyennes saison démo | Moyen |
| Fiche joueur (coach) | `coach.html#page-joueur` | Coach | Profil détaillé + radar | STATIC | MOCK | Navigation | Radar figé | Faible |
| Cartes de tirs | live 2D + recap + `playerCourt` | Tous | Points sur terrain | CLIENT (live) / MOCK (recap) / FONDATION (joueur) | `liveTimeline` / `matches[].baskets` / vide | Générées à la saisie live | Positions illustratives | Moyen |
| Analyses du terrain | `court-analytics.js` `renderSeasonCourt/renderLiveCourt` | Tous | Rendu SVG zones/tirs | CLIENT (module réel) | `zonesTir` (demo) / timeline live | — | Alimenté par données démo | Faible |
| Training Hub / entraînements | `joueur.html#view-training` `zones` 1234 | Joueur | Drills par zone | INT (client) / MOCK | MOCK (drills en dur) | Clic zone → liste drills | Aucun suivi persistant | Moyen |
| Objectifs | `joueur.html:852` « Objectifs de la semaine » | Joueur | Barres de progression | STATIC | MOCK (`data-w`/`data-target`) | Aucune (animation seule) | Valeurs figées | Faible |
| Historique des séances | — | Joueur | — | **ABSENTE** | — | — | Aucun historique daté d'entraînements | — |
| Récap pseudo-3D | `joueur.html` `playRecap` 1425 | Joueur | Rejeu animé des paniers | INT (client) / MOCK | `matches[].baskets` (illustratif) | Ouvrir, rejouer, fermer | Positions inventées | Faible |
| HoopFeed | `joueur.html#view-feed` | Joueur | Fil social | CLIENT (like/commentaire) / STATIC | MOCK (3 posts en dur) | Like, dbl-clic, commentaire, suivre | Aucune persistance | Moyen |
| Publications | `joueur.html:1002+` `.post` | Joueur | 3 posts vedette | STATIC | MOCK | — (contenu figé) | Pas de composition de post | Faible |
| Commentaires | `joueur.html` `addComment` 1508 | Joueur | Ajout commentaire | CLIENT | MOCK (2 commentaires pré-remplis) | Saisie + Publier + Enter | Perdu au rechargement | Faible |
| Likes / réactions | `joueur.html` `setLiked` 1487 | Joueur | Cœur + compteur | CLIENT | MOCK (`data-count`) | Clic + dbl-clic média | Non persisté | Faible |
| Profil social | `joueur.html:951` `.profile-card` | Joueur | Carte profil + compteurs | STATIC + CLIENT (suivre) | MOCK (15,3k abonnés…) | « Suivre » (toggle) ; « Message » **inerte** | Compteurs figés | Faible |
| Partage | `joueur.html` `.pa-share` | Joueur | Bouton partager | STATIC (**inerte**) | — | Aucune | Bouton sans handler | Faible |
| Appels API | `api/*.js` | — | 6 endpoints serverless | CLIENT (3 appelés) / FONDATION (3 non appelés) | `lib/data.js` | fetch club/players/beta | `matches`,`events`,`health` non consommés par le front | Moyen |
| Collecte d'événements | `coach.html` `liveTimeline` 2173 | Coach | Timeline de tirs | CLIENT (in-memory) | format `match-events` répliqué à la main | Alimentée à la saisie | Non persistée, module source non utilisé | Élevé |
| Moteur d'événements | `lib/match-events.js` | — | 15 types + agrégation | **FONDATION** | — | — | **Fichier jamais importé** | — |
| Responsive desktop | 3 pages | Tous | Layout large | INT | CSS | — | — | Faible |
| Responsive mobile | media `≤780/720px` | Tous | Adaptation | INT (partielle) | CSS | — | Tableaux larges + terrain SVG à vérifier | Moyen |
| Responsive tablette | — | Tous | — | **ABSENTE** (pas de breakpoint dédié) | — | — | Zone intermédiaire non ciblée | Moyen |
| État de chargement | `index.html` beta « en cours… » | Public | Feedback envoi | INT (1 seul endroit) | — | — | Hydratation API **silencieuse** ailleurs | Moyen |
| État d'erreur | `index.html:751` beta | Public | Message d'échec | INT (1 seul endroit) | — | — | Aucun état d'erreur visible côté coach/joueur | Moyen |
| État vide | `coach.html:2099` feed live vide | Coach | « Aucune action enregistrée » | INT | — | — | Rare ailleurs | Faible |

---

## Analyse détaillée par zone

### 1. Landing (`index.html`)
- **Emplacement / objectif** : page d'accueil marketing + capture d'e-mails bêta.
- **Composants** : hero, sections de présentation, terrain « 3D » démo (`#fullCourt`), formulaire bêta.
- **Données** : `demoZones` (`index.html:686`, en dur, **MOCK**). Le commentaire `index.html:684` précise que les splits de tir ne sont pas publiés par le feed → valeurs de démonstration.
- **Événements JS** : clic `.fzone` (détail zone), `#neonSwitch` (bascule lignes néon), `mousemove/mouseleave` sur `#fcStage` (parallaxe), `submit #betaForm`.
- **Appels API** : `POST /api/beta` (`index.html:737`).
- **Persistance** : **aucune** — `api/beta.js` valide l'e-mail, journalise (`console.log`) et répond 201 ; commentaire du fichier : « à brancher sur KV/Postgres ».
- **Interactions fonctionnelles** : terrain démo, néon, parallaxe, envoi de formulaire (avec états chargement/erreur/offline).
- **Interactions simulées** : la « réussite » d'inscription (message de confirmation sans enregistrement).
- **Éléments dupliqués** : le bloc terrain 3D (`fullCourt`, néon, parallaxe) est **repris à l'identique** dans `coach.html` (`showTeamZone`/parallaxe 2336).
- **Responsive** : `@media(max-width:1000px)`.
- **Accessibilité** : `aria-pressed` sur le switch néon ; `prefers-reduced-motion` géré.
- **Dépendances** : `/api/beta` (dégradation propre si absent).
- **Limites** : données figées, aucune vraie inscription conservée.
- **À préserver** : le terrain interactif signature et le parcours d'inscription (UX du CTA).

### 2. Navigation générale
- **Inter-pages** : uniquement depuis la landing (`/coach`, `/joueur`). **Aucun lien retour, aucun passage coach↔joueur** → cul-de-sac (déjà noté dans l'audit §10).
- **Intra-page coach** : `goto(id)` (`coach.html:1986`) masque/affiche les `.page`, met à jour l'onglet actif via `tabMap` (plusieurs sections partagent un même onglet : `effectif`, `joueur`, `match` → onglet « Effectif »). Interactif, sans URL/historique (pas de deep-link, pas de bouton précédent natif utile).
- **Intra-page joueur** : `.ptab` avec animation directionnelle `enter-left/right` (`joueur.html:1214`).
- **Limites** : navigation non adressable (pas de routes internes réelles) ; refonte devra décider SPA routée vs MPA.

### 3. Espace coach (`coach.html`) — vue d'ensemble
7 sections (`#page-dashboard/gamecenter/effectif/joueur/match/live/training`). Tout est **dans un seul fichier** (~2 340 lignes, style + markup + JS). Hydratation API partielle au chargement (`hydrateFromAPI` 2353). Aucune notion d'utilisateur/rôle : la page est accessible librement.

### 4. Dashboard coach
- Deux « pills » (nombre de joueurs, nombre de matchs) **hydratées** depuis `/api/players` et `/api/club` (`coach.html:2367`), sinon valeurs HTML par défaut.
- Reste (cartes, citations) figé. Interactions = boutons `data-goto`.

### 5. Game Center coach
- **Compte à rebours** vivant (`setInterval` 2222) — décrémente réellement mais part d'une valeur **MOCK** (J-2). Ce n'est **pas** une horloge de match.
- **Cartes de matchs** générées depuis `coachMatches` (`coach.html:2231`, en dur, **duplique** `data.js`). Jauges FG% animées (`animateCoachGauges`).
- **Terrain central « 3D »** (`#fullCourt`) : zones `.fzone` cliquables → `showTeamZone` (`teamZones` 2292, **MOCK** ; commentaire 2290 : valeurs de démonstration). Effets néon + parallaxe (pseudo-3D CSS, pas de WebGL).
- **Terrain analytics saison 2D** (`#seasonCourt`) rendu par `court-analytics.js` (`renderSeasonCourt`), alimenté par `zonesTir` de `/api/club` — **`demo:true`** (mention « données démo » dessinée dans le SVG, `court-analytics.js:174`).
- **À préserver** : la lecture par zones + conseils, et le terrain analytics 2D (vrai module réutilisable).

### 6. Feuille de match / replay (`#page-match`)
- Liste de 9 actions (`matchActions` 2000, **MOCK**) ; clic sur une action positionne un marqueur sur le terrain (`selectAction` 2035) et remplit un encart d'info. **Purement scénarisé** : sans lien avec la saisie live ni avec `data.js`.

### 7. Match live — voir la section dédiée plus bas.

### 8. Effectif (`#page-effectif`)
- Tableau reconstruit à l'hydratation depuis `/api/players` (`coach.html:2372`), qui renvoie `statsSaison` (**`demo:true`**) fusionné au roster. Mise en évidence des maxima (pts/reb/pd). Bouton « Fiche » → section joueur.
- Sans API : tableau HTML statique de repli.

### 9. Fiche joueur coach (`#page-joueur`)
- Profil détaillé + radar d'aptitudes SVG (`coach.html:1477`), **statique**. Pas d'hydratation dédiée ici.

### 10. Statistiques (équipe / individuelles)
- **Équipe** : `matchHapoel.totauxEquipe` (un seul match, réel revendiqué EuroLeague).
- **Individuelles** : ligne de match réelle (`matchHapoel.joueurs`) ; moyennes saison **`statsSaison demo:true`** ; cœur de la vedette (pts/reb/pd/eva) réel (`joueurVedette.moyennesTournoi`).
- **Limite** : couverture d'un seul match détaillé ; le reste est agrégé/mocké.

### 11. Cartes de tirs & analyses de terrain
- **Live 2D** (coach) : `renderLiveCourt` alimenté par `shotsFromTimeline(liveTimeline)` — **réel côté client**, se remplit à chaque tir saisi.
- **Saison 2D** (coach + joueur) : `renderSeasonCourt` — **DEMO** (coach) / **vide/FONDATION** (joueur `#playerCourt`, `joueur.html:1552`, zones non exposées par l'API).
- **Recap** (joueur) : positions `matches[].baskets` **illustratives** (commentaire `joueur.html:1315`).
- **Module** `court-analytics.js` : autonome, sans dépendance, pur SVG ; heatmap froid→chaud, jitter déterministe, croix pour les manqués (lisible sans couleur = bon point accessibilité). **Réellement branché** (le TODO en tête de fichier est partiellement obsolète depuis PR4.5).

### 12. Training Hub / entraînements (`joueur.html#view-training`)
- **Zones** (`zones` 1234, **MOCK**) → clic `.izone` → `showZone` affiche des drills (fait/à faire, scores en dur).
- **Objectifs de la semaine** (`joueur.html:852`) : 4 barres de progression animées (`goal-fill`, `data-w`), **STATIC**.
- **Historique des séances** : **ABSENTE** (aucune liste datée de séances passées ; seuls des statuts done/todo figés).
- **À préserver** : la logique « point chaud → drills prioritaires » (lien terrain ↔ entraînement).

### 13. Game Center joueur (`#view-games`)
- Cartes de matchs (`matches` 1317, **MOCK**, duplique `data.js`/`coachMatches`), jauges ÉVA animées. Bouton « Voir le récap » ouvre la modale pseudo-3D.
- **Sous-titre** annonce « ton prochain rendez-vous et ton historique » (`joueur.html:884`) — historique = liste de matchs figée.

### 14. Récap pseudo-3D (modale)
- `playRecap(i)` (`joueur.html:1425`) rejoue les paniers un par un via `setTimeout` (≈1 s d'écart), pose des « spots » sur un terrain incliné en CSS, met à jour label/détail/temps et des points de progression. Rejouable, fermable (clic overlay / croix). **INT côté client, données MOCK**.

### 15. HoopFeed — voir la section dédiée plus bas.

### 16. Appels API & collecte d'événements
- **Consommés par le front** : `/api/club`, `/api/players`, `/api/players?id=sylvain-francisco`. Tous lisent `lib/data.js`.
- **Non consommés par le front** : `/api/health`, `/api/matches`, `/api/events` (existent mais aucun fetch ne les appelle).
- **`/api/events`** : accepte un événement, le normalise et le renvoie — **ne stocke rien**. Le front live n'y fait d'ailleurs pas appel : il construit `liveTimeline` **en mémoire** au format `match-events` (`coach.html:2180`).
- **`lib/match-events.js`** : moteur complet (types figés, `makeEvent`, `createMatchTimeline`, `eventsFromBoxScoreLine`, `timelineFromBoxScore`, `aggregateStats`) exporté en **CommonJS uniquement** (`module.exports`) → **jamais chargé par une page ni requis par une fonction API** = FONDATION pure.

### 17. Responsive & états
- **Breakpoints** : coach `1080/780px`, joueur `1000/720px`, index `1000px`. Approche « même DOM adapté par CSS ». **Pas de breakpoint tablette dédié** (zone 780–1024 px peu ciblée).
- **`prefers-reduced-motion`** géré sur les 3 pages.
- **États** : chargement + erreur **seulement** sur le formulaire bêta ; état **vide** sur le feed live (« Aucune action enregistrée »). L'hydratation API coach/joueur est **silencieuse** (pas de skeleton, pas de message d'erreur visible — seulement `console.info`).

---

## Focus — Match live (`coach.html#page-live`)

- **Sélection du joueur** : bande de 5 « chips » (`players` 2053, **MOCK** : Francisco, Williams-Goss, Wright, Lô, Tubelis). Clic → `selected = i`, re-render, mise à jour du label terrain (`selectedPlayerLabel`). Un bouton « **Banc** » est affiché **mais n'a aucun gestionnaire** → **substitution non fonctionnelle**.
- **Sélection d'un tir / zones du terrain** : clic sur une `.zone` du terrain (`coach.html:2120`) → ouverture d'un **popup** aux coordonnées du clic ; `pendingZone = { pts, name, x, y }` où `pts` vient de `data-pts` et `name` de `data-zone`.
- **Ajout des points** : boutons `#btnMake` / `#btnMiss`. `Make` : `scoreHome += pendingZone.pts`, dépose un point coloré (`dropMarker`), enregistre l'événement, pousse au feed. `Miss` : dépose un point gris + feed, **sans** modifier le score.
- **Enregistrement des événements** : `recordShot(made, zone)` (`coach.html:2180`) pousse dans `liveTimeline.events` un objet **au format `match-events`** (`SHOT_MADE`/`SHOT_MISSED`, `player`, `points`, `meta.zone`) puis appelle `renderLiveCourt` → carte 2D live mise à jour en direct.
- **Actions rapides** : `.qa-btn` (rebond off/déf, passe, interception, contre, perte de balle) → `pushFeed('neutral', …)` **uniquement** (aucune stat agrégée). `#btnFoul` incrémente les fautes du joueur (max 5) + feed.
- **Annulation** : `#undoBtn` (`coach.html:2202`) retire le **dernier élément du feed** et, si c'était un panier, retranche les points. **Limite majeure** : l'undo **ne retire pas** le tir de `liveTimeline` ni le point déposé sur le terrain (`dropMarker`) → la carte 2D live et le score peuvent **diverger** du feed après annulation.
- **Historique** : le `feed` (in-memory) fait office d'historique de la session ; ordre anti-chronologique à l'affichage.
- **Rotations** : une timeline « alternance terrain/banc par quart-temps » (`coach.html:1601`) est **STATIC** ; aucune rotation réelle, le bouton banc est inerte.
- **Score & chrono** : `scoreHome` part de **66** (en dur), `scoreAway` **40 figé** (non éditable) ; **pas d'horloge de jeu** (le seul chrono est un décompte MOCK vers le prochain match). Les temps du feed sont codés `'03:27'`.
- **Survie au rechargement** : **NON** — tout est en mémoire (`feed`, `liveTimeline`, `scoreHome`, fautes). Un F5 réinitialise tout.
- **`match-events.js` utilisé ou préparé** : **seulement préparé.** Le format est **répliqué à la main** dans la page ; le module n'est pas importé.
- **Réel vs décoratif** : *réel (client)* = sélection joueur/zone, +2/+3, dépôt de points, feed, carte 2D live, fautes, undo (partiel). *Décoratif / mock* = liste de joueurs figée, score adverse, chrono, rotations, actions rapides (sans agrégation), temps du feed.

---

## Focus — HoopFeed (`joueur.html#view-feed`)

- **Structure d'une publication** (`joueur.html:1002+`, 3 posts en dur) : en-tête (`post-head`) → média (`post-media`) → carrousel de stats → actions (`post-actions`) → légende (`post-caption`) → commentaires (`post-comments`) → champ de commentaire.
- **Auteur** : **toujours `@sylvainfrancisco`** (les 3 posts). C'est le **fil du joueur vedette**, pas un fil multi-utilisateurs.
- **Texte** : légende en dur avec hashtags colorés (ex. `#Zalgiris #EuroLeague`).
- **Image / média** : **pas de vraie image ni vidéo** — chaque média est une **scène SVG/CSS décorative** (mini-terrain + score + tag « Masterclass »).
- **Likes** : `setLiked` (`joueur.html:1487`) bascule le cœur et le compteur (départ `data-count`, ex. 214). Double-clic sur le média → like + animation « burst ». **Client only, non persisté.**
- **Commentaires** : 2 commentaires pré-remplis en dur par post ; `addComment` (`joueur.html:1508`) ajoute `<b>moi</b> …` (échappe `<` — anti-XSS basique). Validation par bouton « Publier » ou touche Entrée. **Non persisté.**
- **Bouton de publication** : **aucune composition de nouveau post** (pas de zone de rédaction de publication ; seulement des commentaires). Bouton **« Message »** du profil = **inerte**. Bouton **partage** (`.pa-share`) = **inerte**.
- **Profils** : carte profil (`joueur.html:951`) — avatar, badges (poste, taille, pays), moyennes, jauges (TIRS/LF/ÉVA) hydratées via `/api/players?id=sylvain-francisco` (`joueur.html:1526`).
- **Abonnés / abonnements** : compteurs **en dur** (`Posts 12`, `Abonnés 15,3k`, `Suivis 183`). Bouton **« Suivre »** = toggle de libellé/opacité (`Suivre`↔`Abonné`), **client only**.
- **Filtres** : **ABSENTS.**
- **Données réelles ou figées** : figées (MOCK), sauf les 4 moyennes cœur de la vedette hydratées depuis l'API.
- **Interactions fonctionnelles** : like, double-clic, commentaire, suivre.
- **Persistance** : **aucune.**
- **Différences coach vs joueur** : **HoopFeed n'existe que côté joueur.** L'espace coach n'a aucun fil social (son seul « feed » est la liste d'actions du match live, sans rapport). Réciproquement, le joueur n'a ni saisie live, ni effectif, ni dashboard d'équipe.

---

## Vérifications finales

1. **`git status`** : voir la sortie ci-dessous — seul `docs/01-inventaire-ecrans.md` est ajouté (avec le `docs/00-audit-technique.md` déjà présent du premier audit).
2. **Aucun fichier applicatif modifié** (HTML/CSS/JS/API intacts).
3. **Cohérence clone** : document produit sur le clone **PR4.5 `ad0af1d`** (`refactor/pr3.1-button-system`), le même que le premier audit — vérifié via `git log` et la présence de `assets/court-analytics.js` + `lib/match-events.js`.

## Correction factuelle à signaler pour `00-audit-technique.md` (non appliquée)
- Aucune erreur factuelle relevée dans `00-audit-technique.md`. Une **précision** mérite d'y être ajoutée ultérieurement (sans que ce soit une correction) : le TODO en tête de `court-analytics.js` (lignes 296-307) est **partiellement obsolète** — `renderSeasonCourt` est désormais **bien branché** dans `coach.html` (PR4.5), contrairement à ce que suggère ce commentaire. Ceci n'affecte pas les conclusions du document 00.

*Fin de l'inventaire. Aucune modification apportée aux fichiers applicatifs.*
