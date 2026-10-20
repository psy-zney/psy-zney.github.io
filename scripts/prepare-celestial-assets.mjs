import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

// Solar System Scope / INOVE, CC BY 4.0. See docs/celestial-asset-sources.md.
const directory = 'public/img/celestial';
await mkdir(directory, { recursive: true });
const sources = {
  earth: '2k_earth_daymap', jupiter: '2k_jupiter', moon: '2k_moon',
  mars: '2k_mars', clouds: '2k_earth_clouds', milkyway: '8k_stars_milky_way', sun: '2k_sun',
};
const selected = process.argv.slice(2);
for (const [name, source] of Object.entries(sources)) {
  if (selected.length && !selected.includes(name)) continue;
  const host = name === 'sun' ? 'www.solarsystemscope.com' : 'cloud.solarsystemscope.com';
  const response = await fetch(`https://${host}/textures/download/${source}.jpg`, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  const original = Buffer.from(await response.arrayBuffer());
  const native = await sharp(original).metadata();
  if (name === 'milkyway' && native.width < 4096) throw new Error('The sky source must contain native 4K detail; do not upscale a 2K map.');
  for (const width of name === 'milkyway' ? [1024, 2048, 4096] : [1024, 2048]) {
    let pipeline = sharp(original).resize(width);
    if (name === 'clouds') pipeline = pipeline.greyscale();
    const data = await pipeline.webp({ quality: name === 'milkyway' ? 88 : 86 }).toBuffer();
    await writeFile(`${directory}/${name}-${width}.webp`, data);
    console.log(`${name}-${width}.webp: ${Math.round(data.length / 1024)} KB`);
  }
}
