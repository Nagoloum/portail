# ai-logs

| Fichier | Contenu |
|---|---|
| `session-discussion.md` | **Le livrable** : l'integralite des echanges IA de l'exercice, les deux sessions dans un seul fichier |
| `export-transcript.js` | Le script qui genere la partie 2 et applique le caviardage |

Uniquement cet exercice : aucun extrait d'un autre projet, conformement au sujet.

## Les deux sessions

L'exercice a ete mene en deux temps, avec deux outils et deux modeles.

**Session 1** (Claude Code en agent distant, depuis un telephone, Sonnet 5) a
produit la totalite du code en un commit. Elle n'a jamais pu executer
l'application : ni Docker, ni base de donnees dans cet environnement.

**Session 2** (Claude Code dans VS Code, Opus 5) a lance la stack pour la
premiere fois. Quatre pannes bloquantes sont apparues immediatement - image
MinIO introuvable sur Docker Hub, fins de ligne CRLF sur l'entrypoint, colonne
TypeORM non mappable qui tuait le backend au demarrage, et un controle de
securite (magic bytes) qui levait une exception a chaque depot. Puis le
deploiement HTTPS reel.

## Pourquoi les deux parties n'ont pas la meme forme

La partie 2 est un **transcript integral** : messages, raisonnement, appels
d'outils et resultats, 1300+ entrees, genere depuis le fichier de session que
Claude Code ecrit sur disque.

La partie 1 est une **reconstitution**, et le fichier le dit franchement. Cette
session tournait dans un environnement distant sans terminal interactif attache,
donc sans `/export` declenchable depuis l'interieur, et l'URL de la conversation
n'est ouvrable que par le titulaire du compte (elle repond 403 a tout le monde
d'autre). Une section **"Annotations a posteriori"** confronte ce recit a ce que
l'execution a reellement montre, sans retoucher le texte d'origine.

## Caviardage

`export-transcript.js` supprime les formes toujours sensibles (tokens `gh*_`,
`github_pat_*`, JWT, cles privees PEM) et, via `REDACT_EXTRA`, les litteraux
propres a la session - ici le mot de passe du serveur et le token GitHub, qui
ont transite par la conversation. Le script ne contient aucun secret en dur, ce
qui lui permet de vivre dans le depot.

Les deux secrets concernes ont ete revoques : token supprime, mot de passe du
serveur change.

```bash
REDACT_EXTRA='<secret1>,<secret2>' \
  node ai-logs/export-transcript.js \
    ~/.claude/projects/d--Projets-portail/<session>.jsonl \
    ai-logs/session-discussion.md
```

La regeneration est sans risque pour la partie redigee a la main : le script
conserve tout ce qui se trouve au-dessus du marqueur
`<!-- TRANSCRIPT GENERE AUTOMATIQUEMENT -->` et ne reecrit que ce qui suit. Il
refuse d'ecrire si le marqueur est absent du fichier existant.

Les secrets applicatifs (`JWT_SECRET`, `PIN_PEPPER`, mots de passe
Postgres/MinIO/Grafana) sont generes aleatoirement par `install.sh` dans un
`.env` jamais commite ; ceux qui apparaissent dans l'export sont des
placeholders de `.env.example`.
