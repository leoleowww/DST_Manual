# The Constant — DST Field Guide

A phone-first quick reference for **Don't Starve Together**. The opening screen is a sortable food table; ingredient and crafting explorers are available from persistent navigation.

- **Food table:** hunger, sanity, and health, searchable and sortable across the full filtered dataset. Preparation, availability, and special-diet filters. Detail pages preserve the table's filters and place when returning.
- **Ingredient explorer:** named ingredients, category-value substitutions, filler uses, and indirect paths through roasting, drying, seasoning, and crafting. Every pot result has a verified four-slot example; tied outcomes and their chances are visible.
- **Crafting:** search 978 registered recipes, expand dependencies, choose a quantity, and see base materials, spare outputs, stations, character requirements, and unlocks.

The checked-in snapshot contains **664 food variants**, **81 Crock Pot rules** (including two non-food results), and **978 crafting recipes** from DST build **762172**, dated **6 November 2026**. The source revision is pinned in [data/source-lock.json](data/source-lock.json). This is a snapshot, not a live update service.

## Run locally

Use Node.js 24 or newer:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. To test from a phone on the same network, use the computer's LAN address and port 3000. The development server binds to `0.0.0.0` by default; use `npm run dev -- --host 127.0.0.1` for loopback-only access.

```sh
npm test
npm run build
```

The deployable static site is written to `dist/`. Python and the data importer are not required to run, test, build, or deploy the checked-in dataset.

## Deploy on Cloudflare

The repository is configured for **[Cloudflare Workers with Static Assets](https://developers.cloudflare.com/workers/static-assets/)**. `wrangler.jsonc` serves `dist/`; no database, Worker application code, or runtime secrets are needed by the guide.

### From your computer

```sh
npx wrangler login
npm run deploy
```

Use your own Cloudflare account. Change `name` in `wrangler.jsonc` if `dst-field-guide` conflicts with an existing Worker in that account. Wrangler returns the deployed URL. You can attach a custom domain in Cloudflare afterward.

To prepare a non-production version for review:

```sh
npm run preview:upload
```

To validate the deployment package without publishing:

```sh
npm run build
npx wrangler deploy --dry-run
```

### From GitHub

After committing and pushing the project, connect the repository to a Cloudflare Workers project using [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/). Use the repository root and configure:

| Setting | Value |
| --- | --- |
| Build command | `npm test && npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production version command, where supported | `npx wrangler versions upload` |
| Node.js version | `24` |

Choose the production branch and preview branches in Cloudflare. The project does not create those connections or deploy automatically before an account is connected. Do not put Cloudflare API tokens in the repository or paste them into chat; use Cloudflare's integration or a scoped secret in your deployment environment.

## Refresh game data

Data extraction is separate from the browser app. It evaluates declarative DST modules in a restricted Lua environment, without the game engine, file/network access from Lua, or access to Python attributes. Entity callbacks are never executed.

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-data.txt
python scripts/import_data.py
python scripts/fetch_assets.py
npm test
npm run build
```

The importer fetches the exact revision in `data/source-lock.json` and caches it under `.cache/dst/<revision>/`. To update to a new build, first confirm that the source is a DST release snapshot, then update the lock's revision, build, and source date. Run the **full** importer, review the generated changes and coverage, and rerun validation before deployment. No recurring update job is installed.

- `public/data/game-data.json`: nutrition, item names, recipe-rule ASTs, transformations, crafting, and provenance.
- `public/data/uses.json`: checked ingredient-to-dish examples, separately lazy-loaded when needed.
- `data/import-report.json`: input-file hashes, source metadata, counts, and coverage.
- `data/assets-lock.json`: pinned inventory-art source and Git blob hashes.
- `public/data/art.json`: available local artwork; missing art uses a neutral icon.

The importer groups ingredients only when their named-recipe identity and every referenced food value agree. It exhausts **3,764,376 four-slot multisets over 96 distinct classes**, for both the standard and portable Crock Pots. This finds valid category and filler uses that a list of explicitly named ingredients would omit.

The `--skip-uses` importer flag is a development shortcut for metadata changes within the same pinned revision. It is not an update workflow: changed game rules or a new revision require a full import.

## Nutrition and crafting assumptions

- Nutrition is fresh, per serving, before survivor modifiers or food-memory effects. Health sorting uses immediate restoration. Jellybeans' additional 120 health over 120 seconds is shown separately.
- Base foods exclude seasoning variants; All variants and Seasoned expose those records. Beefalo and other special-diet items are available through the filters.
- Warly labels identify who can prepare a dish, not who can eat it.
- Pot rules preserve Lua boolean semantics, ingredient aliases, priority, and weighted ties. Recipes are evaluated for the selected cooking station.
- Material totals use baseline yields and share surplus across dependencies. They do not assume a shop purchase or a character's transmutation is the source of an ordinary resource. Explicit alternate recipes remain inspectable.
- Stations and reusable tools are listed separately from consumed ingredients. Character skills, variable yields, placement conditions, and unlock restrictions are flagged.
- Construction-stage costs are separate from the initial craft. Flat construction plans are included; nested multi-stage project definitions are not automatically flattened.
- Creature feeding, farming, loot, and acquisition chains beyond the game's registered recipe menus are outside the graph. Forge/Gorge game modes and single-player/DLC data are excluded.

## Verification

`npm test` checks nutrition baselines, all **15,940** imported ingredient-use witnesses against the portable JavaScript rule evaluator, recipe priority and ties, pot restrictions, aliases, sorting, batch yields, shared leftovers, and conversion cycles. DOM integration checks cover loading failures/retry, filtering, food details and return state, lazy ingredient paths, crafting quantities, and navigation.

DOM tests are not a substitute for real-browser visual and touch checks. During implementation, the managed browser preview could not connect because its relay timed out, so phone/desktop visual QA remains outstanding. The Cloudflare CLI reported that this environment is not authenticated; no production deployment has been made.

Wrangler's deployment dry run was also blocked by this environment's read-only global configuration directory (`/home/agent/.config/.wrangler`). The app build, static-asset checks, and validation against Wrangler's installed configuration schema can run independently; rerun the dry run from an authenticated development machine before publishing.

Before release, check the guide at phone widths (including 320–390 px), open a food and return to the table, follow Tomato and Tallbird Egg branches, and inspect a multi-ingredient building's totals. The first viewport should contain the table with all three nutrition columns, and bottom navigation must remain accessible.

## Project structure

```text
src/                 Browser UI, styles, and pure game-data queries
public/              HTML, generated data, local item art, fonts, response headers
scripts/             Build, development server, and repeatable data/asset imports
tests/               Domain validation and DOM interaction checks
data/                Source locks, import report, and asset provenance
wrangler.jsonc       Cloudflare static asset deployment
PLAN.md              Agreed scope and implementation plan
```

See [THIRD_PARTY.md](THIRD_PARTY.md) for artwork, data, and font attribution.
