# HoopBoard — Checklist de régression

> Compagnon de [`09-plan-implementation.md`](09-plan-implementation.md). Clone `HOOPBoard serieux/Stack claude/HoopBoard`, HEAD **`ad0af1d` (PR4.5)**.
> À exécuter sur la **preview Vercel** de chaque PR de lot avant fusion. **34 points imposés**, aucun ajout.
> Statut initial de tous les points : **À tester**. (Statuts possibles ensuite : À tester · OK · KO.)

| # | Point | Test | Résultat attendu | Breakpoint | Lot responsable | Statut |
|--:|---|---|---|---|---|---|
| 1 | Landing page | Ouvrir `/` | Landing s'affiche, promesse alignée au produit, CTA vers espaces | tous | Lot 10 (base : Lot 0) | À tester |
| 2 | Navigation coach | Parcourir les 8 entrées + « Plus » | Toutes accessibles, état actif fidèle à l'écran | tous | Lot 1 | À tester |
| 3 | Navigation joueur | Parcourir Accueil/Profil/Matchs/Entraînements/Objectifs/Statistiques/HoopFeed/Paramètres | Toutes accessibles, cohérentes | tous | Lot 1 (joueur : Lots 2/5/6/7) | À tester |
| 4 | Dashboard Aujourd'hui | Ouvrir Aujourd'hui | Blocs autorisés uniquement, pas de mur de stats, états vides gérés | tous | Lot 1 | À tester |
| 5 | Effectif | Ouvrir Équipe › Effectif | Tableau lisible, colonne joueur fixe, colonnes prioritaires, hydratation OK | 375/1024 | Lot 2 | À tester |
| 6 | Profil joueur | Ouvrir une fiche joueur | Onglets Résumé/Stats/Matchs/Objectifs/Progression, aucune donnée médicale/admin | tous | Lot 2 | À tester |
| 7 | Matchs | Ouvrir Matchs | Liste par état (À venir/En cours/Terminé), fiche match à onglets | tous | Lot 3 | À tester |
| 8 | Match live | Entrer en mode banc | Isolé (nav masquée), 5 zones présentes, mode par défaut chargé | tous | Lot 4 | À tester |
| 9 | Score | Modifier score HB et adverse + correction manuelle | Deux scores éditables, jamais négatif, correction sans stat joueur | tous | Lot 4B | À tester |
| 10 | Tirs | Enregistrer un tir marqué puis manqué (Option A) | Point/croix sur carte, score mis à jour, ≤ 3 gestes, pas de popup bloquante | tous | Lot 4D | À tester |
| 11 | Fautes | Ajouter une faute joueur/équipe | Compteur incrémenté, total correct | tous | Lot 4C/4D | À tester |
| 12 | Undo | Annuler 3 actions | Score, stat joueur, carte, historique corrigés ensemble (aucune divergence) | tous | Lot 4A | À tester |
| 13 | Terrain | Sélectionner des zones, poser des tirs | Zones ≥ 44 px, marqueurs point/croix, carte 2D à jour | tous | Lot 4D / Lot 6 (analyse) | À tester |
| 14 | Statistiques | Consulter stats équipe/joueurs (Analyse) | Valeurs correctes, données demo signalées | tous | Lot 6 | À tester |
| 15 | Box score | Ouvrir le box score d'un match terminé | Tabulaire lisible, colonne joueur figée, chiffres tabulaires | 375/1024 | Lot 3 | À tester |
| 16 | Entraînements | Ouvrir Training Hub | Zones → drills, pas de créateur ni d'historique (hors périmètre) | tous | Lot 5 | À tester |
| 17 | Objectifs | Consulter les objectifs | Barres de progression affichées, statut clarifié | tous | Lot 5 / Lot 2 (joueur) | À tester |
| 18 | HoopFeed | Ouvrir HoopFeed, consulter 10 publications | Fil ordonné (chrono + priorité type), 5 types, Suivre absent, compteurs masqués | tous | Lot 7A | À tester |
| 19 | Likes | Liker puis retirer | Bascule + compteur, like secondaire, ordre du fil inchangé | tous | Lot 7C | À tester |
| 20 | Commentaires | Ajouter puis supprimer son commentaire | Ajout immédiat, 1 seul niveau, suppression du sien uniquement | tous | Lot 7C | À tester |
| 21 | Données demo | Afficher un bloc `demo:true` | Badge « Données de démonstration » visible, non confondu avec du réel | tous | Lot 0 (badge) / Lots 2,6 | À tester |
| 22 | Formulaire bêta | Soumettre le formulaire (landing) | États chargement/succès/erreur/offline corrects | 375/desktop | Lot 10 | À tester |
| 23 | API bêta | POST `/api/beta` via le formulaire | Réponse 201 + message ; validation email ; (non persisté, inchangé) | — | Lot 10 (non modifié) | À tester |
| 24 | API events | Vérifier `/api/events` non régressé | Endpoint inchangé (non branché au front) ; live utilise timeline locale | — | Lot 4 (non modifié) | À tester |
| 25 | Responsive 375 | Parcourir les sections à 375 px | 1 colonne, aucune sidebar, cibles ≥ 44, pas de table illisible | 375 | Lot 8 (base : chaque lot) | À tester |
| 26 | Responsive 768 | Parcourir à 768 px | Drawer/nav élargie, 1–2 colonnes, terrain plus grand | 768 | Lot 8 | À tester |
| 27 | Responsive 1024 | Parcourir à 1024 px | Rail réduit, liste+détail, live paysage optimisé | 1024 | Lot 8 | À tester |
| 28 | Responsive 1440 | Parcourir à 1440 px | Sidebar complète, contenu max 1200, pas de mur de cartes | 1440 | Lot 8 | À tester |
| 29 | Clavier | Naviguer au clavier | Tout atteignable, focus visible, modales/drawers piégés | tous | Lot 8 | À tester |
| 30 | Reduced motion | Activer `prefers-reduced-motion` | Animations réduites, 3D → 2D | tous | Lot 8 / Lot 9 | À tester |
| 31 | Erreurs | Provoquer une erreur (API/like/commentaire/publication) | Message clair + réessai, jamais couleur seule | tous | Lot 7G / Lot 8 | À tester |
| 32 | Chargements | Observer les chargements (hydratation, feed) | État visible (squelette/indicateur), pas de silence | tous | Lot 8 (base : Lots 1,2,6,7) | À tester |
| 33 | Performance | Charger les pages (dont 3D) | Pas de blocage, lazy-load 3D, fallback appareil faible | tous | Lot 8 / Lot 9 / Lot 10 | À tester |
| 34 | Preview Vercel | Ouvrir la preview de la PR | Preview générée, branche de prod vérifiée avant fusion | tous | Toutes les PR | À tester |

---
*Fin de la checklist de régression (34 points). Aucune modification apportée aux fichiers applicatifs.*
