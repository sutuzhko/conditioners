// Меряет высоту и ширину документа каждого артборда в Chromium и снимает
// кадр для сверки; те же числа снимает с живой страницы стенда.
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/julfy/projects/conditioner/apps/web/node_modules/@playwright/test');

const DIR = process.argv[2] ?? 'canvas';
const ONLY = process.argv[3] ? new Set(process.argv[3].split(',')) : null;
const SHOTS = path.join(DIR, '..', 'shots');
mkdirSync(SHOTS, { recursive: true });
const BASE = 'http://localhost:3000';

const manifest = JSON.parse(readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const CROPS = { Main: [0, 14800], Home1200: [0, 10400], Product375: [0], Article1200: [0], Catalog1200: [0], Compare375: [0] };
for (const item of manifest) if (CROPS[item.name]) item.crop = CROPS[item.name];
const LIVE = {
  Home: '/',
  Catalog: '/catalog',
  Product: '/catalog/split-sistema-07-tihaya',
  Compare: '/compare?compare=split-sistema-07-tihaya,mobilnyy-kondicioner-09,kanalnyy-kondicioner-24',
  Knowledge: '/knowledge',
  Article: '/knowledge/kak-vybrat-moshchnost-kondicionera',
  Privacy: '/privacy',
};

function dataUri(file) {
  const bytes = readFileSync(path.join(DIR, 'img', file));
  const ext = file.split('.').pop();
  const mime = ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function standalone(source, theme) {
  return source
    .replace('<script src="./support.js"></script>', '')
    .replace(/<\/?x-dc>/g, '')
    .replace(/<\/?helmet>/g, '')
    .replace(/\{\{theme\}\}/g, theme)
    .replace('background:var(--bg);color:var(--ink);min-height:100vh', 'background:var(--bg)')
    .replace(/<script data-dc-script[\s\S]*?<\/script>/, '')
    .replace(/src="([^"]+\.(?:svg|webp|jpg|png|gif|avif))"/g, (m, f) => `src="${dataUri(f)}"`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 0.5, reducedMotion: 'reduce' });
const page = await context.newPage();
const results = ONLY ? JSON.parse(readFileSync(path.join(DIR, 'heights.json'), 'utf8')) : {};

async function settle() {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  return page.evaluate(() => ({
    // высота обёртки, а не документа: у короткой секции scrollHeight корня равен окну
    h: Math.ceil((document.querySelector('[data-theme]') ?? document.documentElement).getBoundingClientRect().height),
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }));
}

for (const item of manifest) {
  if (ONLY && !ONLY.has(item.name)) continue;
  const source = readFileSync(path.join(DIR, `${item.name}.dc.html`), 'utf8');
  await page.setViewportSize({ width: item.width, height: 900 });
  await page.setContent(standalone(source, 'light'), { waitUntil: 'load' });
  const m = await settle();
  await page.screenshot({ path: path.join(SHOTS, `${item.name}.png`), fullPage: true });
  if (item.crop) {
    for (const [i, y] of item.crop.entries()) {
      await page.screenshot({ path: path.join(SHOTS, `${item.name}-crop${i}.png`), fullPage: true, clip: { x: 0, y, width: item.width, height: 1400 } });
    }
  }
  await page.setContent(standalone(source, 'dark'), { waitUntil: 'load' });
  const d = await settle();
  await page.screenshot({ path: path.join(SHOTS, `${item.name}-dark.png`), fullPage: true });
  results[item.name] = { ...m, hDark: d.h, swDark: d.sw };
  console.log(
    `${item.name.padEnd(16)} w${item.width}  h ${m.h}  dark ${d.h}  scrollW ${m.sw}${m.sw > m.iw ? '  ← ШИРЕ ОКНА' : ''}`,
  );
}

// живые страницы — те же ширины, для сверки высоты
if (!ONLY) {
  for (const [key, p] of Object.entries(LIVE)) {
    for (const w of [375, 768, 1200]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 90_000 });
      const m = await settle();
      results[`live:${key}${w}`] = m;
      if (w !== 768) await page.screenshot({ path: path.join(SHOTS, `live-${key}${w}.png`), fullPage: true });
      const name = key === 'Home' && w === 375 ? 'Main' : `${key}${w}`;
      const art = results[name]?.h;
      console.log(`live ${key.padEnd(10)} w${w}  h ${m.h}  артборд ${art}  Δ ${art === undefined ? '?' : art - m.h}`);
    }
  }
}

await browser.close();
writeFileSync(path.join(DIR, 'heights.json'), JSON.stringify(results, null, 2));
