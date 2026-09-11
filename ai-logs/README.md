# ai-logs

Cet exercice a ete mene en deux sessions, avec **Claude Code**.

| Fichier | Session | Outil / modele |
|---|---|---|
| `session-notes.md` | 1 - implementation initiale | Claude Code, agent distant, Sonnet 5 |
| `session-2-claude-code-opus5.md` | 2 - reprise, execution reelle, deploiement | Claude Code dans VS Code, Opus 5 |

## Session 1 - implementation initiale

Ecrite depuis un telephone, dans une session d'agent Claude Code distante
(pas de terminal interactif attache, donc pas de `/export` declenchable
depuis l'interieur de la session). `session-notes.md` reconstitue depuis le
contexte de cette session le brief recu, les decisions d'architecture et
les iterations reelles.

**C'est une reconstitution, pas un transcript brut, et il faut le lire en
sachant ce qui a suivi** : cette session a produit tout le code, mais rien
n'y a jamais ete execute (l'environnement n'avait ni Docker ni base de
donnees). La session 2 a lance la stack pour la premiere fois et a trouve
quatre pannes bloquantes que la premiere session ne pouvait pas voir -
image MinIO introuvable, fins de ligne CRLF sur l'entrypoint, colonne
TypeORM non mappable, et un controle de securite (magic bytes) qui levait
une exception a chaque depot. Voir le commit `fix: make the stack actually
run, found by executing install.sh`.

## Session 2 - reprise, execution reelle, deploiement

`session-2-claude-code-opus5.md` est le transcript complet de cette
session, genere par `export-transcript.js` depuis le fichier de transcript
local de Claude Code (`~/.claude/projects/<projet>/<session>.jsonl`), qui
est ce que l'extension VS Code ecrit sur disque. C'est le meme contenu que
`/export`, avec en plus une passe de caviardage.

## Caviardage

`export-transcript.js` supprime systematiquement les formes toujours
sensibles (tokens `gh*_`, `github_pat_*`, JWT, cles privees PEM) et, via la
variable `REDACT_EXTRA`, les litteraux propres a la session - ici le mot de
passe du compte serveur, qui a transite par la conversation et a ete change
ensuite. Le script ne contient aucun secret en dur, ce qui lui permet de
vivre dans le depot.

```bash
REDACT_EXTRA='<secret1>,<secret2>' \
  node ai-logs/export-transcript.js \
    ~/.claude/projects/d--Projets-portail/<session>.jsonl \
    ai-logs/session-2-claude-code-opus5.md
```

Les secrets applicatifs (`JWT_SECRET`, `PIN_PEPPER`, mots de passe
Postgres/MinIO/Grafana) sont generes aleatoirement par `install.sh` dans un
`.env` jamais commite ; ceux qui apparaissent dans les exports sont des
placeholders de `.env.example`.
