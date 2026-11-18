import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { bundleApp } from './bundle.mjs';

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
await mkdir(path.join(root, 'dist/src'), { recursive: true });
await cp(path.join(root, 'src/style.css'), path.join(root, 'dist/src/style.css'));
const { outputFiles: [app] } = await bundleApp();
await writeFile(path.join(root, 'dist/src/app.js'), app.contents);
await mkdir(path.join(root, 'dist/vendor'), { recursive: true });
await cp(path.join(root, 'node_modules/i18next/LICENSE'), path.join(root, 'dist/vendor/i18next-LICENSE.txt'));
console.log(`Built DST Field Guide: ${Object.keys(data.foods).length} foods, ${data.crafts.length} crafting recipes. Output: dist/`);
