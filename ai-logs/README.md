# ai-logs

Cet exercice a ete realise avec **Claude Code** (modele Claude Sonnet 5,
`claude-sonnet-5`), dans une session d'agent dediee a ce depot, executee
dans un environnement d'execution distant (Claude Code sur le web / "CCR")
plutot que dans un terminal local interactif.

## Contenu

- `session-notes.md` - notes de session detaillant le brief recu, les
  decisions d'architecture prises, et les corrections/iterations reelles
  faites au fil de l'implementation (erreurs de compilation trouvees et
  corrigees, verification d'API via recherche web, limite decouverte en
  cours de route, etc.).

## Pourquoi pas un export `/export` brut

La commande `/export` de Claude Code ecrit la transcription dans le
terminal *interactif* local d'un utilisateur. Cette session a tourne dans
un environnement d'agent distant sans terminal interactif attache pour
declencher cette commande depuis l'interieur de la session elle-meme.
`session-notes.md` reconstitue donc fidelement, depuis le contexte complet
de la session, le fil des decisions et des corrections reelles - dans le
meme esprit de transparence que l'export demande, sans etre un copier-
coller brut de l'interface.

Aucun secret, cle d'API ou mot de passe reel n'a ete manipule pendant
cette session (les secrets vus ci-dessus, type `PIN_PEPPER` ou
`JWT_SECRET`, sont soit des placeholders de `.env.example`, soit des
valeurs de test generees pour les besoins de la validation locale, jamais
commitees).
