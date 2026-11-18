# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed: lightweight static HTML, CSS, and JavaScript with browser-local interactions. Cloudflare hosting. A development-only Python importer produces versioned data files from DST scripts.

## Users

DST players consulting the guide primarily on a phone while playing. They compare food restoration values and look up uses for ingredients and materials.

## Product Purpose

Make food comparisons and complete direct and indirect recipe relationships easy to find. The food table must be on the opening screen. See PLAN.md for the agreed scope and acceptance criteria.

## Capabilities and Constraints

Sortable hunger, sanity, and health; searchable food and crafting data; expandable preparation and crafting paths; recipe examples validated against DST priorities. Exclude single-player and DLC-only recipes. Visitors need no installation. Hosting target: Cloudflare Workers with Static Assets.

## Evidence on Hand

PLAN.md records the user's requirements. data/source-lock.json pins the game-script revision and build. Game assets and data require source attribution. No visual identity was supplied; visual decisions are implementation choices.

## Product Principles

- Put comparison and lookup before explanatory content.
- Explain how an ingredient reaches a result.
- Use game data, validate recipe outcomes, and disclose coverage limits.
- Keep the core table and navigation useful at phone widths.
