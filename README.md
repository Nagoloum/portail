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

```
backend/    NestJS (API, logique metier, migrations, tests Jest)
frontend/   React + Vite + Chakra UI v3
infra/      docker-compose, Prometheus, Grafana, nginx, certbot
ai-logs/    export des echanges avec l'IA pour cet exercice
install.sh  installation one-click
```

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
| `GET /requests` | JWT avocat | Liste des demandes avec statut/progression calcules |
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
  tentatives, refus sur lien expire.
- `files/file-validation.util.spec.ts` - allow-list de types et detection
  par signature binaire, dont le cas qui motive ce controle (executable
  renome `.pdf`) et les buffers trop courts.
- `database/entity-metadata.spec.ts` - construit les metadonnees TypeORM
  sans base de donnees.

Ces deux derniers fichiers sont des **tests de non-regression ecrits apres
coup**, et c'est la limite qu'ils documentent : les specs d'origine
testaient de la logique pure avec des repositories mockes, donc rien
n'exercait la couche de mapping ni le controle de type. Deux bugs ont
survecu a une suite verte et ne sont apparus qu'en lancant la stack
(`DataTypeNotSupportedError` au demarrage, `ERR_PACKAGE_PATH_NOT_EXPORTED`
a chaque depot). Tester la logique metier isolement est necessaire et pas
suffisant : il faut au moins un test par couche d'adaptation.

`cd backend && npm test` (37 tests). La CI (`.github/workflows/ci.yml`)
lance ces tests + le build des deux apps a chaque push/PR.

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

**Limite assumee** : Alertmanager est cable et route les alertes
(visibles dans son UI/API, `http://localhost:${ALERTMANAGER_PORT}`), mais
aucun canal de notification reel (email/Slack) n'est configure - cet
exercice ne fournissait pas d'identifiants a utiliser, et en simuler
aurait ete moins honnete que de documenter le point d'ajout (voir les
commentaires dans `infra/alertmanager/alertmanager.yml`).

## Deploiement

### Registre d'images

`.github/workflows/publish.yml` construit et publie
`ghcr.io/<owner>/portail-backend` et `ghcr.io/<owner>/portail-frontend` a
chaque push sur `main` (tags `latest` + sha court), avec le `GITHUB_TOKEN`
integre - aucun secret a configurer.

**Etat reel** : GitHub Actions est desactive sur ce compte ("GitHub Actions
is currently disabled for this repository"), donc ce workflow n'a jamais
pu s'executer et la CI n'a pas tourne non plus. Les images en ligne ont
donc ete construites en local et poussees a la main :

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
(verifiable : `ls ~/portail` n'y contient que `infra/` et `.env`).

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
  postgres+minio) serait la suite logique.
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

Export des echanges avec l'IA pour cet exercice, voir `ai-logs/README.md`.
