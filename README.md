# HoopBoard — bêta

La plateforme des clubs de basket : saisie de match en direct sur le terrain,
box scores au format pro, récaps 3D et espace joueur façon réseau social.
Démo alimentée par les données réelles du U18 Pôle France à l'ANGT Belgrade
(source Proballers).

## Pages

| Route | Contenu |
|---|---|
| `/` | Landing (bêta ouverte, formulaire d'inscription) |
| `/coach.html` | Espace coach — dashboard, effectif, Game Center (terrain 3D), match live, entraînement |
| `/joueur.html` | Espace joueur — Training Hub, Game Center, HoopFeed |

## API (fonctions serverless Vercel)

| Endpoint | Méthode | Description |
|---|---|---|
| `/api/health` | GET | État du service |
| `/api/club` | GET | Club + bilan du tournoi |
| `/api/matches` · `?id=hapoel` | GET | Matchs ; le détail Hapoel inclut le box score complet |
| `/api/players` · `?id=nathan-soliman` | GET | Effectif ; la vedette inclut ses moyennes |
| `/api/beta` | POST | Inscription bêta `{email, club?}` — à brancher sur KV/Postgres |
| `/api/events` | POST | Pipeline de saisie live `{type, player, zone?, clock?}` |

Les données vivent dans `lib/data.js`. Les pages s'hydratent depuis l'API
quand elle répond, et retombent sur les données embarquées sinon.

## Développement local

```bash
npx vercel dev        # statique + fonctions sur http://localhost:3000
```

## Déploiement

```bash
npx vercel --prod     # nécessite d'être connecté (vercel login)
```

Ou : importer ce dépôt GitHub sur https://vercel.com/new — zéro config,
le projet est détecté tel quel (statique + `api/`).
