# Notes de session - Portail de depot de pieces

Outil : Claude Code, modele Claude Sonnet 5 (`claude-sonnet-5`).
Contexte : session d'agent unique, environnement d'execution distant,
depot GitHub `nagoloum/portail`, branche `claude/portail-depot-pieces-g24jfi`.

## Le brief

Le prompt initial est le sujet complet de l'exercice DIV "Portail de depot
de pieces" : page blanche, NestJS + Chakra UI v3, stack objet MinIO/S3,
Prometheus/Grafana, `install.sh` one-click, image publiee sur un registre,
deploiement HTTPS reel sur un serveur partage avec plage de ports assignee,
charte graphique DIV avec tokens exacts, mini-kit UI de reference. Autorisation
explicite a creer/pousser sur le repo GitHub.

## Decoupage du travail

Le travail a ete planifie comme une liste de taches sequentielles (config
+ modele de donnees -> auth -> requests + logique de statut testee ->
public (PIN/upload) + tests -> stockage/metriques/Dockerfile -> frontend
(theme -> pages avocat -> pages publiques -> Dockerfile) -> infra (compose,
Prometheus, Grafana, nginx, certbot) -> install.sh/.env.example/CI -> README
+ ai-logs), avec verification (typecheck, tests, build) a la fin de chaque
etape backend/frontend plutot qu'a la toute fin.

## Decisions d'architecture prises (et pourquoi)

- **Statut derive, pas stocke** : `EXPIRED` n'est jamais ecrit en base,
  toujours recalcule a la lecture depuis `expiresAt` vs l'horloge courante
  (`RequestStatusService`). Decision prise des le debut pour eviter toute
  divergence entre un cron d'expiration et l'etat reel, et pour permettre
  des tests unitaires purs sans horloge systeme ni base de donnees.
- **Jeton de session public separe du PIN** : `unlock` verifie le PIN une
  fois et emet un JWT scope a la demande (`type: 'public'`, `token` du
  lien inclus dans le payload et revalide par le guard contre l'URL). Evite
  de retransmettre le PIN a chaque appel du client pendant l'upload.
- **MinIO jamais expose** : discussion interne (avec moi-meme, en
  redigeant le controller public) sur l'upload direct vers MinIO via URL
  pre-signee (bonus explicitement liste dans le sujet). Decision de ne
  *pas* l'implementer : le serveur partage ne route que deux ports vers
  Internet (voir routage du sujet), et faire correspondre exactement le
  chemin d'un nginx proxy avec la signature SigV4 d'une URL pre-signee
  est fragile pour un gain marginal sur des fichiers plafonnes a 20 Mo.
  Le backend bufferise en memoire (`multer.memoryStorage()`, jamais sur
  disque) et relaie vers MinIO en interne. Documente comme limite connue
  dans le README plutot que laisse silencieux.
- **Verification de type plutot qu'antivirus** : le sujet propose les deux
  comme equivalents pour le point bonus ("Antivirus ou verification de
  type"). Implemente la verification par signature binaire (`file-type`)
  en plus de l'allow-list de `Content-Type` declare, pour attraper un
  fichier renomme. Un vrai moteur antivirus (ClamAV) est hors de portee du
  temps disponible et documente comme tel.

## Corrections et iterations reelles

Ce qui suit est le detail des allers-retours effectifs (compilation,
tests, verification d'API) plutot qu'un recit lisse - c'est la partie que
le sujet demande explicitement de documenter.

1. **Faute de frappe dans `package.json`** : la version de `@aws-sdk/client-s3`
   avait ete tapee par erreur comme `^3.especially` (artefact de redaction).
   Repere immediatement en relisant le fichier avant meme d'installer, corrige
   en `^3.699.0`.

2. **`npx tsc --noEmit` a fait remonter 3 erreurs reelles apres la premiere
   passe du module `public/`** :
   - `app.set('trust proxy', 1)` n'existe pas sur le type `INestApplication`
     generique -> corrige en typant explicitement l'app comme
     `NestExpressApplication` (`NestFactory.create<NestExpressApplication>`).
   - `HttpStatus.LOCKED` n'existe pas dans la version de `@nestjs/common`
     installee -> remplace par le code litteral `423` avec un commentaire
     expliquant pourquoi (RFC 4918, absent de l'enum de cette version).
   - Un vrai bug logique : `registerSuccess()` renvoie `{failedAttempts,
     lockedUntil}` (les noms du type pur `LockoutState`) alors que la colonne
     TypeORM s'appelle `pinFailedAttempts`/`pinLockedUntil`. Le compilateur a
     rejete le `repo.update(id, registerSuccess())` faute de proprietes
     communes - sans ce typage strict, ce bug (reset du compteur silencieusement
     ignore) serait passe en production. Corrige en mappant explicitement les
     champs.

3. **`file-type` est un package ESM-only** depuis sa v17. Un `import {
   fileTypeFromBuffer } from 'file-type'` statique aurait echoue au runtime
   dans le build CommonJS de Nest (`ERR_REQUIRE_ESM`), erreur qui ne se serait
   vue qu'a l'execution, pas a la compilation. Anticipe et remplace par un
   `await import('file-type')` dynamique (TypeScript preserve les `import()`
   dynamiques telsquels meme en sortie `commonjs`, contrairement aux imports
   statiques).

4. **Verification de l'API Chakra UI v3 avant d'ecrire le theme** : l'API de
   theming a completement change entre v2 (`extendTheme`) et v3
   (`createSystem`/`defineConfig`/`defineRecipe`, `ChakraProvider value={system}`).
   Plutot que de deviner depuis la memoire du modele (risque eleve de melanger
   les deux API), recherche web ciblee pour confirmer la forme exacte de
   `defineRecipe` avec variants et sa fusion dans `theme.recipes.button`, ainsi
   que la dependance peer `@emotion/react` requise a l'installation. Le
   `npm run build` du frontend a compile sans aucune erreur TypeScript des la
   premiere tentative complete, ce qui a valide le choix de verifier avant
   d'ecrire plutot qu'apres.

5. **Validation visuelle par capture d'ecran plutot que confiance aveugle au
   CSS-in-JS** : lancement de `vite preview` + Chromium (Playwright,
   preinstalle dans l'environnement) pour capturer la page de connexion (etat
   normal et hover du bouton primaire), l'ecran de saisie du PIN cote client,
   et un rendu a 375px de large. Cela a confirme concretement l'inversion du
   bouton au hover (exigence explicite du sujet, "le detail qui signe le
   site") et la lisibilite mobile, plutot que de se fier au code seul.

6. **Docker-in-Docker indisponible dans cet environnement** : tentative de
   `docker ps` / `service docker start` pour valider `docker compose up` de
   bout en bout - le daemon ne demarre pas dans ce sandbox (execution
   imbriquee sans les privileges necessaires). Plutot que d'ignorer le
   probleme, pivot vers une strategie de validation en deux temps :
   `docker compose config` (avec un `.env` de test) pour verifier la syntaxe
   et l'interpolation des variables sur `docker-compose.yml` et son overlay
   `docker-compose.edge.yml` (fusion des `environment:` confirmee, y compris
   le remplacement de `FRONTEND_PUBLIC_BASE_URL` et des reglages de sous-chemin
   Grafana par l'overlay) ; et validation independante de chaque application
   (`npm test`, `npm run build` pour le backend et le frontend). Cette limite
   est documentee explicitement dans le README avec l'invitation a executer
   `./install.sh` en premier lors de la correction.

7. **Deploiement reel sur le serveur partage** : le sujet mentionne un
   identifiant/mot de passe/sous-domaine/plage de ports envoyes par email au
   candidat pour le serveur mutualise. Cette session ne disposait d'aucun de
   ces identifiants (environnement de preparation isole). Decision : construire
   et valider syntaxiquement tout le chemin de deploiement (template nginx
   d'edge avec substitution de `${DOMAIN}`, script `init-letsencrypt.sh`,
   overlay compose dedie) sans pouvoir l'executer contre un vrai serveur, et le
   documenter clairement comme etape restante plutot que de pretendre un
   deploiement effectif.

## Ce qui n'a pas ete fait (et pourquoi)

Voir la section "Limites connues" du README - redondant de la dupliquer
ici. Les points principaux : pas d'URL pre-signee MinIO directe, pas de
vrai antivirus, animation "reveal" simplifiee en reveal-au-montage plutot
qu'au scroll (ecrans courts), pas de gestion multi-cabinet.
