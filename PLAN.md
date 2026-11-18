# Don't Starve Together Quick Reference Guide

Status: implementation authorized by the user on 2026-11-12. The requirements below remain the implementation plan.

Last updated: 2026-11-12.

## Goal

Create a fast browser guide for Don't Starve Together (DST), primarily used on a phone. Make food comparisons and recipe relationships immediately accessible, without scrolling through long wiki articles or mixing DST information with single-player Don't Starve and its DLC.

The guide should answer:

- What foods restore the most hunger, sanity, or health?
- I have an item such as Tomato or Tallbird Egg. Which recipes can use it?
- What can that item become through preparation or intermediate crafting, and what can those results make?
- What materials, quantities, stations, and unlocks do I need to craft an item or building?

## Opening screen and navigation

The food table is the home screen and must be visible in the first viewport. Keep the header compact so introductory content does not push the table below the fold.

- Top: search and compact filters.
- Main content: sortable food table.
- Persistent bottom navigation: Food table, Ingredient explorer, Crafting.

Optimize the primary interactions for a phone, while supporting larger screens. Use readable text, accessible touch targets, keyboard navigation, and clear labels.

## Food table

Provide one searchable table covering raw, cooked, dried, and prepared DST foods.

- Show Name, Hunger, Sanity, and Health together at phone widths.
- Tap a column heading to sort ascending or descending; show the active sort clearly.
- Filter by food category and preparation method, with relevant character and event restrictions available.
- Tap a row to open ingredients, preparation methods, related recipes, and additional details.
- Put secondary information such as spoilage, cooking time, and special effects in the detail view so the main comparison remains compact.
- State the baseline for displayed nutrition values: fresh food, per serving, before character-specific modifiers. Identify exceptions and effects delivered over time.
- Preserve the table's search, filters, sort, and scroll position when returning from an item.

## Ingredient explorer

Search for a food ingredient or crafting material, then show its direct and indirect uses as expandable vertical branches.

- Distinguish recipes requiring the specific item from recipes accepting its category or ingredient value.
- Include valid substitute and filler uses, even when a recipe does not explicitly name the selected ingredient.
- Show the other ingredients needed for each result.
- Include at least one validated four-slot combination containing the selected ingredient for each Crock Pot result.
- Show nutrition and relevant cooking-station, character, event, or unlock restrictions alongside results.
- Keep transformation steps visible so an indirect result explains how it relates to the original item.
- Use progressive expansion and cycle protection to keep large trees usable on a phone.

Initial indirect paths cover documented item transformations, including roasting, drying, refining, and seasoning where supported. Feeding creatures, farming, loot, and trading chains are potential later additions rather than part of the initial graph.

### Required examples

- Selecting Tomato exposes its valid direct recipe uses and paths through its prepared form, rather than only recipes that explicitly name tomato.
- Selecting Tallbird Egg exposes both recipes requiring that item and other valid recipes that accept its egg value.
- Each displayed path identifies whether the original item is used directly or must first be transformed.

## Crafting and building reference

Support both directions of exploration:

- **What uses this?** Show recipes consuming the selected material and expand paths through intermediate products.
- **What do I need?** Show a selected item's or building's ingredients and recursively expand craftable dependencies.

Display ingredient quantities, recipe output quantities, required stations or technology, unlock requirements, and character or event restrictions. When calculating base-material totals, account for intermediate recipe yields and distinguish reusable stations from consumed ingredients.

## Data and correctness

Use DST game-script data as the main source, with links to the corresponding source and wiki explanations. Select and record a release/build and source revision before importing data. Exclude single-player and DLC-only recipes and avoid mixing release and beta data.

Candidate script sources:

- [CN-DST-DEVELOPER/scripts](https://github.com/CN-DST-DEVELOPER/scripts)
- [vietnd69/dst-scripts](https://github.com/vietnd69/dst-scripts)

Use a repeatable import process to produce validated, versioned data files. Display the game's build/version, source revision, and dataset update date in the guide. Record unsupported or unresolved entries explicitly rather than silently presenting an incomplete dataset as complete.

Crock Pot matching must account for:

- Four ingredient slots and ingredient quantities.
- Specific required ingredients, aliases, and category values.
- Forbidden ingredients and category limits.
- Cooking-station and character restrictions.
- Competing recipe priorities and any ties that allow multiple outcomes.

An ingredient-tag match alone is insufficient. A displayed example must produce the stated dish under the selected cooking rules; possible tied outcomes must be identified.

## Proposed technical approach

Build a lightweight static browser app with HTML, CSS, and JavaScript. Visitors should need no installation or setup. Search, sorting, filtering, and recipe-tree exploration run in the browser using packaged data files.

The first version does not require a runtime database or application API. Keep data extraction separate from the browser interface so the dataset can be refreshed and validated without rewriting the UI.

Data flow:

```text
DST game scripts
  -> repeatable import and validation
  -> versioned recipe and nutrition data
  -> browser app
  -> Cloudflare hosting
```

## Cloudflare hosting

Cloudflare is the selected hosting platform. The proposed target is [Cloudflare Workers with Static Assets](https://developers.cloudflare.com/workers/static-assets/), serving the app and its data files.

Connect the GitHub repository to [Cloudflare Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) for a deployment workflow, with previews for review before production. Decide the Cloudflare account, project name, deployment branch, and optional custom domain during implementation.

Implementation is authorized. Cloudflare resource setup and deployment depend on the account access available when the app is ready.

## Implementation sequence

1. Select the DST data snapshot, define the import format, and verify coverage using Tomato and Tallbird Egg.
2. Build the opening food table with search, filters, and hunger/sanity/health sorting.
3. Add ingredient search, validated direct uses, and expandable transformation paths.
4. Add crafting and building dependencies, material totals, stations, and unlock requirements.
5. Verify recipe outcomes, dataset coverage, accessibility, and phone layouts.
6. Prepare Cloudflare previews and production deployment after authorization to proceed.

## Acceptance criteria

- Opening the guide on a phone immediately shows the food table.
- Hunger, sanity, and health can each be sorted numerically in either direction.
- Food table, Ingredient explorer, and Crafting are directly accessible from persistent navigation.
- Tomato and Tallbird Egg searches include valid category/substitution uses as well as named-ingredient recipes.
- Indirect paths explain every preparation or intermediate crafting step.
- Crock Pot examples respect slot limits, restrictions, priorities, and tied outcomes.
- Crafting trees show correct ingredient quantities, yields, stations, and unlocks.
- All data belongs to the identified DST snapshot, with coverage limitations made visible.
- Navigation and exploration work at phone widths without requiring a desktop-sized graph.
- The completed app can be hosted on Cloudflare using the repository's documented deployment process.

## Potential later additions

- Offline access and an installable home-screen shortcut.
- Favorites and recently viewed items saved on the device.
- Pantry-based searches using several available ingredients.
- Additional acquisition paths through feeding, farming, loot, or trading.

These are optional follow-up features, not requirements for the first version.

## Implementation progress

The initial app is implemented in this repository: the table-first interface, ingredient paths, crafting trees, versioned data import, local assets, and Cloudflare deployment configuration are present. See README.md for usage, validation, and deployment.

Real-browser phone/desktop visual checks remain outstanding because the managed preview relay could not connect. Cloudflare publication also remains pending: the environment has no authenticated Cloudflare account. No production site has been deployed.
