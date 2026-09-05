// Собирает canvas.json: страница «Экраны» — ряд на каждую публичную страницу,
// три ширины в ряд; страница «Предложения» — «сейчас» и «предложение» рядом.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2] ?? 'canvas';
const manifest = JSON.parse(readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const heights = JSON.parse(readFileSync(path.join(DIR, 'heights.json'), 'utf8'));

// запас на разницу растеризации шрифтов: лишнее закрасит фон, обрезка — нет
const frameHeight = (name) => {
  const h = Math.max(heights[name].h, heights[name].hDark ?? 0);
  return Math.ceil(h * 1.05) + 60;
};

const GAP_X = 120;
const GAP_Y = 200;
const artboards = [];
const annotations = [];

/* ---------- страница 1: экраны ---------- */
const PAGE_ORDER = ['Home', 'Catalog', 'Product', 'Compare', 'Knowledge', 'Article', 'Privacy'];
const PAGE_TITLES = {
  Home: 'Главная  /',
  Catalog: 'Каталог  /catalog',
  Product: 'Модель  /catalog/[slug]',
  Compare: 'Сравнение  /compare?compare=…',
  Knowledge: 'База знаний  /knowledge',
  Article: 'Статья  /knowledge/[slug]',
  Privacy: 'Политика  /privacy',
};
annotations.push({
  id: 'about',
  page: 'page-1',
  x: -480,
  y: 0,
  w: 380,
  text:
    'Публичные страницы как они есть 4 сентября: разметка и стили сняты с localhost:3000, ничего не перерисовано. Три ширины — 375, 768 и 1200 (пороги DESIGN_BRIEF §6: 600 / 900 / 1200).\n\nФото моделей и обложки статей в дев-базе отсутствуют — на их месте штриховая заглушка, как в прототипе.\n\nПереключатель темы — над каждым артбордом. Высота рамок снята в Chromium с запасом 3%: ниже подвала остаётся полоса фона, обрезки нет.',
});
let y = 0;
for (const key of PAGE_ORDER) {
  const row = manifest.filter((m) => m.page === key && m.canvasPage === 'page-1').sort((a, b) => a.width - b.width);
  let x = 0;
  let rowH = 0;
  annotations.push({ id: `row-${key.toLowerCase()}`, page: 'page-1', x: 0, y: y - 110, w: 420, text: PAGE_TITLES[key] });
  for (const item of row) {
    const h = frameHeight(item.name);
    artboards.push({ file: `${item.name}.dc.html`, page: 'page-1', title: item.title, x, y, w: item.width, h });
    x += item.width + GAP_X;
    rowH = Math.max(rowH, h);
  }
  y += rowH + GAP_Y;
}

/* ---------- страница 2: предложения ---------- */
const GROUPS = [
  {
    now: 'ContactsNow',
    next: 'ContactsNew',
    alt: 'ContactsAlt',
    label: 'Контакты',
    note:
      'Что не так сейчас: адрес и регион напечатаны дважды — в списке и в карточке «Как нас найти»; карточка в 320px висит рядом с колонкой вдвое выше неё; пояснение про cookie — служебный текст на продающей странице.\n\nПредложение А (три ширины): карта — ссылка под адресом, там, где её ищут; карточки нет; факты встают в три колонки с 900px; два номера — в одну строку с 600px. Ничего, кроме контактов, не меняется.\n\nВариант Б (только 1200): заголовок, лид и заявка слева, факты — карточкой справа. Если хочется сохранить две колонки. Лид в нём — черновик, факта о компании не содержит.',
  },
  {
    now: 'SavingsNow',
    next: 'SavingsNew',
    alt: null,
    label: 'Экономия инвертора',
    note:
      'Что не так сейчас: у сетки часов четыре цвета и ни одной подписи — подсказка спрятана в srOnly, метки 00/12 непонятны; переключатель тарифа оторван от подписи на всю ширину карточки; ночная ставка показана выключенным ползунком; результат висит посередине пустой карточки.\n\nПредложение: час подписан в самой ячейке; легенда под сеткой; пресеты режимов одним нажатием — на телефоне не надо красить 24 клетки; переключатель рядом с подписью; в едином тарифе вместо мёртвого ползунка — подсказка про двухтарифный счётчик; итог прижат к низу карточки. Формула, суммы, оговорка и цвета — не тронуты.',
  },
];
let y2 = 0;
for (const g of GROUPS) {
  annotations.push({ id: `g-${g.now.toLowerCase()}`, page: 'page-2', x: 0, y: y2 - 110, w: 420, text: `${g.label}: слева как сейчас, справа предложение` });
  annotations.push({ id: `n-${g.now.toLowerCase()}`, page: 'page-2', x: -480, y: y2, w: 420, text: g.note });
  let rowH = 0;
  let x = 0;
  for (const w of [375, 768, 1200]) {
    for (const kind of [g.now, g.next]) {
      const name = `${kind}${w}`;
      const item = manifest.find((m) => m.name === name);
      if (!item) continue;
      const h = frameHeight(name);
      artboards.push({ file: `${name}.dc.html`, page: 'page-2', title: item.title, x, y: y2, w, h });
      x += w + (kind === g.now ? 60 : GAP_X);
      rowH = Math.max(rowH, h);
    }
  }
  if (g.alt) {
    const name = `${g.alt}1200`;
    const item = manifest.find((m) => m.name === name);
    if (item) {
      const h = frameHeight(name);
      artboards.push({ file: `${name}.dc.html`, page: 'page-2', title: item.title, x, y: y2, w: 1200, h });
      rowH = Math.max(rowH, h);
    }
  }
  y2 += rowH + GAP_Y;
}

/* ---------- карточка итога: как сейчас и выбранный вариант Н ---------- */
const chosenRow = (page, y, ids, label, note, names, gap) => {
  annotations.push({ id: ids[0], page, x: 0, y: y - 110, w: 640, text: label });
  annotations.push({ id: ids[1], page, x: -480, y, w: 420, text: note });
  let x = 0;
  let rowH = 0;
  for (const name of names) {
    const item = manifest.find((m) => m.name === name);
    if (!item) continue;
    const h = frameHeight(name);
    artboards.push({ file: `${name}.dc.html`, page, title: item.title, x, y, w: item.width, h });
    x += item.width + gap;
    rowH = Math.max(rowH, h);
  }
  return rowH;
};

y2 += chosenRow(
  'page-2',
  y2,
  ['g-total', 'n-total'],
  'Карточка итога экономии: слева как сейчас, справа выбранный вариант Н',
  'Выбран 4 сентября — ADR-308. Тёмная карточка-сцена, одинаковая в обеих темах: свечение сверху, сетка пола уходит в перспективу и медленно движется, итог первым, сравнение внизу над полом с теми же градиентными полосами, но со свечением.\n\nВысота карточки больше не пустует: итог у верхнего края, сравнение у нижнего, между ними глубина сцены. Полосы вырастают при появлении, итог всплывает, свечение дышит; при prefers-reduced-motion всё стоит.\n\nЦвета сцены здесь литералы — токены заведутся в задаче на реализацию. До кода: показать Н в блоке целиком на 1200 и 375. Правее — Н в блоке целиком: на 1200 с нынешней сеткой часов (карточка 351px) и на 375, где колонка одна и сцене задана минимальная высота 400px. Отклонённые варианты — на странице «Отклонённые».',
  ['TotalNow', 'TotalScene', 'SceneBlock375', 'SceneBlock1200'],
  120,
) + GAP_Y;

/* ---------- страница 3: отклонённые варианты карточки итога ---------- */
let y3 = 0;
y3 += chosenRow(
  'page-3',
  y3,
  ['g-total1', 'n-total1'],
  'Первый заход: перестановки той же карточки — отклонены разом',
  'А — без полос: ответ первым, сравнение таблицей внизу. Б — одна полоса длиной в расход обычной модели, доли под ней. В — обе полосы как сейчас, итог по правой линии без голубой карточки.\n\nЧинили оси и коробку, но не то, что мешало: карточка растягивается по высоте, а полосы владельцу нравятся.',
  ['TotalA', 'TotalB', 'TotalC'],
  60,
) + GAP_Y;
y3 += chosenRow(
  'page-3',
  y3,
  ['g-total2', 'n-total2'],
  'Третий заход: глубина и движение — не выбранные',
  'Л — стекло и наклон: дрейфующие пятна фирменных цветов, итог на матовом стекле, карточка наклоняется за курсором. М — объёмные столбики в перспективе, вырастают при появлении, голубая карточка итога как сейчас.\n\nМежду ними второй заход — чек, без карточки, панель, фразой — убирал полосы и на холст не выкладывался; третий — по содержимому, столбики, полоса под сеткой — отклонён по описанию как несовременный.',
  ['TotalGlass', 'TotalBars3d'],
  60,
) + GAP_Y;

const canvas = {
  artboards,
  annotations,
  pages: [
    { id: 'page-1', name: 'Экраны' },
    { id: 'page-2', name: 'Предложения' },
    { id: 'page-3', name: 'Отклонённые' },
  ],
  // открывается на странице последней работы — предложениях
  launch: { view: 'canvas', page: 'page-2' },
};
writeFileSync(path.join(DIR, 'canvas.json'), JSON.stringify(canvas, null, 2));
console.log(`artboards ${artboards.length}, notes ${annotations.length}`);
