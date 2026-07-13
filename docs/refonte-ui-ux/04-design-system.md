# HoopBoard — Design System

> Sources : [`00`](00-audit-technique.md) · [`01`](01-inventaire-ecrans.md) · [`02`](02-audit-ux.md) · [`03`](03-information-architecture.md) · [`05`](05-match-live.md) · [`06`](06-hoopfeed.md).
> Clone : `HOOPBoard serieux/Stack claude/HoopBoard`, HEAD **`ad0af1d` (PR4.5)**.
> Nature : **spécification visuelle** (tokens, composants, règles). **Aucun code, aucun CSS/JS, aucun fichier applicatif modifié.**
> Voir aussi [`07-strategie-3d.md`](07-strategie-3d.md) et [`08-responsive-accessibilite.md`](08-responsive-accessibilite.md).

## 1. Périmètre
- Présentation et comportement visuel des **fonctions déjà définies** (03/05/06). Aucune fonction, section, statistique, rôle ou module nouveau. Hors sujet → `Hors périmètre`.
- Ne remet en cause ni l'architecture (03), ni les 3 modes du live (05), ni les 5 types HoopFeed (06), ni les décisions Suivre/abonnés/médias/Partager.
- **État actuel** (relevé code) : thème sombre, palette **teal/mint** (`--void #030A08`, `--orange` **=** `#40E8D5` teal — mal nommé), police **Outfit** auto-hébergée, tirs `#3FBF7A`/`#E0563F` (`court-analytics.js`). La direction ci-dessous **recentre l'accent sur l'orange ballon** (décision de présentation, pas de fonction nouvelle).

## 2. Direction visuelle
**Une seule direction retenue** : **minimalisme sportif + dashboard professionnel + dimensional layering léger + micro-interactions fonctionnelles + références basket discrètes + 3D limitée au terrain.**
- Profondeur créée surtout par **surfaces + bordures**, pas par les ombres ni le néon.
- Références basket **discrètes** : orange ballon (accent), lignes de terrain, cercle, typographie de score, parquet (réservé à la 3D). Jamais de néon, cyberpunk, jeu vidéo, mur de cartes, dégradés violet/rose « IA ».
- Cible : sportif, moderne, premium, crédible, lisible, efficace mobile/tablette pour coach amateur.

## 3. Thème
**Thème sombre principal unique**, adapté gymnase / mode banc / consultation prolongée / graphiques / mise en valeur du terrain. Thème clair = `Évolution future — absent de la première version` (non conçu en parallèle).

## 4. Palette

> Valeurs hex indicatives, cohérentes avec un thème sombre. **Les ratios de contraste doivent être vérifiés à l'implémentation** (§5) — aucune valeur n'est présentée comme mesurée.

### Fonds
| Token | Hex | Usage |
|---|---|---|
| `background-primary` | `#0A0E12` | Fond d'application (près du noir, graphite bleuté) |
| `background-secondary` | `#0F141A` | Fonds de zones, colonnes secondaires |
| `background-elevated` | `#151B22` | Fond sous éléments surélevés / barres |

### Surfaces
| Token | Hex | Usage |
|---|---|---|
| `surface-primary` | `#161D25` | Cartes, panneaux |
| `surface-secondary` | `#1C242E` | Sous-blocs, en-têtes de tableau |
| `surface-interactive` | `#212B36` | Contrôles au repos (boutons secondaires, champs) |
| `surface-hover` | `#263140` | Survol |
| `surface-active` | `#2E3A48` | Enfoncé / sélectionné |

### Bordures
| Token | Hex | Usage / interdits |
|---|---|---|
| `border-subtle` | `rgba(255,255,255,0.06)` | Séparateurs discrets (hérite de `--hair-soft`) |
| `border-default` | `rgba(255,255,255,0.10)` | Contour standard de carte/champ |
| `border-strong` | `rgba(255,255,255,0.16)` | Séparation forte, en-têtes |
| `border-focus` | `#5AA2FF` | **Anneau de focus** — jamais utilisé comme bordure décorative |

### Textes
| Token | Hex | Usage / interdits |
|---|---|---|
| `text-primary` | `#F2F5F8` | Titres, valeurs (fort contraste sur fonds sombres) |
| `text-secondary` | `#B7C0CB` | Corps secondaire |
| `text-muted` | `#7E8894` | Légendes, métadonnées — **ne pas** utiliser pour texte normal < 16px sans vérif contraste |
| `text-disabled` | `#55606B` | Désactivé — **jamais** pour information utile |
| `text-inverse` | `#0A0E12` | Texte sur accent orange / fonds clairs |

### Accent
| Token | Hex | Usage |
|---|---|---|
| `accent-primary` | `#E8722C` | **Orange ballon** — action principale, accent basket. **Ne couvre pas toute l'UI** (voir §18) |
| `accent-primary-hover` | `#F2843F` | Survol |
| `accent-primary-active` | `#CC5F1E` | Enfoncé |
| `accent-secondary` | `#2FB5A0` | Accent d'appoint (teal, clin d'œil à l'existant) — **discret**, jamais concurrent de l'orange |

### États
| Token | Hex | Usage |
|---|---|---|
| `success` | `#3FBF7A` | Succès, sauvegardé, tir marqué (aligné `court-analytics`) |
| `warning` | `#E5A93C` | Avertissement, hors connexion |
| `error` | `#E4574C` | Erreur, action destructrice |
| `info` | `#5AA2FF` | Information, focus |

### Données basket
| Token | Hex | Usage / interdits |
|---|---|---|
| `shot-made` | `#3FBF7A` | Tir marqué (point plein) |
| `shot-missed` | `#E0563F` | Tir manqué (**croix** — forme obligatoire, cf. §20) |
| `home-team` | `#E8722C` | HoopBoard (orange) |
| `away-team` | `#6B7683` | Adverse (slate neutre) |
| `court-line` | `rgba(239,231,212,0.55)` | Lignes du terrain (crème, hérite de l'INK `court-analytics`) |
| `court-surface` | `#14202A` | Fond schématique 2D du terrain (parquet chaud réservé à la 3D, cf. `07`) |

**Associations interdites (contraste/confusion)** :
- `accent-primary` (orange) **adjacent** à `shot-missed` (orange-rouge) → confusion ; séparer ou distinguer par forme.
- `text-muted`/`text-disabled` sur `surface-hover`/`background-secondary` pour du texte normal → contraste insuffisant probable, à éviter.
- `error` et `accent-primary` côte à côte comme deux actions → réserver le rouge aux erreurs/destructions (§4 règle).
- Rouge (`error`/`shot-missed`) **uniquement** : erreurs, actions destructrices, tirs manqués.

## 5. Contrastes
Cible **WCAG AA** : texte normal **4,5:1**, grand texte **3:1**, éléments interactifs **3:1**, focus visible, graphiques compréhensibles **sans dépendre de la couleur seule**.

Couples recommandés (à **vérifier au calcul** lors de l'implémentation — non mesurés ici) :
| Rôle | Premier plan | Fond |
|---|---|---|
| Texte sur fond principal | `text-primary` | `background-primary` |
| Texte secondaire | `text-secondary` | `surface-primary` |
| Bouton principal | `text-inverse` | `accent-primary` |
| Bouton secondaire | `text-primary` | `surface-interactive` |
| Erreur | `error` (+ icône) | `surface-primary` |
| Succès | `success` (+ icône) | `surface-primary` |
| Tir marqué | `shot-made` (point) | `court-surface` |
| Tir manqué | `shot-missed` (croix) | `court-surface` |

> `text-muted` sur accent, et `shot-missed`/`accent` sur fonds sombres sont **à vérifier** ; si < seuil, foncer le fond ou éclaircir le token. Aucune affirmation de mesure sans calcul.

## 6. Typographie
**Deux familles maximum.**
- **Police principale — Inter** : navigation, textes, formulaires, tableaux, publications, descriptions. Excellent support français, chiffres tabulaires (`tnum`), disponible légalement (Google Fonts/OFL), performante, neutre-pro. Fallback : `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`.
- **Police d'affichage — Outfit** (déjà auto-hébergée dans le produit) : scores, grands nombres, titres courts, statistiques clés. Géométrique, moderne, sportive **sans** aspect jeu vidéo. Fallback : `system-ui, sans-serif`.
- **Poids** : Inter 400/500/600/700 ; Outfit 500/600/700.
- **Chiffres tabulaires** obligatoires pour scores, chronos, tableaux, box score (alignement des colonnes).
- **Cas interdits** : Outfit pour du corps de texte long ; polices décoratives/condensées extrêmes façon jeu vidéo ; plus de deux familles.
- Police d'affichage finale **après test** : `À décider plus tard`.

## 7. Échelle typographique
| Token | Desktop | Mobile | line-height | Poids | Usage |
|---|--:|--:|--:|--:|---|
| `display` | 40 | 30 | 1.1 | 700 | Titres de héros (landing) |
| `heading-1` | 28 | 24 | 1.2 | 700 | Titre de section |
| `heading-2` | 22 | 20 | 1.25 | 600 | Sous-section, titre de carte importante |
| `heading-3` | 18 | 17 | 1.3 | 600 | Titre de carte, en-tête de bloc |
| `body-large` | 16 | 16 | 1.5 | 400/500 | Texte principal confortable (HoopFeed) |
| `body` | 15 | 15 | 1.5 | 400 | Texte courant |
| `body-small` | 13 | 13 | 1.45 | 400 | Texte dense, tableaux |
| `label` | 13 | 13 | 1.2 | 600 | Libellés de champs/boutons |
| `caption` | 11 | 11 | 1.3 | 500 | Métadonnées, légendes, « démo » |
| `score-large` | 56 | 40 | 1.0 | 700 | Score du mode banc (Outfit, tnum) |
| `score-medium` | 32 | 26 | 1.0 | 700 | Scores de cartes match, grands KPI (Outfit) |

Aucun autre niveau.

## 8. Espacements (base 4 px)
| Token | px | Usage |
|---|--:|---|
| `space-1` | 4 | Icône/texte, interstice minimal |
| `space-2` | 8 | Padding interne serré, gap de chips |
| `space-3` | 12 | Padding de contrôle, gap de liste |
| `space-4` | 16 | Padding interne de carte, gap standard |
| `space-5` | 20 | Séparation de sous-groupes |
| `space-6` | 24 | Séparation de groupes, padding de panneau |
| `space-8` | 32 | Marges de section |
| `space-10` | 40 | Séparations majeures |
| `space-12` | 48 | Respirations de page (desktop) |
| `space-16` | 64 | Grandes zones (landing) |

Marges de page : mobile `space-4` ; tablette `space-6` ; desktop `space-8`. Gouttières de grille : mobile `space-4`, tablette `space-5`, desktop `space-6`.

## 9. Rayons
| Token | px | Usage |
|---|--:|---|
| `radius-small` | 6 | Champs, petits contrôles, chips de filtre |
| `radius-medium` | 10 | Boutons, cartes standard |
| `radius-large` | 16 | Panneaux, modales, drawers |
| `radius-pill` | 999 | Filtres arrondis, badges, boutons pill |
| `radius-circle` | 50% | Avatars, marqueurs, pastilles |

Éviter les cartes excessivement arrondies (> `radius-large`).

## 10. Ombres et profondeur
| Token | Usage |
|---|---|
| `shadow-low` | Élévation légère d'une carte interactive au survol |
| `shadow-medium` | Éléments flottants (menu contextuel, toast) |
| `shadow-high` | **Modales et drawers uniquement** |

Contraintes : ombres **discrètes**, pas de glow néon, pas d'ombre autour de chaque carte ; profondeur surtout par surfaces + bordures.

## 11. Bordures
- **Épaisseur standard** 1 px (`border-default`) ; **forte** 1,5–2 px (`border-strong`).
- **Focus** : anneau `border-focus` 2 px + décalage, visible sur tout fond (jamais couleur seule → aussi épaisseur).
- **Séparateurs** : `border-subtle`.
- **Actif/sélectionné** : bordure `accent-primary` (1,5 px) **+** changement de surface (jamais couleur seule).
- Ne pas entourer chaque donnée d'une bordure.

## 12. Grille et layout
Système **unique** (pas une grille par page).
| Palier | Colonnes | Marge | Gouttière | Largeur max contenu | Sidebar |
|---|--:|--:|--:|--:|---|
| 375 | 4 | 16 | 16 | 100% | aucune (barre basse, 03) |
| 768 (tablette portrait) | 8 | 24 | 20 | 720 | drawer / nav élargie |
| 1024 (tablette paysage / petit desktop) | 12 | 24 | 24 | 960 | rail réduit |
| 1440 (desktop large) | 12 | 32 | 24 | 1200 | complète |

- **Panneaux secondaires** : apparaissent à ≥ 1024 (liste + détail). **Aucune page ne devient un mur de cartes.**
- **Densité** : contrôlée par section (§13).

## 13. Densité (trois niveaux)
| Niveau | Sections | Hauteur de ligne / contrôle | Espacement | Interdit |
|---|---|---|---|---|
| **Compacte** | match live, tableaux, historique d'actions | ligne 36–40, contrôle 40–44 | `space-2`/`space-3` | descendre sous **44×44 px** de cible tactile |
| **Standard** | Aujourd'hui, Équipe, Analyse, Entraînements | ligne 44–48, contrôle 44–48 | `space-3`/`space-4` | densité trop lâche qui casse le balayage |
| **Confortable** | HoopFeed, profils, landing | ligne 52+, contrôle 48+ | `space-4`/`space-6` | densité compacte inadaptée à la lecture |

Cibles tactiles **≥ 44×44 px** même en compacte.

## 14. Icônes
- **Une seule bibliothèque** : **Lucide** (SVG open-source, style trait cohérent, couvre navigation/actions/stats/erreurs/paramètres ; disponible légalement). Se substitue aux SVG dessinés à la main actuels tout en gardant leur esprit trait fin.
- **Tailles** : standard 20 px ; compacte 16 px ; touch 24 px dans une cible ≥ 44 px.
- **Épaisseur** : ~2 px (stroke), cohérente.
- **État actif** : couleur `accent-primary` ou `text-primary` + éventuel remplissage ; jamais couleur seule pour un sens critique.
- **Avec/sans libellé** : navigation et actions du live peuvent être icône + libellé ; **texte obligatoire** pour toute action destructrice, tout statut (sauvegarde), et les actions du mode banc peu évidentes.
- **Aucun emoji** comme icône d'interface.
- **Icônes personnalisées** autorisées uniquement pour : terrain, ballon, actions basket non couvertes par la bibliothèque.

## 15. Composants de base
Pour chacun : usage · états · taille · mobile · clavier · accessibilité · interdit. (États non applicables notés « n/a ».)

1. **Bouton principal** — action dominante unique par zone. États : default/hover/active/focus/disabled/loading. Taille : 44 (touch 48). Mobile : pleine largeur possible. Clavier : Entrée/Espace, focus visible. A11y : label explicite. Interdit : plusieurs par écran.
2. **Bouton secondaire** — actions courantes. `surface-interactive` + `border-default`. Idem états. Interdit : ressembler au principal.
3. **Bouton discret (ghost)** — actions tertiaires. Fond transparent, texte `text-secondary`. Interdit : pour action destructrice.
4. **Bouton destructif** — suppression. `error`. Confirmation requise. Interdit : usage non destructeur.
5. **Bouton icône** — action compacte. Cible ≥ 44. A11y : `aria-label` obligatoire. Interdit : sens critique sans label.
6. **Champ texte** — saisie courte. États : default/focus/error/disabled. Label visible. Mobile : 44 min, clavier adapté.
7. **Zone de texte** — commentaire, publication. Multi-lignes, compteur si limite. Idem états.
8. **Select** — choix (type de publication, langue). Natif de préférence (a11y). État error.
9. **Switch** — préférence on/off (paramètres live). État on/off + focus. Label associé.
10. **Checkbox** — option/objectif coché. default/checked/indeterminate/disabled. Cible ≥ 24 dans zone 44.
11. **Radio** — choix exclusif (mode Simple/Standard/Avancé). Groupe labellisé.
12. **Filtre (chip)** — HoopFeed/zones. `radius-pill`. États : default/selected/hover. Selected = fond + texte + coche (pas couleur seule).
13. **Onglet** — sous-navigation (fiche joueur, analyse). Actif = soulignement + poids + couleur. Clavier : flèches.
14. **Badge** — compteur/étiquette (type, nouveauté). Petit, non cliquable. Interdit : logique de popularité.
15. **Avatar** — joueur/coach. `radius-circle`, initiales si pas d'image. Tailles 24/32/40.
16. **Tooltip** — aide brève desktop. Non essentiel (jamais la seule source d'info). Masqué au clavier via focus.
17. **Toast** — confirmation transitoire (enregistré, erreur). Auto-dismiss, non bloquant, `shadow-medium`. A11y : rôle live-region.
18. **Modale** — décision (confirmation de sortie). `shadow-high`, focus piégé, Échap ferme. Mobile : plein écran possible.
19. **Drawer** — panneau latéral/bas (substitution, historique complet, paramètres, création). `shadow-high`. Focus piégé.
20. **Menu contextuel** — actions de carte (kebab). `shadow-medium`. Clavier navigable.
21. **Skeleton** — chargement. Formes neutres, pas d'animation excessive. Respecte reduced-motion.
22. **État vide** — message + explication + action. Aligné §22 (06). A11y : texte lisible.
23. **Message d'erreur** — associé au contrôle, `error` + icône + texte. Jamais couleur seule.

Aucun autre composant de base.

## 16. Composants HoopBoard
Pour chacun : responsabilité · hiérarchie · données · états · densité · responsive · a11y.

1. **Carte prochain match** — annonce le prochain match. Hiérarchie : adversaire > date/lieu > CTA. Données : `tournoi.prochainMatch`. États : normal / vide. Densité standard. Responsive : pleine largeur mobile. A11y : lien nommé.
2. **Carte dernier résultat** — score + V/D. Hiérarchie : score `score-medium`. Données : `tournoi.resultats[0]`. États : victoire/défaite (forme + couleur). 
3. **Carte entraînement** — prochaine séance/zone. Données : Training Hub. États : normal / vide.
4. **Résumé statistique** — 2–3 KPI d'équipe. Hiérarchie : valeur > label. Données : `statsEquipe`. **Pas** un mur de cartes.
5. **Ligne joueur** — rangée d'effectif. Données : nom, poste, KPI. Densité compacte. Responsive : colonnes essentielles mobile (§tableaux).
6. **Fiche joueur compacte** — profil résumé. Données : avatar, nom, stats, objectifs. Onglets internes.
7. **Tableau statistique** — box score/effectif. Chiffres tabulaires. Voir §19.
8. **Bloc score** — score des deux équipes (live). `score-large`, tnum. États : édition/plancher 0. Toujours visible (05).
9. **Chronomètre** — temps + état. `score-medium` tnum. États : non démarré/en cours/pause/terminé.
10. **Bouton statistique live** — émet un événement. Hiérarchie **cohérente** entre eux, aucun ne ressemble au CTA principal (05). Cible ≥ 44 (compacte). Feedback 150 ms.
11. **Sélecteur joueur** — bande de joueurs. Actif **fortement saillant** (surface + bordure accent). Cible ≥ 44.
12. **Lineup** — cinq actifs (Avancé). État : valide (5). Substitution via drawer.
13. **Terrain interactif** — zones + tirs. Zones ≥ 44. Marqueurs point/croix. Voir `07`.
14. **Marqueur de tir** — point (marqué) / croix (manqué). Forme + couleur.
15. **Feed d'actions** — historique live récent. Densité compacte, 3–5 lignes. Undo attaché.
16. **Statut de sauvegarde** — 4 statuts (05). Icône + texte, discret, permanent.
17. **Carte HoopFeed** — publication. Voir 06 §10. Densité confortable.
18. **Bloc statistique HoopFeed** — stat de perf/progression dans un post. Lien interne.
19. **Commentaire** — 1 niveau. Auteur + date + texte. Suppression propre.
20. **Filtre HoopFeed** — 5 chips. Selected clair.
21. **Carte objectif** — objectif + progression (barre). Données existantes.
22. **Carte exercice** — drill (fait/à faire). Statut forme + texte.
23. **Heatmap** — % par zone (Analyse, pas live). Motif + couleur. `demo` signalé.
24. **Box score** — tableau détaillé de match. Chiffres tabulaires, colonne joueur fixe.
25. **Graphique de tendance** — évolution d'un indicateur. Titre + unité + période. Séries limitées.

Aucun autre composant métier.

## 17. Cartes
**Une carte est justifiée** si elle : regroupe une info cohérente, a une action/état propre, doit être séparée visuellement. **Interdit** : une carte par statistique, par libellé, par bouton, par micro-info.
- **Padding** : `space-4` (compacte `space-3`, confortable `space-6`).
- **Titre** : `heading-3` optionnel.
- **Action** : au plus une action dominante par carte.
- **Bordure** : `border-default` ; **fond** : `surface-primary`.
- **Hover** (si cliquable) : `surface-hover` + `shadow-low`.
- **Sélectionnée** : bordure accent + surface active.
- **Cliquable** : toute la carte est une cible, curseur pointer, focusable. **Non cliquable** : pas de hover, pas de focus.

## 18. Boutons
- **Hauteurs** : compacte 40, standard 44, tactile 48. **Padding horizontal** : `space-4` (icône seule : carré ≥ 44).
- **Icône** : optionnelle, alignée au texte (`space-2`).
- **Chargement** : spinner + libellé conservé, bouton désactivé.
- **Désactivé** : `text-disabled` + surface atténuée, non focusable.
- **Focus** : anneau `border-focus`.
- **Feedback** : enfoncement 150 ms.
- **Le bouton principal reste rare** : **une seule action principale dominante par zone**. Dans le **match live**, les nombreux boutons statistiques partagent **une hiérarchie cohérente** (secondaires/égaux entre eux) et **aucun** n'imite le CTA orange principal — l'orange y est réservé au repère « joueur actif » / action de score clé, pas à tous les boutons.

## 19. Tableaux (effectif, box score, statistiques)
- **En-tête** : `surface-secondary`, `label`, alignement des nombres à droite.
- **Nombres** : chiffres **tabulaires**, alignés à droite ; texte (noms) à gauche.
- **Lignes** : séparateur `border-subtle` ; **hover** `surface-hover`.
- **Tri futur** : `À décider plus tard` (indicateur d'en-tête prévu, non actif).
- **Colonne fixe** : colonne joueur figée en scroll horizontal.
- **Mobile** : **scroll horizontal contrôlé** avec colonne joueur fixe + colonnes prioritaires visibles (**Pts, Reb, Pd, Éva**) ; les colonnes secondaires défilent. **Ne pas** transformer automatiquement tout tableau en cartes ; l'alternative en cartes est réservée à l'effectif consulté hors contexte dense.
- **Tablette** : plus de colonnes visibles sans scroll.
- **Champs prioritaires** : joueur, poste/taille, minutes, points, rebonds, passes, évaluation.

## 20. Graphiques
- **Barres / lignes / donut (si nécessaire) / heatmap / carte de tirs / tendance** — pas de graphique **décoratif**.
- Chaque graphique : **titre clair**, **période**, **unité**, **légende**, **tooltip**, **état vide**.
- **`demo:true` signalé** (§21).
- **Motifs/formes en complément de la couleur** : tir marqué = point plein, manqué = **croix** ; séries distinguées par forme/label, pas couleur seule ; heatmap doublée d'une valeur chiffrée.
- **Nombre de séries limité** (≤ 3–4 recommandé).
- **Aucune nouvelle bibliothèque graphique imposée** ici (choix = `À décider plus tard`).

## 21. Données `demo`
Règle **unique** pour tout `demo:true` : rester visible, **clairement identifié**, ne pas ressembler à une donnée saisie, indicateur cohérent, origine expliquée sans polluer chaque écran.

**Option A — badge `Données de démonstration`** (par bloc concerné).
**Option B — bandeau global de mode démo.**

| | Avantages | Risques |
|---|---|---|
| A | Précis, localisé sur le bloc réellement démo ; n'altère pas le reste | Répétition si beaucoup de blocs |
| B | Une seule mention, simple | Trop global : masque le fait que **certaines** données sont réelles ; ambigu quand réel + démo cohabitent |

**✅ Recommandation : Option A — badge `Données de démonstration`** au niveau du bloc/graphe concerné (ex. moyennes saison, zones de tir). Cohérent avec l'audit `02` (UX-P1-004) : distingue précisément réel vs démo, contrairement au bandeau global qui laisserait croire que **tout** est fictif. Badge discret (`caption`), une icône + libellé, jamais couleur seule.

## 22. États interactifs
Pour tout composant interactif : **default · hover · active · focus · selected · disabled · loading · error · success**, avec **jamais de dépendance à la couleur seule** (ajouter forme/icône/texte/épaisseur).
- Non applicables (n/a) : `selected` sur boutons d'action ; `loading` sur badges/avatars/tooltips ; `success`/`error` sur éléments purement décoratifs ; `hover` sur mobile (remplacé par `active`).
- `focus` **toujours** applicable aux éléments focusables.

## 23. Micro-interactions
Catégories autorisées uniquement : changement d'onglet, ouverture drawer, ouverture modale, sélection joueur, enregistrement stat, undo, like, commentaire, filtre, chargement, sauvegarde, erreur, mise à jour d'un graphique.
- **Durées** : interaction rapide **150 ms** ; transition standard **200 ms** ; panneau **250 ms max**.
- **Interdit** : particules, confettis, rebonds excessifs, parallaxe, texte cinétique, curseur personnalisé, animation décorative permanente, rotation 3D de cartes, glow animé.
- **`prefers-reduced-motion`** : respecté (transitions réduites à un fondu instantané).

## 24. Match live (application du DS, sans rien changer à 05)
- **Hiérarchie** : scores (`score-large`) dominent ; joueur actif saillant ; boutons stat cohérents entre eux ; statut de sauvegarde discret mais permanent.
- **Tailles** : cibles ≥ 44 (densité compacte), scores lisibles à distance.
- **Contrastes** : score et chrono à fort contraste ; marqué/manqué = point/croix.
- **Densité** : compacte.
- **Composants** : bloc score, chronomètre, sélecteur période, sélecteur joueur, lineup, bouton statistique live, terrain, marqueur de tir, feed d'actions, statut de sauvegarde, drawers (substitution/historique/paramètres/sortie).
- **États** : les 9 états (§22) ; 4 statuts de sauvegarde inchangés.
- **Micro-interactions** : celles de 05 §24, dans les durées §23.
- **Ne modifie pas** : Option A tirs, ordre mobile, 3 modes, stats autorisées, 4 statuts, structure tablette paysage.

## 25. HoopFeed (application du DS, sans rien changer à 06)
- **Cartes** : densité confortable, `surface-primary`, `radius-medium`, type/rôle discrets.
- **Texte** : `body-large` pour le corps, `caption` pour dates/type.
- **Actions** : like + commentaire discrets (secondaires), cibles ≥ 44.
- **Espacements** : `space-4`/`space-6`.
- **Responsive** : 1 colonne (mobile/tablette portrait), fil + panneau secondaire (tablette paysage/desktop).
- **États** : 5 états vides + erreurs (06 §22/§23).
- **Ne modifie pas** : Suivre masqué, compteurs masqués, aucun média v1, Partager = lien interne, 5 filtres, 5 types, une réaction Like, commentaires 1 niveau.

## 26. Critères d'acceptation
- [ ] **Une seule** direction visuelle (minimalisme sportif + dashboard pro + layering léger + micro-interactions + basket discret + 3D terrain).
- [ ] Aucun nouveau module/rôle/section/statistique/type.
- [ ] Palette **complète** (toutes les catégories imposées, aucun token en plus).
- [ ] Contrastes **traités honnêtement** (couples recommandés + mention « à vérifier », aucune mesure inventée).
- [ ] Composants **limités** aux listes imposées (base + HoopBoard).
- [ ] Accent **orange** dominant mais **non envahissant** ; rouge réservé erreurs/destructif/manqué.
- [ ] Données démo **identifiables** (badge, Option A).
- [ ] Jamais de sens porté par la **couleur seule**.
- [ ] Match live conforme à `05`, HoopFeed conforme à `06`.
- [ ] `prefers-reduced-motion` respecté ; cibles ≥ 44×44.
- [ ] Aucun fichier applicatif modifié.

---
*Fin du design system. Aucune modification apportée aux fichiers applicatifs.*
