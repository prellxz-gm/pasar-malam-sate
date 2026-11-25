// main.ts — entrypoint for the Pasar Malam: Sate make.fun entry.
// Copies game/ and screenshots/ beside it to the output dir and writes
// /output/dossier.json with buildDossier from vendor/makefun-game.ts.
// Node 22 stdlib only.

import { cp, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

await mkdir(outputDir, { recursive: true });
await cp(join(root, 'game'), join(outputDir, 'game'), { recursive: true });
await cp(join(root, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

await writeFile(join(outputDir, 'dossier.json'), dossier);
console.log('dossier written to ' + join(outputDir, 'dossier.json') + ' (' + dossier.length + ' bytes)');
