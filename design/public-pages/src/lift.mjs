// Снимает публичные страницы дев-стенда в артборды .dc.html: серверный HTML +
// CSS страницы, шрифты — те же гарнитуры с Google Fonts, картинки — файлами
// рядом, повторяющиеся иконки — спрайтом <symbol>/<use>.
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/Users/julfy/projects/conditioner/apps/web/node_modules/@playwright/test');

const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = process.argv[2] ?? 'canvas';
const IMG_DIR = path.join(OUT, 'img');
mkdirSync(IMG_DIR, { recursive: true });

const FONTS =
  'https://fonts.googleapis.com/css2?family=Onest:wght@600;700;800&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap';

const PAGES = [
  { key: 'Home', path: '/', title: 'Главная' },
  { key: 'Catalog', path: '/catalog', title: 'Каталог' },
  { key: 'Product', path: '/catalog/split-sistema-07-tihaya', title: 'Модель' },
  {
    key: 'Compare',
    path: '/compare?compare=split-sistema-07-tihaya,mobilnyy-kondicioner-09,kanalnyy-kondicioner-24',
    title: 'Сравнение',
  },
  { key: 'Knowledge', path: '/knowledge', title: 'База знаний' },
  { key: 'Article', path: '/knowledge/kak-vybrat-moshchnost-kondicionera', title: 'Статья' },
  { key: 'Privacy', path: '/privacy', title: 'Политика' },
];
const WIDTHS = [375, 768, 1200];
// секции главной, которые пойдут на страницу предложений отдельными артбордами «сейчас»
const SECTIONS = [
  { id: 'contacts', key: 'ContactsNow', title: 'Контакты · сейчас' },
  { id: 'savings', key: 'SavingsNow', title: 'Экономия · сейчас' },
];

/* ---------- CSS ---------- */

function matchBrace(css, open) {
  let depth = 0;
  for (let k = open; k < css.length; k++) {
    const c = css[k];
    if (c === '"' || c === "'") {
      k++;
      while (k < css.length && css[k] !== c) {
        if (css[k] === '\\') k++;
        k++;
      }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return k;
    }
  }
  return css.length - 1;
}

function parseBlocks(css) {
  const out = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    while (i < n && /\s/.test(css[i])) i++;
    if (i >= n) break;
    let j = i;
    while (j < n && css[j] !== '{' && !(css[i] === '@' && css[j] === ';')) j++;
    if (j >= n) break;
    const prelude = css.slice(i, j).trim();
    if (css[j] === ';') {
      out.push({ kind: 'at', prelude });
      i = j + 1;
      continue;
    }
    const end = matchBrace(css, j);
    const body = css.slice(j + 1, end);
    out.push({ kind: prelude.startsWith('@') ? 'atblock' : 'rule', prelude, body });
    i = end + 1;
  }
  return out;
}

function keepSelector(sel, classes) {
  const cleaned = sel.replace(/:not\([^)]*\)/g, '').replace(/:(is|where)\([^)]*\)/g, '');
  const found = cleaned.match(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g) ?? [];
  return found.every((c) => classes.has(c.slice(1)));
}

function purge(css, classes) {
  const out = [];
  for (const b of parseBlocks(css)) {
    if (b.kind === 'at') {
      if (!/^@(import|charset)/.test(b.prelude)) out.push(`${b.prelude};`);
      continue;
    }
    if (b.kind === 'atblock') {
      if (/^@font-face/.test(b.prelude)) continue;
      if (/^@(media|supports|container|layer)/.test(b.prelude)) {
        const inner = purge(b.body, classes);
        if (inner.trim() !== '') out.push(`${b.prelude}{${inner}}`);
        continue;
      }
      out.push(`${b.prelude}{${b.body.trim()}}`);
      continue;
    }
    const sels = b.prelude.split(/,(?![^(]*\))/).map((s) => s.trim());
    const kept = sels.filter((s) => keepSelector(s, classes));
    if (kept.length === 0) continue;
    out.push(`${kept.join(',')}{${b.body.trim()}}`);
  }
  return out.join('\n');
}

function prepareCss(raw) {
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/:root\[data-theme='dark'\]/g, "[data-theme='dark']")
    .replace(/html\[data-theme='dark'\]/g, "[data-theme='dark']");
}

function minifyCss(css) {
  // одно правило — одна строка: многострочные значения (transition, тени)
  // иначе рвут правило, и всё, что идёт после, теряет смысл
  return css
    .replace(/\s+/g, ' ')
    .replace(/\s*\{\s*/g, '{')
    .replace(/\s*\}\s*/g, '}\n')
    .replace(/;\s+/g, ';')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/* ---------- HTML ---------- */

function bodyInner(html) {
  const s = html.indexOf('<body');
  const s2 = html.indexOf('>', s) + 1;
  const e = html.lastIndexOf('</body>');
  return html.slice(s2, e);
}

function cleanBody(b) {
  return b
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/g, '')
    .replace(/<template[\s\S]*?<\/template>/g, '')
    .replace(/<link[^>]*>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function extractSection(body, id) {
  const start = body.search(new RegExp(`<section[^>]*\\bid="${id}"`));
  if (start < 0) throw new Error(`секция #${id} не найдена`);
  let depth = 0;
  const re = /<section\b|<\/section>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[0] === '<section') depth++;
    else {
      depth--;
      if (depth === 0) return body.slice(start, m.index + '</section>'.length);
    }
  }
  throw new Error(`секция #${id} не закрыта`);
}

const cssCache = new Map();
async function fetchCss(href) {
  if (!cssCache.has(href)) {
    const res = await fetch(BASE + href);
    if (!res.ok) throw new Error(`css ${href}: ${res.status}`);
    cssCache.set(href, prepareCss(await res.text()));
  }
  return cssCache.get(href);
}

const imgCache = new Map();
const missing = new Set();
const STUB = 'stub.svg';
writeFileSync(
  path.join(IMG_DIR, STUB),
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><defs><pattern id="s" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="14" fill="#edf2f6"/><rect x="7" width="7" height="14" fill="#f5f8fa"/></pattern></defs><rect width="640" height="480" fill="url(#s)"/></svg>`,
);
async function storeImage(rawSrc) {
  const src = rawSrc.replace(/&amp;/g, '&');
  if (imgCache.has(src)) return imgCache.get(src);
  let url;
  let fallback = null;
  if (src.startsWith('/_next/image')) {
    const u = new URL(src, BASE);
    const original = u.searchParams.get('url');
    url = (w) => `${BASE}/_next/image?url=${encodeURIComponent(original)}&w=${w}&q=75`;
    fallback = BASE + original;
  } else if (src.startsWith('/')) {
    url = () => BASE + src;
  } else {
    url = () => src;
  }
  let bytes = null;
  let type = '';
  for (const w of [640, 384]) {
    let res = await fetch(url(w), { headers: { Accept: 'image/webp,image/*;q=0.8' } });
    if (!res.ok && fallback !== null) res = await fetch(fallback);
    if (!res.ok) {
      // медиа в дев-базе нет — штрихованная заглушка в тонах проекта, а не битая картинка
      missing.add(src);
      imgCache.set(src, { name: STUB, size: 0 });
      return imgCache.get(src);
    }
    type = res.headers.get('content-type') ?? '';
    bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length <= 70 * 1024) break;
  }
  const ext = type.includes('svg')
    ? 'svg'
    : type.includes('webp')
      ? 'webp'
      : type.includes('png')
        ? 'png'
        : type.includes('avif')
          ? 'avif'
          : type.includes('gif')
            ? 'gif'
            : 'jpg';
  const name = `p${createHash('sha1').update(bytes).digest('hex').slice(0, 8)}.${ext}`;
  writeFileSync(path.join(IMG_DIR, name), bytes);
  imgCache.set(src, { name, size: bytes.length });
  return imgCache.get(src);
}

async function inlineImages(b) {
  const tags = [...b.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const replacements = new Map();
  for (const tag of tags) {
    const attrs = new Map();
    for (const a of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs.set(a[1], a[2]);
    const src = attrs.get('src');
    if (!src) continue;
    const { name } = await storeImage(src);
    for (const drop of ['srcset', 'sizes', 'loading', 'decoding', 'fetchpriority', 'data-nimg']) {
      attrs.delete(drop);
    }
    attrs.set('src', name);
    replacements.set(
      tag,
      `<img ${[...attrs].map(([k, v]) => `${k}="${v}"`).join(' ')}>`,
    );
  }
  let out = b;
  for (const [from, to] of replacements) out = out.split(from).join(to);
  return out;
}

function spriteSvgs(b) {
  const map = new Map();
  const sprite = [];
  let n = 0;
  const html = b.replace(/<svg\b([^>]*)>([\s\S]*?)<\/svg>/g, (m, attrs, inner) => {
    if (/<svg\b/.test(inner)) return m;
    const vb = (attrs.match(/\sviewBox="([^"]*)"/) ?? [])[1] ?? '';
    const key = `${vb}|${inner.trim()}`;
    let id = map.get(key);
    if (id === undefined) {
      id = `i${++n}`;
      map.set(key, id);
      sprite.push(`<symbol id="${id}"${vb ? ` viewBox="${vb}"` : ''}>${inner.trim()}</symbol>`);
    }
    return `<svg${attrs}><use href="#${id}"></use></svg>`;
  });
  const spriteSvg = `<svg width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">${sprite.join('')}</svg>`;
  return { html, sprite: spriteSvg };
}

function classSet(html) {
  const set = new Set();
  for (const m of html.matchAll(/class="([^"]*)"/g)) {
    for (const c of m[1].split(/\s+/)) if (c) set.add(c);
  }
  return set;
}

function artboard({ css, body, sprite }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="${FONTS}">
  <style>
${css}
  </style>
</helmet>
<div data-theme="{{theme}}" style="background:var(--bg);color:var(--ink);min-height:100vh">
${sprite}
${body}
</div>
</x-dc>
<script data-dc-script data-props='{"theme":{"editor":"enum","options":["light","dark"],"default":"light","section":"Тема"}}'>
class Component extends DCLogic {
  renderVals() {
    return { theme: this.props.theme ?? 'light' };
  }
}
</script>
</body>
</html>
`;
}

async function buildFromBody(rawBody, cssAll, keyName) {
  let body = cleanBody(rawBody);
  if (body.includes('{{')) throw new Error(`${keyName}: в разметке есть «{{»`);
  body = await inlineImages(body);
  const { html, sprite } = spriteSvgs(body);
  const classes = classSet(html);
  const css = minifyCss(purge(cssAll, classes));
  return { source: artboard({ css, body: html.trim(), sprite }), cssBytes: css.length, bodyBytes: html.length };
}

/* ---------- main ---------- */

// Динамические страницы приходят потоком: `fetch` отдаёт скелет с
// <template>/<div hidden>, содержимое подставляет клиентский скрипт. Поэтому
// разметка снимается с DOM после загрузки, а не с ответа сервера.
const browser = await chromium.launch();
const tab = await browser.newPage({ viewport: { width: 1200, height: 900 }, reducedMotion: 'reduce' });
async function snapshot(p, width) {
  await tab.setViewportSize({ width, height: 900 });
  const res = await tab.goto(BASE + p, { waitUntil: 'networkidle', timeout: 90_000 });
  if (!res || !res.ok()) throw new Error(`${p}: ${res?.status()}`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(300);
  return tab.content();
}

const manifest = [];
for (const page of PAGES) {
  // 🔴 Снимок на каждой ширине отдельно: часть состояний ставит JS по ширине
  // окна (подвал карточки отзыва, аккордеон подвала, витрина каталога).
  for (const w of WIDTHS) {
    const html = await snapshot(page.path, w);
    const hrefs = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
    const cssAll = (await Promise.all(hrefs.map(fetchCss))).join('\n');
    const rawBody = bodyInner(html);

    const built = await buildFromBody(rawBody, cssAll, page.key);
    const name = page.key === 'Home' && w === 375 ? 'Main' : `${page.key}${w}`;
    writeFileSync(path.join(OUT, `${name}.dc.html`), built.source);
    manifest.push({ name, page: page.key, title: `${page.title} · ${w}`, width: w, canvasPage: 'page-1' });
    console.log(
      `${name.padEnd(14)} html ${String(rawBody.length).padStart(8)} → body ${String(built.bodyBytes).padStart(7)} css ${String(built.cssBytes).padStart(7)}`,
    );

    if (page.key === 'Home') {
      for (const section of SECTIONS) {
        const sectionHtml = extractSection(cleanBody(rawBody), section.id);
        const sec = await buildFromBody(sectionHtml, cssAll, section.key);
        const secName = `${section.key}${w}`;
        writeFileSync(path.join(OUT, `${secName}.dc.html`), sec.source);
        manifest.push({ name: secName, page: section.key, title: `${section.title} · ${w}`, width: w, canvasPage: 'page-2', section: section.id });
      }
    }
  }
}
await browser.close();
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('missing media → stub:', missing.size);
console.log(
  'images:',
  [...imgCache.values()].map((i) => `${i.name} ${Math.round(i.size / 1024)}K`).join(', '),
);
