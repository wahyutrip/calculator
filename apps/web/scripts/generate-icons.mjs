/**
 * Render the PWA icons from a single SVG source.
 *
 * The maskable variant is NOT the same artwork scaled: Android crops maskable
 * icons to a circle and clips anything outside the inner 80% diameter, so the
 * mark is drawn smaller on a filled background.
 *
 *   node scripts/generate-icons.mjs
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');

const GREEN = '#00AB6B';
const INK = '#0C120F';

/** A rising ladder of bars — the entry ladder the tool is built around. */
function svg({ size, maskable }) {
  const pad = maskable ? size * 0.22 : size * 0.14;
  const inner = size - pad * 2;
  const barW = inner / 7;
  const gap = barW / 2;
  const heights = [0.35, 0.55, 0.75, 1];
  const bars = heights
    .map((h, i) => {
      const w = barW;
      const x = pad + i * (barW + gap);
      const bh = inner * h;
      const y = pad + inner - bh;
      return `<rect x="${x}" y="${y}" width="${w}" height="${bh}" rx="${w * 0.22}" fill="${
        i === heights.length - 1 ? GREEN : '#7ED3AE'
      }"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${INK}" ${maskable ? '' : `rx="${size * 0.22}"`}/>
  ${bars}
</svg>`;
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const targets = [
    { file: 'icon-192.png', size: 192, maskable: false },
    { file: 'icon-512.png', size: 512, maskable: false },
    { file: 'maskable-512.png', size: 512, maskable: true },
    { file: 'apple-touch-icon.png', size: 180, maskable: false },
  ];

  for (const t of targets) {
    const buf = await sharp(Buffer.from(svg(t))).png().toBuffer();
    await writeFile(join(outDir, t.file), buf);
    console.warn(`wrote icons/${t.file}`);
  }

  // favicon.ico is served from the app root, not /icons.
  const fav = await sharp(Buffer.from(svg({ size: 32, maskable: false }))).png().toBuffer();
  await writeFile(join(here, '..', 'public', 'favicon.png'), fav);
  console.warn('wrote favicon.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
