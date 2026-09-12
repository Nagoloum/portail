# Exercice technique DIV - Daniel Nagoloum Talla

Ce depot rassemble les deux exercices du test technique.

```text
exo1-no-ai/           Algorithmie sans IA
  clash-of-code/      Captures des deux clashs CodinGame (100%, 2e a chaque fois)
  advent-of-code/     Puzzle de grille en deux parties (Node.js, sans dependance)
  README.md
exo2-portail-depot/   Portail de depot de pieces (produit complet, avec IA)
  backend/            NestJS - API, logique metier, migrations, tests Jest
  frontend/           React + Vite + Chakra UI v3
  infra/              docker-compose, Prometheus, Grafana, nginx, certbot
  ai-logs/            Export integral des echanges IA de l'exercice
  install.sh          Installation one-click
  README.md
README.md             (ce fichier)
```

Chaque exercice a son propre README, qui couvre le setup, l'architecture et les
choix techniques, les tests, les limites connues et les preuves.

## Exercice 1 - sans IA

**[exo1-no-ai/README.md](exo1-no-ai/README.md)**

Deux clashs CodinGame en Mode Plus Rapide (Python 3, 100% et 2e place aux deux)
et le puzzle de grille de l'Advent of Code (jour 6, "Guard Gallivant") resolu en
deux parties en JavaScript. Le point interessant est la partie 2 : detecter une
boucle demande de suivre l'etat *(position, direction)* et pas seulement la
position, et de ne tester comme obstacles candidats que les cases du parcours
d'origine.

```bash
cd exo1-no-ai/advent-of-code/part-2 && node code.js
# partie 1: 4515
# partie 2: 1309
```

Enregistrement video de la session :
<https://drive.google.com/file/d/1lRnNGKJTffv2LOOA8KzH45YxV-khSEh3/view>

## Exercice 2 - portail de depot de pieces

**[exo2-portail-depot/README.md](exo2-portail-depot/README.md)**

Un avocat cree une demande de depot, genere un lien public expirable protege par
un PIN a 4 chiffres, et son client depose ses pieces sans compte. NestJS +
Chakra UI v3 + PostgreSQL + MinIO, conteneurise, avec Prometheus/Grafana pour
l'observabilite, deploye en HTTPS reel.

```bash
cd exo2-portail-depot
./install.sh
```

| | |
|---|---|
| Demo en ligne | <https://daniel-nagoloum.stage2-div.rayan-drissi.com> |
| Lien de depot seede (client, anonyme) | <https://daniel-nagoloum.stage2-div.rayan-drissi.com/d/8f3a2c1b4d5e6f70> - PIN `1234` |
| Grafana | <https://daniel-nagoloum.stage2-div.rayan-drissi.com/grafana/> |
| Prometheus | <https://daniel-nagoloum.stage2-div.rayan-drissi.com/prometheus/> |
| Compte avocat de demonstration | `avocat@demo.dev` / `Demo1234!` |
| Export des conversations IA | [exo2-portail-depot/ai-logs/](exo2-portail-depot/ai-logs/) |

## Integration continue

`.github/workflows/ci.yml` construit et teste les deux applications de
l'exercice 2 a chaque push. **Le workflow n'a jamais pu s'executer** : GitHub
Actions est desactive au niveau du compte qui heberge ce depot, pas du depot
lui-meme. Le diagnostic complet (les requetes API qui le prouvent) et le
contournement - `make verify`, qui rejoue la meme sequence en local - sont dans
le README de l'exercice 2, section "Registre d'images".
