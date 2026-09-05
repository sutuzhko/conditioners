// Собирает четыре артборда карточки итога экономии: как сейчас и три
// варианта. Карточка одна и та же, что справа в расчёте на 1200: классы и
// CSS кита сняты с живой страницы, свои правила — с префиксом t-.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2] ?? 'canvas';
const manifest = JSON.parse(readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));

function parts(name) {
  const s = readFileSync(path.join(DIR, `${name}.dc.html`), 'utf8');
  const head = s.slice(0, s.indexOf('<x-dc>'));
  const css = s.slice(s.indexOf('<style>') + 7, s.indexOf('</style>'));
  const sprite = (s.match(/<svg width="0" height="0"[\s\S]*?<\/svg>/) ?? [''])[0];
  const tail = s.slice(s.indexOf('</x-dc>'));
  const body = s.slice(s.indexOf('</helmet>'), s.indexOf('</x-dc>'));
  return { head, css, sprite, tail, body };
}

function cls(css, base) {
  const m = css.match(new RegExp(`\\.(${base}__[A-Za-z0-9_-]+)`));
  if (!m) throw new Error(`класс ${base} не найден`);
  return m[1];
}

function wrap({ head, css, extraCss, sprite, body, tail }) {
  return `${head}<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@600;700;800&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">
  <style>
${css}
${extraCss}
  </style>
</helmet>
<div data-theme="{{theme}}" style="background:var(--bg);color:var(--ink);min-height:100vh">
${sprite}
${body}
</div>
${tail}`;
}

const WIDTH = 396;

function write(name, title, source) {
  writeFileSync(path.join(DIR, `${name}.dc.html`), source);
  const entry = { name, page: 'Total', title, width: WIDTH, canvasPage: 'page-2', section: 'savings' };
  const i = manifest.findIndex((m) => m.name === name);
  if (i >= 0) manifest[i] = entry;
  else manifest.push(entry);
}

const S = parts('SavingsNow1200');
const s = (b) => cls(S.css, b);

/* карточка итога как она есть на 1200 — вырезается из снятой разметки */
const from = S.body.indexOf(s('SavingsCalculator_result'));
const start = S.body.lastIndexOf('<div', from);
const disclaimer = S.body.indexOf(s('SavingsBlock_disclaimer'), from);
const gridClose = S.body.lastIndexOf('</div>', disclaimer);
const cardClose = S.body.lastIndexOf('</div>', gridClose - 1);
const nowCard = S.body.slice(start, cardClose + 6);
if (!nowCard.includes(s('SavingsCalculator_total'))) throw new Error('карточка итога не вырезалась');

/* две строки сравнения с полосами — как сейчас, для варианта В */
const rowsFrom = nowCard.indexOf('<div class="' + s('SavingsCalculator_row'));
const rowsTo = nowCard.indexOf('<div class="' + s('Card_card') + ' ' + s('Card_accent'));
const nowRows = nowCard.slice(rowsFrom, rowsTo);

/* 🔴 На 1200 поле карточки clamp(22px, 5vw, 32px) даёт 32px, кегль итога —
   28px. В рамке шириной 396 vw считается от рамки, и оба значения упали бы
   до телефонных; здесь они зашиты, чтобы карточка была той же, что справа
   в расчёте на 1200. Высота — высота сетки часов, к которой карточка
   растянута в двухколонной сетке. */
const CARD_H = 351;
const cardClass = `${s('Card_card')} ${s('Card_default')} ${s('Card_xl')} ${s('Card_rXl')} ${s('SavingsCalculator_result')}`;
const rowLabel = s('SavingsCalculator_rowLabel');
const rowValue = s('SavingsCalculator_rowValue');
const horizon = s('SavingsCalculator_totalHorizon');

const css = `
/* карточка итога: как сейчас и три варианта; свои правила — t- */
.t-stage{box-sizing:border-box;width:${WIDTH}px;padding:24px}
.t-card{justify-content:flex-start;min-height:${CARD_H}px;padding:32px}
.t-eyebrow{margin:0 0 14px;color:var(--faint);font-family:var(--font-mono);font-size:var(--fs-micro);font-weight:500;letter-spacing:.1em;text-transform:uppercase}
.t-rows{display:flex;flex-direction:column;margin:0}
.t-row{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin:0;padding:9px 0;border-top:1px solid var(--line-soft)}
.t-row:first-child{padding-top:0;border-top:0}
.t-row dd{margin:0 0 0 auto}
.t-lead{margin:0;color:var(--muted);font-size:var(--fs-dense)}
.t-hero{margin:2px 0 0;color:var(--ink);font-family:var(--font-display);font-size:40px;font-weight:700;line-height:1.1;letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap}
.t-approx{margin-right:.12em;color:var(--muted);font-weight:600}
.t-total{margin-top:auto;padding-top:18px;border-top:1px solid var(--line-soft)}
.t-stack{display:flex;gap:3px;height:10px;margin:12px 0 0;overflow:hidden;border-radius:var(--r-pill);background:var(--stripe-a)}
.t-seg{display:block;height:100%}
.t-segInv{background:var(--brand-mark)}
.t-segSave{background:var(--ok-ink)}
.t-legend{display:flex;flex-wrap:wrap;gap:6px 16px;margin:8px 0 0;padding-bottom:10px;color:var(--faint);font-size:var(--fs-caption);line-height:1.4}
.t-legend span{display:inline-flex;align-items:center;gap:7px}
.t-dot{display:inline-block;flex-shrink:0;width:8px;height:8px;border-radius:50%}
.t-right{text-align:right}
.t-value28{display:block;margin:2px 0 0;font-size:28px}`;

const stage = (card) => `<div class="t-stage">${card}</div>`;

/* сейчас: снятая разметка, только поле и высота как на 1200 */
const now = nowCard
  .replace(s('SavingsCalculator_result') + '"', `${s('SavingsCalculator_result')}" style="min-height:${CARD_H}px;padding:32px"`)
  .replace(`class="${s('SavingsCalculator_totalValue')}"`, `class="${s('SavingsCalculator_totalValue')}" style="font-size:28px"`);

/* А — без полос: ответ первым, сравнение таблицей внизу */
const a = `<div class="${cardClass} t-card">
  <p class="t-eyebrow">За сезон охлаждения</p>
  <p class="t-lead">Ваша экономия</p>
  <p class="t-hero"><span class="t-approx">≈</span>1&nbsp;778&nbsp;₽</p>
  <p class="${horizon}">≈ 8&nbsp;892&nbsp;₽ за 5 лет</p>
  <dl class="t-rows t-total">
    <div class="t-row"><dt class="${rowLabel}">Обычный on/off</dt><dd class="${rowValue}">≈ 4&nbsp;680&nbsp;₽</dd></div>
    <div class="t-row"><dt class="${rowLabel}">Инверторный</dt><dd class="${rowValue}">≈ 2&nbsp;902&nbsp;₽</dd></div>
  </dl>
</div>`;

/* Б — одна полоса длиной в расход обычной модели: доля инвертора и доля экономии */
const b = `<div class="${cardClass} t-card">
  <p class="t-eyebrow">За сезон охлаждения</p>
  <div class="t-rows">
    <p class="t-row"><span class="${rowLabel}">Обычный on/off</span><span class="${rowValue}">≈ 4&nbsp;680&nbsp;₽</span></p>
    <p class="t-row"><span class="${rowLabel}">Инверторный</span><span class="${rowValue}">≈ 2&nbsp;902&nbsp;₽</span></p>
  </div>
  <span class="t-stack" aria-hidden="true"><span class="t-seg t-segInv" style="width:62%"></span><span class="t-seg t-segSave" style="width:38%"></span></span>
  <p class="t-legend" aria-hidden="true"><span><i class="t-dot t-segInv"></i>инверторный · 62 %</span><span><i class="t-dot t-segSave"></i>экономия · 38 %</span></p>
  <div class="t-total">
    <p class="t-lead">Ваша экономия</p>
    <p class="t-hero"><span class="t-approx">≈</span>1&nbsp;778&nbsp;₽</p>
    <p class="${horizon}">≈ 8&nbsp;892&nbsp;₽ за 5 лет</p>
  </div>
</div>`;

/* В — обе полосы как сейчас, итог без голубой карточки, по правой линии сумм */
const c = `<div class="${cardClass} t-card">
  ${nowRows}
  <div class="t-total t-right">
    <p class="t-lead">Ваша экономия</p>
    <p class="${s('SavingsCalculator_totalValue')} t-value28">≈ 1&nbsp;778&nbsp;₽/сезон</p>
    <p class="${horizon}">≈ 8&nbsp;892&nbsp;₽ за 5 лет</p>
  </div>
</div>`;

write('TotalNow', 'Итог · сейчас', wrap({ ...S, extraCss: css, body: stage(now) }));
write('TotalA', 'Итог · А · без полос', wrap({ ...S, extraCss: css, body: stage(a) }));
write('TotalB', 'Итог · Б · одна полоса', wrap({ ...S, extraCss: css, body: stage(b) }));
write('TotalC', 'Итог · В · обе полосы, ровный итог', wrap({ ...S, extraCss: css, body: stage(c) }));


writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('total written: TotalNow, TotalA, TotalB, TotalC');
