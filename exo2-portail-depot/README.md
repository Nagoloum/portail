# Portail de depot de pieces

Un avocat cree une demande de depot, genere un lien public expirable protege
par un PIN a 4 chiffres, et son client depose ses pieces sans compte.
NestJS + Chakra UI v3 + PostgreSQL + MinIO, conteneurise, avec Prometheus/Grafana
pour l'observabilite.

## Demo en ligne

**<https://daniel-nagoloum.stage2-div.rayan-drissi.com>**

| | |
|---|---|
| Application (avocat) | <https://daniel-nagoloum.stage2-div.rayan-drissi.com> |
| Lien de depot seede (client, anonyme) | <https://daniel-nagoloum.stage2-div.rayan-drissi.com/d/8f3a2c1b4d5e6f70> - PIN `1234` |
| Grafana | <https://daniel-nagoloum.stage2-div.rayan-drissi.com/grafana/> |
| Prometheus | <https://daniel-nagoloum.stage2-div.rayan-drissi.com/prometheus/> |

Compte avocat de demonstration : `avocat@demo.dev` / `Demo1234!`

Certificat Let's Encrypt (production, renouvellement automatique), TLS
termine par notre propre nginx derriere le proxy frontal en passthrough
SNI. Images tirees depuis GHCR : aucun code source ni build sur le serveur.

## Demarrage rapide

```bash
git clone <ce-repo>
cd exo2-portail-depot
./install.sh
```

`install.sh` genere un `.env` (secrets aleatoires) s'il n'existe pas,
recupere les images publiees sur GitHub Container Registry, demarre toute
la stack, attend que les migrations + le seed (executes automatiquement par
le conteneur backend, voir `backend/entrypoint.sh`) soient termines, puis
affiche les URLs. `./install.sh --build` fait la meme chose en construisant
les images depuis les sources locales (pratique en dev, jamais utilise en
production - voir "Deploiement").

Identifiants de demonstration (aussi affiches en fin d'installation) :

| | |
|---|---|
| Email avocat | `avocat@demo.dev` |
| Mot de passe | `Demo1234!` |
| Demande seedee | "Dossier Martin, pieces 2026", PIN `1234`, 4 pieces attendues |

## Structure du depot

Ce dossier `exo2-portail-depot/` est autonome : toutes les commandes de ce
README se lancent depuis ici.

```
backend/    NestJS (API, logique metier, migrations, tests Jest)
frontend/   React + Vite + Chakra UI v3
infra/      docker-compose, Prometheus, Grafana, nginx, certbot
ai-logs/    export des echanges avec l'IA pour cet exercice (2 sessions)
install.sh  installation one-click
Makefile    raccourcis (up/down/logs/test/verify/seed)
.env.example
```

Seuls les workflows GitHub vivent un cran au-dessus, a la racine du depot
(`../.github/workflows/`) : GitHub ne les lit qu'a cet endroit. Ils ciblent
explicitement `exo2-portail-depot/backend` et `exo2-portail-depot/frontend`.
L'exercice 1 est dans `../exo1-no-ai/`.

## Architecture

```
Internet
   │ HTTPS (certbot, voir "Deploiement")
   ▼
 nginx "edge" (TLS, infra/docker-compose.edge.yml - serveur reel uniquement)
   │ HTTP interne
   ▼
 nginx "frontend" (sert le SPA, proxy /auth /requests /public vers le backend)
   │
   ├── backend (NestJS) ──┬── PostgreSQL (donnees)
   │                      └── MinIO (fichiers, S3-compatible)
   │
   └── Prometheus ── scrape backend:3000/metrics directement (pas via nginx)
          │
          └── Grafana (dashboards) + Alertmanager (regles d'alerte)
```

En local (`./install.sh`), il n'y a pas de couche "edge" : le conteneur
`frontend` est publie directement sur `127.0.0.1:${APP_HTTP_PORT}`. La
couche `edge` (TLS reelle + certbot) n'existe que dans l'overlay
`infra/docker-compose.edge.yml`, utilise uniquement sur le serveur partage
(voir "Deploiement") - elle n'a aucune raison d'exister en local puisqu'il
n'y a pas de vrai nom de domaine a certifier.

### Backend (NestJS)

Un module par responsabilite, decouplage volontaire entre logique metier
"pure" (testable sans base de donnees) et couche HTTP/TypeORM :

- `auth/` - JWT avocat. Deux strategies passport distinctes (`jwt-lawyer`,
  `jwt-public`) partagent le meme secret mais portent un claim `type`
  verifie par chaque guard : un jeton public ne peut jamais etre rejoue sur
  une route avocat, et reciproquement.
- `lawyers/` - compte avocat (email + mot de passe hashe bcrypt).
- `requests/` - creation/liste/detail des demandes de depot, et
  `RequestStatusService` : la logique pure de calcul de statut
  (PENDING/COMPLETE/EXPIRED), testee unitairement.
- `public/` - tout le parcours anonyme : deverrouillage par PIN (avec
  lockout), consultation du statut, depot de fichier. Voir "Decoupage de
  l'API" plus bas pour la justification du detail des routes.
- `files/` - entite `DepositFile` + `StorageService` (client S3/MinIO).
- `audit/` - journal d'acces au lien public (bonus "journal d'audit").
- `metrics/` - metriques Prometheus (voir "Observabilite").

### Frontend (React + Chakra UI v3)

- `theme/system.ts` - les tokens de la charte DIV (couleurs, radius, police
  Inter) et le recipe du bouton primaire (inversion au hover), via
  `createSystem`/`defineConfig`/`defineRecipe` (API Chakra v3).
- `components/` - le mini kit d'UI demande : `StatusBadge`, `RequestCard`,
  `PinInput`, `Dropzone`, `FileRow`, `GeneratedLinkCard`, `EmptyState`,
  `Card`, `RevealOnMount`.
- `pages/` - `LoginPage`, `DashboardPage` (liste + creation),
  `RequestDetailPage` (cote avocat), `PublicUnlockPage` +
  `PublicDepositPage` (cote client, assembles par `PublicPage`).
- `api/` - deux clients axios distincts : un pour l'avocat (JWT en
  `localStorage`, redirection sur 401), un pour le flux public (jeton de
  session scoped au lien, en `sessionStorage` par token).

## Decoupage de l'API

La surface indicative du brief (`/auth/login`, `/requests`,
`/public/:token/unlock`, `/public/:token/files`) est respectee telle
quelle, complétée par les routes necessaires a un vrai parcours :

| Route | Auth | Role |
|---|---|---|
| `POST /auth/login` | - | Connexion avocat, retourne un JWT |
| `POST /requests` | JWT avocat | Cree une demande, retourne **le PIN en clair une seule fois** |
| `GET /requests?page=&limit=` | JWT avocat | Liste **paginee** des demandes avec statut/progression calcules |
| `GET /requests/:id` | JWT avocat | Detail + liste des pieces deposees |
| `POST /public/:token/unlock` | - | Verifie le PIN, retourne un jeton de session scope a la demande |
| `GET /public/:token/status` | jeton public | Statut/progression courant (polling apres upload) |
| `POST /public/:token/files` | jeton public | Depot d'une piece (multipart) |

Pourquoi un jeton de session public plutot que renvoyer le PIN a chaque
appel : l'`unlock` fait le travail couteux (bcrypt + verification de
lockout) une fois, puis le client peut lister/deposer plusieurs pieces
avec un JWT de courte duree (`PUBLIC_JWT_EXPIRES_IN`, 45 min par defaut)
plutot que de retaper le PIN a chaque requete. Le jeton porte le token du
lien (`token` claim) et le guard verifie qu'il correspond a l'URL appelee,
donc un jeton mine pour un lien ne peut pas servir sur un autre.

Pourquoi pas d'URL pre-signee directe vers MinIO (bonus non implemente) :
cela aurait exige d'exposer MinIO sur le sous-domaine public (le serveur
partage ne route que deux ports vers Internet, voir "Deploiement"), avec
un nginx qui doit preserver exactement le chemin signe pour que la
signature SigV4 reste valide cote navigateur. Le gain (decharger le
backend du transfert d'octets) ne justifiait pas le risque sur un exercice
avec des fichiers plafonnes a 20 Mo : le backend bufferise en memoire
(jamais sur disque, `multer.memoryStorage()`) et relaie vers MinIO par le
reseau docker interne, qui reste ainsi jamais expose. Documente comme
limite connue plus bas.

`GET /requests` est **pagine** (`?page=1&limit=20`, 100 maximum) et renvoie
une enveloppe plutot qu'un tableau nu :

```json
{ "items": [ ... ], "total": 42, "page": 1, "limit": 20, "hasMore": true }
```

Le tableau nu aurait suffi au rendu, mais la liste d'un avocat grandit sans
borne et rien ne l'arretait. Voir "Performance" pour le detail. Le `limit`
venant de la query string, il est **borne cote serveur** : sans plafond,
`?limit=1000000` reconstitue exactement l'endpoint non pagine qu'on vient
de remplacer.

## Modele de donnees

```
Lawyer (avocat)
  id, email, passwordHash, name

DepositRequest (demande de depot)
  id, lawyerId -> Lawyer, title, token (unique), pinHash,
  requiredCount, expiresAt, status (PENDING | COMPLETE),
  pinFailedAttempts, pinLockedUntil

DepositFile (piece deposee)
  id, requestId -> DepositRequest, originalName,
  declaredMimeType, detectedMimeType, size, storageKey,
  status (PENDING | UPLOADED | REJECTED)

AuditLog (journal d'acces au lien public)
  id, requestId, action, ip, userAgent, metadata, createdAt
```

Decision cle : **`status` ne stocke que ce qui n'est pas une pure fonction
du temps.** La colonne ne connait que `PENDING`/`COMPLETE` ; `EXPIRED` est
toujours *derive* a la lecture par `RequestStatusService` en comparant
`expiresAt` a l'horloge courante. Deux raisons : un cron qui "expirerait"
les demandes en base peut toujours avoir du retard ou tomber en panne,
alors qu'une derivation a la lecture ne peut jamais etre en retard ; et
`COMPLETE` est **sticky** - une fois toutes les pieces recues, la demande
reste `COMPLETE` meme apres l'expiration du lien (l'avocat a eu ce qu'il
demandait, l'expiration ne concerne que l'acces *en attente*). Ces regles
sont exactement ce que couvre `request-status.service.spec.ts`.

Le PIN n'est **jamais stocke en clair**, nulle part : `pinHash` est un
bcrypt de `pin + PIN_PEPPER` (secret cote serveur, absent de la base). Un
PIN a 4 chiffres n'a que 10 000 combinaisons ; sans le pepper, une fuite de
la base seule ne suffit pas a le retrouver hors-ligne (voir
`backend/src/common/security/pin.util.ts`).

## Securite

- **Authentification avocat** : JWT signe (`JWT_SECRET`), mot de passe
  hashe bcrypt (12 rounds).
- **Deposant anonyme** : aucun compte, seulement le lien + PIN. Le jeton
  de session public est scope a une seule demande (voir plus haut).
- **PIN** : hash + pepper (voir "Modele de donnees"), verrouillage apres
  `PIN_MAX_ATTEMPTS` echecs pendant `PIN_LOCKOUT_MINUTES` (etat machine
  pure dans `pin-lockout.util.ts`, teste unitairement), en plus d'un rate
  limiting global (`@nestjs/throttler`, 120 req/min/IP) qui ralentit toute
  automatisation avant meme d'atteindre la logique metier.
- **Fichiers** : allow-list de types (PDF/JPG/PNG), **verification par
  signature binaire** (magic bytes, pas seulement le `Content-Type`
  declare par le navigateur) - un `.exe` renomme en `.pdf` est rejete.
  La detection est faite a la main (`files/file-validation.util.ts`, une
  table de trois signatures specifiees : ISO 32000-1 pour le PDF, marqueur
  SOI pour le JPEG, RFC 2083 pour le PNG) plutot qu'avec le paquet
  `file-type` : celui-ci est ESM-only depuis la v17, or le backend compile
  en CommonJS, donc TypeScript reecrivait l'`await import()` en `require()`
  et le controle levait `ERR_PACKAGE_PATH_NOT_EXPORTED` a chaque depot -
  un controle de securite qui ne s'execute jamais en production est le pire
  des cas. Trois formats fixes ne justifiaient ni la dependance ni le
  risque. Voir "Limites connues" pour ce qui n'est *pas* couvert
  (antivirus reel).
- **Stockage** : MinIO n'est jamais expose au reseau (ni a Internet, ni au
  navigateur) ; seul le backend y accede, sur le reseau docker interne.
  Aucun fichier n'est ecrit sur le disque de l'app (`multer.memoryStorage()`).
- **Audit** : chaque acces a un lien public (reussi, PIN faux,
  verrouillage, upload accepte/rejete) est journalise avec IP + user-agent
  dans `audit_logs`.
- **En-tetes** : `helmet` sur l'API (nosniff, `Referrer-Policy`,
  `frame-ancestors`, HSTS) et une **CSP explicite** sur le nginx qui sert le
  SPA (`frontend/nginx.conf`), ecrite d'apres ce que l'application charge
  reellement : `script-src 'self'` (bundle Vite, pas de CDN, pas d'`eval`),
  Google Fonts en `style-src`/`font-src`, `frame-ancestors 'none'` - on ne
  met pas un formulaire de saisie de PIN dans une iframe tierce.
  `'unsafe-inline'` reste necessaire en `style-src` : Emotion, le moteur de
  Chakra, injecte ses `<style>` a l'execution, et un nonce supposerait un
  HTML rendu par requete, ce qu'un SPA statique n'est pas.
- **CORS** : restreint a `FRONTEND_PUBLIC_BASE_URL` (plus `localhost:5173`
  hors production). En production la question ne se pose pas - le SPA et
  l'API sont sur la meme origine derriere nginx - mais le `cors: true`
  precedent valait `Access-Control-Allow-Origin: *` : n'importe quelle page
  du web pouvait appeler cette API depuis le navigateur d'un visiteur.
- **Enumeration** : `GET /requests/:id` filtre sur `lawyerId` **dans le
  `WHERE`** et repond 404, au lieu de lire puis comparer et repondre 403.
  Un 403 distinguait "cette demande existe mais n'est pas a vous" de "elle
  n'existe pas", ce qui suffit a sonder les identifiants existants. Un
  `:id` malforme est refuse en 400 par `ParseUUIDPipe` avant d'atteindre
  postgres, qui repondait sinon une erreur de driver en 500.
- **Prometheus** : protege par authentification basic au niveau du edge
  nginx (voir "Observabilite" et "Etapes sur le serveur"). Il n'a aucune
  authentification native, et publie tel quel il repondait `/api/v1/query`
  a tout Internet.

## Performance

Trois choses ici, dans l'ordre ou elles auraient fait mal :

**Pagination.** `GET /requests` chargeait *toutes* les demandes d'un avocat
et, via `relations: { files: true }`, *toutes les pieces de chacune* - pour
n'en tirer qu'un compteur "2 sur 4" affiche sur une carte. Le cout d'un
appel croissait avec l'historique complet du cabinet et avec le nombre de
pieces deposees. L'endpoint est desormais pagine (20 par defaut, 100 max) et
le dashboard consomme les pages avec un bouton "Charger plus"
(`useInfiniteQuery`).

**Comptage en SQL, pas en JavaScript.** Le compteur est calcule par
`loadRelationCountAndMap` avec un filtre sur `status = 'UPLOADED'` : une
requete groupee pour la page entiere, au lieu d'hydrater une ligne par
fichier pour ensuite les compter en memoire. Une page coute maintenant deux
requetes quel que soit le nombre de pieces. Cote parcours client, `summarize()`
faisait un `COUNT` puis un `SELECT` de la meme liste : le compte est la
longueur de la liste, une requete suffit.

**Index alignes sur les requetes reellement emises**
(`1700000001000-TuneIndexes.ts`) :

| Index | Requete qu'il sert |
|---|---|
| `deposit_requests (lawyerId, createdAt DESC, id DESC)` | la liste paginee - l'ancien index sur `(lawyerId)` seul trouvait les lignes mais pas dans l'ordre, donc chaque page triait tout l'historique de l'avocat |
| `deposit_files (requestId, status)` | tous les comptages/listes de pieces, qui filtrent toujours sur les deux colonnes |

Les deux anciens index simple-colonne sont supprimes plutot que conserves :
`(lawyerId)` et `(requestId)` sont des prefixes gauches des nouveaux, donc
redondants en lecture et payants en ecriture.

Le tri ajoute `id DESC` apres `createdAt DESC` : `createdAt` n'est pas
unique, donc a lui seul il ne definit pas une pagination stable - deux
demandes creees dans la meme milliseconde pouvaient s'echanger entre la
page 1 et la page 2.

## Strategie de tests

Les tests Jest ciblent la logique metier pure, isolee de TypeORM/HTTP pour
pouvoir controler l'horloge et l'etat sans base de donnees :

- `requests/request-status.service.spec.ts` - **expiration du lien** et
  **transitions de statut** (PENDING -> EXPIRED, PENDING -> COMPLETE,
  caractere sticky de COMPLETE, bornes exactes de `isExpired`).
- `common/security/pin-lockout.util.spec.ts` - machine a etats du
  verrouillage (compteur, seuil exact, fenetre de verrouillage).
- `common/security/pin.util.spec.ts` - **verification du PIN** (hash/verify
  bcrypt+pepper, sensibilite au pepper).
- `public/public.service.spec.ts` - integration au niveau service (repository
  mocke) du flux `unlock` complet : succes, echec, verrouillage apres N
  tentatives, refus sur lien expire. Et du flux **depot** : passage a
  COMPLETE sur la derniere piece, refus de la piece dont la place a ete
  prise entre la pre-verification et le commit (la course decrite plus
  bas), nettoyage de l'objet MinIO dans ce cas, rejet d'un executable
  renomme `.pdf` avant tout envoi vers le bucket.
- `auth/token-isolation.spec.ts` - les deux garanties que le README mettait
  en avant sans que rien ne les verifie : un jeton public rejoue sur une
  route avocat est refuse (et reciproquement), et une session publique
  minee pour un lien est refusee sur un autre lien. Une signature valide
  reste une signature valide : si le claim `type` ou la comparaison
  jeton/URL disparaissaient, tous les autres tests resteraient verts.
- `common/pagination.spec.ts` - bornage de la pagination, dont le cas qui
  justifie la fonction : `?limit=1000000` doit retomber sur le plafond.
- `files/file-validation.util.spec.ts` - allow-list de types et detection
  par signature binaire, dont le cas qui motive ce controle (executable
  renome `.pdf`) et les buffers trop courts.
- `database/entity-metadata.spec.ts` - construit les metadonnees TypeORM
  sans base de donnees.

`file-validation` et `entity-metadata` sont des **tests de non-regression
ecrits apres coup**, et c'est la limite qu'ils documentent : les specs
d'origine testaient de la logique pure avec des repositories mockes, donc
rien n'exercait la couche de mapping ni le controle de type. Deux bugs ont
survecu a une suite verte et ne sont apparus qu'en lancant la stack
(`DataTypeNotSupportedError` au demarrage, `ERR_PACKAGE_PATH_NOT_EXPORTED`
a chaque depot). Tester la logique metier isolement est necessaire et pas
suffisant : il faut au moins un test par couche d'adaptation.

`token-isolation` illustre la meme lecon sous un autre angle : une suite
verte ne dit rien des invariants que personne n'a pense a ecrire. Les
regles les plus critiques d'une application sont souvent celles qu'aucun
test ne touche, precisement parce qu'elles "vont de soi".

`cd backend && npm test` (60 tests), ou `make verify` pour rejouer
exactement la sequence de `../.github/workflows/ci.yml` (installation propre,
build et tests des deux applications). Le workflow lui-meme n'a jamais pu
s'executer : voir "Registre d'images" pour le diagnostic.

## Observabilite

Le perimetre est volontairement restreint a ce qui reflete la sante du
*produit*, pas des dashboards decoratifs :

| Metrique | Pourquoi |
|---|---|
| `http_request_duration_seconds{method,route,status_code}` | Methode RED (latence + taux d'erreur) sur toutes les routes - le signal generique "l'API va mal" |
| `pin_verification_total{result}` | Signal de securite : un pic d'echecs est une tentative de brute-force contre un PIN a 4 chiffres |
| `deposit_files_uploaded_total` / `_bytes_total` | Le coeur du produit : des pieces arrivent-elles effectivement |
| `deposit_files_rejected_total{reason}` | Le mode d'echec du produit : type refuse, lien expire/complet, trop volumineux |
| `deposit_requests_created_total` | Usage cote avocat |
| `public_link_access_total{result}` | Usage cote client (ok/expire/introuvable) |

Deux de ces series etaient documentees ici mais **jamais alimentees** :
`deposit_requests_created_total` n'etait incremente nulle part (plat a zero
pour toujours), et `deposit_files_rejected_total{reason="size"}` non plus,
parce que multer refuse un fichier trop lourd pendant le streaming, avant
que le controleur ne s'execute. Cette erreur n'etant pas une
`HttpException`, Nest repondait 500 : la maladresse la plus banale de
l'utilisateur - "mon scan fait 30 Mo" - ressemblait a un plantage serveur,
n'etait pas auditee et ne comptait nulle part. Un filtre
(`public/multer-exception.filter.ts`) la traduit maintenant en 413 avec un
message utilisable, une ligne d'audit et le compteur correspondant. Une
metrique qu'on documente sans jamais l'incrementer est pire qu'une metrique
absente : elle affiche un zero rassurant.

**Alertes** (`infra/prometheus/alerts.yml`) : `BackendDown` (l'API ne
repond plus, 1 min), `HighErrorRate` (>5% de 5xx sur 5 min),
`PinBruteForceSuspected` (taux d'echecs de PIN eleve et soutenu),
`HighUploadRejectionRate` (>30% des depots rejetes sur 15 min - signale un
bug ou une confusion cote client plutot qu'un aleas). Ces quatre-la ont ete
retenues parce que chacune correspond a une action concrete, pas parce
qu'elles remplissent un dashboard.

`/metrics` n'est **jamais expose via nginx** : Prometheus scrape le
backend directement sur le reseau docker interne
(`infra/prometheus/prometheus.yml`), donc les metriques ne font jamais
partie de la surface publique.

Grafana est provisionne automatiquement (datasource + dashboard "Portail -
Vue d'ensemble", `infra/grafana/provisioning/`) : aucune configuration
manuelle apres `./install.sh`.

### Acces aux deux UI en production

Le serveur partage ne nous route qu'un seul hostname (voir "Routage"), donc
Grafana et Prometheus sortent sur le meme domaine, sous `/grafana/` et
`/prometheus/`. Ils n'ont pas du tout la meme surface d'authentification :

| | Auth | D'ou elle vient |
|---|---|---|
| Grafana | Login Grafana, compte admin unique (`GF_USERS_ALLOW_SIGN_UP=false`) | L'application elle-meme |
| Prometheus | Basic auth nginx | **Ajoutee par le edge** - Prometheus n'en a aucune |

C'est la correction la plus importante de cette passe. Prometheus etait
publie tel quel : `GET /prometheus/api/v1/query` repondait `200` a
n'importe qui, exposant la volumetrie metier et surtout
`pin_verification_total{result="failure"}` - un attaquant pouvait suivre sa
propre tentative de brute-force en direct. "Ce n'est que de la lecture"
n'est pas un argument quand la lecture porte sur l'efficacite d'une
attaque en cours.

Grafana continue de scraper Prometheus par le reseau docker interne, sans
passer par le edge : ajouter le mot de passe ne touche pas aux dashboards.

En local (`./install.sh`) la question ne se pose pas : ni le edge ni la
basic auth n'existent, tout est sur `127.0.0.1`.

**Limite assumee** : Alertmanager est cable et route les alertes
(visibles dans son UI/API, `http://localhost:${ALERTMANAGER_PORT}`), mais
aucun canal de notification reel (email/Slack) n'est configure - cet
exercice ne fournissait pas d'identifiants a utiliser, et en simuler
aurait ete moins honnete que de documenter le point d'ajout (voir les
commentaires dans `infra/alertmanager/alertmanager.yml`).

## Deploiement

### Registre d'images

`../.github/workflows/publish.yml` construit et publie
`ghcr.io/<owner>/portail-backend` et `ghcr.io/<owner>/portail-frontend` a
chaque push sur `main` (tags `latest` + sha court), avec le `GITHUB_TOKEN`
integre - aucun secret a configurer.

**Etat reel** : GitHub Actions est desactive **sur le compte** qui heberge
ce depot, et le diagnostic vaut d'etre precis parce que tous les reglages
visibles cote projet sont corrects :

```
GET  /repos/<owner>/portail/actions/permissions
     -> { "enabled": true, "allowed_actions": "all" }     # le depot autorise tout

POST /repos/<owner>/portail/actions/workflows/ci.yml/dispatches
     -> 422 { "message": "Actions has been disabled for this user." }
```

Le test qui tranche : `GET /actions/runs` renvoie `total_count: 0` apres
une dizaine de push sur `main`, alors que les deux workflows sont
`state: active` et que leurs declencheurs correspondent. **Un run
declenche par un push n'implique aucun jeton** - GitHub le cree lui-meme
a partir des fichiers de workflow - donc ce n'est ni un probleme de scope
(le jeton porte bien `workflow`), ni un role insuffisant (`admin: true`,
proprietaire de type User et non organisation).

Le blocage est donc au niveau du compte, pas du depot ni du workflow :
aucun reglage de projet ne le leve, et ce n'est pas une question de quota
(les depots publics ont des minutes illimitees). Consequence : ni `ci.yml`
ni `publish.yml` n'ont jamais pu s'executer. Un ticket est ouvert aupres
du support GitHub, seule voie de resolution.

`make verify` execute en local exactement la meme sequence que `ci.yml`
(install propre, build et tests des deux applications), ce qui laisse la
verification reproductible sur n'importe quelle machine en attendant.

Les images en ligne ont donc ete construites en local et poussees a la
main :

```bash
docker login ghcr.io -u <user>            # PAT avec le scope write:packages
SHA=$(git rev-parse --short HEAD)
for c in backend frontend; do
  docker build -t ghcr.io/<owner>/portail-$c:latest -t ghcr.io/<owner>/portail-$c:$SHA ./$c
  docker push ghcr.io/<owner>/portail-$c:latest
  docker push ghcr.io/<owner>/portail-$c:$SHA
done
```

Les deux packages doivent ensuite etre passes en **public** (Package
settings -> Change visibility ; l'API REST ne le permet pas pour les
container packages), sinon `./install.sh` echoue au `pull` sur une machine
vierge. Les images publiees correspondent au commit `bac40b1`.

### Serveur partage : routage

Le serveur fourni est partage : un proxy frontal ecoute les ports 80/443
de la machine et relaie, par sous-domaine, vers une plage de 100 ports qui
nous est assignee - `:80` par en-tete `Host`, `:443` en *passthrough* TLS
par SNI (c'est donc bien notre propre nginx qui termine le TLS avec notre
propre certificat, pas le proxy frontal). Concretement, seuls **deux**
ports de notre plage sont joignables depuis Internet : le 1er (HTTP) et le
2e (HTTPS). Tout le reste (Postgres, MinIO, Prometheus, Grafana,
Alertmanager) reste sur `127.0.0.1` et le reseau docker interne - jamais
publie au-dela de la machine, et de toute facon pas routé par le proxy
frontal.

`infra/docker-compose.edge.yml` ajoute, uniquement pour ce contexte, un
service `edge` (nginx) qui :
- repond sur `:80` au challenge HTTP-01 de Let's Encrypt et redirige le
  reste vers HTTPS ;
- termine le TLS sur `:443` avec le certificat obtenu par certbot, puis
  relaie vers le conteneur `frontend` (qui route lui-meme vers le backend,
  voir "Architecture") ;
- expose aussi `/grafana/` et `/prometheus/` sur le meme domaine, seul
  moyen de les consulter depuis l'exterieur puisque un seul couple de
  ports est routé vers Internet.

### Etapes sur le serveur

```bash
# .env : renseigner DOMAIN, CERTBOT_EMAIL, EDGE_HTTP_PORT, EDGE_HTTPS_PORT
# (voir .env.example) avec les valeurs recues par email, en plus des
# variables deja generees par un premier ./install.sh.
#
# La machine est partagee : TOUS les ports hotes (y compris APP_HTTP_PORT,
# BACKEND_PORT, PROMETHEUS_PORT, ALERTMANAGER_PORT, GRAFANA_PORT) doivent
# etre deplaces dans la plage assignee. Leurs valeurs par defaut (8080,
# 3000, 3001, 9090, 9093) sont exactement celles que tout le monde
# choisirait : deux conteneurs ne peuvent pas binder le meme port hote, et
# les prendre reviendrait a casser le deploiement d'un autre candidat.
# Voir l'exemple chiffre en bas de .env.example.

# Identifiant basic auth pour /prometheus/ (Prometheus n'a aucune
# authentification a lui - voir "Observabilite"). A faire une fois : le
# edge refuse de demarrer sans ce fichier, ce qui est le bon mode d'echec.
infra/nginx/generate-prometheus-htpasswd.sh          # mot de passe aleatoire, affiche une fois
# ou : infra/nginx/generate-prometheus-htpasswd.sh <user> <password>

infra/certbot/init-letsencrypt.sh   # obtient le premier certificat (staging par defaut)
# une fois valide : LETSENCRYPT_STAGING=false dans .env, puis relancer le script

docker compose --env-file .env \
  -f infra/docker-compose.yml -f infra/docker-compose.edge.yml up -d
```

Le renouvellement est automatique (conteneur `certbot` avec une boucle
`certbot renew` toutes les 12h, montage `/etc/letsencrypt` partage avec
`edge`).

Ce qui vit sur le serveur : `infra/` et `.env`, rien d'autre. Pas de code
source, pas de `git clone`, pas de build - `docker compose pull` uniquement
(verifiable : `ls ~/portail` n'y contient que `infra/` et `.env`). Le
`prometheus.htpasswd` genere ci-dessus vit dans `infra/nginx/` sur le
serveur uniquement, et n'est jamais commite (`.gitignore`).

Ports reellement alloues pour ce deploiement (plage 21700-21799) :
`21700` edge HTTP, `21701` edge HTTPS, `21702` frontend, `21703` backend,
`21704` Prometheus, `21705` Alertmanager, `21706` Grafana - tous sur
`127.0.0.1`, seuls les deux premiers etant routes depuis Internet.

## Limites connues

- **Pas de test automatise du parcours complet (e2e)** : le parcours
  `login -> creation -> unlock -> depot` a ete verifie a la main, en local
  puis en production, mais aucun test ne le rejoue automatiquement. C'est
  la limite qui a coute le plus cher ici : le code a d'abord ete ecrit sans
  jamais etre execute, et quatre pannes bloquantes (image MinIO introuvable,
  fins de ligne CRLF, colonne TypeORM non mappable, controle magic-bytes
  qui levait une exception a chaque depot) n'ont ete trouvees qu'en lancant
  reellement `./install.sh`. Deux tests de non-regression comblent les deux
  dernieres ; un vrai test e2e (Testcontainers ou un job CI avec services
  postgres+minio) serait la suite logique. La passe de revue decrite dans
  "Performance" et "Securite" a ajoute des tests de service sur le depot
  (course sur `requiredCount`, nettoyage du bucket, isolation des deux
  familles de jetons), mais aucun ne traverse encore HTTP.
- **La pagination n'est pas curseur** : `LIMIT/OFFSET` avec un tri
  `(createdAt DESC, id DESC)`. C'est stable pour les pages deja chargees,
  mais une demande creee pendant la consultation decale les pages
  suivantes, et l'`OFFSET` se degrade sur de tres grandes profondeurs. Une
  pagination par curseur (keyset, `WHERE (createdAt, id) < (...)`) serait
  la suite logique ; l'index composite en place la supporte deja telle
  quelle.
- **Verification de type plutot qu'antivirus** : les fichiers sont
  verifies par allow-list + signature binaire (magic bytes), pas par un
  moteur antivirus (ClamAV). Un fichier PDF/JPG/PNG structurellement valide
  mais contenant un payload malveillant ne serait pas detecte.
- **Pas d'URL pre-signee directe vers MinIO** : voir "Decoupage de l'API"
  pour la justification.
- **Reveal au scroll simplifie** : la charte demande une animation
  declenchee au scroll (IntersectionObserver). Les ecrans de cette
  application sont courts (peu de defilement reel), donc `RevealOnMount`
  applique la meme transition (opacity/translateY, meme easing) au montage
  plutot qu'a l'entree dans le viewport.
- **PIN non recuperable apres creation** : par design (jamais stocke en
  clair), donc si l'avocat perd le PIN affiche a la creation, il doit
  recreer une demande. Un ecran de "regeneration de PIN" serait la suite
  logique.
- **Un seul avocat par email, pas de gestion multi-cabinet** : hors
  perimetre de l'exercice.

## ai-logs/

`ai-logs/session-discussion.md` contient l'integralite des echanges IA de cet
exercice : la session 1 (qui a produit tout le code, sans jamais l'executer) et
le transcript complet de la session 2 (qui l'a execute, corrige quatre pannes
bloquantes et deploye). Une section d'annotations confronte le recit de la
premiere a ce que l'execution a reellement montre.

Le caviardage est fait par `ai-logs/export-transcript.js` ; details et
limites dans `ai-logs/README.md`.
