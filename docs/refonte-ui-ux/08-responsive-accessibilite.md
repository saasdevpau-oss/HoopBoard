# HoopBoard — Responsive & Accessibilité

> Sources : [`00`](00-audit-technique.md) · [`01`](01-inventaire-ecrans.md) · [`02`](02-audit-ux.md) · [`03`](03-information-architecture.md) · [`04`](04-design-system.md) · [`05`](05-match-live.md) · [`06`](06-hoopfeed.md) · [`07`](07-strategie-3d.md).
> Clone : `HOOPBoard serieux/Stack claude/HoopBoard`, HEAD **`ad0af1d` (PR4.5)**.
> Nature : **spécification**. Aucun code, aucun fichier applicatif modifié.

## 1. Périmètre
- Règles responsive et accessibilité pour les fonctions **déjà définies**. Aucune fonction/section/rôle nouveau. Hors sujet → `Hors périmètre`.
- Respecte strictement l'architecture (`03`), le match live (`05`), HoopFeed (`06`), la stratégie 3D (`07`) et les tokens/grille (`04`).
- Breakpoints de référence **exactement** : **375 · 768 · 1024 · 1440 px** (aucun autre) ; comportement **fluide** entre ces valeurs.

## 2. Principes responsive
- **Mobile-first** pour le match live ; conception **séparée** mobile / tablette (jamais un simple agrandissement du mobile).
- **Une grille unique** (`04` §12), densité par section (`04` §13).
- **Aucune page ne devient un mur de cartes** ; divulgation progressive (`03`).
- **Cibles ≥ 44×44 px** partout, même en densité compacte.
- **2D toujours dispo**, 3D facultative (`07`).

## 3. 375 px (mobile)
- **Navigation** : barre basse 5 entrées + « Plus » (`03`) ; **aucune sidebar**. Titre d'écran + retour explicite.
- **Une colonne principale** ; détails secondaires en **drawers**.
- **Aujourd'hui** : blocs empilés, dernière publication + raccourcis ; pas de mur de stats.
- **Équipe** : liste de joueurs en lignes compactes ; fiche joueur en écran plein (onglets internes).
- **Matchs** : liste par état (À venir/En cours/Terminé) ; fiche match à onglets.
- **Entraînements** : zones + drills empilés.
- **Analyse** : un graphique à la fois, pleine largeur ; heatmap/carte 2D pleine largeur.
- **HoopFeed** : ordre vertical en-tête → création → filtres (scroll H) → publications pleine largeur (`06` §24).
- **Club / Paramètres** : listes simples.
- **Match live** : ordre des 5 zones de `05` §21 ; **score/chrono toujours lisibles** (sticky top) ; actions au pouce (sticky bottom) ; terrain contextuel ; historique réduit ; aucune table large ; aucune nav principale.
- **Fiche joueur** : résumé → onglets stats/matchs/objectifs.
- **Tableaux** : scroll horizontal contrôlé, colonne joueur fixe, colonnes prioritaires (Pts/Reb/Pd/Éva) ; pas d'illisibilité.
- **Graphiques** : simplifiés, légende compacte, tooltip au tap.
- **Terrain** : pleine largeur, zones ≥ 44 px.
- **3D** : **facultative** (fallback 2D par défaut).

## 4. 768 px (tablette portrait)
- **Navigation** : **drawer** ou version élargie de la nav mobile (pas de sidebar complète).
- **Une ou deux colonnes** selon la page (jamais un simple agrandissement mobile).
- **Terrain plus grand** ; formulaires plus confortables.
- **HoopFeed** : colonne centrée, largeur de lecture confortable.
- **Tableaux** : plus de colonnes visibles, **scroll contrôlé** si besoin.
- **Analyse** : graphique large + légende latérale possible.
- **Match live** : portrait selon `05` §22 (score, joueurs, actions, terrain, historique).
- **3D** : confortable à la demande.

## 5. 1024 px (tablette paysage / petit desktop)
- **Sidebar réduite** (rail d'icônes).
- **Deux colonnes** ; **liste + détail** (Équipe→fiche, Matchs→détail, HoopFeed→panneau).
- **Terrain et commandes côte à côte** ; graphiques plus larges.
- **Match live** : **paysage optimisé** — terrain large à gauche, joueurs/actions/historique à droite (`05` §22). **Meilleure expérience au bord du terrain.**
- **Analyse** : vue d'ensemble + détail simultanés.
- **3D** : pleine, panneau dédié.

## 6. 1440 px (desktop large)
- **Sidebar complète** ; **largeur max de contenu 1200** (pas d'étirement).
- **Deux à trois colonnes maximum** selon la page ; **panneaux secondaires** (profil, détail, filtres).
- **HoopFeed** : fil + panneau secondaire (2 colonnes, pas de 3ᵉ colonne de suggestions, `06` §26).
- **Analyse** : plusieurs graphiques alignés sans devenir un mur de cartes.
- **3D** : pleine.
- **Aucune page ne devient un mur de cartes.**

## 7. Huit sections coach
| Section | Densité | Largeur | Colonnes | Composant principal | Secondaire | Mobile | Tablette | Desktop |
|---|---|---|---|---|---|---|---|---|
| Aujourd'hui | standard | max contenu | 1→2 | carte prochain match | raccourcis, dernière pub | 1 col empilée | 2 col | 2 col + panneau |
| Équipe | standard | max contenu | 1→2 | tableau/liste effectif | fiche joueur | liste → écran fiche | liste + détail | liste + détail |
| Matchs | standard | max contenu | 1→2 | liste par état | fiche match | 1 col | 2 col | liste + détail |
| Entraînements | standard | max contenu | 1→2 | zones/drills | objectifs | 1 col | 2 col | 2 col |
| Analyse | standard | large | 1→2 | graphique/heatmap/carte | filtres, détail | 1 graphe/écran | graphe + légende | vue d'ensemble + détail |
| HoopFeed | confortable | lecture | 1→2 | fil de publications | profil/détail | 1 col (`06`) | centré | fil + panneau |
| Club | standard | étroit | 1 | identité club | — | 1 col | 1 col | 1 col centré |
| Paramètres | standard | étroit | 1 | listes de réglages | — | 1 col | 1 col | 1 col centré |

Aucune section ajoutée.

## 8. Espace joueur
- Mêmes principes ; **consultation** + interactions HoopFeed (`03`/`06`).
- 375 : barre basse, 1 colonne, fiches à onglets. 768/1024 : liste + détail (profil, matchs, objectifs, stats). 1440 : contenu centré, panneau secondaire pour HoopFeed.
- Pas de saisie live, pas d'effectif, pas de dashboard d'équipe.

## 9. Match live
- Conforme à `05` (ordre mobile, tablette paysage, 3 modes, 4 statuts, Option A). Ce document n'ajoute que le placement responsive :
  - **375** : 5 zones verticales (`05` §21), score sticky top, actions sticky bottom.
  - **768 portrait** : score / joueurs / actions / terrain / historique.
  - **1024 paysage** : terrain large à gauche (≈55–60 %) + colonne droite joueurs/actions/historique.
  - **1440** : idem paysage, terrain plus grand, historique développé.
- Score/chrono **toujours visibles** ; cibles ≥ 44 ; densité compacte.

## 10. HoopFeed
- Conforme à `06`. Responsive : 1 colonne (375/768 portrait), fil + panneau (1024/1440). Filtres scroll H sur mobile. Cartes pleine largeur mobile, largeur de lecture centrée au-delà.

## 11. Tableaux
- **Mobile** : scroll horizontal contrôlé, **colonne joueur fixe**, colonnes prioritaires (Pts/Reb/Pd/Éva) visibles ; pas de conversion automatique en cartes.
- **Tablette/desktop** : plus de colonnes ; hover de ligne ; en-tête `surface-secondary` ; chiffres tabulaires alignés à droite.
- **Box score** : colonne joueur figée, scroll pour les colonnes détaillées.
- Champs prioritaires toujours visibles : joueur, minutes, points, rebonds, passes, évaluation.

## 12. Graphiques
- Titre + unité + période + légende + tooltip + état vide (`04` §20).
- **Motif/forme** en plus de la couleur ; séries limitées.
- Mobile : un graphique par écran, légende compacte. Tablette/desktop : plus larges, comparaisons possibles.
- `demo:true` signalé (badge, `04` §21).

## 13. Terrain
- Zones ≥ 44 px ; marqueurs point (marqué) / croix (manqué).
- Mobile : pleine largeur, contextuel dans le live. Tablette/desktop : plus grand, permanent en analyse/paysage.
- 2D de référence ; 3D optionnelle (`07`).

## 14. 3D
- Facultative, différée, fallback 2D (`07`). Mobile : 2D par défaut. Tablette/desktop : 3D à la demande. `prefers-reduced-motion` → 2D statique.

## 15. Checklist accessibilité (18 points imposés)
1. **Contraste** : AA (texte 4,5:1, grand texte/interactif 3:1) ; couples `04` §5 **à vérifier au calcul**.
2. **Focus visible** : anneau `border-focus` 2 px sur tout élément focusable.
3. **Navigation clavier** : tous les parcours (nav, live, HoopFeed, formulaires) opérables au clavier.
4. **Ordre de lecture** : logique et cohérent avec l'ordre visuel.
5. **Taille tactile** : ≥ 44×44 px, même en densité compacte.
6. **Labels** : chaque contrôle nommé (boutons icône, champs avec `<label>`, pas placeholder seul).
7. **Texte alternatif** : pour tout média/illustration porteur de sens (sinon décoratif ignoré).
8. **Graphiques sans dépendance à la couleur** : forme/motif/valeur en complément.
9. **Terrain compréhensible** : lignes lisibles, zones nommées, marqueurs point/croix.
10. **Réduction des mouvements** : `prefers-reduced-motion` respecté (transitions minimales, 3D → 2D).
11. **Erreurs** : associées au contrôle, texte + icône, jamais couleur seule.
12. **États de sauvegarde** : 4 statuts (`05`) lisibles, icône + texte, annoncés (live-region).
13. **Tableaux** : en-têtes de colonnes/lignes explicites, associations correctes, scroll accessible.
14. **Modales et drawers** : focus piégé, Échap ferme, retour du focus à l'origine.
15. **Chronomètre** : lisible, état annoncé (en cours/pause), non porté par la couleur seule.
16. **Scores** : fort contraste, grande taille, chiffres tabulaires.
17. **Zoom texte** : lisible et utilisable jusqu'à **200 %** sans perte de fonction.
18. **Lisibilité en gymnase** : contraste élevé, grandes cibles, scores dominants, éviter le texte fin gris sur sombre pour l'info critique.

Aucun volet juridique.

## 16. Tests manuels (15 scénarios imposés)
1. Ouvrir **Aujourd'hui à 375 px** → 1 colonne, pas de mur de stats, raccourcis accessibles.
2. Consulter l'**effectif à 375 px** → colonne joueur fixe, colonnes prioritaires lisibles, scroll contrôlé.
3. Consulter un **box score à 375 px** → tabulaire lisible, colonne joueur figée.
4. Consulter **Analyse à 375 px** → un graphique/écran, légende + unité + période présentes.
5. Utiliser **HoopFeed à 375 px** → ordre en-tête/création/filtres/publications, actions ≥ 44 px.
6. Utiliser le **match live à 375 px** → score sticky, actions au pouce, terrain contextuel, aucune perte au changement d'action.
7. Utiliser le **match live à 768 px portrait** → ordre score/joueurs/actions/terrain/historique.
8. Utiliser le **match live à 1024 px paysage** → terrain large gauche + colonne droite ; saisie rapide.
9. Consulter **Analyse à 1024 px** → vue d'ensemble + détail côte à côte.
10. Consulter **HoopFeed à 1440 px** → fil + panneau, pas de 3ᵉ colonne, pas de mur de cartes.
11. Activer **`prefers-reduced-motion`** → animations réduites, 3D → 2D.
12. Naviguer **uniquement au clavier** → focus visible, tout atteignable, drawers/modales piégés.
13. **Zoomer le texte à 200 %** → aucune perte de fonction, pas de chevauchement bloquant.
14. **Appareil faible avec la 3D** → fallback 2D automatique, état de chargement/erreur propre.
15. Afficher des **données `demo:true`** → badge « Données de démonstration » visible, non confondu avec du réel.

Aucun autre scénario.

## 17. Critères d'acceptation
- [ ] Breakpoints **exactement** 375/768/1024/1440 ; comportement fluide entre.
- [ ] Mobile et tablette **conçus séparément** (pas d'agrandissement).
- [ ] **Aucune sidebar** à 375 ; barre basse (`03`).
- [ ] Match live conforme à `05` (ordre, statuts, modes) ; HoopFeed conforme à `06`.
- [ ] Tableaux lisibles sur mobile **sans** conversion automatique en cartes.
- [ ] **2D toujours disponible** ; 3D facultative, fallback systématique.
- [ ] Cibles **≥ 44×44** partout ; **zoom 200 %** utilisable.
- [ ] Accessibilité intégrée (18 points) ; jamais de sens par la couleur seule.
- [ ] Données démo identifiables.
- [ ] **Aucune page** en mur de cartes.
- [ ] Aucun fichier applicatif modifié.

## 18. Éléments `À décider plus tard`
(Communs à la refonte visuelle, cf. `04`/`07`) : thème clair ; bibliothèque graphique ; bibliothèque 3D ; technologie de rendu 3D ; police d'affichage finale après test ; seuil exact de désactivation automatique de la 3D ; disponibilité de l'animation tactique ; disponibilité de la visualisation d'exercice.

---
*Fin du document responsive & accessibilité. Aucune modification apportée aux fichiers applicatifs.*
