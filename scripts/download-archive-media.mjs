/**
 * Fetch the explicitly curated official media in research/media-vehicles.json.
 * Sources/credits were checked manually on 2026-10-25; downloading does not
 * grant new rights. JAXA and marked source products remain byte-for-byte intact.
 * Run: node scripts/download-archive-media.mjs
 * Requires Python + Pillow for proportional web-size conversion.
 */
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const archive = resolve(root, 'public/images/archive');
const rows = JSON.parse(await readFile(resolve(root, 'research/media-vehicles.json'), 'utf8'));
const selectedIds = new Set(process.argv.slice(2));
const selected = selectedIds.size ? rows.filter(row => selectedIds.has(row.id)) : rows;
if (selectedIds.size && selected.length !== selectedIds.size) throw new Error('Unknown media id');
await mkdir(archive, { recursive: true });
const convert = [
  'from PIL import Image',
  'import sys, io, json',
  'im = Image.open(io.BytesIO(sys.stdin.buffer.read()))',
  'im.thumbnail((1800, 1800), Image.Resampling.LANCZOS)',
  'im.convert("RGB").save(sys.argv[1], "JPEG", quality=88, optimize=True, progressive=True)',
  'print(json.dumps({"width":im.width,"height":im.height}))'
].join('\n');
const inspect = [
  'from PIL import Image',
  'import sys, json',
  'im = Image.open(sys.argv[1]); im.verify()',
  'im = Image.open(sys.argv[1])',
  'print(json.dumps({"width":im.width,"height":im.height}))'
].join('\n');

async function fetchImage(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:') throw new Error('Only reviewed HTTPS assets are accepted');
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const type = response.headers.get('content-type') ?? '';
      if (!type.startsWith('image/')) throw new Error('Unexpected content type ' + type);
      return Buffer.from(await response.arrayBuffer());
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

let total = 0;
for (const row of selected) {
  const destination = resolve(root, 'public', row.src.replace(/^\//, ''));
  const inside = relative(archive, destination);
  if (inside.startsWith('..' + sep) || inside === '..' || !inside) throw new Error('Invalid media path');
  const bytes = await fetchImage(row.assetUrl);
  let dimensions;
  if (row.preserveOriginal) {
    await writeFile(destination, bytes);
    const result = spawnSync('python', ['-c', inspect, destination], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr);
    dimensions = JSON.parse(result.stdout.trim());
  } else {
    const result = spawnSync('python', ['-c', convert, destination], { input: bytes, maxBuffer: 1024 * 1024 });
    if (result.status !== 0) throw new Error(result.stderr.toString());
    dimensions = JSON.parse(result.stdout.toString().trim());
  }
  const size = (await stat(destination)).size;
  total += size;
  console.log(row.id + ': ' + dimensions.width + ' × ' + dimensions.height + ', ' + Math.round(size / 1024) + ' KiB' + (row.preserveOriginal ? ' (original bytes)' : ''));
}
console.log('Saved ' + selected.length + ' images; ' + (total / 1024 / 1024).toFixed(2) + ' MiB total.');
