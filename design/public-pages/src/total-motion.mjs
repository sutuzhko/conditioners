// Третий заход по карточке итога: глубина и движение. Три артборда 348×432 —
// стекло с наклоном за курсором, объёмные столбики в перспективе, тёмная сцена
// с неоном. Классы и CSS кита сняты с живой страницы, свои правила — с
// префиксами g-, b3-, n-. Цвета слоёв — литералы: токенов под них нет.
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
  const body = s.slice(s.indexOf('</helmet>') + 9, s.indexOf('</x-dc>'));
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
const CARD_W = 348;
const CARD_H = 432;

function write(name, title, source) {
  writeFileSync(path.join(DIR, `${name}.dc.html`), source);
  const entry = { name, page: 'TotalMotion', title, width: WIDTH, canvasPage: 'page-2', section: 'savings' };
  const i = manifest.findIndex((m) => m.name === name);
  if (i >= 0) manifest[i] = entry;
  else manifest.push(entry);
}

const S = parts('SavingsNow1200');
const s = (b) => cls(S.css, b);
const rowHead = s('SavingsCalculator_rowHead');
const rowLabel = s('SavingsCalculator_rowLabel');
const rowValue = s('SavingsCalculator_rowValue');
const accentBox = `<div class="${s('Card_card')} ${s('Card_accent')} ${s('Card_md')} ${s('Card_rLg')} ${s('SavingsCalculator_total')}" style="margin-top:22px"><p class="${s('SavingsCalculator_totalLine')}"><span class="${s('SavingsCalculator_totalLabel')}">Ваша экономия:</span><span class="${s('SavingsCalculator_totalValue')}" style="font-size:28px">≈ 1&nbsp;778&nbsp;₽/сезон</span></p><p class="${s('SavingsCalculator_totalHorizon')}">≈ 8&nbsp;892&nbsp;₽ за 5 лет</p></div>`;

/* хвост с наклоном за курсором: состояние rx/ry, обработчики в renderVals */
const tiltTail = (baseX, baseY) => `</x-dc>
<script data-dc-script data-props='{"theme":{"editor":"enum","options":["light","dark"],"default":"light","section":"Тема"}}'>
class Component extends DCLogic {
  constructor() {
    super(...arguments);
    this.state = Object.assign({}, this.state, { rx: 0, ry: 0 });
  }
  renderVals() {
    const rx = ${baseX} + this.state.rx;
    const ry = ${baseY} + this.state.ry;
    return {
      theme: this.props.theme ?? 'light',
      tilt: 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)',
      move: (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        this.setState({ rx: -y * 8, ry: x * 10 });
      },
      leave: () => this.setState({ rx: 0, ry: 0 }),
    };
  }
}
</script>
</body>
</html>`;

const common = `
.t-stage{box-sizing:border-box;width:${WIDTH}px;padding:24px;perspective:1100px}
@keyframes m-grow{from{transform:scaleX(0)}}
@keyframes m-rise{from{opacity:0;transform:translateY(14px)}}`;

/* ---------- Л — стекло и наклон ---------- */
const glassCss = `
.g-card{position:relative;box-sizing:border-box;width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;border:1px solid rgb(255 255 255 / 70%);border-radius:var(--r-xl);background:var(--card);box-shadow:0 30px 60px -30px rgb(14 116 144 / 35%),0 2px 10px rgb(15 23 42 / 6%);transform-style:preserve-3d;transition:transform .18s ease-out;will-change:transform}
.g-blob{position:absolute;display:block;border-radius:50%;filter:blur(36px);opacity:.75;animation:g-drift 14s ease-in-out infinite alternate}
.g-b1{top:-60px;left:-70px;width:260px;height:260px;background:var(--accent-line)}
.g-b2{top:130px;right:-90px;width:240px;height:240px;background:rgb(6 182 212 / 35%);animation-duration:18s}
.g-b3{bottom:-100px;left:30px;width:220px;height:220px;background:rgb(249 115 22 / 16%);animation-duration:22s}
@keyframes g-drift{from{transform:translate3d(0,0,0) scale(1)}to{transform:translate3d(30px,24px,0) scale(1.15)}}
.g-body{position:relative;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;height:100%;padding:32px;transform:translateZ(30px)}
.g-row + .g-row{margin-top:22px}
.g-bar{display:block;overflow:hidden;height:8px;border-radius:var(--r-pill);background:rgb(255 255 255 / 60%)}
.g-fill{display:block;height:100%;border-radius:var(--r-pill);transform-origin:left;animation:m-grow 1.1s cubic-bezier(.2,.7,.2,1) both}
.g-usual{background:linear-gradient(90deg,var(--eco-usual-from),var(--eco-usual-to));box-shadow:0 0 16px rgb(239 68 68 / 45%)}
.g-inverter{background:linear-gradient(90deg,var(--eco-inverter-from),var(--brand-mark-dark));box-shadow:0 0 16px rgb(34 211 238 / 50%);animation-delay:.15s}
.g-total{padding:20px;border:1px solid rgb(255 255 255 / 80%);border-radius:var(--r-lg);background:rgb(255 255 255 / 55%);box-shadow:inset 0 1px 0 rgb(255 255 255 / 90%),0 10px 30px -18px rgb(15 23 42 / 25%);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);transform:translateZ(20px);animation:m-rise .8s .35s cubic-bezier(.2,.7,.2,1) both}
.g-label{margin:0;color:var(--muted);font-size:var(--fs-dense)}
.g-num{margin:2px 0 0;font-family:var(--font-display);font-size:32px;font-weight:800;line-height:1.15;letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap;background:linear-gradient(90deg,var(--brand),var(--brand-mark-dark));-webkit-background-clip:text;background-clip:text;color:transparent}
.g-unit{font-size:17px;font-weight:700}
.g-hz{margin:4px 0 0;color:var(--body);font-size:var(--fs-dense)}
[data-theme='dark'] .g-card{border-color:rgb(255 255 255 / 8%)}
[data-theme='dark'] .g-bar{background:rgb(255 255 255 / 10%)}
[data-theme='dark'] .g-total{border-color:rgb(255 255 255 / 12%);background:rgb(255 255 255 / 6%);box-shadow:inset 0 1px 0 rgb(255 255 255 / 12%)}
@media (prefers-reduced-motion:reduce){.g-blob,.g-fill,.g-total{animation:none}.g-card{transition:none}}`;

const glass = `<div class="t-stage">
<div class="g-card" style="transform:{{tilt}}" onMouseMove="{{move}}" onMouseLeave="{{leave}}">
  <span class="g-blob g-b1" aria-hidden="true"></span><span class="g-blob g-b2" aria-hidden="true"></span><span class="g-blob g-b3" aria-hidden="true"></span>
  <div class="g-body">
    <div class="g-rows">
      <div class="g-row"><p class="${rowHead}"><span class="${rowLabel}">Обычный on/off</span><span class="${rowValue}">≈ 4&nbsp;680&nbsp;₽/сезон</span></p><span class="g-bar" aria-hidden="true"><span class="g-fill g-usual" style="width:100%"></span></span></div>
      <div class="g-row"><p class="${rowHead}"><span class="${rowLabel}">Инверторный</span><span class="${rowValue}">≈ 2&nbsp;902&nbsp;₽/сезон</span></p><span class="g-bar" aria-hidden="true"><span class="g-fill g-inverter" style="width:62%"></span></span></div>
    </div>
    <div class="g-total">
      <p class="g-label">Ваша экономия</p>
      <p class="g-num">≈ 1&nbsp;778&nbsp;₽<span class="g-unit">/сезон</span></p>
      <p class="g-hz">≈ 8&nbsp;892&nbsp;₽ за 5 лет</p>
    </div>
  </div>
</div>
</div>`;

/* ---------- М — объёмные столбики ---------- */
const barsCss = `
.b3-card{position:relative;display:flex;flex-direction:column;box-sizing:border-box;width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;padding:32px;border:1px solid var(--line);border-radius:var(--r-xl);background:var(--card);box-shadow:var(--sh-sm)}
.b3-scene{display:flex;flex:1;align-items:flex-end;justify-content:center;padding:36px 0 30px;perspective:900px}
.b3-group{display:flex;align-items:flex-end;gap:44px;transform-style:preserve-3d;transition:transform .18s ease-out}
.b3-bar{position:relative;width:84px;transform-style:preserve-3d;animation:b3-grow 1s cubic-bezier(.2,.7,.2,1) both}
.b3-inverter{animation-delay:.15s}
@keyframes b3-grow{from{height:0}}
.b3-face{position:absolute;display:block}
.b3-front{inset:0;border-radius:5px 5px 0 0}
.b3-top{top:0;left:0;width:100%;height:36px;transform-origin:top;transform:rotateX(-90deg)}
.b3-side{top:0;right:0;width:36px;height:100%;transform-origin:right;transform:rotateY(-90deg)}
.b3-usual .b3-front{background:linear-gradient(0deg,var(--eco-usual-from),var(--eco-usual-to))}
.b3-usual .b3-top{background:color-mix(in srgb,var(--eco-usual-to) 65%,white)}
.b3-usual .b3-side{background:color-mix(in srgb,var(--eco-usual-from) 70%,black)}
.b3-inverter .b3-front{background:linear-gradient(0deg,var(--eco-inverter-from),var(--brand-mark-dark))}
.b3-inverter .b3-top{background:color-mix(in srgb,var(--brand-mark-dark) 65%,white)}
.b3-inverter .b3-side{background:color-mix(in srgb,var(--eco-inverter-from) 70%,black)}
.b3-shadow{position:absolute;right:-30%;bottom:-9px;left:-8%;display:block;height:16px;border-radius:50%;background:radial-gradient(ellipse at center,rgb(15 23 42 / 28%),transparent 70%);filter:blur(3px);transform:translateZ(-1px)}
.b3-val,.b3-lab{position:absolute;left:50%;white-space:nowrap;transform:translateX(-50%) rotateY(24deg) rotateX(12deg)}
.b3-val{bottom:calc(100% + 18px);margin:0;color:var(--ink);font-family:var(--font-display);font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
.b3-lab{top:calc(100% + 12px);color:var(--muted);font-size:13px}
@media (prefers-reduced-motion:reduce){.b3-bar{animation:none}.b3-group{transition:none}}`;

const bars = `<div class="t-stage">
<div class="b3-card" onMouseMove="{{move}}" onMouseLeave="{{leave}}">
  <div class="b3-scene">
    <div class="b3-group" style="transform:{{tilt}}">
      <div class="b3-bar b3-usual" style="height:150px"><span class="b3-val">≈ 4&nbsp;680&nbsp;₽</span><i class="b3-face b3-front"></i><i class="b3-face b3-top"></i><i class="b3-face b3-side"></i><i class="b3-shadow" aria-hidden="true"></i><span class="b3-lab">Обычный on/off</span></div>
      <div class="b3-bar b3-inverter" style="height:93px"><span class="b3-val">≈ 2&nbsp;902&nbsp;₽</span><i class="b3-face b3-front"></i><i class="b3-face b3-top"></i><i class="b3-face b3-side"></i><i class="b3-shadow" aria-hidden="true"></i><span class="b3-lab">Инверторный</span></div>
    </div>
  </div>
  ${accentBox}
</div>
</div>`;

/* ---------- Н — сцена с неоном ---------- */
const sceneCss = `
.n-card{position:relative;display:flex;flex-direction:column;box-sizing:border-box;width:${CARD_W}px;height:${CARD_H}px;overflow:hidden;border:1px solid rgb(34 211 238 / 25%);border-radius:var(--r-xl);background:radial-gradient(120% 80% at 50% 0%,#12305a 0%,#0b1220 60%,#070c17 100%);color:#eaf1f8;box-shadow:0 30px 60px -30px rgb(34 211 238 / 35%)}
.n-glow{position:absolute;top:-130px;left:50%;display:block;width:380px;height:280px;background:radial-gradient(closest-side,rgb(34 211 238 / 45%),transparent);filter:blur(30px);transform:translateX(-50%);animation:n-pulse 6s ease-in-out infinite alternate}
@keyframes n-pulse{from{opacity:.7;transform:translateX(-50%) scale(1)}to{opacity:1;transform:translateX(-50%) scale(1.2)}}
.n-floor{position:absolute;right:-40%;bottom:-20px;left:-40%;display:block;height:340px;background-image:linear-gradient(rgb(34 211 238 / 45%) 1px,transparent 1px),linear-gradient(90deg,rgb(34 211 238 / 45%) 1px,transparent 1px);background-size:40px 40px;transform:perspective(520px) rotateX(58deg);transform-origin:bottom;-webkit-mask-image:linear-gradient(to top,rgb(0 0 0 / 85%),transparent 100%);mask-image:linear-gradient(to top,rgb(0 0 0 / 85%),transparent 100%);animation:n-scroll 3s linear infinite}
@keyframes n-scroll{to{background-position:0 40px}}
.n-body{position:relative;display:flex;flex:1;flex-direction:column;justify-content:space-between;box-sizing:border-box;padding:32px}
/* в контексте блока: ширину и высоту даёт сетка; на телефоне колонка одна и сцене нужна своя минимальная высота */
.n-ctx{width:auto;height:auto}
.n-ctx375{min-height:400px;padding:0}
.n-ctx375 .n-body{padding:22px}
.n-eyebrow{margin:0 0 18px;color:rgb(234 241 248 / 55%);font-family:var(--font-mono);font-size:12px;font-weight:500;letter-spacing:.1em;text-transform:uppercase}
.n-total{animation:m-rise .8s .35s cubic-bezier(.2,.7,.2,1) both}
.n-label{margin:0;color:rgb(234 241 248 / 65%);font-size:var(--fs-dense)}
.n-num{margin:2px 0 0;color:#fff;font-family:var(--font-display);font-size:38px;font-weight:800;line-height:1.1;letter-spacing:-.01em;font-variant-numeric:tabular-nums;white-space:nowrap;text-shadow:0 0 18px rgb(34 211 238 / 65%)}
.n-unit{color:rgb(234 241 248 / 70%);font-size:18px;font-weight:700;text-shadow:none}
.n-hz{margin:4px 0 0;color:rgb(234 241 248 / 80%);font-size:var(--fs-dense)}
.n-row + .n-row{margin-top:20px}
.n-head{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;margin:0 0 8px}
.n-lab{color:rgb(234 241 248 / 65%);font-size:var(--fs-dense);white-space:nowrap}
.n-val{margin-left:auto;font-family:var(--font-display);font-size:17px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.n-bar{display:block;overflow:hidden;height:8px;border-radius:var(--r-pill);background:rgb(255 255 255 / 8%)}
.n-fill{display:block;height:100%;border-radius:var(--r-pill);transform-origin:left;animation:m-grow 1.1s cubic-bezier(.2,.7,.2,1) both}
.n-usual{background:linear-gradient(90deg,var(--eco-usual-from),var(--eco-usual-to));box-shadow:0 0 10px rgb(239 68 68 / 70%),0 0 24px rgb(249 115 22 / 45%)}
.n-inverter{background:linear-gradient(90deg,var(--eco-inverter-from),var(--brand-mark-dark));box-shadow:0 0 10px rgb(34 211 238 / 80%),0 0 24px rgb(6 182 212 / 50%);animation-delay:.15s}
@media (prefers-reduced-motion:reduce){.n-glow,.n-floor,.n-total,.n-fill{animation:none}}`;

const scene = `<div class="t-stage">
<div class="n-card">
  <i class="n-glow" aria-hidden="true"></i>
  <i class="n-floor" aria-hidden="true"></i>
  <div class="n-body">
    <div>
      <p class="n-eyebrow">За сезон охлаждения</p>
      <div class="n-total">
        <p class="n-label">Ваша экономия</p>
        <p class="n-num">≈ 1&nbsp;778&nbsp;₽<span class="n-unit">/сезон</span></p>
        <p class="n-hz">≈ 8&nbsp;892&nbsp;₽ за 5 лет</p>
      </div>
    </div>
    <div class="n-rows">
      <div class="n-row"><p class="n-head"><span class="n-lab">Обычный on/off</span><span class="n-val">≈ 4&nbsp;680&nbsp;₽</span></p><span class="n-bar" aria-hidden="true"><span class="n-fill n-usual" style="width:100%"></span></span></div>
      <div class="n-row"><p class="n-head"><span class="n-lab">Инверторный</span><span class="n-val">≈ 2&nbsp;902&nbsp;₽</span></p><span class="n-bar" aria-hidden="true"><span class="n-fill n-inverter" style="width:62%"></span></span></div>
    </div>
  </div>
</div>
</div>`;

/* ---------- Н в контексте блока: 1200 с нынешней сеткой часов и 375 ---------- */
function cutResult(body) {
  const from = body.indexOf(s('SavingsCalculator_result'));
  const start = body.lastIndexOf('<div', from);
  const disc = body.indexOf(s('SavingsBlock_disclaimer'), from);
  const gridClose = body.lastIndexOf('</div>', disc);
  // lastIndexOf включает fromIndex — иначе находится тот же закрывающий тег сетки
  const cardClose = body.lastIndexOf('</div>', gridClose - 1);
  const card = body.slice(start, cardClose + 6);
  if (!card.includes(s('SavingsCalculator_total'))) throw new Error('карточка итога не вырезалась');
  return card;
}
const sceneCard = (extra) => scene.slice(scene.indexOf('<div class="n-card">'), scene.lastIndexOf('</div>')).replace('<div class="n-card">', `<div class="n-card ${extra}">`);
for (const [name, source, extra, title] of [
  ['SceneBlock1200', 'SavingsNow1200', 'n-ctx', 'Итог · Н в блоке · 1200'],
  ['SceneBlock375', 'SavingsNow375', 'n-ctx n-ctx375', 'Итог · Н в блоке · 375'],
]) {
  const P = parts(source);
  const body = P.body.replace(cutResult(P.body), sceneCard(extra));
  writeFileSync(path.join(DIR, `${name}.dc.html`), wrap({ ...P, extraCss: common + sceneCss, body }));
  const width = name.endsWith('375') ? 375 : 1200;
  const entry = { name, page: 'SceneBlock', title, width, canvasPage: 'page-2', section: 'savings' };
  const i = manifest.findIndex((m) => m.name === name);
  if (i >= 0) manifest[i] = entry;
  else manifest.push(entry);
}

write('TotalGlass', 'Итог · Л · стекло и наклон', wrap({ ...S, tail: tiltTail(0, 0), extraCss: common + glassCss, body: glass }));
write('TotalBars3d', 'Итог · М · объёмные столбики', wrap({ ...S, tail: tiltTail(-12, -24), extraCss: common + barsCss, body: bars }));
write('TotalScene', 'Итог · Н · сцена с неоном', wrap({ ...S, extraCss: common + sceneCss, body: scene }));

writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('motion written: TotalGlass, TotalBars3d, TotalScene, SceneBlock1200, SceneBlock375');
