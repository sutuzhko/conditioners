// Собирает артборды-предложения для двух блоков главной — контактов и
// расчёта экономии — из CSS и классов кита, снятых с живой страницы, плюс
// новая раскладка инлайн-стилями и небольшим блоком своих правил.
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
  return { head, css, sprite, tail };
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

function write(name, title, width, source) {
  writeFileSync(path.join(DIR, `${name}.dc.html`), source);
  manifest.push({ name, page: name.replace(/\d+$/, ''), title: `${title} · ${width}`, width, canvasPage: 'page-2' });
}

/* ================= КОНТАКТЫ ================= */

const C = parts('ContactsNow1200');
const c = (b) => cls(C.css, b);
const S = parts('SavingsNow1200');
const s = (b) => cls(S.css, b);

const MAP_HREF = 'https://yandex.ru/maps/?ll=37.6182,54.1961&amp;z=17&amp;pt=37.6182,54.1961';
const icon = (id) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#${id}"></use></svg>`;
const EXTERNAL =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6"></path><path d="M20 4 10 14"></path><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"></path></svg>';

const mapLink = `<a class="p-map" href="${MAP_HREF}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;color:var(--accent-text);font-size:14.5px;font-weight:600;text-decoration:none">Открыть в Яндекс.Картах ${EXTERNAL}</a>`;

const contactRows = (phonesInline) => `
<dl class="${c('Contacts_rows')} p-rows" aria-label="Контакты компании">
  <div class="${c('Contacts_row')}">
    <span class="${c('Contacts_icon')}" aria-hidden="true">${icon('i1')}</span>
    <div class="${c('Contacts_rowBody')}">
      <dt class="${c('Contacts_label')}">Адрес</dt>
      <dd class="${c('Contacts_definition')}" style="display:flex;flex-direction:column;align-items:flex-start;gap:2px">
        <address class="${c('Contacts_address')}">Тула, проспект Ленина, 108, офис 312</address>
        ${mapLink}
      </dd>
    </div>
  </div>
  <div class="${c('Contacts_row')}">
    <span class="${c('Contacts_icon')}" aria-hidden="true">${icon('i2')}</span>
    <div class="${c('Contacts_rowBody')}">
      <dt class="${c('Contacts_label')}">Телефон</dt>
      <dd class="${c('Contacts_definition')}">
        <span class="${c('Contacts_phones')}" style="display:flex;flex-direction:${phonesInline ? 'row' : 'column'};flex-wrap:wrap;gap:0 20px">
          <a href="tel:+74872000010" class="${c('Contacts_phone')}" aria-label="Позвонить +7 (4872) 00-00-10">+7 (4872) 00-00-10</a>
          <a href="tel:+79000000020" class="${c('Contacts_phone')}" aria-label="Позвонить +7 (900) 000-00-20">+7 (900) 000-00-20</a>
        </span>
      </dd>
    </div>
  </div>
  <div class="${c('Contacts_row')}">
    <span class="${c('Contacts_icon')}" aria-hidden="true">${icon('i3')}</span>
    <div class="${c('Contacts_rowBody')}">
      <dt class="${c('Contacts_label')}">Часы работы</dt>
      <dd class="${c('Contacts_definition')}"><span class="${c('Contacts_value')}">Пн–Вс, 8:00–21:00</span></dd>
    </div>
  </div>
</dl>`;

const contactsCss = `
/* предложение А: три колонки фактов с 900, карта — ссылка под адресом */
.p-rows{grid-template-columns:minmax(0,1fr);gap:20px}
@media (min-width:600px){.p-rows{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 32px}}
@media (min-width:900px){.p-rows{grid-template-columns:repeat(3,minmax(0,1fr))}}
.p-map{min-height:var(--tap)}
@media (min-width:900px){.p-map{min-height:32px}}
.p-map:hover{text-decoration:underline}
.p-map:focus-visible{outline:none;border-radius:6px;box-shadow:var(--ring-focus-ring)}`;

const contactsA = `
<section id="contacts" class="${c('Contacts_section')}" aria-labelledby="contacts-title">
  <div class="${c('Contacts_container')}">
    <div class="${c('Contacts_info')}">
      <p class="${c('Contacts_kicker')}">— Контакты —</p>
      <h2 id="contacts-title" class="${c('Contacts_title')}" style="max-width:760px">Тула и область: Щёкино, Новомосковск, Алексин, Ясногорск, Венёв</h2>
      ${contactRows(true)}
      <a class="${c('Button_button')} ${c('Button_solid')} ${c('Button_lg')} ${c('Button_fullWidth')} ${c('Contacts_cta')}" href="#lead"><span class="${c('Button_content')}"><span class="${c('Button_label')}">Оставить заявку</span></span></a>
    </div>
  </div>
</section>`;

for (const w of [375, 768, 1200]) {
  write(`ContactsNew${w}`, 'Контакты · предложение А', w, wrap({ ...C, extraCss: contactsCss, body: contactsA }));
}

/* вариант Б: заголовок и призыв слева, факты — карточкой справа */
const cardRules = S.css
  .split('\n')
  .filter((l) => /^\.Card_/.test(l))
  .join('\n');
const contactsBCss = `${cardRules}
.p-two{display:grid;grid-template-columns:minmax(0,1fr);gap:28px;align-items:start}
@media (min-width:900px){.p-two{grid-template-columns:minmax(0,1fr) minmax(420px,480px);gap:48px}}
.p-rows{grid-template-columns:minmax(0,1fr);gap:22px}
.p-map{min-height:var(--tap)}
@media (min-width:900px){.p-map{min-height:32px}}
.p-map:hover{text-decoration:underline}`;

const contactsB = `
<section id="contacts" class="${c('Contacts_section')}" aria-labelledby="contacts-title">
  <div class="${c('Contacts_container')}">
    <div class="p-two">
      <div class="${c('Contacts_info')}">
        <p class="${c('Contacts_kicker')}">— Контакты —</p>
        <h2 id="contacts-title" class="${c('Contacts_title')}">Тула и область: Щёкино, Новомосковск, Алексин, Ясногорск, Венёв</h2>
        <p style="margin:0 0 28px;max-width:520px;color:var(--muted);font-size:var(--fs-lead)">Позвоните или оставьте заявку — перезвоним в рабочие часы и подберём модель под ваше помещение.</p>
        <a class="${c('Button_button')} ${c('Button_solid')} ${c('Button_lg')} ${c('Button_fullWidth')} ${c('Contacts_cta')}" style="margin-top:0" href="#lead"><span class="${c('Button_content')}"><span class="${c('Button_label')}">Оставить заявку</span></span></a>
      </div>
      <div class="${s('Card_card')} ${s('Card_default')} ${s('Card_xl')} ${s('Card_rXl')}">
        ${contactRows(false)}
      </div>
    </div>
  </div>
</section>`;

write('ContactsAlt1200', 'Контакты · вариант Б', 1200, wrap({ ...C, extraCss: contactsBCss, body: contactsB }));

/* ================= ЭКОНОМИЯ ================= */

const NIGHT = new Set([23, 0, 1, 2, 3, 4, 5, 6]);
const ON = new Set([12, 13, 14, 15, 18, 19, 20, 21]);
const pad = (h) => String(h).padStart(2, '0');

const cells = [...Array(24).keys()]
  .map((h) => {
    const night = NIGHT.has(h);
    const on = ON.has(h);
    const name = `${pad(h)}:00–${pad((h + 1) % 24)}:00${night ? ', ночная зона' : ''}, ${on ? 'включён' : 'выключен'}`;
    return `<button type="button" class="p-cell${night ? ' p-night' : ''}${on ? ' p-on' : ''}" aria-pressed="${on}" aria-label="${name}" title="${name}" data-hour="${h}">${pad(h)}</button>`;
  })
  .join('\n      ');

const chip = (label, pressed = false) =>
  `<button type="button" class="p-chip" aria-pressed="${pressed}">${label}</button>`;

const slider = (id, label, value, min, max, text) => `
<div class="${s('Field_field')}">
  <span class="${s('RangeSlider_head')} ${s('RangeSlider_headSm')}">
    <label for="${id}">${label}</label>
    <output for="${id}" class="${s('RangeSlider_value')}">${text}</output>
  </span>
  <input type="range" id="${id}" class="${s('RangeSlider_slider')} ${s('RangeSlider_sliderSm')}" min="${min}" max="${max}" step="0.1" aria-valuetext="${text}" value="${value}">
</div>`;

const savingsCss = `
/* предложение: пресеты, часы с подписью в ячейке, легенда, одна ставка в едином тарифе */
.p-presets{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px}
.p-chip{display:inline-flex;align-items:center;min-height:36px;padding:0 14px;border:1px solid var(--line);border-radius:var(--r-pill);background:var(--bg-soft);color:var(--ink2);font-family:var(--font-text);font-size:13px;font-weight:600;line-height:1.2;cursor:pointer;transition:background var(--dur-fast) ease,border-color var(--dur-fast) ease}
.p-chip:hover{border-color:var(--accent-line);background:var(--accent-bg)}
.p-chip[aria-pressed='true']{border-color:var(--accent-line);background:var(--accent-bg);color:var(--accent-text)}
.p-chip:focus-visible{outline:none;box-shadow:var(--ring-focus-ring)}
@media (max-width:899px){.p-chip{min-height:var(--tap)}}
.p-hours{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px 5px;user-select:none;touch-action:pan-y}
@media (max-width:599px){.p-hours{grid-template-columns:repeat(6,minmax(0,1fr))}}
.p-cell{position:relative;box-sizing:border-box;height:32px;padding:0;border:0;border-radius:7px;background:var(--stripe-a);color:var(--faint);font-family:var(--font-mono);font-size:11.5px;font-weight:500;font-variant-numeric:tabular-nums;cursor:pointer;transition:background var(--dur-fast) ease}
.p-cell::after{content:'';position:absolute;inset:-6px calc(-5px / 2)}
.p-cell.p-night{background:var(--hours-night);color:var(--ink2)}
.p-cell.p-on{background:linear-gradient(180deg,var(--brand-mark-dark),var(--brand-mark));color:var(--panel)}
.p-cell.p-on.p-night{background:linear-gradient(180deg,var(--hours-night-on-from),var(--hours-night-on-to));color:var(--on-brand)}
@media (hover:hover){.p-cell:hover:not(.p-on){background:var(--accent-bg);color:var(--accent-text)}}
.p-cell:focus-visible{z-index:1;outline:none;box-shadow:var(--ring-focus-ring)}
.p-legend{display:flex;flex-wrap:wrap;gap:6px 18px;margin:12px 0 0;color:var(--faint);font-size:12.5px;line-height:1.5}
.p-legend span{display:inline-flex;align-items:center;gap:7px}
.p-sw{display:inline-block;width:12px;height:12px;border-radius:3px;flex-shrink:0}
.p-hint{align-self:center;margin:0;color:var(--faint);font-size:12.5px;line-height:1.5}
@media (max-width:599px){.p-hint{display:none}}`;

const savings = `
<section id="savings" class="${s('SavingsBlock_section')}" aria-labelledby="savings-title">
  <div class="${s('SavingsBlock_container')}">
    <header class="${s('SavingsBlock_intro')}">
      <p class="${s('SavingsBlock_kicker')}">— Помощь в выборе —</p>
      <h2 id="savings-title" class="${s('SavingsBlock_title')}">Инверторный кондиционер окупает себя</h2>
      <p class="${s('SavingsBlock_lead')}">Посчитайте, сколько вы сэкономите на электричестве по сравнению с обычной on/off-моделью.</p>
    </header>
    <div class="${s('SavingsCalculator_grid')}">
      <div class="${s('Card_card')} ${s('Card_default')} ${s('Card_xl')} ${s('Card_rXl')} ${s('SavingsCalculator_inputs')}" style="gap:26px">
        <div>
          <p class="${s('SavingsCalculator_gridHead')}">
            <span id="hours-label" class="${s('SavingsCalculator_gridLabel')}">Когда работает кондиционер</span>
            <output class="${s('SavingsCalculator_gridTotal')}" aria-live="polite" aria-label="Всего в сутки">8 ч</output>
          </p>
          <div class="p-presets" role="group" aria-label="Типовые режимы">
            ${chip('Вечером')} ${chip('Днём и вечером')} ${chip('Ночью')} ${chip('Круглосуточно')}
          </div>
          <div class="p-hours" role="group" aria-labelledby="hours-label">
      ${cells}
          </div>
          <p class="p-legend" aria-hidden="true">
            <span><i class="p-sw" style="background:linear-gradient(180deg,var(--brand-mark-dark),var(--brand-mark))"></i>включён</span>
            <span><i class="p-sw" style="background:var(--hours-night)"></i>ночная зона 23–07 — дешевле при тарифе «День / ночь»</span>
          </p>
        </div>
        <div>
          <p class="${s('SavingsCalculator_tariffHead')}" style="justify-content:flex-start;gap:14px">
            <span class="${s('SavingsCalculator_gridLabel')}">Тариф</span>
            <span class="${s('SavingsCalculator_modes')}" role="group" aria-label="Тариф на электричество">
              <button aria-pressed="true" type="button" class="${s('Button_button')} ${s('Button_solid')} ${s('Button_sm')}"><span class="${s('Button_content')}"><span class="${s('Button_label')}">Единый</span></span></button>
              <button aria-pressed="false" type="button" class="${s('Button_button')} ${s('Button_light')} ${s('Button_sm')}"><span class="${s('Button_content')}"><span class="${s('Button_label')}">День / ночь</span></span></button>
            </span>
          </p>
          <div class="${s('SavingsCalculator_sliders')}">
            ${slider('p-day', 'Единый тариф', '6.5', 3, 10, '6,5 ₽/кВт·ч')}
            <p class="p-hint">Есть двухтарифный счётчик? Ночью киловатт дешевле — переключите на «День / ночь» и укажите обе ставки.</p>
          </div>
        </div>
      </div>
      <div class="${s('Card_card')} ${s('Card_default')} ${s('Card_xl')} ${s('Card_rXl')} ${s('SavingsCalculator_result')}" style="justify-content:flex-start">
        <p style="margin:0 0 18px;color:var(--faint);font-family:var(--font-mono);font-size:var(--fs-caption);letter-spacing:0.1em;text-transform:uppercase">За сезон охлаждения</p>
        <div class="${s('SavingsCalculator_row')}">
          <p class="${s('SavingsCalculator_rowHead')}"><span class="${s('SavingsCalculator_rowLabel')}">Обычный on/off</span><span class="${s('SavingsCalculator_rowValue')}">≈ 4 680 ₽/сезон</span></p>
          <span class="${s('SavingsCalculator_bar')}" aria-hidden="true"><span class="${s('SavingsCalculator_fill')} ${s('SavingsCalculator_fillUsual')}" style="width:100%"></span></span>
        </div>
        <div class="${s('SavingsCalculator_row')}">
          <p class="${s('SavingsCalculator_rowHead')}"><span class="${s('SavingsCalculator_rowLabel')}">Инверторный</span><span class="${s('SavingsCalculator_rowValue')}">≈ 2 902 ₽/сезон</span></p>
          <span class="${s('SavingsCalculator_bar')}" aria-hidden="true"><span class="${s('SavingsCalculator_fill')} ${s('SavingsCalculator_fillInverter')}" style="width:62%"></span></span>
        </div>
        <div class="${s('Card_card')} ${s('Card_accent')} ${s('Card_md')} ${s('Card_rLg')} ${s('SavingsCalculator_total')}" style="margin-top:auto;padding-top:20px">
          <p class="${s('SavingsCalculator_totalLine')}"><span class="${s('SavingsCalculator_totalLabel')}">Ваша экономия:</span><span class="${s('SavingsCalculator_totalValue')}">≈ 1 778 ₽/сезон</span></p>
          <p class="${s('SavingsCalculator_totalHorizon')}">≈ 8 892 ₽ за 5 лет</p>
        </div>
      </div>
    </div>
    <p class="${s('SavingsBlock_disclaimer')}">Это прикидка, а не расчёт по счётчику. Реальный расход зависит от режима работы, площади и утепления помещения, разницы температур на улице и в комнате и от конкретной модели — разброс легко получается в полтора раза. Считаем для класса 09 и сезона охлаждения около 120 дней в году. Мы показываем порядок величины, чтобы было с чем сравнивать, а не сумму, которую готовы пообещать.</p>
  </div>
</section>`;

for (const w of [375, 768, 1200]) {
  write(`SavingsNew${w}`, 'Экономия · предложение', w, wrap({ ...S, extraCss: savingsCss, body: savings }));
}

writeFileSync(path.join(DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('proposals written:', manifest.filter((m) => /New|Alt/.test(m.name)).map((m) => m.name).join(', '));
