# HoopBoard — Conception UX de HoopFeed

> Suite de [`00`](00-audit-technique.md) · [`01`](01-inventaire-ecrans.md) · [`02`](02-audit-ux.md) · [`03`](03-information-architecture.md).
> Clone : `HOOPBoard serieux/Stack claude/HoopBoard`, HEAD **`ad0af1d` (PR4.5)**.
> Nature : **spécification UX** de HoopFeed, prête à implémenter. **Aucun code, aucune couleur, aucun fichier applicatif modifié.**
> Périmètre : **HoopFeed uniquement**. Hors sujet → `Hors périmètre`. Non tranché → `À décider plus tard`.

---

## 1. Périmètre strict

- On conçoit **HoopFeed** (aujourd'hui présent uniquement côté joueur, `joueur.html#view-feed`) et son extension **côté coach**, à partir des fonctions existantes (publications, auteurs, texte, médias SVG, likes, double-clic, commentaires locaux, Suivre, profil, compteurs, Message/Partager inertes) et des évolutions **explicitement autorisées** ici.
- **Deux expériences** : coach, joueur. Aucun autre rôle.
- **Interdits** (non conçus, non recommandés) : parent, responsable légal, staff, modérateur, messagerie/conversation, réseau public, découverte d'inconnus, recommandations algorithmiques, stories, vidéos courtes, live, marketplace, hashtags avancés, classement de popularité, gamification, juridique/administratif, médical, toute fonction hors HoopFeed. → `Hors périmètre`.
- **Cinq types de publication** exactement (aucun sixième). **Une seule réaction** : Like. **Un seul niveau** de commentaires.

---

## 2. Contexte actuel (confirmé en `01`/`02`)

- HoopFeed n'existe **que côté joueur** ; fil **mono-auteur** (`@sylvainfrancisco`), 3 posts figés.
- Médias = **scènes SVG décoratives** (pas de vraie image/vidéo).
- Likes : `setLiked` (compteur depuis `data-count`), double-clic média = like + burst.
- Commentaires : 2 pré-remplis/post ; ajout local `<b>moi</b>` (échappe `<`), non persisté.
- **Suivre** : toggle de libellé (`Suivre`↔`Abonné`), client only.
- **Compteurs** figés : Posts 12 · Abonnés 15,3k · Suivis 183.
- **Message** et **Partager** : **inertes** (aucun handler).
- Limites : aucune persistance, aucune création, aucun HoopFeed coach, logique de popularité trop visible, rôle produit flou (audit `02` UX-P1-007).

---

## 3. Positionnement imposé

> **HoopFeed = le fil privé de l'équipe, centré sur les informations, les performances et les échanges liés au basket.**

Il **n'est pas** : une copie d'Instagram, un réseau public, une messagerie, le dashboard principal, une plateforme de contenu généraliste.
Il **reste distinct** de : Aujourd'hui, Matchs, Entraînements, Analyse, Profil joueur (cf. `03` §6).

---

## 4. Principes UX

- **Utilité d'équipe avant social** : le contenu (info coach, perf, progression, entraînement) prime ; les mécaniques sociales (like, Suivre, compteurs) sont **secondaires**.
- **Fil privé** : visible uniquement au sein de l'équipe ; aucun suivi externe, aucune découverte d'inconnus.
- **Pas de popularité** : l'ordre ne dépend jamais des likes ; aucun classement.
- **Chronologie compréhensible** : ordre principalement chronologique + légère priorité par type (règle simple, §7).
- **Honnêteté** : aucun bouton inerte présenté comme actif (corrige Message/Partager).
- **Séparation des espaces** : Aujourd'hui = résumé + raccourci ; HoopFeed = historique.
- **Accessibilité par défaut** : forme + couleur, focus visible, `prefers-reduced-motion`.

---

## 5. Différences coach / joueur

| Capacité | Coach | Joueur |
|---|---|---|
| Consulter le fil | ✅ | ✅ |
| Ouvrir une publication | ✅ | ✅ |
| Liker / retirer le like | ✅ | ✅ |
| Commenter (1 niveau) | ✅ | ✅ |
| Supprimer **son propre** commentaire | ✅ | ✅ |
| Publier — type **Publication du coach** | ✅ | ❌ |
| Publier — types Performance / Progression / Entraînement | ✅ | ❌ (consultation) |
| Publier — **Publication joueur** | ❌ | ✅ *(si activé, `À décider plus tard`)* |
| Supprimer / masquer **sa propre** publication | ✅ *(si retenu)* | ✅ *(sa publication joueur, si activé)* |
| Consulter un profil de l'équipe | ✅ | ✅ |
| Réseau public / message privé / suivi externe / classement | ❌ | ❌ |

Aucune console de modération. Aucune capacité au-delà de ce tableau.

---

## 6. Structure du fil

**Quatre zones permanentes maximum** :

1. **En-tête HoopFeed** (titre + éventuel badge de nouveauté, §20).
2. **Création rapide / bouton Publier** (coach ; joueur si activé).
3. **Filtres simples** (§8).
4. **Liste des publications** (§10).

Aucune 5ᵉ zone permanente. Panneaux temporaires seulement pour : détail d'une publication, profil compact, formulaire de création.

---

## 7. Ordre du fil

- **Principalement chronologique** (plus récent en haut).
- **Légère priorité par type** en cas d'égalité de fraîcheur / regroupement récent, dans cet ordre :
  1. Publication du coach
  2. Performance de match
  3. Entraînement ou objectif
  4. Progression joueur
  5. Publication joueur
- **Règle simple et compréhensible** : « le plus récent d'abord ; à fraîcheur proche, le contenu d'équipe/coach passe avant le contenu social ». Le lecteur doit pouvoir prédire l'ordre.
- **Interdits** : score de popularité, nombre de likes, taux d'engagement, algorithme personnalisé, recommandation IA.
- **Publication épinglée par le coach** : `Évolution future — à décider plus tard`.

---

## 8. Filtres

Exactement cinq, non extensibles : **Tout · Équipe · Matchs · Progression · Entraînements**.
- « Équipe » = Publications du coach + Publications joueur ; « Matchs » = Performances de match ; « Progression » = Progression joueur ; « Entraînements » = Entraînement ou objectif.
- Les filtres **restreignent** la liste **sans changer** l'ordre chronologique interne (pas de réordonnancement opaque).
- État actif du filtre clairement visible (§27).

---

## 9. Types de publications (cinq, imposés)

| # | Type | Auteur | Contenu autorisé | Lien interne |
|---|---|---|---|---|
| 1 | **Publication du coach** | Coach | Message d'équipe, retour post-match, objectif collectif, info d'entraînement | facultatif |
| 2 | **Performance de match** | Coach (ou système futur) | Résultat, score, stat principale, joueur mis en avant | Match / récap |
| 3 | **Progression joueur** | Coach / Joueur | Stats, objectifs, progrès **déjà présents** dans l'espace joueur | Profil / objectif |
| 4 | **Entraînement ou objectif** | Coach | Training Hub, exercice, zone à travailler, objectif existant | Entraînement / objectif |
| 5 | **Publication joueur** | Joueur | Contenu court dans le cadre de l'équipe | facultatif |

- Aucune donnée inventée : les types 2/3/4 s'appuient sur des données **déjà présentes** (Matchs, Profil, Training Hub).
- **Génération automatique** de publications (ex. perf publiée après un match) : `Évolution future — absente actuellement`.
- Aucun 6ᵉ type.

---

## 10. Carte de publication

**Contenu (uniquement les éléments nécessaires)** : auteur · rôle (coach/joueur) · avatar · date/ancienneté · type · texte · média éventuel · statistique éventuelle · lien interne (match/profil/objectif/entraînement) · nombre de likes · nombre de commentaires · bouton like · bouton commentaire · **menu minimal**.

**Menu minimal** (uniquement) :
- Supprimer **sa propre** publication.
- Masquer une publication *(`À décider plus tard`)*.
- Signaler une erreur de contenu *(`À décider plus tard`)*.

Pas de signalement juridique, pas de système de modération détaillé. Le **type** et le **rôle** sont affichés discrètement (repère de contexte, pas de mise en avant sociale).

---

## 11. Likes

- **Emplacement** : dans la barre d'actions de la carte, **discret**, jamais plus visible que le contenu.
- **État actif** : cœur plein quand liké (forme + couleur, pas couleur seule).
- **Retrait du like** : re-tap → revient à l'état inactif.
- **Compteur** : nombre affiché sobrement ; **n'influence pas l'ordre** du fil, **n'est pas** un indicateur de statut.
- **Feedback** : bascule 150–250 ms (§28).
- **Persistance future** : `À décider plus tard` (le like doit à terme survivre au rechargement).
- **Hors connexion futur** : `À décider plus tard`.
- **Une seule réaction** : Like. Aucune autre réaction.

---

## 12. Commentaires

- **Ouverture** : depuis le bouton commentaire de la carte (compteur), ouvre la liste.
- **Liste** : auteur · date · texte. **Un seul niveau** — aucune réponse imbriquée.
- **Champ d'ajout** : saisie + envoi (bouton ou Entrée).
- **Envoi** : ajoute le commentaire en bas de la liste, feedback immédiat.
- **Erreur** : message clair + possibilité de réessayer, texte conservé.
- **Suppression** : seulement **son propre** commentaire.
- **Nombre de niveaux** : **exactement 1**.
- **Interdits** : mentions, GIF, pièces jointes, réactions sur commentaires, messages vocaux, modération complexe. → `Hors périmètre`.

---

## 13. Bouton Suivre

**Option A — Supprimer visuellement** (logique technique conservée, non exposée).
**Option B — Conserver uniquement pour suivre les publications d'un joueur de l'équipe** (aucun suivi externe).

| | Avantages | Risques |
|---|---|---|
| A | Cohérent avec « fil privé d'équipe » (tout le monde voit tout) ; supprime la sémantique réseau social ; zéro logique de popularité | Perte d'un contrôle de filtrage par joueur (mais couvert par le profil) |
| B | Permet de suivre un coéquipier | Réintroduit une **sémantique d'abonnement** proche du réseau social ; incohérent avec un fil déjà commun à l'équipe ; ouvre la porte aux compteurs d'abonnés |

**✅ Recommandation : Option A — supprimer visuellement le bouton Suivre.** Dans un fil **privé d'équipe**, tous les membres voient déjà tout : « suivre » n'a pas de sens et importe une logique de popularité à éviter. Le besoin « voir les publications d'un joueur » est couvert par le **profil** (§15). La logique technique peut rester dormante.

---

## 14. Abonnés et abonnements

**Option A — Masquer les compteurs.**
**Option B — Les rendre très secondaires** (zone secondaire du profil).

**✅ Recommandation : Option A — masquer les compteurs** (Abonnés/Abonnements). Cohérent avec la suppression du bouton Suivre (§13) : sans abonnement, les compteurs n'ont plus d'objet et véhiculent une logique de popularité proscrite. Le profil conserve des indicateurs **sportifs** (stats, objectifs), pas sociaux.

> Cohérence garantie : Suivre supprimé (A) + compteurs masqués (A).

---

## 15. Profils

**Profil joueur (lié à HoopFeed)** — uniquement : avatar · nom · équipe · numéro · poste (si déjà présent) · statistiques principales · objectifs · publications · **likes reçus si cette donnée existe déjà**.

**Profil coach** — uniquement : avatar · nom · rôle coach · équipe · publications.

- **Interdits** : biographie libre complexe, liens externes, badges, classement, abonnements publics, galerie média, profil public hors équipe. → `Hors périmètre`.
- Le profil sert d'accès aux **publications d'un auteur de l'équipe** (remplace le besoin de « Suivre »).

---

## 16. Création d'une publication (≤ 5 étapes)

1. **Ouvrir le formulaire** (bouton Publier).
2. **Sélectionner le type** (parmi les 5 autorisés ; joueur limité à « Publication joueur »).
3. **Écrire le contenu** (texte, contenu requis).
4. **Ajouter éventuellement un lien interne** (match / joueur / entraînement / objectif — uniquement).
5. **Publier** → aperçu bref → confirmation.

**Écran coach** : liste (fil) + bouton Publier proéminent mais secondaire au contenu. **Aperçu** avant publication. **Confirmation** après. **Erreur** : message + texte conservé. **État vide** : voir §22.

**Le formulaire ne propose pas** : programmation avancée, ciblage d'audience, pièces jointes complexes, vidéo, sondage, localisation, hashtags, paramètres publicitaires. → `Hors périmètre`.

---

## 17. Médias

**Option A — Aucun média** dans la première version.
**Option B — Une image unique.**

| | Avantages | Risques |
|---|---|---|
| A | Simple, rapide, aucun stockage/modération d'image, focalise sur le texte + liens internes | Publications moins riches visuellement |
| B | Plus expressif | Impose stockage, redimensionnement, texte alternatif, risque de contenu inapproprié (équipe avec mineurs), modération |

**✅ Recommandation : Option A — aucun média dans la première version.** Elle évite stockage/modération d'images dans un contexte d'équipe (mineurs), reste rapide, et s'appuie sur le **texte + liens internes + blocs statistiques** déjà disponibles. **Image unique = `À décider plus tard`.**
Interdits dans tous les cas : galerie, vidéo, audio, document, lien externe, média généré par IA. → `Hors périmètre`.

> Note : les médias SVG décoratifs actuels ne sont pas de vraies images ; ils peuvent servir d'illustration de type (perf/match) sans upload.

---

## 18. Liens internes (HoopFeed ↔ produit)

Uniquement ces liens :
- **Matchs → HoopFeed** : une performance/récap **peut** être publiée plus tard (`Évolution future` pour l'automatique).
- **Entraînements → HoopFeed** : un objectif/exercice peut être partagé.
- **Profil joueur → HoopFeed** : accès aux publications du joueur.
- **HoopFeed → Matchs** : ouvrir le match lié.
- **HoopFeed → Entraînements** : ouvrir l'entraînement/objectif lié.
- **HoopFeed → Profil** : ouvrir l'auteur.

Aucun autre lien. Publications automatiques : `Évolution future — absente actuellement`.

---

## 19. Relation avec « Aujourd'hui »

- **Aujourd'hui** : résumé court + raccourcis ; affiche **uniquement** la **dernière publication importante** + un **lien vers HoopFeed**. Ne reproduit **pas** tout le fil.
- **HoopFeed** : **historique chronologique** complet des publications de l'équipe.
- Séparation stricte : Aujourd'hui ne devient jamais le fil ; HoopFeed ne devient jamais le dashboard (`03` §6/§7).

---

## 20. Notifications limitées

Cette mission ne conçoit **pas** un système complet de notifications. Uniquement :
- **Badge** sur l'entrée HoopFeed (nav).
- **Indicateur de nouvelle publication** dans le fil.
- **Indicateur de nouveau commentaire sur sa propre publication**.

Aucun autre type. Push / e-mail / navigateur : `À décider plus tard`.

---

## 21. Actions inertes actuelles

- **Message** : **retiré de l'interface** de HoopFeed (aucune messagerie n'est conçue). → décision ferme (pas d'option).
- **Partager** :
  - Option A — retirer visuellement ;
  - Option B — copier un **lien interne HoopBoard**.
  **✅ Recommandation : Option B — copier un lien interne HoopBoard** (vers la publication/le contenu, au sein du produit). Aucun partage vers un réseau externe. Cohérent avec un fil privé : le « partage » devient « copier le lien interne » pour renvoyer un coéquipier à un contenu précis. *(Si l'implémentation du lien interne n'est pas prête : repli sur Option A, `À décider plus tard`.)*
- **Suivre** : traité en §13 (supprimé visuellement).

---

## 22. États vides (cinq, imposés)

| État | Message principal | Explication | Action |
|---|---|---|---|
| Aucun contenu dans HoopFeed | « Le fil de l'équipe est vide » | Aucune publication n'a encore été partagée | Publier (coach) / — (joueur) |
| Aucune publication du coach | « Aucune information du coach pour l'instant » | Le coach n'a rien publié | Filtrer « Tout » / Publier (coach) |
| Aucun résultat avec le filtre | « Aucune publication pour ce filtre » | Ce filtre ne contient rien pour le moment | Revenir à « Tout » |
| Aucun commentaire | « Aucun commentaire — soyez le premier » | La publication n'a pas encore de commentaire | Ajouter un commentaire |
| Aucune publication sur un profil | « Ce membre n'a rien publié » | L'auteur n'a pas de publication | Revenir au fil |

Aucun autre état vide.

---

## 23. États de chargement et erreurs

- **Chargement initial** : squelette de cartes (non bloquant).
- **Chargement de publications supplémentaires** : indicateur en bas de liste.
- **Échec du chargement** : message + « Réessayer ».
- **Échec de publication** : message + texte conservé + « Réessayer ».
- **Échec du like** : revient à l'état précédent + indication discrète.
- **Échec du commentaire** : texte conservé + « Réessayer ».
- **Hors connexion futur** : `À décider plus tard`.
- Aucune technologie choisie.

---

## 24. Mobile (~375 px)

**Ordre vertical exact** :
1. **En-tête** HoopFeed.
2. **Bouton / zone de création** (coach ; joueur si activé).
3. **Filtres horizontaux** (défilables).
4. **Publications** (liste).

- **Largeur des cartes** : pleine largeur (marges latérales), une colonne.
- **Média** (si un jour activé) : pleine largeur de carte, ratio contraint.
- **Actions like/commentaire** : boutons ≥ 44 px, atteignables au pouce.
- **Ouverture des commentaires** : dans la carte ou panneau glissant, sans quitter le fil.
- **Création** : le formulaire s'ouvre en panneau plein écran (≤ 5 étapes, §16).
- **Menu de carte** : accessible via un contrôle discret (kebab), cible ≥ 44 px.
- **Chargement supplémentaire** : au défilement / bouton « Voir plus ».
- **Navigation** : celle définie en `03` (barre inférieure), **non modifiée ici**.

---

## 25. Tablette

- **Portrait** : une **colonne principale centrée** (fil), largeur de lecture confortable.
- **Paysage** : **deux colonnes maximum** — fil principal (gauche) + **panneau secondaire facultatif** (droite) pour profil compact ou détail d'une publication sélectionnée.
- Aucune fonction spécifique tablette ajoutée.

---

## 26. Desktop

- **Deux colonnes maximum** : fil (principale) + panneau secondaire (profil, filtres, ou publication sélectionnée).
- **Pas** de troisième colonne de suggestions/tendances. Aucune fonction ajoutée.

---

## 27. Accessibilité

- **Ordre de lecture** : en-tête → création → filtres → publications ; chaque carte lue auteur → type → texte → actions.
- **Focus clavier** : ordre logique, focus visible sur cartes, boutons, champ commentaire, filtres.
- **Boutons like/commentaire** : rôle et label explicites (« Aimer », « Commenter »), état annoncé.
- **Labels** : tous les contrôles nommés ; champ commentaire avec label (pas placeholder seul).
- **Taille tactile** : ≥ 44 px.
- **Contraste** : texte et dates lisibles (ratios exacts `À décider plus tard`, à mesurer).
- **Texte alternatif du média** : requis si un média est activé (sinon sans objet).
- **État actif des filtres** : indiqué par forme + texte, pas couleur seule ; `aria-pressed`/sélection annoncée.
- **État actif du like** : cœur plein + état annoncé (pas couleur seule).
- **Erreurs** : annoncées, associées au contrôle.
- **Réduction des animations** : `prefers-reduced-motion` respecté.
- **Date lisible** : format clair (date ou ancienneté).
- **Menu de publication** : accessible au clavier, options labellisées.
- Pas d'audit juridique.

---

## 28. Micro-interactions (150–250 ms, `prefers-reduced-motion`)

Autorisées uniquement : like, retrait du like, commentaire ajouté, publication créée, filtre sélectionné, ouverture des commentaires, chargement, erreur.
Interdits : particules, célébration, compteur animé excessif, effet 3D, animation longue.

---

## 29. Composants à spécifier

| Composant | Responsabilité | Données reçues | Actions émises | États | Variantes rôle | Variantes M/T/D |
|---|---|---|---|---|---|---|
| En-tête HoopFeed | Titre + badge nouveauté | badge (nouveau) | — | normal / nouveauté | identique | M/T/D |
| Bouton de création | Ouvrir le formulaire | rôle, autorisation | ouvrir formulaire | visible (coach) / masqué ou conditionnel (joueur) | coach ✅ / joueur conditionnel | M/T/D |
| Formulaire de publication | Composer une publication | rôle, types dispo | publier, annuler | type / contenu / aperçu / erreur | coach (5 types) / joueur (1 type) | plein écran M / panneau T-D |
| Filtres | Restreindre le fil | filtre actif | changer filtre | 5 valeurs, 1 active | identique | scroll H (M) / inline (T-D) |
| Liste de publications | Afficher le fil ordonné | publications | ouvrir, charger + | chargement / rempli / vide / erreur | identique | 1 col (M/T portrait) / 2 col (T paysage/D) |
| Carte de publication | Présenter une publication | publication | like, commenter, ouvrir lien, menu | normal / liké / avec média / avec stat | menu élargi si propriétaire | M/T/D |
| Auteur | Identité + rôle | auteur, rôle, avatar | ouvrir profil | coach / joueur | — | M/T/D |
| Média | Illustration éventuelle | média (ou SVG) | — | présent / absent | — | pleine largeur |
| Bloc statistique | Stat de perf/progression | stat existante | ouvrir lien | présent / absent | — | M/T/D |
| Actions like/commentaire | Interagir | compteurs, état like | like, ouvrir commentaires | liké / non / compteur | identique | ≥44px M/T/D |
| Liste de commentaires | Afficher commentaires (1 niveau) | commentaires | supprimer (propre) | vide / rempli / erreur | suppression si propriétaire | M/T/D |
| Champ commentaire | Saisir un commentaire | — | envoyer | vide / saisie / envoi / erreur | identique | M/T/D |
| Menu publication | Actions sur la publication | propriété | supprimer / masquer / signaler | propriétaire / non | coach modère sa publication | kebab M/T/D |
| Profil compact | Aperçu auteur | profil (stats/objectifs/publications) | ouvrir contenu | joueur / coach | joueur (stats) / coach (publications) | panneau T-D / écran M |
| État vide | Message + action | type d'état | action contextuelle | 5 variantes (§22) | selon rôle | M/T/D |
| Chargement | Indiquer le chargement | — | — | initial / plus / — | identique | M/T/D |
| Erreur | Signaler + réessayer | type d'erreur | réessayer | chargement/publication/like/commentaire | identique | M/T/D |

Pas de CSS ni couleurs.

---

## 30. Modèle conceptuel minimal (sans code)

**Publication** — champs possibles uniquement :
`identifiant` · `type` (1 des 5) · `auteur` · `rôle` (coach/joueur) · `texte` · `lien interne` (match/joueur/entraînement/objectif) · `média éventuel` · `statistique éventuelle` · `date` · `likes` · `commentaires` · `propriétaire` · `état de synchronisation`.

**Commentaire** — uniquement :
`identifiant` · `publication` · `auteur` · `texte` · `date` · `propriétaire` · `état de synchronisation`.

**Like** — uniquement :
`publication` · `utilisateur` · `état`.

Champs par type de publication (indicatif) :
- Coach : texte requis ; lien interne facultatif.
- Performance de match : lien match requis + statistique ; texte facultatif.
- Progression joueur : lien profil/objectif + statistique.
- Entraînement/objectif : lien entraînement/objectif requis.
- Publication joueur : texte requis.

Aucun schéma backend supplémentaire.

---

## 31. Correspondance avec l'existant

| Élément actuel | État actuel | Recommandation | Fonction préservée | Évolution nécessaire |
|---|---|---|---|---|
| Posts actuels | 3 figés, mono-auteur | Conserver comme exemples + **faire évoluer** vers 5 types | Format de carte | Persistance + création |
| Auteurs | Un seul (@francisco) | Faire évoluer | Bloc auteur | Multi-auteurs (équipe) |
| Médias SVG | Décoratifs | Conserver (illustration de type) | Illustration | Pas d'upload (média = Option A) |
| Likes | Client only, non persistés | Conserver + **rendre secondaire** | Bascule like/compteur | Persistance future |
| Double-clic média | Like rapide | Conserver (secondaire) | Raccourci like | — |
| Commentaires | Locaux, non persistés | Conserver (1 niveau) | Ajout commentaire | Persistance + suppression propre |
| Bouton Suivre | Toggle libellé | **Masquer** (Option A §13) | (logique dormante) | Retiré de l'UI |
| Abonnés | Compteur figé | **Masquer** (Option A §14) | — | Retiré du profil |
| Abonnements | Compteur figé | **Masquer** (Option A §14) | — | Retiré du profil |
| Bouton Message | Inerte | **Retirer** de l'UI (§21) | — | Aucune messagerie |
| Bouton Partager | Inerte | **Copier lien interne** (Option B §21) | Emplacement | Lien interne HoopBoard |
| Profil joueur | Statique, social | Conserver + **recentrer sportif** | Avatar, stats, objectifs, publications | Retirer compteurs sociaux |
| Publications de performance | Absentes en tant que type | **Faire évoluer** (type 2) | Données Matchs existantes | Type dédié + lien récap |
| Données figées | Compteurs/contenu en dur | Remplacer visuellement par données réelles/étiquetées | Rendu | Persistance / marquage démo |
| Absence de persistance | Confirmée | Faire évoluer | — | Persistance (techno `À décider`) |
| Absence de création | Confirmée | Faire évoluer | — | Formulaire ≤ 5 étapes |
| Absence de HoopFeed coach | Confirmée | **Créer l'expérience coach** | Fil commun | Publication + consultation coach |

Actions employées : conserver, rendre secondaire, masquer, désactiver/retirer visuellement, faire évoluer, remplacer visuellement.

---

## 32. Critères d'acceptation

### Coach
- [ ] Consulter le fil ordonné (chronologique + priorité type).
- [ ] Publier une publication en **≤ 5 étapes** avec aperçu + confirmation.
- [ ] Commenter (1 niveau) et supprimer son propre commentaire.
- [ ] Liker / retirer un like.
- [ ] Ouvrir un lien interne (match / joueur / entraînement / objectif).

### Joueur
- [ ] Consulter le fil.
- [ ] Commenter et supprimer son propre commentaire.
- [ ] Liker / retirer un like.
- [ ] Publier une **Publication joueur** *(si activé — `À décider plus tard`)*.
- [ ] Ouvrir un profil ou un contenu lié.

### Général
- [ ] Aucun réseau public, aucun suivi externe, aucune découverte d'inconnus.
- [ ] Aucun message privé.
- [ ] Aucun bouton inerte présenté comme actif (Message retiré, Partager = lien interne, Suivre masqué).
- [ ] Ordre du fil **compréhensible** et prévisible.
- [ ] Fonctions sociales (like, compteurs) **secondaires** ; aucune logique de popularité.
- [ ] Aucun classement, aucun tri par likes.
- [ ] Mobile utilisable (cartes pleine largeur, actions au pouce ≥ 44 px).
- [ ] États vides (5) et erreurs présents.

---

## 33. Tests manuels (douze scénarios imposés)

1. Ouvrir HoopFeed **sans publication** → état vide « fil de l'équipe vide » + action.
2. **Consulter dix publications** → ordre chronologique + priorité type respectés.
3. **Filtrer sur Matchs** → seules les performances de match s'affichent, ordre conservé.
4. **Liker** une publication → cœur plein, compteur +1, l'ordre du fil **ne change pas**.
5. **Retirer un like** → état inactif, compteur −1.
6. **Ouvrir les commentaires** → liste 1 niveau, sans quitter le fil.
7. **Ajouter un commentaire** → apparaît en bas, feedback immédiat.
8. **Supprimer son propre commentaire** → retiré ; ceux des autres non supprimables.
9. **Créer une publication coach** → ≤ 5 étapes, aperçu, confirmation.
10. **Créer une publication joueur** *(si activé)* → type unique joueur, publiée dans le cadre de l'équipe.
11. **Ouvrir un profil** depuis une publication → profil compact (sportif, sans compteurs sociaux).
12. **Ouvrir un match ou entraînement lié** → navigation vers le contenu interne.

Aucun autre scénario.

---

## 34. Éléments `À décider plus tard`

Limité aux sujets autorisés :
- **Publications joueur** activées ou non.
- **Image unique** autorisée ou non (média Option B).
- **Publication épinglée** par le coach.
- **Notifications** push / e-mail / navigateur.
- **Fonctionnement hors connexion**.
- **Persistance** (technologie).
- **Possibilité de masquer** une publication.
- **Action « signaler une erreur de contenu »**.

Aucun autre sujet.

---

*Fin de la spécification HoopFeed. Aucune modification apportée aux fichiers applicatifs.*
