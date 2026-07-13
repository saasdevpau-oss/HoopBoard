# HoopBoard — Stratégie 2D / 3D

> Sources : [`00`](00-audit-technique.md) · [`01`](01-inventaire-ecrans.md) · [`02`](02-audit-ux.md) · [`03`](03-information-architecture.md) · [`04`](04-design-system.md) · [`05`](05-match-live.md).
> Clone : `HOOPBoard serieux/Stack claude/HoopBoard`, HEAD **`ad0af1d` (PR4.5)**.
> Nature : **spécification**. Aucun code, aucune bibliothèque installée, aucun fichier applicatif modifié.
> Rappel du réel (`00`/`01`) : la « 3D » actuelle = **transforms CSS** (perspective/rotateX/Y) ; la carte de tirs = **SVG 2D** (`court-analytics.js`) ; aucun WebGL/Three.js/canvas.

## 1. Périmètre
- Définit **où** et **comment** la 3D peut servir, uniquement pour des fonctions **déjà définies** ou marquées future. Aucune fonction nouvelle. Hors sujet → `Hors périmètre`.
- **La 2D reste la vue de référence.** Aucune fonction critique ne dépend de la 3D.
- Ne choisit **pas** de bibliothèque de rendu (§15, `À décider plus tard`).

## 2. Rôle de la 3D
La 3D **aide uniquement à comprendre le basket**. Elle n'est **jamais** décorative pour la navigation ou les cartes. Elle est **facultative**, **différée**, et toujours doublée d'un **fallback 2D**.

## 3. Usages autorisés (exhaustifs)
1. **Récapitulatif de match** (§6).
2. **Visualisation des tirs** — vue complémentaire de la carte 2D (§7).
3. **Animation tactique** — `Évolution future — absente actuellement` (§8).
4. **Visualisation d'un exercice** — `Évolution future — absente actuellement` (§9).
5. **Présentation ponctuelle sur la landing** — une scène max (§10).

Aucun autre usage.

## 4. Usages interdits
Décor de navigation/cartes, rotation 3D de cartes, personnages photoréalistes, public/tribunes, salle détaillée, fumée, lens flare, néons, caméra libre, physique complexe, environnement de jeu vidéo, 3D bloquant le chargement, 3D nécessaire à la compréhension d'un écran. → `Hors périmètre`.

## 5. Direction visuelle 3D
Impose : **parquet semi-réaliste** (bois chaud sobre), éclairage **discret**, **caméra contrôlée** (pas libre), **vue isométrique ou du dessus**, **silhouettes/pions simples** (aucune modélisation réaliste de joueur), **lignes de terrain très lisibles** (`court-line`), fond cohérent avec le **thème sombre** (`04`), effets limités, aucune texture lourde inutile.
- Palette : `court-surface` pour le sol schématique, parquet chaud discret pour la 3D, `shot-made`/`shot-missed` pour les marqueurs, `home-team`/`away-team` pour les pions.

## 6. 3D — Récapitulatif de match
- **Objectif** : rejouer les temps forts d'un match de façon compréhensible (prolonge le récap pseudo-3D actuel `joueur.html playRecap`, sans en inventer les données).
- **Données utilisées** : uniquement celles présentes — paniers/actions avec **zone** (et x/y seulement en mode Avancé du live, `05`). **La 3D n'invente aucune position de joueur** absente. Si seules les zones existent → limiter aux **zones et trajectoires permises** (point d'origine = zone, cible = panier).
- **Vue par défaut** : isométrique du demi-terrain, caméra fixe.
- **Contrôles** : lecture / **pause** / **vitesse** (1×, éventuellement 0,5×/2× `À décider plus tard`) / **passage action précédente-suivante**.
- **Durée** : chaque action 150–250 ms d'apparition (cohérent `04` §23), pas d'animation longue ni de célébration.
- **Navigation** : timeline d'actions ; sélection directe d'une action.
- **Fallback 2D** : le récap doit exister **entièrement en 2D** (séquence sur carte SVG) ; la 3D est un complément.
- **Mobile** : fallback 2D par défaut, 3D à la demande. **Tablette** : 3D confortable (paysage idéal). **Desktop** : 3D pleine.
- **Accessibilité** : contrôles clavier, `prefers-reduced-motion` → passe en 2D statique/étape par étape, marqueurs point/croix.

## 7. 3D — Visualisation des tirs
- **Vue principale** : **carte de tirs 2D** (`court-analytics.js`) — **toujours disponible**.
- **Vue complémentaire** : **3D facultative**.
- **Bascule 2D/3D** : contrôle explicite ; **2D par défaut** ; état mémorisé `À décider plus tard`.
- **Angle de caméra** : isométrique fixe (pas de caméra libre).
- **Marqueurs** : point (`shot-made`) / **croix** (`shot-missed`) — forme + couleur.
- **Trajectoires** : arcs simples zone → cercle, seulement si la donnée le permet (sinon marqueur seul).
- **Réussite/échec** : distingués par forme (point/croix) et couleur.
- **Filtres existants** : réutilise les filtres de l'Analyse (par joueur/zone) sans en créer.
- **Performances** : différée, marqueurs limités (§14).
- **Mobile** : 2D uniquement par défaut ; 3D optionnelle si l'appareil suit.
- **Fallback** : la 3D **ne remplace jamais** la 2D analytique.

## 8. 3D — Animation tactique (future)
`Évolution future — absente actuellement`. **Pas** d'éditeur tactique conçu, **pas** de logique de création de systèmes.
Principes visuels autorisés seulement : **vue du dessus** ou **isométrique**, **pions**, **ballon**, **lignes de déplacement**, **pause**, **lecture**, **vitesse**, **fallback 2D**. Disponibilité : `À décider plus tard`.

## 9. 3D — Exercices (future)
`Évolution future — absente actuellement`. **Pas** de bibliothèque d'exercices conçue.
Apparence/comportement d'une future visualisation, uniquement : **terrain**, **pions**, **ballon**, **déplacements simples**, **zones**, fallback 2D. Disponibilité : `À décider plus tard`.

## 10. 3D — Landing page
**Une scène 3D maximum.** Peut montrer : un terrain, une carte de tirs, ou un récap d'action.
- **Rôle** : illustration, non essentielle à la compréhension.
- **Taille** : encadrée (pas plein écran).
- **Interaction** : minimale (au survol/tap), pas de caméra libre.
- **Ne doit pas** : bloquer le chargement, être nécessaire, occuper tout l'écran, utiliser personnage réaliste/caméra libre, tourner en permanence, créer une expérience de jeu.
- **Fallback** : image/SVG 2D statique. **Mobile** : fallback 2D par défaut. **Réduction de mouvement** : scène figée.

## 11. Relation 2D / 3D
- **2D = référence, toujours disponible** partout (carte de tirs, récap, analyse).
- **3D = complément facultatif**, activé à la demande, jamais bloquant.
- Toute vue 3D a un **équivalent 2D** fonctionnel.

## 12. Responsive
- **Mobile (375)** : 2D par défaut ; 3D à la demande, LOD réduit ; landing = fallback 2D.
- **Tablette (768/1024)** : 3D confortable, paysage recommandé pour récap/tirs.
- **Desktop (1440)** : 3D pleine, panneau dédié.
- La 3D respecte les breakpoints de `08` sans layout spécifique nouveau.

## 13. Accessibilité
- Contrôles **clavier** (lecture/pause/vitesse/navigation).
- **`prefers-reduced-motion`** → bascule en 2D statique ou étape par étape, sans mouvement continu.
- Marqueurs **forme + couleur** (point/croix), lignes très lisibles.
- Alternative textuelle/2D pour tout contenu porté par la 3D.
- Ne jamais faire dépendre une information **critique** de la 3D.

## 14. Performances
- **Chargement différé** (lazy) : le moteur 3D n'est chargé qu'à l'activation.
- **Activation à la demande** uniquement (bascule explicite).
- **Suspension hors écran** (pause quand non visible).
- **LOD réduit sur mobile** (moins de détail, moins de marqueurs).
- **Limite de marqueurs** (seuil exact `À décider plus tard`).
- **Fallback automatique** en 2D si l'appareil est faible ou le rendu échoue.
- **État de chargement** (skeleton/indicateur) et **état d'erreur** (message + 2D).
- **Appareil faible** : rester en 2D par défaut.

## 15. Comparaison des technologies (recommandation par usage, sans installation ni code)
| Techno | Forces | Limites | Convient à |
|---|---|---|---|
| **CSS 3D** (actuel) | Léger, natif, zéro dépendance | Pas de vraie profondeur/occlusion, vite limité | Effet d'inclinaison léger, landing discrète, pseudo-3D de secours |
| **SVG 2D** (`court-analytics.js`) | Net, accessible, performant, déjà en place | Pas de 3D réelle | **Vue de référence** : carte de tirs, heatmap, récap 2D |
| **Canvas 2D** | Nombreux marqueurs performants | Moins accessible que SVG | Cartes de tirs très denses (si volumétrie élevée) |
| **Three.js / WebGL** | Vraie 3D, caméra, éclairage | Poids, complexité, coût mobile | Récap 3D, visualisation 3D des tirs, tactique/exercice futurs |

**Recommandations par usage :**
- **Carte de tirs (analyse)** → **SVG 2D** (référence) ; Canvas si densité extrême.
- **Récap de match** → **2D SVG** par défaut ; **Three.js** pour la couche 3D optionnelle.
- **Visualisation 3D des tirs** → **Three.js** en complément, 2D SVG en principal.
- **Landing** → **CSS 3D / SVG** léger ; une scène Three.js seulement si différée et avec fallback.
- **Tactique / exercice (futurs)** → **Three.js** (vue isométrique/dessus) le moment venu.
> Le **choix de bibliothèque et de technologie de rendu** reste `À décider plus tard`.

## 16. Critères d'acceptation
- [ ] La **2D reste toujours disponible** pour tirs, récap, analyse.
- [ ] La 3D est **facultative, différée, à la demande**, avec **fallback 2D** systématique.
- [ ] **Aucune fonction critique** ne dépend de la 3D.
- [ ] La 3D **n'invente aucune position** absente des données (limitée aux zones/trajectoires permises).
- [ ] Usages 3D limités aux **5 autorisés** ; tactique et exercice marqués **future**.
- [ ] Direction visuelle respectée (isométrique/dessus, pions, parquet sobre, thème sombre, aucun réalisme joueur/salle).
- [ ] Performances : lazy-load, suspension hors écran, LOD mobile, fallback appareil faible.
- [ ] `prefers-reduced-motion` respecté (bascule 2D).
- [ ] Aucune bibliothèque imposée ; aucun code ; aucun fichier applicatif modifié.

## 17. Éléments `À décider plus tard`
- Bibliothèque 3D.
- Technologie de rendu 3D.
- Seuil exact de désactivation automatique de la 3D.
- Disponibilité de l'animation tactique.
- Disponibilité de la visualisation d'exercice.

---
*Fin de la stratégie 3D. Aucune modification apportée aux fichiers applicatifs.*
