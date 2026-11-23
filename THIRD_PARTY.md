# Third-party data and assets

## Don't Starve Together

Don't Starve Together, its original game data, item names, and inventory artwork belong to **Klei Entertainment**. This is an unofficial fan reference. No affiliation or endorsement is claimed, and this repository does not claim to relicense Klei's material.

The recipe and nutrition dataset is derived from the game-script snapshot archived at [CN-DST-DEVELOPER/scripts](https://github.com/CN-DST-DEVELOPER/scripts), pinned to build 762172 and revision `c20cb323ca6686b3892f08bb40b3747ddb85231d`. Source links appear in the app. The original Lua source is fetched for development-time extraction and is not bundled into the deployed app.

Traditional Chinese item text comes from the same snapshot’s [game localization catalog](https://github.com/CN-DST-DEVELOPER/scripts/blob/c20cb323ca6686b3892f08bb40b3747ddb85231d/languages/chinese_t.po). Run `python scripts/import_zh_tw.py` after updating the game data to refresh the extracted catalog.

Inventory artwork is mirrored from [fankimm/dst-craft](https://github.com/fankimm/dst-craft), revision `12c58d86ccf8490169f13132e8fb22ae62c8aacf`. The art is original game inventory imagery, not newly commissioned artwork. `data/assets-lock.json` records the upstream file hashes, and `scripts/fetch_assets.py` verifies downloaded blobs against them.

`data/art-aliases.json` maps item IDs to the corresponding textures in the same pinned mirror. Refresh those files with `python scripts/fetch_assets.py --supplemental-art`. For items absent from the local artwork, the guide displays thumbnails directly from the [Don’t Starve Wiki on wiki.gg](https://dontstarve.wiki.gg/). `src/wiki-art.mjs` records the source paths, and item details link to the wiki file pages. The wiki’s Creative Commons notice covers its page content subject to exceptions. Its fair-use image notices do not grant a Creative Commons license for the game artwork. The guide uses a neutral fallback if a thumbnail is unavailable. Seasoned foods reuse their unseasoned dish’s image.

## Fonts

DM Sans and Fraunces are distributed under the **SIL Open Font License 1.1**. Their license files are included alongside the self-hosted fonts:

- [DM Sans license](public/assets/fonts/dm-sans-OFL.txt)
- [Fraunces license](public/assets/fonts/fraunces-OFL.txt)

`data/font-sources.json` records the font download URLs. Visitors' browsers request these fonts from the guide's own host.

## Interface icons

The small interface icons are inline stroke SVGs in `src/icons.mjs`; they are separate from the game inventory artwork. The guide's leaf favicon is an authored vector mark.

## Localization library

[i18next](https://www.i18next.com/) is distributed under the MIT License. The build includes its license with the static assets.
