import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
for (const file of ['public/index.html', 'public/data/game-data.json', 'public/data/uses.json', 'public/data/art.json']) {
  await stat(path.join(root, file));
}
const data = JSON.parse(await readFile(path.join(root, 'public/data/game-data.json'), 'utf8'));
if (data.meta.game !== "Don't Starve Together" || !data.recipes.meatballs || !data.items.tomato) {
  throw new Error('The DST dataset is incomplete. Run the importer before building.');
}
await rm(path.join(root, 'dist'), { recursive: true, force: true });
await mkdir(path.join(root, 'dist'), { recursive: true });
await cp(path.join(root, 'public'), path.join(root, 'dist'), { recursive: true });
await cp(path.join(root, 'src'), path.join(root, 'dist/src'), { recursive: true });
await mkdir(path.join(root, 'dist/vendor'), { recursive: true });
await cp(path.join(root, 'node_modules/i18next/dist/esm/i18next.js'), path.join(root, 'dist/vendor/i18next.mjs'));
await cp(path.join(root, 'node_modules/i18next/LICENSE'), path.join(root, 'dist/vendor/i18next-LICENSE.txt'));
console.log(`Built DST Field Guide: ${Object.keys(data.foods).length} foods, ${data.crafts.length} crafting recipes. Output: dist/`);
