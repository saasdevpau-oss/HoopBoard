# HoopBoard — Audit technique (cartographie)

> Document de cartographie technique préalable à la refonte UI/UX.
> Portée : le dépôt `saasdevpau-oss/HoopBoard`, branche `refactor/pr3.1-button-system` (HEAD `ad0af1d` — *PR4.5 Court analytics integration*).
> Aucun fichier applicatif n'a été modifié pour produire ce document.
> Convention de lecture : **RÉEL** = présent et fonctionnel · **MOCK** = donnée de démonstration explicite (`demo: true`) · **INCOMPLET** = fondation posée mais non branchée · **ABSENT** = attendu d'un SaaS mais introuvable.

---

## 1. Résumé de la stack

| Domaine | Constat | Preuve |
|---|---|---|
| **Type de projet** | Site **statique multi-pages** (MPA), pas d'application à framework. Chaque page est un fichier HTML autonome. | `index.html`, `coach.html`, `joueur.html` à la racine |
| **Framework front** | **Aucun** (pas de React/Vue/Next/Svelte). HTML + CSS + JS vanilla. | Aucun `node_modules`, pas de bundler, pas de dépendance dans `package.json` |
| **Langage** | HTML5, CSS3, **JavaScript vanilla** (ES2017+, `async/await`) côté client ; **Node.js** (CommonJS `require`/`module.exports`) côté serverless | `assets/court-analytics.js`, `lib/*.js`, `api/*.js` |
| **Build / tooling** | **Aucun build**. Pas de TypeScript, ESLint, PostCSS, bundler. `package.json` ne déclare aucune dépendance, seulement des scripts `vercel`. | `package.json` (scripts `dev`/`deploy` uniquement) |
| **Système de styles** | **CSS pur inline** dans un unique `<style>` par page, piloté par **variables CSS (design tokens)** issues de PR2/PR3. Pas de Tailwind, pas de CSS Modules, pas de Sass. | `<style>` unique + tokens `--void`, `--orange`, `--radius`, `--t1..t4`… ; 124 `style="..."` inline dans `coach.html` |
| **Bibliothèques UI** | **Aucune** (pas de Bootstrap/MUI/shadcn). Composants faits main. | Aucun `<link>`/`<script src>` externe |
| **Icônes** | **SVG inline** dessinés à la main (paths). Pas de librairie d'icônes. | ~57 `<svg>` dans `coach.html`, 33 dans `joueur.html`, 18 dans `index.html` |
| **Graphiques** | **SVG fait main** (radar d'aptitudes, barres, terrains analytics). Aucune lib de charting. | `<svg … aria-label="Radar des aptitudes">` `coach.html:1477` ; `assets/court-analytics.js` |
| **3D** | **Pas de vraie 3D** (ni Three.js, ni WebGL, ni `<canvas>`). Effet « 3D » = **transforms CSS** (`perspective`, `rotateX/Y`, `preserve-3d`) animés en JS. | `transform-style:preserve-3d` + `perspective` dans `joueur.html` ; `requestAnimationFrame` (5–6 occurrences/page) |
| **Gestion de l'état** | **DOM comme état.** Navigation par affichage/masquage de sections (`.page.active`), pas de store. Pas de `localStorage`/`sessionStorage`. | `goto()` + `data-goto` (`coach.html`), `data-view` (`joueur.html`) |
| **Hébergement** | **Vercel** — statique + fonctions serverless dans `api/`. `cleanUrls`, cache CDN sur `/api/*`. | `vercel.json`, `.vercel/` |
| **Polices** | **Auto-hébergées** en base64 (woff2 embarqué dans le CSS). Zéro requête externe. | `@font-face … url(data:font/woff2;base64,…)` |

**Synthèse :** HoopBoard n'est pas (encore) un SaaS applicatif, c'est une **démo statique haute-fidélité** de 3 pages, hydratée optionnellement par 6 fonctions serverless lisant un jeu de données unique. Zéro dépendance runtime.

---

## 2. Arbre simplifié des dossiers utiles

```
HoopBoard/
├── index.html          # Landing + formulaire bêta          (~84 KB, 757 l.)
├── coach.html          # Espace coach (7 sections/onglets)   (~180 KB, 2342 l.)
├── joueur.html         # Espace joueur (3 vues)              (~124 KB, 1537 l.)
├── api/                # Fonctions serverless Vercel
│   ├── health.js       #   GET  état du service
│   ├── club.js         #   GET  club + tournoi + zonesTir
│   ├── matches.js      #   GET  liste/détail matchs (box score sur ?id=hapoel)
│   ├── players.js      #   GET  effectif / fiche joueur
│   ├── beta.js         #   POST inscription bêta (non persistée)
│   └── events.js       #   POST saisie live (echo normalisé, non persistée)
├── lib/
│   ├── data.js         # SOURCE DE DONNÉES UNIQUE (Žalgiris/EuroLeague)
│   ├── http.js         # utilitaires réponse/CORS/slug
│   └── match-events.js # moteur d'événements — FONDATION non branchée (PR4.2)
├── assets/
│   └── court-analytics.js  # rendu SVG des terrains 2D (PR4.4/4.5)
├── package.json        # aucune dépendance, scripts vercel
├── vercel.json         # cleanUrls + cache /api/*
├── README.md           # ⚠ partiellement obsolète (voir §10)
└── .vercelignore       # exclut maquettes/ et *.md du déploiement
```

Dossier `maquettes/` référencé par `.vercelignore` mais **absent du dépôt suivi** (non versionné / local).

---

## 3. Liste des routes

### Routes de pages (statiques, `cleanUrls` actif)

| Route | Fichier | Rôle |
|---|---|---|
| `/` | `index.html` | Landing bêta + formulaire d'inscription |
| `/coach` | `coach.html` | Espace coach |
| `/joueur` | `joueur.html` | Espace joueur |

Navigation inter-pages **uniquement** depuis la landing : `href="/coach.html"` et `href="/joueur.html"` dans `index.html`. Aucun lien retour ni lien croisé coach↔joueur → **navigation en cul-de-sac** (voir §10).

### Routes API (serverless `api/`)

| Endpoint | Méthode | Source | État |
|---|---|---|---|
| `/api/health` | GET | statique | RÉEL |
| `/api/club` | GET | `data.js` (`club`, `tournoi`, `zonesTir`) | RÉEL (données partiellement MOCK) |
| `/api/matches` `?id=<slug>` | GET | `data.js` | RÉEL (box score complet seulement pour slug `hapoel`) |
| `/api/players` `?id=<slug>` | GET | `data.js` | RÉEL |
| `/api/beta` | POST | — | INCOMPLET : valide + `console.log`, **pas de persistance** (`api/beta.js` : « à brancher sur KV/Postgres ») |
| `/api/events` | POST | — | INCOMPLET : renvoie l'événement normalisé, **rien n'est stocké** (`api/events.js`) |

### « Routes » internes (SPA-like au sein d'une page)

- `coach.html` — 7 sections basculées par `goto()` : `dashboard`, `gamecenter`, `effectif`, `joueur`, `match`, `live`, `training` (`<section class="page" id="page-…">` + `data-goto`).
- `joueur.html` — 3 vues via `data-view` : `training`, `games`, `feed`.

---

## 4. Layouts et navigations

- **Pas de layout partagé / composant commun** : chaque page réimplémente son `<head>`, ses tokens CSS, sa barre de nav et son pied. Duplication assumée (MPA sans templating).
- **coach.html** : `header.topnav` fixe + `nav.tabs` (onglets) → système d'onglets maison qui montre/masque les `.page` ; l'onglet actif porte `.active`. Boutons profonds via `data-goto` (ex. « Voir match », « Fiche joueur ») pointent vers d'autres sections.
- **joueur.html** : navigation par vues `data-view` (Training Hub / Game Center / HoopFeed), style « réseau social ».
- **index.html** : landing linéaire scrollée, CTA vers `/coach` et `/joueur` + formulaire bêta.
- **Transitions** : animations CSS + `requestAnimationFrame`, respect de `@media (prefers-reduced-motion: reduce)` sur les 3 pages (bon point accessibilité).

---

## 5. Composants principaux (par page)

| Page | Blocs principaux | Preuve |
|---|---|---|
| **index** | Hero landing, sections marketing, formulaire bêta (POST `/api/beta`) | `index.html:735` (`fetch('/api/beta')`) |
| **coach** | Dashboard (pills/KPI), Game Center avec **terrain interactif** (SVG `#fullCourt`, zones `data-zone`, saisie de tir `data-pts`/`data-action`), Effectif (tableau hydraté), Fiche joueur, Feuille de match (box score), **Match live** (saisie temps réel), Entraînement, **Terrain analytics saison** (via `court-analytics.js`) | `coach.html:1066` (`#fullCourt`), `:1198`, `:1676`, `:1983` |
| **joueur** | Training Hub (barres de progression `data-target`/`data-w`), Game Center (récaps `data-recap`, terrain de tirs), HoopFeed (feed social), radar/stat cards | `joueur.html` (`data-view`, `data-recap`, `data-target`) |

Le **terrain de basket** est la pièce d'interaction centrale : SVG `viewBox="0 0 560 300"` avec zones cliquables (`data-zone`: raquette, top-clé, mi-distance G/D, corners G/D) et actions de saisie (`data-action`, `data-pts`).

---

## 6. Composants réutilisables

- **`assets/court-analytics.js`** — SEUL vrai module front partagé. Exposé global `window.HoopBoardCourt`, chargé par `coach.html` **et** `joueur.html` (`<script src="/assets/court-analytics.js">`). Rend en SVG pur, sans dépendance, un demi-terrain à 8 zones canoniques, pour deux usages (volume/% saison, tirs live). Consommé à l'hydratation coach (`coach.html:2362`, `if(window.HoopBoardCourt && zonesTir)`).
- **`lib/http.js`** — utilitaires serverless partagés par les 6 endpoints : `send()` (JSON + en-têtes CORS `*`), `methodGuard()`, `readJson()`, `slug()`.
- **`lib/match-events.js`** — 15 types d'événements canoniques (`EVENT_TYPES` figé), fonctions pures. **INCOMPLET** : « fondations seulement… branché sur aucune route API » (en-tête du fichier). Le format est *répliqué à la main* dans `coach.html` (carte des tirs live) plutôt qu'importé.
- **Côté HTML** : aucun composant réutilisable au sens technique — les patterns visuels (cartes, pills, avatars, tableaux) sont **copiés-collés** entre pages, pas factorisés (pas de Web Components, pas de templates).

---

## 7. Sources de données

**Source unique : `lib/data.js`** (objet `HOOPBOARD_DATA`, 161 lignes), consommé par l'API et **dupliqué en dur** dans le HTML embarqué de chaque page.

Modèle d'hydratation (progressive enhancement) : le HTML contient déjà les données affichées ; au chargement, `hydrateFromAPI()` tente `fetch('/api/…')` et **remplace** certains fragments DOM si l'API répond ; sinon repli silencieux sur l'embarqué (`coach.html:2299-2339`, `joueur.html:1515`). Ne s'exécute pas hors `http(s)` (`if(!location.protocol.startsWith('http')) return`).

Nature des données (à corriger dans la perception « données réelles ») :

| Bloc | Nature | Preuve |
|---|---|---|
| Identité club **Žalgiris Kaunas**, tournoi EuroLeague 2025-26, résultats | RÉEL (revendiqué feed EuroLeague) | `data.js:1-33` |
| Box score match vs **Hapoel** (13/02/2026) | RÉEL | `data.js` `matchHapoel` |
| Fiche vedette **Sylvain Francisco** (moyennes cœur pts/reb/pd/eva) | RÉEL | `data.js` `joueurVedette` |
| `statsSaison` (moyennes saison de l'effectif, colonnes min/int/ct/bp/tirsPct/mj) | **MOCK** `demo:true` | `data.js:99` + commentaire explicite |
| `zonesTirSaison` (8 zones, tentés/réussis/%) | **MOCK** `demo:true` | `data.js:124-125` |
| Inscription bêta & événements live | **NON PERSISTÉS** | `api/beta.js`, `api/events.js` |

> ⚠ **Incohérence de données héritée** : les clés `matchHapoel` et `quartTemps.poleFrance` sont des **noms hérités** de l'ancien jeu de données « U18 Pôle France » ; elles portent désormais du Žalgiris (commentaire assumé `data.js:37-41`). L'API attache le box score au match dont le *slug contient « hapoel »* — couplage fragile par nom.

---

## 8. Gestion des rôles

- **Aucune authentification, aucun rôle applicatif, aucune session.** Les occurrences de « role » sont des attributs ARIA (`role="img"`) et le mot « auth » n'apparaît que dans des noms de classes CSS — **pas** de login/token/permission.
- La « séparation des rôles » est **purement éditoriale** : deux pages figées, `/coach` et `/joueur`, accessibles librement par URL. N'importe qui atteint n'importe quelle page.
- CORS ouvert à `*` sur toute l'API (`lib/http.js`) — acceptable pour une démo publique, à restreindre pour un vrai SaaS.

**Pour un vrai produit multi-rôles (club/coach/joueur), tout le socle auth + autorisation + multi-tenant est ABSENT.**

---

## 9. Dépendances UI et 3D

- **Dépendances npm : zéro.** `package.json` ne liste ni `dependencies` ni `devDependencies`. Rien à auditer côté supply-chain front.
- **UI** : 100 % maison (SVG inline, CSS tokens, transforms). Aucune lib externe, aucun CDN, aucune police distante.
- **3D** : **simulée en CSS** (`perspective`, `rotateX/Y`, `preserve-3d`) + `requestAnimationFrame`. Le README parle de « récaps 3D » ; techniquement c'est de la **pseudo-3D CSS**, pas un moteur 3D. Pas de WebGL/Three.js/`<canvas>`.
- **Graphiques** : SVG génératif (`court-analytics.js` + SVG statiques). Palette froid→chaud codée en dur dans le module (`COLD`/`HOT`), non reliée aux tokens CSS globaux (choix d'isolation assumé du module).

---

## 10. Dette technique et risques (côté interface)

1. **Duplication massive de code UI** — head, tokens CSS, nav, cartes, tableaux et **le jeu de données** sont copiés dans les 3 pages. Toute évolution de style/donnée doit être répétée 3×. `coach.html` fait ~2 300 lignes dans un seul fichier (style + markup + JS mêlés). *Risque majeur pour une refonte.*
2. **Double source de vérité des données** — données en dur dans le HTML **et** dans `data.js`. L'hydratation peut faire diverger l'affichage initial (embarqué) de l'affiché après fetch (API). *Réf. `coach.html:2299+`.*
3. **Fonctionnalités « fondations » non branchées** — `lib/match-events.js` (moteur d'événements) et une partie de `court-analytics.js` sont posés mais partiellement non câblés ; le format d'événement est ré-implémenté à la main dans `coach.html` au lieu d'être importé. *Risque de divergence entre le module et sa copie.*
4. **Backend non persistant** — `/api/beta` et `/api/events` acceptent, valident, journalisent, mais **ne stockent rien** (TODO KV/Postgres). Les inscriptions bêta réelles sont **perdues**. *Réf. `api/beta.js`, `api/events.js`.*
5. **Couplage par convention de nommage** — box score rattaché via `slug.includes("hapoel")` (`api/matches.js`) ; clés héritées `poleFrance`/`matchHapoel` portant d'autres données. Fragile et trompeur.
6. **Documentation obsolète** — `README.md` décrit encore « U18 Pôle France à l'ANGT Belgrade (Proballers) » alors que le dépôt est passé à **Žalgiris / EuroLeague**. Induit en erreur (mais `*.md` est exclu du déploiement via `.vercelignore`).
7. **Navigation en impasse** — depuis `/coach` ou `/joueur`, aucun retour vers la landing ni passage croisé ; l'utilisateur est bloqué sans le bouton « précédent » du navigateur.
8. **Absence de socle SaaS** — pas d'auth, de rôles, de multi-club, de base de données, de tests, de CI. Attendu si l'objectif dépasse la démo.
9. **Accessibilité partielle** — bons points (`prefers-reduced-motion`, `aria-label` sur les SVG), mais le très fort recours aux `style="…"` inline et aux SVG interactifs demandera une vérification clavier/lecteur d'écran lors de la refonte.
10. **Maintenabilité du CSS** — un seul `<style>` monolithique par page, tokens partiellement redéfinis d'une page à l'autre (`--orange` seulement côté coach, `--aqua/--mint` côté joueur/landing) → **pas de design system centralisé** malgré l'intitulé des commits « design tokens / design system ».

---

## 11. Zones nécessitant une inspection supplémentaire

- **Interne du terrain interactif** (`coach.html` `#fullCourt`, saisie `data-zone`/`data-pts`/`data-action`) : logique de scoring live non lue en détail — à ouvrir pour la refonte du Game Center.
- **HoopFeed** (`joueur.html`, vue `feed`) : contenu et structure du « réseau social » non détaillés ; vérifier si les posts sont statiques ou générés.
- **`court-analytics.js` (lignes 60→307)** : seules les 60 premières lignes ont été lues (zones, palette). Le rendu SVG complet et les fonctions publiques (`shotFromEvent`, rendus saison/live) restent à cartographier.
- **`match-events.js` (lignes 40→192)** : reste de l'API du moteur (`aggregateStats`, validation) non lu.
- **Détail des tokens CSS & responsive fin** : breakpoints repérés (`coach` : 1080/780 px ; `joueur` : 1000/720 px ; `index` : 1000 px) mais la stratégie mobile complète (masquages, réorganisations) n'a pas été auditée section par section.
- **Dossier `maquettes/`** (référencé par `.vercelignore`) : absent du dépôt — vérifier s'il existe en local et ce qu'il contient.
- **Parité avec la prod** `hoopboardbeta.vercel.app` : audit fait sur la branche `refactor/pr3.1-button-system` (PR4.5) ; confirmer qu'elle correspond bien au déploiement bêta en ligne (la branche `main` est en retard, à PR3.1).

---

## Différences mobile / desktop (résumé transverse)

- Approche **responsive par media queries** uniquement (pas d'app mobile). Breakpoints : `@media(max-width:1080px)` et `780px` (coach), `1000px`/`720px` (joueur), `1000px` (index).
- `prefers-reduced-motion: reduce` géré partout (désactive les animations/pseudo-3D).
- Pas de détection de device, pas de layout mobile dédié : c'est un **même DOM adapté par CSS**. Le fort usage de tableaux larges (Effectif, box score) et du terrain SVG est le point de vigilance mobile principal.

---

*Fin de l'audit. Aucune modification apportée aux fichiers applicatifs.*
