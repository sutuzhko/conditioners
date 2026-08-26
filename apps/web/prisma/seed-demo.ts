#!/usr/bin/env node
/**
 * Демонстрационное наполнение стенда: компания, каталог, статьи, команда,
 * клиенты, обращения, наряды, календарь и журнал доставки — всё сразу.
 *
 * 🔴 Зачем отдельно от `seed.ts`. Обычный сид оставляет данные компании
 * заглушками «ЗАПОЛНИТЕ В АДМИНКЕ» и не заводит ни одного отзыва: выдуманные
 * отзывы и счётчики выполненных работ на боевом сайте запрещены (инвариант 10),
 * а придуманный телефон в шапке расходится с карточкой Яндекс.Бизнеса
 * (инвариант 8). Здесь всё ровно наоборот — стенд должен выглядеть как живой
 * сайт, чтобы его было на чём проверять.
 *
 * 🔴 Поэтому это не миграция. `prisma migrate deploy` идёт и на боевом
 * сервере — отдельным контейнером при каждой выкладке (ADR-089), — и
 * демо-клиенты с выдуманными отзывами уехали бы в прод молча. Запуск здесь
 * всегда ручной и всегда с проверкой окружения (ADR-114).
 *
 * Запуск в дев-контейнере:
 *   pnpm --filter web seed:demo
 *
 * Скрипт заменяет демо-данные целиком: операционные таблицы очищаются и
 * наполняются заново, поэтому его можно гонять сколько угодно раз, в том
 * числе на пустой базе после `prisma migrate reset`.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { hash as hashPassword } from '@node-rs/argon2';
import { Prisma, PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const prisma = new PrismaClient();

/**
 * Предохранитель. Демо-данные — это выдуманная компания, выдуманные отзывы и
 * персональные данные несуществующих людей: на боевой базе им нечего делать
 * ни при каких обстоятельствах.
 */
function assertNotProduction(): void {
  const reasons: string[] = [];

  if (process.env.NODE_ENV === 'production') reasons.push('NODE_ENV=production');
  if ((process.env.SITE_URL ?? '').startsWith('https://')) {
    reasons.push(`SITE_URL=${process.env.SITE_URL} — боевой сайт отдаётся по https`);
  }

  if (reasons.length > 0) {
    console.error('Демо-данные на боевом окружении не заводятся:');
    for (const reason of reasons) console.error(`  · ${reason}`);
    process.exit(1);
  }
}

/**
 * Москва — UTC+3 круглый год: переход на летнее время в России отменён с 2014
 * года. Отсюда простое смещение вместо разбора часового пояса: момент дела и
 * наряда хранится в UTC, а владелец вводит и видит московское (ADR-080).
 */
const MSK_OFFSET_HOURS = 3;

function msk(day: string, time = '00:00'): Date {
  const [year, month, date] = day.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(
    Date.UTC(
      year ?? 2026,
      (month ?? 1) - 1,
      date ?? 1,
      (hours ?? 0) - MSK_OFFSET_HOURS,
      minutes ?? 0,
    ),
  );
}

/** Дата, отсчитанная от сегодняшнего дня: стенд не должен «протухать» за неделю. */
function daysFromToday(delta: number): string {
  const now = new Date();
  const moscow = new Date(now.getTime() + MSK_OFFSET_HOURS * 3_600_000);
  moscow.setUTCDate(moscow.getUTCDate() + delta);
  return moscow.toISOString().slice(0, 10);
}

function at(delta: number, time: string): Date {
  return msk(daysFromToday(delta), time);
}

// ---------- Изображения ----------

/**
 * Снимки товаров и отзывов рисуются на месте, а не берутся из интернета.
 *
 * Фотографии моделей — только от поставщика или свои (красная линия «не
 * публиковать чужое»), а на стенде нужны хоть какие-то: пустая карточка не
 * показывает ни вёрстку, ни `next/image`. Поэтому — заведомо синтетические
 * плашки, которые невозможно перепутать с настоящим фото.
 *
 * Имя файла подчиняется тому же правилу, что и у загруженных через админку
 * (`isSafeFilename`): uuid плюс расширение, иначе `/api/media` их не отдаст.
 */
const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/data/uploads';
const MEDIA_PREFIX = '/api/media';

async function makeImage(params: {
  readonly title: string;
  readonly subtitle: string;
  readonly from: string;
  readonly to: string;
  readonly width?: number;
  readonly height?: number;
}): Promise<string> {
  const width = params.width ?? 1200;
  const height = params.height ?? 900;

  const escape = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${params.from}"/>
        <stop offset="100%" stop-color="${params.to}"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <text x="50%" y="47%" text-anchor="middle" font-family="sans-serif"
          font-size="${Math.round(width / 14)}" font-weight="700" fill="#ffffff">${escape(params.title)}</text>
    <text x="50%" y="59%" text-anchor="middle" font-family="sans-serif"
          font-size="${Math.round(width / 30)}" fill="#ffffff" opacity="0.85">${escape(params.subtitle)}</text>
    <text x="50%" y="93%" text-anchor="middle" font-family="sans-serif"
          font-size="${Math.round(width / 42)}" fill="#ffffff" opacity="0.6">демо-данные стенда</text>
  </svg>`;

  const filename = `${randomUUID()}.jpg`;
  const body = await sharp(Buffer.from(svg)).jpeg({ quality: 82, progressive: true }).toBuffer();

  await mkdir(UPLOADS_DIR, { recursive: true });
  await writeFile(join(UPLOADS_DIR, filename), body);

  return `${MEDIA_PREFIX}/${filename}`;
}

// ---------- Данные компании ----------

/**
 * Заполнено так, как заполнял бы владелец: без единой заглушки, чтобы стенд
 * показывал разметку, метаданные и футер в рабочем виде. Компания выдумана
 * целиком — реквизиты правдоподобны по формату (ИНН предпринимателя из 12
 * цифр, ОГРНИП из 15), но не принадлежат никому.
 */
const settings: Record<string, unknown> = {
  company: {
    name: 'ТулаКлимат',
    tagline: 'Кондиционеры с монтажом под ключ за один день',
    foundedYear: 2015,
  },
  contacts: {
    phones: ['+7 (4872) 79-25-40', '+7 (910) 155-24-68'],
    email: 'zakaz@tulaklimat.example',
    telegram: 'https://t.me/tulaklimat_demo',
    whatsapp: 'https://wa.me/79101552468',
    hours: 'Пн–Вс, 8:00–21:00',
    responseTime: '15 минут',
    openingHours: ['Mo-Su 08:00-21:00'],
  },
  address: {
    country: 'RU',
    region: 'Тульская область',
    city: 'Тула',
    street: 'проспект Ленина',
    building: '108',
    office: 'офис 312',
    postalCode: '300041',
  },
  // Тула, центр: координаты нужны чипу погоды и разметке LocalBusiness
  geo: { lat: 54.1961, lng: 37.6182 },
  area: {
    served:
      'Тула и область: Щёкино, Новомосковск, Алексин, Ясногорск, Венёв — выезд в день обращения',
  },
  legal: {
    form: 'ИП',
    name: 'Ковалёв Сергей Николаевич',
    inn: '710512345678',
    ogrn: '315715400012345',
    address: '300041, Тульская область, г. Тула, проспект Ленина, д. 108, офис 312',
  },
  extras: {
    trassaPerM: 700,
    shtrobPerM: 800,
    heightWorks: 2000,
    trassaIncludedM: 3,
    heightFloorFrom: 10,
  },
  warranty: {
    installation:
      'Гарантия на монтаж — 3 года. Течь трассы, вибрацию, ошибки вакуумации и любые последствия наших работ устраняем бесплатно, выезд входит в гарантию.',
    equipment:
      'Гарантия производителя на технику — от 1 до 5 лет в зависимости от модели, точный срок указан в карточке. Гарантийный ремонт ведём сами: везти кондиционер в сервис не нужно.',
  },
  payment: {
    methods: [
      'Наличными монтажнику после запуска',
      'Картой на объекте по QR-коду',
      'Безналичный расчёт для юридических лиц',
      'Рассрочка на 6 месяцев без переплаты',
    ],
    vat: 'Работаем без НДС: применяется упрощённая система налогообложения.',
  },
  social: {
    links: ['https://t.me/tulaklimat_demo', 'https://vk.com/tulaklimat_demo'],
  },
  seo: {
    homeTitle: 'Кондиционеры в Туле — продажа и установка под ключ',
    homeDescription:
      'Продажа, монтаж и обслуживание кондиционеров в Туле. Установка за один день, честная смета без доплат на объекте, гарантия на работы 3 года.',
    titleSuffix: 'ТулаКлимат',
    ogImage: '',
  },
  /**
   * Полоса цифр первого экрана. Числа выдуманы вместе с компанией — на боевом
   * сайте владелец отвечает за каждое из них лично (инвариант 10).
   */
  achievements: {
    items: [
      { value: '1200', suffix: '+', label: 'установок в Туле и области' },
      { value: '3', suffix: ' года', label: 'гарантия на монтаж' },
      { value: '1', suffix: ' день', label: 'от заявки до запуска' },
      { value: '15', suffix: ' мин', label: 'среднее время ответа' },
    ],
  },
  /**
   * Адресация уведомлений. Токен бота и пароль SMTP сюда не попадают никогда
   * (инвариант 3) — в базе живёт только выбор каналов и куда писать.
   *
   * На стенде `NOTIFY_DRIVER=log` и транспорт Telegram выключен: включённые
   * каналы дают вид рабочей настройки и записи в журнале доставки, но наружу
   * при этом не уходит ничего.
   */
  notifications: {
    telegram: true,
    email: true,
    telegramChatId: '@tulaklimat_demo',
    emailTo: 'zakaz@tulaklimat.example',
  },
  integrations: {
    metrikaId: '',
    messengerButtons: { telegram: true, whatsapp: true },
    callback: { enabled: true },
  },
};

// ---------- Каталог ----------

type DemoSpec = { readonly k: string; readonly v: string };

type DemoProduct = {
  readonly slug: string;
  readonly badge: string;
  readonly name: string;
  readonly brand: string;
  readonly sku: string;
  readonly areaMax: number;
  readonly tag: string;
  readonly priceNum: number;
  readonly salePrice?: number;
  readonly saleFrom?: string;
  readonly saleTo?: string;
  readonly saleLabel?: string;
  readonly visible: boolean;
  readonly featured: boolean;
  readonly seoTitle?: string;
  readonly seoDescription?: string;
  readonly colors: readonly [string, string];
  readonly specs: readonly DemoSpec[];
};

/**
 * Витрина и ассортимент разведены намеренно (ADR-109): `featured` — то, что
 * владелец вынес на главную, `visible` — всё, что в продаже. Одна модель
 * скрыта совсем: снятая с продажи карточка должна быть на стенде, иначе
 * проверить её поведение негде.
 *
 * Скидка ровно одна и с честным периодом: перечёркивается цена, по которой
 * товар действительно продавался, а конец периода наступает сам (инвариант 14).
 */
const products: readonly DemoProduct[] = [
  {
    slug: 'split-sistema-07-tihaya',
    badge: '07',
    name: 'Сплит-система 07, тихая серия',
    brand: 'Ballu',
    sku: 'BSWI-07HN8',
    areaMax: 20,
    tag: 'тихая, для спальни',
    priceNum: 31900,
    visible: true,
    featured: true,
    seoTitle: 'Сплит-система 07 для спальни — купить в Туле с установкой',
    seoDescription:
      'Тихий кондиционер класса 07 на комнату до 20 м². Уровень шума 19 дБ, инвертор, монтаж под ключ за один день.',
    colors: ['#0ea5b7', '#0b4f6c'],
    specs: [
      { k: 'Рекомендуемая площадь', v: 'до 20 м²' },
      { k: 'Мощность охлаждения', v: '2.1 кВт' },
      { k: 'Мощность обогрева', v: '2.2 кВт' },
      { k: 'Уровень шума внутреннего блока', v: '19 дБ' },
      { k: 'Тип компрессора', v: 'инверторный' },
      { k: 'Обогрев при температуре снаружи', v: 'до −15 °C' },
      { k: 'Гарантия производителя', v: '3 года' },
      { k: 'Класс энергоэффективности', v: 'A++' },
    ],
  },
  {
    slug: 'split-sistema-09-invertor',
    badge: '09',
    name: 'Сплит-система 09, инверторная',
    brand: 'Electrolux',
    sku: 'EACS/I-09HAT',
    areaMax: 27,
    tag: 'самая ходовая',
    priceNum: 38500,
    salePrice: 34900,
    saleFrom: daysFromToday(-9),
    saleTo: daysFromToday(12),
    saleLabel: 'Летняя цена',
    visible: true,
    featured: true,
    seoTitle: 'Инверторная сплит-система 09 — установка в Туле за один день',
    seoDescription:
      'Кондиционер класса 09 на комнату до 27 м². Инвертор, обогрев до −20 °C, монтаж под ключ и гарантия на работы 3 года.',
    colors: ['#1d4ed8', '#0f172a'],
    specs: [
      { k: 'Рекомендуемая площадь', v: 'до 27 м²' },
      { k: 'Мощность охлаждения', v: '2.6 кВт' },
      { k: 'Мощность обогрева', v: '2.8 кВт' },
      { k: 'Уровень шума внутреннего блока', v: '21 дБ' },
      { k: 'Тип компрессора', v: 'инверторный' },
      { k: 'Обогрев при температуре снаружи', v: 'до −20 °C' },
      { k: 'Wi-Fi управление', v: 'есть' },
      { k: 'Гарантия производителя', v: '5 лет' },
      { k: 'Класс энергоэффективности', v: 'A+++' },
    ],
  },
  {
    slug: 'split-sistema-09-byudzhetnaya',
    badge: '09',
    name: 'Сплит-система 09, базовая',
    brand: 'Hisense',
    sku: 'AS-09HR4SYDDJ',
    areaMax: 25,
    tag: 'дешевле всех',
    priceNum: 27400,
    visible: true,
    featured: true,
    colors: ['#0891b2', '#134e4a'],
    specs: [
      { k: 'Рекомендуемая площадь', v: 'до 25 м²' },
      { k: 'Мощность охлаждения', v: '2.6 кВт' },
      { k: 'Уровень шума внутреннего блока', v: '26 дБ' },
      { k: 'Тип компрессора', v: 'on/off' },
      { k: 'Обогрев при температуре снаружи', v: 'до −7 °C' },
      { k: 'Гарантия производителя', v: '1 год' },
      { k: 'Класс энергоэффективности', v: 'A' },
    ],
  },
  {
    slug: 'split-sistema-12-invertor',
    badge: '12',
    name: 'Сплит-система 12, инверторная',
    brand: 'Haier',
    sku: 'AS12TL4HRA',
    areaMax: 35,
    tag: 'на гостиную',
    priceNum: 46900,
    visible: true,
    featured: true,
    colors: ['#4338ca', '#111827'],
    specs: [
      { k: 'Рекомендуемая площадь', v: 'до 35 м²' },
      { k: 'Мощность охлаждения', v: '3.5 кВт' },
      { k: 'Мощность обогрева', v: '3.8 кВт' },
      { k: 'Уровень шума внутреннего блока', v: '22 дБ' },
      { k: 'Тип компрессора', v: 'инверторный' },
      { k: 'Обогрев при температуре снаружи', v: 'до −25 °C' },
      { k: 'Wi-Fi управление', v: 'есть' },
      { k: 'Самоочистка', v: 'есть' },
      { k: 'Гарантия производителя', v: '5 лет' },
    ],
  },
  {
    slug: 'split-sistema-18-na-dva-pomescheniya',
    badge: '18',
    name: 'Сплит-система 18, на два помещения',
    brand: 'Royal Clima',
    sku: 'RCI-TF18HN',
    areaMax: 52,
    tag: 'для студии и офиса',
    priceNum: 61500,
    visible: true,
    featured: false,
    colors: ['#7c3aed', '#1e1b4b'],
    specs: [
      { k: 'Рекомендуемая площадь', v: 'до 52 м²' },
      { k: 'Мощность охлаждения', v: '5.3 кВт' },
      { k: 'Мощность обогрева', v: '5.6 кВт' },
      { k: 'Уровень шума внутреннего блока', v: '28 дБ' },
      { k: 'Тип компрессора', v: 'инверторный' },
      { k: 'Обогрев при температуре снаружи', v: 'до −15 °C' },
      { k: 'Гарантия производителя', v: '3 года' },
    ],
  },
  {
    slug: 'kanalnyy-kondicioner-24',
    badge: '24',
    name: 'Канальный кондиционер 24',
    brand: 'Tosot',
    sku: 'T24H-LD',
    areaMax: 70,
    tag: 'скрытый монтаж за потолком',
    priceNum: 98000,
    visible: true,
    featured: false,
    seoTitle: 'Канальный кондиционер 24 — монтаж за подвесным потолком в Туле',
    seoDescription:
      'Канальная сплит-система на площадь до 70 м². Скрытый монтаж за потолком, разводка по нескольким комнатам, проект и установка под ключ.',
    colors: ['#0f766e', '#052e2b'],
    specs: [
      { k: 'Рекомендуемая площадь', v: 'до 70 м²' },
      { k: 'Мощность охлаждения', v: '7.0 кВт' },
      { k: 'Тип', v: 'канальный' },
      { k: 'Напор вентилятора', v: '50 Па' },
      { k: 'Тип компрессора', v: 'инверторный' },
      { k: 'Гарантия производителя', v: '3 года' },
    ],
  },
  {
    slug: 'mobilnyy-kondicioner-09',
    badge: '09',
    name: 'Мобильный кондиционер 09',
    brand: 'Zanussi',
    sku: 'ZACM-09MP-III',
    areaMax: 25,
    tag: 'без монтажа, для съёмной квартиры',
    priceNum: 24900,
    visible: true,
    featured: false,
    colors: ['#0369a1', '#0c4a6e'],
    specs: [
      { k: 'Рекомендуемая площадь', v: 'до 25 м²' },
      { k: 'Мощность охлаждения', v: '2.6 кВт' },
      { k: 'Тип', v: 'мобильный моноблок' },
      { k: 'Уровень шума', v: '52 дБ' },
      { k: 'Монтаж', v: 'не требуется' },
      { k: 'Гарантия производителя', v: '1 год' },
    ],
  },
  {
    slug: 'split-sistema-07-snyata-s-prodazhi',
    badge: '07',
    name: 'Сплит-система 07, прошлая серия',
    brand: 'Ballu',
    sku: 'BSA-07HN1',
    areaMax: 20,
    tag: 'снята с продажи',
    priceNum: 25900,
    visible: false,
    featured: false,
    colors: ['#64748b', '#1e293b'],
    specs: [
      { k: 'Рекомендуемая площадь', v: 'до 20 м²' },
      { k: 'Мощность охлаждения', v: '2.1 кВт' },
      { k: 'Тип компрессора', v: 'on/off' },
      { k: 'Гарантия производителя', v: '1 год' },
    ],
  },
];

// ---------- Цены на монтаж ----------

const prices = [
  { cls: '07', power: '2.0 кВт', area: 'до 20 м²', price: 5500, term: '3–4 часа' },
  { cls: '09', power: '2.6 кВт', area: 'до 27 м²', price: 6000, term: '3–4 часа' },
  { cls: '12', power: '3.5 кВт', area: 'до 35 м²', price: 6500, term: '4 часа' },
  { cls: '18', power: '5.3 кВт', area: 'до 50 м²', price: 8000, term: '4–5 часов' },
  { cls: '24', power: '7.0 кВт', area: 'до 70 м²', price: 12000, term: '1–2 дня' },
] as const;

// ---------- База знаний ----------

type DemoArticle = {
  readonly slug: string;
  readonly title: string;
  readonly category: string;
  readonly date: string;
  readonly minutes: number;
  readonly excerpt: string;
  readonly body: string;
  readonly published: boolean;
  readonly cover: boolean;
};

/**
 * Статьи короткие: стенд проверяет вёрстку списка, карточки и разметки
 * `Article`, а не читается целиком. Одна не опубликована — черновик обязан
 * быть на стенде, иначе его поведение проверить негде.
 */
const articles: readonly DemoArticle[] = [
  {
    slug: 'kak-vybrat-moshchnost-kondicionera',
    title: 'Как выбрать мощность кондиционера по площади комнаты',
    category: 'Выбор',
    date: daysFromToday(-64),
    minutes: 6,
    excerpt:
      'Правило «100 ватт на квадратный метр» работает не всегда: солнечная сторона, последний этаж и техника в комнате добавляют нагрузку. Разбираем на примерах.',
    body: [
      '## Откуда берётся класс 07, 09, 12',
      '',
      'Число в названии — это тысячи BTU в час, британских тепловых единиц. Класс 09 — это 9000 BTU, примерно 2,6 кВт холода. Производители называют модели именно так, потому что шкала пришла из США и прижилась.',
      '',
      '## Базовый расчёт',
      '',
      'Для комнаты с обычным потолком 2,7 метра берут 100 Вт на квадратный метр. Комната 20 м² — это 2 кВт, то есть класс 07.',
      '',
      '## Что добавляет нагрузку',
      '',
      '- окна на юг или запад — плюс 20 %;',
      '- последний этаж под нагретой крышей — плюс 15 %;',
      '- компьютер, телевизор и холодильник в комнате — по 100–300 Вт каждый;',
      '- каждый человек, который постоянно находится в комнате, — около 100 Вт.',
      '',
      'Если после всех надбавок расчёт попадает между классами, берите старший: кондиционер, который работает на пределе, шумит и изнашивается быстрее.',
    ].join('\n'),
    published: true,
    cover: true,
  },
  {
    slug: 'skolko-stoit-ustanovka-kondicionera',
    title: 'Из чего складывается цена установки кондиционера',
    category: 'Монтаж',
    date: daysFromToday(-41),
    minutes: 7,
    excerpt:
      'Почему монтаж стоит 6 000 ₽, а не 3 000 ₽, и какие работы прячут в «доплату на объекте». Разбираем смету построчно.',
    body: [
      '## Что входит в базовую цену',
      '',
      'Базовая цена монтажа — это работа бригады, кронштейны, три метра медной трассы, вакуумация и пусконаладка. Три метра хватает, когда внутренний блок вешают на ту же стену, за которой стоит наружный.',
      '',
      '## За что доплачивают отдельно',
      '',
      '- трасса сверх трёх метров — по метру;',
      '- штробление стены, если трассу прячут в стену;',
      '- высотные работы с автовышки или промышленным альпинизмом.',
      '',
      '## Как понять, что смету занижают',
      '',
      'Цена 3 000 ₽ за монтаж «под ключ» означает, что часть работ назовут дополнительной уже на объекте, когда техника снята с гарантии магазина, а бригада стоит в квартире. Честная смета считается до выезда и не меняется на месте.',
    ].join('\n'),
    published: true,
    cover: true,
  },
  {
    slug: 'obsluzhivanie-kondicionera-svoimi-rukami',
    title: 'Что можно сделать с кондиционером самому, а что нельзя',
    category: 'Обслуживание',
    date: daysFromToday(-22),
    minutes: 5,
    excerpt:
      'Фильтры моются за десять минут раз в месяц. Всё остальное — с манометрами и вакуумным насосом, и попытка сделать это самому заканчивается дозаправкой.',
    body: [
      '## Раз в месяц: фильтры',
      '',
      'Откройте крышку внутреннего блока, снимите две сетки, промойте тёплой водой без моющих средств, высушите. Забитый фильтр режет мощность вдвое и заставляет компрессор работать дольше.',
      '',
      '## Раз в год: чистка теплообменника',
      '',
      'Здесь нужен парогенератор и антибактериальный состав. Своими силами обычно заканчивается погнутым оребрением.',
      '',
      '## Никогда: фреон',
      '',
      'Дозаправка идёт по весу и по давлению, с манометрической станцией и вакуумным насосом. «Долить фреон баллончиком из автомагазина» — верный способ угробить компрессор.',
    ].join('\n'),
    published: true,
    cover: false,
  },
  {
    slug: 'kondicioner-zimoy-mozhno-li-vklyuchat',
    title: 'Можно ли включать кондиционер на обогрев зимой',
    category: 'Эксплуатация',
    date: daysFromToday(-8),
    minutes: 4,
    excerpt:
      'Можно, если у модели есть зимний комплект и заявленный диапазон обогрева. Без них компрессор запускается на густом масле и живёт недолго.',
    body: [
      '## Что мешает работать зимой',
      '',
      'При минусовой температуре масло в компрессоре густеет, а конденсат в дренаже замерзает. Обычная сплит-система рассчитана на обогрев до −7 °C, инверторная — до −15…−25 °C.',
      '',
      '## Зимний комплект',
      '',
      'Это подогрев картера компрессора, подогрев дренажа и регулятор оборотов вентилятора. Ставится при монтаже и стоит дешевле, чем замена компрессора.',
    ].join('\n'),
    published: true,
    cover: false,
  },
  {
    slug: 'chto-delat-esli-kondicioner-techet',
    title: 'Кондиционер течёт: что проверить до звонка мастеру',
    category: 'Ремонт',
    date: daysFromToday(2),
    minutes: 4,
    excerpt: 'Черновик: дописать раздел про уклон дренажа и добавить фотографии.',
    body: [
      '## Первое: дренаж',
      '',
      'Девять течей из десяти — это забитая дренажная трубка. Пыль и слизь копятся за сезон, вода не уходит и переливается через край поддона.',
      '',
      '_Черновик: дописать про уклон трассы и добавить фотографии с объектов._',
    ].join('\n'),
    published: false,
    cover: false,
  },
];

// ---------- Команда ----------

/**
 * Пароль один на всех демо-учёток и заведомо несекретный: стенд открыт только
 * внутри дев-контура. Хеш считается argon2id тем же вызовом, что и в админке.
 */
const DEMO_PASSWORD = 'demo-parol-2026';

type DemoStaff = {
  readonly login: string;
  readonly name: string;
  readonly phone: string;
  readonly employment: 'SELF_EMPLOYED' | 'CONTRACT' | 'STAFF' | null;
  readonly active: boolean;
  readonly notes: readonly string[];
};

const staff: readonly DemoStaff[] = [
  {
    login: 'zaharov',
    name: 'Захаров Илья',
    phone: '+7 (910) 700-14-22',
    employment: 'SELF_EMPLOYED',
    active: true,
    notes: [
      'Работает с нами четвёртый сезон, берёт сложные высотные объекты.',
      'Просил не ставить два монтажа подряд в один день — не успевает по времени.',
    ],
  },
  {
    login: 'mironov',
    name: 'Миронов Артём',
    phone: '+7 (953) 420-88-01',
    employment: 'CONTRACT',
    active: true,
    notes: ['Аккуратный, но медленный: на типовой монтаж закладывать 4 часа, а не 3.'],
  },
  {
    login: 'panov',
    name: 'Панов Дмитрий',
    phone: '+7 (920) 311-45-90',
    employment: 'STAFF',
    active: true,
    notes: [],
  },
  {
    login: 'gusev',
    name: 'Гусев Роман',
    phone: '+7 (960) 602-73-15',
    // оформление не заведено: у наряда такого монтажника удержание остаётся
    // пометкой и вознаграждение не уменьшает — состояние должно быть на стенде
    employment: null,
    active: false,
    notes: ['Ушёл в другую бригаду в мае. Учётная запись отключена, наряды за ним остались.'],
  },
];

// ---------- Клиенты ----------

type DemoClient = {
  readonly key: string;
  readonly name: string;
  readonly phone: string;
  readonly address: string | null;
  readonly note: string | null;
  readonly createdDaysAgo: number;
};

/**
 * Телефоны выдуманы, но в разных записях: владелец диктует номер как привык, и
 * дедупликация обязана свести «+7 (910) …», «8 910 …» и «9 10…» к одному
 * ключу (ADR-105). Здесь нарочно смешаны три способа записи.
 */
const clients: readonly DemoClient[] = [
  {
    key: 'orlova',
    name: 'Орлова Наталья Викторовна',
    phone: '+7 (910) 155-24-68',
    address: 'Тула, ул. Первомайская, 27, кв. 45',
    note: 'Две сплит-системы: спальня и гостиная. Просит звонить после 18:00.',
    createdDaysAgo: 310,
  },
  {
    key: 'sergeev',
    name: 'Сергеев Павел',
    phone: '8 953 811 40 26',
    address: 'Тула, ул. Октябрьская, 91, кв. 12',
    note: 'ТО раз в год, весной. Кондиционер Ballu 09, поставлен нами в 2023.',
    createdDaysAgo: 240,
  },
  {
    key: 'kuznecova',
    name: 'Кузнецова Ирина',
    phone: '9206114488',
    address: 'Щёкино, ул. Советская, 14',
    note: null,
    createdDaysAgo: 188,
  },
  {
    key: 'romashka',
    name: 'ООО «Ромашка», офис на Ленина',
    phone: '+7 (4872) 25-19-03',
    address: 'Тула, проспект Ленина, 85, 4 этаж',
    note: 'Юрлицо, оплата по счёту. Контактное лицо — Марина, завхоз.',
    createdDaysAgo: 165,
  },
  {
    key: 'demin',
    name: 'Дёмин Алексей Юрьевич',
    phone: '+7 (915) 902-77-31',
    address: 'Тула, ул. Металлургов, 62, кв. 118',
    note: '12 этаж, нужна автовышка. В прошлый раз согласовывали с управляющей компанией.',
    createdDaysAgo: 120,
  },
  {
    key: 'belyaeva',
    name: 'Беляева Ольга',
    phone: '+7 (910) 088-52-14',
    address: 'Тула, ул. Пузакова, 5, кв. 3',
    note: null,
    createdDaysAgo: 96,
  },
  {
    key: 'novikov',
    name: 'Новиков Станислав',
    phone: '+7 (930) 745-16-08',
    address: 'Новомосковск, ул. Комсомольская, 40, кв. 77',
    note: 'Дача под Новомосковском, выезд согласовывать заранее.',
    createdDaysAgo: 71,
  },
  {
    key: 'fedotova',
    name: 'Федотова Лидия Ивановна',
    phone: '+7 (906) 530-92-44',
    address: 'Тула, ул. Кирова, 12, кв. 9',
    note: 'Пенсионерка, просит подробно объяснять по телефону.',
    createdDaysAgo: 45,
  },
  {
    key: 'salon',
    name: 'Салон «Аврора»',
    phone: '+7 (487) 233-10-77',
    address: 'Тула, ул. Советская, 47, помещение 2',
    note: 'Два канальных блока за потолком, обслуживание по договору дважды в год.',
    createdDaysAgo: 30,
  },
  {
    key: 'zhukov',
    name: 'Жуков Кирилл',
    phone: '+7 (952) 187-63-40',
    address: 'Тула, ул. Токарева, 88, кв. 204',
    note: null,
    createdDaysAgo: 9,
  },
];

// ---------- Обращения ----------

type DemoLead = {
  readonly name: string;
  readonly phone: string;
  readonly topic: string;
  readonly place?: string;
  readonly qty?: string;
  readonly callTime?: string;
  readonly address?: string;
  readonly comment?: string;
  readonly status: 'NEW' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';
  readonly managerComment?: string;
  readonly clientKey?: string;
  readonly hoursAgo: number;
  readonly sourceUrl: string;
  readonly referrer?: string;
  readonly utm?: Record<string, string>;
  readonly photo?: boolean;
};

/**
 * Обращения разложены по всем четырём статусам и по разным источникам: часть
 * пришла из поиска, часть по объявлению, часть напрямую. Происхождение
 * собирает сервер, а не форма (docs/API.md §8) — здесь оно записано так же,
 * как записал бы он.
 */
const leads: readonly DemoLead[] = [
  {
    name: 'Жуков Кирилл',
    phone: '+7 (952) 187-63-40',
    topic: 'Установка кондиционера',
    place: 'Квартира',
    qty: '1',
    callTime: 'После 18:00',
    address: 'Тула, ул. Токарева, 88, кв. 204',
    comment: 'Комната 18 м², окна на юг. Хочу тихий, спим в этой же комнате.',
    status: 'NEW',
    clientKey: 'zhukov',
    hoursAgo: 3,
    sourceUrl: 'http://tulaklimat.localhost/#lead',
    referrer: 'https://yandex.ru/search/',
    utm: { utm_source: 'yandex', utm_medium: 'organic' },
  },
  {
    name: 'Марина',
    phone: '+7 (4872) 25-19-03',
    topic: 'Обслуживание',
    place: 'Офис',
    qty: '4',
    callTime: 'В рабочее время',
    address: 'Тула, проспект Ленина, 85, 4 этаж',
    comment: 'Четыре кондиционера в офисе, нужна чистка перед сезоном. Оплата по счёту.',
    status: 'NEW',
    clientKey: 'romashka',
    hoursAgo: 9,
    sourceUrl: 'http://tulaklimat.localhost/#lead',
  },
  {
    name: 'Антон',
    phone: '+7 (910) 244-05-77',
    topic: 'Консультация',
    comment: 'Сколько будет стоить, если трасса 7 метров и штробить бетон?',
    status: 'NEW',
    hoursAgo: 20,
    sourceUrl: 'http://tulaklimat.localhost/#calculator',
    referrer: 'https://www.google.com/',
    utm: { utm_source: 'google', utm_medium: 'organic' },
  },
  {
    name: 'Федотова Лидия Ивановна',
    phone: '+7 (906) 530-92-44',
    topic: 'Установка кондиционера',
    place: 'Квартира',
    qty: '1',
    callTime: 'Утром',
    address: 'Тула, ул. Кирова, 12, кв. 9',
    comment: 'Второй этаж, есть балкон. Нужен самый простой, лишь бы летом не задыхаться.',
    status: 'IN_PROGRESS',
    managerComment: 'Созвонились, замер во вторник в 10:00. Считаем класс 07, базовый монтаж.',
    clientKey: 'fedotova',
    hoursAgo: 52,
    sourceUrl: 'http://tulaklimat.localhost/#lead',
    utm: { utm_source: 'vk', utm_medium: 'cpc', utm_campaign: 'leto-2026' },
  },
  {
    name: 'Новиков Станислав',
    phone: '+7 (930) 745-16-08',
    topic: 'Установка кондиционера',
    place: 'Дом',
    qty: '2',
    address: 'Новомосковск, ул. Комсомольская, 40',
    comment: 'Дача, две комнаты. Электрика уже выведена под оба блока.',
    status: 'IN_PROGRESS',
    managerComment: 'Ждём, пока подсохнет фасад после дождей. Перезвонить в пятницу.',
    clientKey: 'novikov',
    hoursAgo: 74,
    sourceUrl: 'http://tulaklimat.localhost/#lead',
    photo: true,
  },
  {
    name: 'Дёмин Алексей',
    phone: '+7 (915) 902-77-31',
    topic: 'Установка кондиционера',
    place: 'Квартира',
    qty: '1',
    address: 'Тула, ул. Металлургов, 62, кв. 118',
    comment: '12 этаж, наружный блок вешать с вышки.',
    status: 'DONE',
    managerComment: 'Смонтировали 14-го, автовышка своя. Оплата наличными на объекте.',
    clientKey: 'demin',
    hoursAgo: 26 * 24,
    sourceUrl: 'http://tulaklimat.localhost/#lead',
    photo: true,
  },
  {
    name: 'Беляева Ольга',
    phone: '+7 (910) 088-52-14',
    topic: 'Ремонт',
    place: 'Квартира',
    address: 'Тула, ул. Пузакова, 5, кв. 3',
    comment: 'Течёт из внутреннего блока на стену.',
    status: 'DONE',
    managerComment: 'Забился дренаж, промыли. Заодно почистили теплообменник.',
    clientKey: 'belyaeva',
    hoursAgo: 19 * 24,
    sourceUrl: 'http://tulaklimat.localhost/knowledge/chto-delat-esli-kondicioner-techet',
  },
  {
    name: 'Сергеев Павел',
    phone: '8 953 811 40 26',
    topic: 'Обслуживание',
    place: 'Квартира',
    qty: '1',
    address: 'Тула, ул. Октябрьская, 91, кв. 12',
    comment: 'Ежегодная чистка, ставили у вас в 2023.',
    status: 'DONE',
    managerComment: 'Почистили 2-го. Напомнить весной следующего года.',
    clientKey: 'sergeev',
    hoursAgo: 33 * 24,
    sourceUrl: 'http://tulaklimat.localhost/#lead',
  },
  {
    name: 'Кузнецова Ирина',
    phone: '9206114488',
    topic: 'Установка кондиционера',
    place: 'Квартира',
    address: 'Щёкино, ул. Советская, 14',
    status: 'DONE',
    managerComment: 'Поставили класс 09, штробление по бетону. Клиент доволен, оставила отзыв.',
    clientKey: 'kuznecova',
    hoursAgo: 48 * 24,
    sourceUrl: 'http://tulaklimat.localhost/#lead',
  },
  {
    name: 'Игорь',
    phone: '+7 (900) 000-11-22',
    topic: 'Установка кондиционера',
    comment: 'Нужно завтра к 8 утра, иначе не надо.',
    status: 'REJECTED',
    managerComment: 'Все бригады заняты на неделю вперёд, предложили четверг — не подошло.',
    hoursAgo: 11 * 24,
    sourceUrl: 'http://tulaklimat.localhost/#lead',
  },
  {
    name: 'Продвижение сайтов',
    phone: '+7 (999) 999-99-99',
    topic: 'Консультация',
    comment: 'Здравствуйте! Предлагаем вывести ваш сайт в топ выдачи за 3 дня.',
    status: 'REJECTED',
    managerComment: 'Спам.',
    hoursAgo: 5 * 24,
    sourceUrl: 'http://tulaklimat.localhost/#lead',
  },
  {
    name: 'Орлова Наталья',
    phone: '+7 (910) 155-24-68',
    topic: 'Установка кондиционера',
    place: 'Квартира',
    qty: '2',
    callTime: 'После 18:00',
    address: 'Тула, ул. Первомайская, 27, кв. 45',
    comment: 'Спальня и гостиная. Второй блок можно позже, если так дешевле.',
    status: 'DONE',
    managerComment: 'Поставили оба сразу, скидка на второй монтаж. Постоянный клиент.',
    clientKey: 'orlova',
    hoursAgo: 60 * 24,
    sourceUrl: 'http://tulaklimat.localhost/#lead',
  },
];

// ---------- Отзывы ----------

type DemoReview = {
  readonly name: string;
  readonly rating: number;
  readonly text: string;
  readonly status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
  readonly daysAgo: number;
  readonly photo?: boolean;
  readonly avatar?: boolean;
};

/**
 * 🔴 Только для стенда. Выдуманные отзывы на боевом сайте прямо запрещены
 * (инвариант 10): раздел стартует пустым и наполняется тем, что люди прислали
 * через форму. Здесь они нужны, чтобы было что модерировать и на чём смотреть
 * вёрстку ленты.
 *
 * Разложены по всем четырём статусам, включая отклонённый и архивный: их
 * поведение проверить иначе негде.
 */
const reviews: readonly DemoReview[] = [
  {
    name: 'Кузнецова Ирина',
    rating: 5,
    text: 'Приехали в тот же день, что и позвонила. Работали аккуратно, за собой всё убрали, штробу закрыли ровно. Цена совпала со сметой по телефону до рубля.',
    status: 'APPROVED',
    daysAgo: 44,
    photo: true,
    avatar: true,
  },
  {
    name: 'Дёмин Алексей',
    rating: 5,
    text: 'Двенадцатый этаж, думал никто не возьмётся. Приехали с вышкой, согласовали с управляющей компанией сами. Работает тихо, спасибо.',
    status: 'APPROVED',
    daysAgo: 25,
    photo: true,
  },
  {
    name: 'Павел',
    rating: 4,
    text: 'Всё сделали хорошо, но приехали на час позже, чем договаривались. Позвонили, предупредили — и на том спасибо.',
    status: 'APPROVED',
    daysAgo: 31,
  },
  {
    name: 'Беляева Ольга',
    rating: 5,
    text: 'Вызывала из-за течи, оказался забитый дренаж. Промыли, заодно почистили — и денег взяли как за обычную чистку.',
    status: 'APPROVED',
    daysAgo: 18,
    avatar: true,
  },
  {
    name: 'Наталья',
    rating: 5,
    text: 'Ставили два кондиционера в один заход, обошлось дешевле, чем по отдельности. Второй сезон работают без нареканий.',
    status: 'PENDING',
    daysAgo: 2,
  },
  {
    name: 'Станислав',
    rating: 4,
    text: 'Ставили на даче под Новомосковском. Ехать далеко, но за выезд не накинули. Единственное — пришлось подождать неделю из-за дождей.',
    status: 'PENDING',
    daysAgo: 1,
    photo: true,
  },
  {
    name: 'Аноним',
    rating: 1,
    text: 'Лучшие цены на кондиционеры тут: super-kondei-tula.example — переходите, не пожалеете!',
    status: 'REJECTED',
    daysAgo: 6,
  },
  {
    name: 'Виктор',
    rating: 3,
    text: 'Работой доволен, но отзыв просил удалить — писал в сердцах, пока ждал звонка. Претензий нет.',
    status: 'ARCHIVED',
    daysAgo: 74,
  },
];

// ---------- Наряды ----------

type DemoUnit = {
  readonly equip:
    'CONDITIONER' | 'FRIDGE' | 'COMPRESSOR' | 'VENTILATION' | 'HEAT_CURTAIN' | 'OTHER';
  readonly model?: string;
  readonly source: 'OURS' | 'CLIENT';
  readonly trassaM?: number;
  readonly diameter?: string;
  readonly shtrob?: boolean;
};

type DemoOrder = {
  readonly type: 'INSTALL' | 'SERVICE' | 'REPAIR';
  readonly status: 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  readonly clientKey: string;
  readonly installerLogin?: string;
  readonly dayDelta: number;
  readonly time: string;
  readonly durationMin: number;
  readonly address: string;
  readonly intercom?: string;
  readonly phone2?: string;
  readonly floor?: number;
  readonly heightWorks?: boolean;
  readonly payment: 'COMPANY' | 'CASH_TO_INSTALLER';
  readonly price: number;
  readonly installerFee: number;
  readonly deductionSum?: number;
  readonly deductionReason?: string;
  readonly comment?: string;
  readonly ownerNote?: string;
  readonly units: readonly DemoUnit[];
};

/**
 * Наряды разложены по всем статусам и обоим способам оплаты, часть — на
 * оборудовании клиента (`source: 'CLIENT'`), потому что половина работ это
 * монтаж купленной самостоятельно техники (CRM.md §3.3).
 *
 * Удержание заведено ровно одно и с основанием: сумма без причины — это то,
 * что схема запрещает, и на стенде должно быть видно, как выглядит правильно
 * заполненное поле.
 */
const orders: readonly DemoOrder[] = [
  {
    type: 'INSTALL',
    status: 'NEW',
    clientKey: 'zhukov',
    dayDelta: 3,
    time: '10:00',
    durationMin: 240,
    address: 'Тула, ул. Токарева, 88, кв. 204',
    intercom: '204',
    floor: 4,
    payment: 'COMPANY',
    price: 44900,
    installerFee: 0,
    comment: 'Комната 18 м², окна на юг. Клиент просил тихую модель.',
    ownerNote: 'Исполнитель не назначен — Захаров занят до четверга.',
    units: [
      {
        equip: 'CONDITIONER',
        model: 'Electrolux EACS/I-09HAT',
        source: 'OURS',
        trassaM: 4,
        diameter: '1/4–3/8',
        shtrob: false,
      },
    ],
  },
  {
    type: 'INSTALL',
    status: 'ASSIGNED',
    clientKey: 'fedotova',
    installerLogin: 'mironov',
    dayDelta: 1,
    time: '09:00',
    durationMin: 240,
    address: 'Тула, ул. Кирова, 12, кв. 9',
    phone2: '+7 (906) 530-92-44',
    floor: 2,
    payment: 'CASH_TO_INSTALLER',
    price: 37400,
    installerFee: 6000,
    comment: 'Клиент пожилой, объяснить пульт подробно и показать режимы.',
    units: [
      {
        equip: 'CONDITIONER',
        model: 'Ballu BSWI-07HN8',
        source: 'OURS',
        trassaM: 3,
        diameter: '1/4–3/8',
        shtrob: false,
      },
    ],
  },
  {
    type: 'INSTALL',
    status: 'ASSIGNED',
    clientKey: 'novikov',
    installerLogin: 'zaharov',
    dayDelta: 5,
    time: '11:00',
    durationMin: 420,
    address: 'Новомосковск, ул. Комсомольская, 40',
    payment: 'COMPANY',
    price: 84300,
    installerFee: 14000,
    comment: 'Две комнаты, электрика выведена. Ехать 55 км, выезжать раньше.',
    units: [
      {
        equip: 'CONDITIONER',
        model: 'Haier AS12TL4HRA',
        source: 'OURS',
        trassaM: 5,
        diameter: '1/4–3/8',
        shtrob: true,
      },
      {
        equip: 'CONDITIONER',
        model: 'Ballu BSWI-07HN8',
        source: 'OURS',
        trassaM: 4,
        diameter: '1/4–3/8',
        shtrob: true,
      },
    ],
  },
  {
    type: 'SERVICE',
    status: 'IN_PROGRESS',
    clientKey: 'romashka',
    installerLogin: 'panov',
    dayDelta: 0,
    time: '13:00',
    durationMin: 180,
    address: 'Тула, проспект Ленина, 85, 4 этаж',
    phone2: '+7 (4872) 25-19-03',
    floor: 4,
    payment: 'COMPANY',
    price: 9600,
    installerFee: 3200,
    comment: 'Четыре внутренних блока, чистка перед сезоном. Пропуск заказан на Марину.',
    units: [
      { equip: 'CONDITIONER', model: 'Ballu BSA-09', source: 'CLIENT' },
      { equip: 'CONDITIONER', model: 'Ballu BSA-09', source: 'CLIENT' },
      { equip: 'CONDITIONER', model: 'Hisense AS-12', source: 'CLIENT' },
      { equip: 'CONDITIONER', model: 'Hisense AS-12', source: 'CLIENT' },
    ],
  },
  {
    type: 'INSTALL',
    status: 'DONE',
    clientKey: 'demin',
    installerLogin: 'zaharov',
    dayDelta: -12,
    time: '09:00',
    durationMin: 360,
    address: 'Тула, ул. Металлургов, 62, кв. 118',
    floor: 12,
    heightWorks: true,
    payment: 'CASH_TO_INSTALLER',
    price: 52400,
    installerFee: 9000,
    comment: 'Наружный блок с автовышки, согласование с УК на руках.',
    ownerNote: 'Вышка своя, в смету заложены только высотные работы.',
    units: [
      {
        equip: 'CONDITIONER',
        model: 'Haier AS12TL4HRA',
        source: 'OURS',
        trassaM: 6,
        diameter: '1/4–3/8',
        shtrob: false,
      },
    ],
  },
  {
    type: 'REPAIR',
    status: 'DONE',
    clientKey: 'belyaeva',
    installerLogin: 'mironov',
    dayDelta: -6,
    time: '15:00',
    durationMin: 90,
    address: 'Тула, ул. Пузакова, 5, кв. 3',
    floor: 1,
    payment: 'CASH_TO_INSTALLER',
    price: 3500,
    installerFee: 1800,
    comment: 'Течь из внутреннего блока: промывка дренажа, чистка теплообменника.',
    units: [{ equip: 'CONDITIONER', model: 'Zanussi ZACS-09', source: 'CLIENT' }],
  },
  {
    type: 'SERVICE',
    status: 'DONE',
    clientKey: 'sergeev',
    installerLogin: 'panov',
    dayDelta: -20,
    time: '11:30',
    durationMin: 120,
    address: 'Тула, ул. Октябрьская, 91, кв. 12',
    floor: 5,
    payment: 'CASH_TO_INSTALLER',
    price: 3200,
    installerFee: 1600,
    deductionSum: 500,
    deductionReason: 'Опоздание на два часа без предупреждения, клиент отпрашивался с работы.',
    comment: 'Ежегодное ТО, техника наша с 2023 года.',
    ownerNote: 'Удержание согласовано с Дмитрием, в договоре пункт есть.',
    units: [{ equip: 'CONDITIONER', model: 'Ballu BSWI-09HN8', source: 'OURS' }],
  },
  {
    type: 'SERVICE',
    status: 'DONE',
    clientKey: 'salon',
    installerLogin: 'zaharov',
    dayDelta: -27,
    time: '08:30',
    durationMin: 300,
    address: 'Тула, ул. Советская, 47, помещение 2',
    payment: 'COMPANY',
    price: 18000,
    installerFee: 6000,
    comment: 'Два канальных блока за потолком, снимать плитку армстронг.',
    units: [
      { equip: 'VENTILATION', model: 'Канальный блок Tosot T24H', source: 'OURS' },
      { equip: 'VENTILATION', model: 'Канальный блок Tosot T24H', source: 'OURS' },
    ],
  },
  {
    type: 'INSTALL',
    status: 'DONE',
    clientKey: 'orlova',
    installerLogin: 'gusev',
    dayDelta: -55,
    time: '10:00',
    durationMin: 420,
    address: 'Тула, ул. Первомайская, 27, кв. 45',
    floor: 7,
    payment: 'COMPANY',
    price: 79800,
    installerFee: 13000,
    comment: 'Два блока в один выезд: спальня и гостиная.',
    ownerNote: 'Наряд остался за Гусевым — учётная запись отключена, история сохранена.',
    units: [
      {
        equip: 'CONDITIONER',
        model: 'Electrolux EACS/I-09HAT',
        source: 'OURS',
        trassaM: 3,
        diameter: '1/4–3/8',
      },
      {
        equip: 'CONDITIONER',
        model: 'Haier AS12TL4HRA',
        source: 'OURS',
        trassaM: 7,
        diameter: '1/4–3/8',
        shtrob: true,
      },
    ],
  },
  {
    type: 'INSTALL',
    status: 'CANCELLED',
    clientKey: 'kuznecova',
    dayDelta: -3,
    time: '14:00',
    durationMin: 240,
    address: 'Щёкино, ул. Советская, 14',
    payment: 'COMPANY',
    price: 0,
    installerFee: 0,
    comment: 'Второй блок в детскую.',
    ownerNote: 'Клиент отложил до следующего лета, деньги не брали.',
    units: [{ equip: 'CONDITIONER', source: 'OURS' }],
  },
];

// ---------- Календарь работ ----------

type DemoEvent = {
  readonly kind: 'CALL' | 'MEASURE' | 'INSTALL' | 'SERVICE' | 'MEETING' | 'NOTE';
  readonly status: 'PLANNED' | 'DONE' | 'CANCELLED';
  readonly dayDelta: number;
  readonly time: string;
  readonly clientName: string;
  readonly clientPhone?: string;
  readonly address?: string;
  readonly note?: string;
  readonly leadIndex?: number;
};

/**
 * Дела разложены вокруг сегодняшнего дня: часть просрочена, часть на сегодня,
 * часть впереди. Половина заведена без заявки — по звонку и сарафану, ровно
 * как в жизни (поэтому клиент в деле строками, а не ссылкой).
 */
const events: readonly DemoEvent[] = [
  {
    kind: 'CALL',
    status: 'PLANNED',
    dayDelta: -2,
    time: '11:00',
    clientName: 'Антон',
    clientPhone: '+7 (910) 244-05-77',
    note: 'Спрашивал про трассу 7 метров и штробление. Просрочено — перезвонить.',
    leadIndex: 2,
  },
  {
    kind: 'CALL',
    status: 'DONE',
    dayDelta: -1,
    time: '18:30',
    clientName: 'Федотова Лидия Ивановна',
    clientPhone: '+7 (906) 530-92-44',
    note: 'Согласовали замер на завтра, 10:00.',
    leadIndex: 3,
  },
  {
    kind: 'SERVICE',
    status: 'PLANNED',
    dayDelta: 0,
    time: '13:00',
    clientName: 'ООО «Ромашка»',
    clientPhone: '+7 (4872) 25-19-03',
    address: 'Тула, проспект Ленина, 85, 4 этаж',
    note: 'Чистка четырёх блоков, пропуск на Марину.',
    leadIndex: 1,
  },
  {
    kind: 'CALL',
    status: 'PLANNED',
    dayDelta: 0,
    time: '19:00',
    clientName: 'Жуков Кирилл',
    clientPhone: '+7 (952) 187-63-40',
    note: 'Новая заявка с сайта, просил звонить после 18:00.',
    leadIndex: 0,
  },
  {
    kind: 'MEASURE',
    status: 'PLANNED',
    dayDelta: 1,
    time: '10:00',
    clientName: 'Федотова Лидия Ивановна',
    clientPhone: '+7 (906) 530-92-44',
    address: 'Тула, ул. Кирова, 12, кв. 9',
    note: 'Второй этаж, балкон. Посмотреть, куда вешать наружный блок.',
    leadIndex: 3,
  },
  {
    kind: 'INSTALL',
    status: 'PLANNED',
    dayDelta: 1,
    time: '09:00',
    clientName: 'Федотова Лидия Ивановна',
    address: 'Тула, ул. Кирова, 12, кв. 9',
    note: 'Монтаж сразу после замера, если всё сойдётся.',
  },
  {
    kind: 'MEETING',
    status: 'PLANNED',
    dayDelta: 2,
    time: '15:00',
    clientName: 'Поставщик, склад на Одоевском',
    clientPhone: '+7 (4872) 70-11-05',
    address: 'Тула, Одоевское шоссе, 83',
    note: 'Забрать четыре внутренних блока и кронштейны.',
  },
  {
    kind: 'INSTALL',
    status: 'PLANNED',
    dayDelta: 3,
    time: '10:00',
    clientName: 'Жуков Кирилл',
    clientPhone: '+7 (952) 187-63-40',
    address: 'Тула, ул. Токарева, 88, кв. 204',
    leadIndex: 0,
  },
  {
    kind: 'NOTE',
    status: 'PLANNED',
    dayDelta: 4,
    time: '09:00',
    clientName: 'Внутреннее',
    note: 'Заказать фреон R32, остался один баллон.',
  },
  {
    kind: 'INSTALL',
    status: 'PLANNED',
    dayDelta: 5,
    time: '11:00',
    clientName: 'Новиков Станислав',
    clientPhone: '+7 (930) 745-16-08',
    address: 'Новомосковск, ул. Комсомольская, 40',
    note: 'Два блока, выезд на весь день.',
    leadIndex: 4,
  },
  {
    kind: 'SERVICE',
    status: 'PLANNED',
    dayDelta: 8,
    time: '12:00',
    clientName: 'Салон «Аврора»',
    clientPhone: '+7 (487) 233-10-77',
    address: 'Тула, ул. Советская, 47',
    note: 'Плановое ТО по договору, второй раз за год.',
  },
  {
    kind: 'CALL',
    status: 'PLANNED',
    dayDelta: 12,
    time: '10:00',
    clientName: 'Сергеев Павел',
    clientPhone: '8 953 811 40 26',
    note: 'Напомнить про ТО следующей весной — договаривались заранее.',
  },
  {
    kind: 'INSTALL',
    status: 'DONE',
    dayDelta: -12,
    time: '09:00',
    clientName: 'Дёмин Алексей',
    address: 'Тула, ул. Металлургов, 62, кв. 118',
    note: 'Высотные работы, автовышка.',
    leadIndex: 5,
  },
  {
    kind: 'MEASURE',
    status: 'CANCELLED',
    dayDelta: -4,
    time: '16:00',
    clientName: 'Кузнецова Ирина',
    clientPhone: '9206114488',
    address: 'Щёкино, ул. Советская, 14',
    note: 'Отменили: клиент отложил второй блок до следующего лета.',
    leadIndex: 8,
  },
  {
    kind: 'SERVICE',
    status: 'DONE',
    dayDelta: -6,
    time: '15:00',
    clientName: 'Беляева Ольга',
    address: 'Тула, ул. Пузакова, 5, кв. 3',
    note: 'Течь, промывка дренажа.',
    leadIndex: 6,
  },
];

// ---------- Занятость ----------

type DemoBlock = {
  readonly login: string;
  readonly repeat: 'ONCE' | 'WEEKLY';
  readonly dayDelta?: number;
  readonly weekday?: number;
  readonly fromMin?: number;
  readonly toMin?: number;
  readonly reason: string;
};

/**
 * Занятость личная, и на стенде нужны все её виды: день целиком, окно на
 * несколько часов и постоянный выходной. Выходные не в субботу и воскресенье
 * намеренно — в этой сфере монтажи как раз идут в выходные.
 */
const blocks: readonly DemoBlock[] = [
  { login: 'zaharov', repeat: 'WEEKLY', weekday: 2, reason: 'Постоянный выходной' },
  {
    login: 'zaharov',
    repeat: 'ONCE',
    dayDelta: 6,
    reason: 'Семейные дела, весь день недоступен',
  },
  {
    login: 'mironov',
    repeat: 'ONCE',
    dayDelta: 2,
    fromMin: 9 * 60,
    toMin: 12 * 60,
    reason: 'Врач, до обеда',
  },
  { login: 'panov', repeat: 'WEEKLY', weekday: 4, reason: 'Учёба, каждый четверг' },
  {
    login: 'panov',
    repeat: 'ONCE',
    dayDelta: 9,
    fromMin: 14 * 60,
    toMin: 18 * 60,
    reason: 'Забрать ребёнка из лагеря',
  },
];

// ---------- Журнал доставки ----------

/**
 * 🔴 Ни одного уведомления в статусе `PENDING`.
 *
 * Очередь разбирает живой воркер, а в деве драйвер Telegram может быть
 * настоящим — незакрытая запись превратилась бы в реальное сообщение боту при
 * первом же тике. На стенде нужен вид журнала, а не рассылка: заводим только
 * отправленные и отказавшие.
 */
type DemoNotification = {
  readonly channel: 'telegram' | 'email';
  readonly kind: 'lead' | 'review' | 'to-reminder';
  readonly status: 'SENT' | 'FAILED';
  readonly hoursAgo: number;
  readonly attempts: number;
  readonly lastError?: string;
  readonly payload: Record<string, unknown>;
};

const notifications: readonly DemoNotification[] = [
  {
    channel: 'telegram',
    kind: 'lead',
    status: 'SENT',
    hoursAgo: 3,
    attempts: 1,
    payload: {
      kind: 'lead',
      name: 'Жуков Кирилл',
      phone: '+7 (952) 187-63-40',
      topic: 'Установка кондиционера',
    },
  },
  {
    channel: 'email',
    kind: 'lead',
    status: 'SENT',
    hoursAgo: 3,
    attempts: 1,
    payload: {
      kind: 'lead',
      name: 'Жуков Кирилл',
      phone: '+7 (952) 187-63-40',
      topic: 'Установка кондиционера',
    },
  },
  {
    channel: 'telegram',
    kind: 'lead',
    status: 'SENT',
    hoursAgo: 9,
    attempts: 2,
    payload: { kind: 'lead', name: 'Марина', phone: '+7 (4872) 25-19-03', topic: 'Обслуживание' },
  },
  {
    channel: 'email',
    kind: 'lead',
    status: 'FAILED',
    hoursAgo: 9,
    attempts: 5,
    lastError: 'SMTP 421: соединение закрыто сервером после трёх попыток подряд',
    payload: { kind: 'lead', name: 'Марина', phone: '+7 (4872) 25-19-03', topic: 'Обслуживание' },
  },
  {
    channel: 'telegram',
    kind: 'review',
    status: 'SENT',
    hoursAgo: 26,
    attempts: 1,
    payload: { kind: 'review', name: 'Станислав', rating: 4 },
  },
  {
    channel: 'telegram',
    kind: 'to-reminder',
    status: 'SENT',
    hoursAgo: 50,
    attempts: 1,
    payload: { kind: 'to-reminder', phone: '8 953 811 40 26', when: 'Весной' },
  },
  {
    channel: 'telegram',
    kind: 'lead',
    status: 'FAILED',
    hoursAgo: 120,
    attempts: 5,
    lastError: 'Telegram 400: chat not found — проверьте идентификатор чата в настройках',
    payload: {
      kind: 'lead',
      name: 'Игорь',
      phone: '+7 (900) 000-11-22',
      topic: 'Установка кондиционера',
    },
  },
];

// ---------- Запись ----------

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3_600_000);
}

function daysAgo(days: number): Date {
  return hoursAgo(days * 24);
}

/**
 * Демо-данные заменяются целиком, а не дополняются: иначе повторный запуск
 * плодит вторых Орловых и десятые наряды. Чистятся только те таблицы, которые
 * скрипт и наполняет; учётная запись владельца из `seed.ts` не трогается —
 * иначе стенд остался бы без входа.
 */
async function wipe(): Promise<void> {
  await prisma.orderUnit.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dayBlock.deleteMany();
  await prisma.crmEvent.deleteMany();
  await prisma.installerNote.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.client.deleteMany();
  await prisma.productSpec.deleteMany();
  await prisma.productPhoto.deleteMany();
  await prisma.product.deleteMany();
  await prisma.priceRow.deleteMany();
  await prisma.article.deleteMany();

  // сессии монтажников умрут вместе с учётками, но владелец остаётся в панели
  await prisma.adminUser.deleteMany({ where: { role: 'INSTALLER' } });
}

/**
 * Уборка снимков, на которые больше никто не ссылается.
 *
 * Без неё каждый прогон оставлял бы на диске прежний комплект: строки в базе
 * заменяются, а файлы — нет. Проверяем по всей базе, а не по списку демо-имён:
 * так же уборка работает и для того, что залили руками через админку, а потом
 * удалили вместе с карточкой.
 */
async function sweepOrphans(): Promise<void> {
  const referenced = new Set<string>();
  const take = (url: string | null): void => {
    if (url !== null && url.startsWith(`${MEDIA_PREFIX}/`)) {
      referenced.add(url.slice(MEDIA_PREFIX.length + 1));
    }
  };

  for (const row of await prisma.productPhoto.findMany({ select: { url: true } })) take(row.url);
  for (const row of await prisma.article.findMany({ select: { cover: true } })) take(row.cover);
  for (const row of await prisma.review.findMany({ select: { photo: true, avatar: true } })) {
    take(row.photo);
    take(row.avatar);
  }
  for (const row of await prisma.lead.findMany({ select: { photo: true } })) take(row.photo);

  const names = await readdir(UPLOADS_DIR).catch(() => [] as string[]);
  // трогаем только файлы с именем, которое выдаёт сервер: чужое в этом
  // каталоге удалять не наше дело
  const generated = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

  let removed = 0;
  for (const name of names) {
    if (!generated.test(name) || referenced.has(name)) continue;
    await rm(join(UPLOADS_DIR, name), { force: true });
    removed += 1;
  }

  if (removed > 0) console.log(`  снимков без карточек убрано: ${removed}`);
}

/** Приведение телефона к ключу дедупликации — та же логика, что в `shared/lib/phone`. */
function phoneKeyOf(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  return digits;
}

async function main(): Promise<void> {
  assertNotProduction();

  console.log('Чищу прежние демо-данные…');
  await wipe();
  await sweepOrphans();

  console.log('Настройки компании…');
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    });
  }

  console.log('Прайс на монтаж…');
  for (const [index, row] of prices.entries()) {
    await prisma.priceRow.create({ data: { ...row, sort: index } });
  }

  console.log('Каталог…');
  for (const [index, product] of products.entries()) {
    const [from, to] = product.colors;
    const main = await makeImage({
      title: product.badge,
      subtitle: `${product.brand} · ${product.name}`,
      from,
      to,
    });
    const second = await makeImage({
      title: 'наружный блок',
      subtitle: product.sku,
      from: to,
      to: from,
    });

    await prisma.product.create({
      data: {
        slug: product.slug,
        badge: product.badge,
        name: product.name,
        brand: product.brand,
        sku: product.sku,
        areaMax: product.areaMax,
        tag: product.tag,
        priceNum: product.priceNum,
        salePrice: product.salePrice ?? null,
        saleFrom: product.saleFrom === undefined ? null : msk(product.saleFrom),
        // конец периода — последний день целиком, поэтому граница на полночь
        // следующего дня: скидка заканчивается сама (инвариант 14)
        saleTo: product.saleTo === undefined ? null : msk(product.saleTo, '23:59'),
        saleLabel: product.saleLabel ?? null,
        visible: product.visible,
        featured: product.featured,
        sort: index,
        seoTitle: product.seoTitle ?? null,
        seoDescription: product.seoDescription ?? null,
        photos: {
          create: [
            { url: main, alt: `${product.name}, внутренний блок`, isMain: true, sort: 0 },
            { url: second, alt: `${product.name}, наружный блок`, isMain: false, sort: 1 },
          ],
        },
        specs: {
          create: product.specs.map((spec, order) => ({ k: spec.k, v: spec.v, sort: order })),
        },
      },
    });
  }

  console.log('Статьи…');
  for (const article of articles) {
    const cover = article.cover
      ? await makeImage({
          title: article.category,
          subtitle: article.title,
          from: '#0f766e',
          to: '#0f172a',
          width: 1200,
          height: 630,
        })
      : null;

    await prisma.article.create({
      data: {
        slug: article.slug,
        title: article.title,
        category: article.category,
        date: msk(article.date),
        minutes: article.minutes,
        cover,
        excerpt: article.excerpt,
        body: article.body,
        published: article.published,
      },
    });
  }

  console.log('Команда…');
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const staffIds = new Map<string, string>();
  for (const person of staff) {
    const created = await prisma.adminUser.create({
      data: {
        login: person.login,
        passwordHash,
        role: 'INSTALLER',
        employment: person.employment,
        name: person.name,
        phone: person.phone,
        active: person.active,
        notes: { create: person.notes.map((text) => ({ text })) },
      },
    });
    staffIds.set(person.login, created.id);
  }

  console.log('Клиенты…');
  const clientIds = new Map<string, string>();
  for (const client of clients) {
    const created = await prisma.client.create({
      data: {
        name: client.name,
        phone: client.phone,
        phoneKey: phoneKeyOf(client.phone),
        address: client.address,
        note: client.note,
        createdAt: daysAgo(client.createdDaysAgo),
      },
    });
    clientIds.set(client.key, created.id);
  }

  console.log('Обращения…');
  const leadIds: string[] = [];
  for (const lead of leads) {
    const photo =
      lead.photo === true
        ? await makeImage({
            title: 'фото к заявке',
            subtitle: lead.address ?? lead.name,
            from: '#334155',
            to: '#0f172a',
            width: 1000,
            height: 750,
          })
        : null;

    const created = await prisma.lead.create({
      data: {
        name: lead.name,
        phone: lead.phone,
        topic: lead.topic,
        place: lead.place ?? null,
        qty: lead.qty ?? null,
        callTime: lead.callTime ?? null,
        address: lead.address ?? null,
        comment: lead.comment ?? null,
        photo,
        sourceUrl: lead.sourceUrl,
        referrer: lead.referrer ?? null,
        /* Prisma при exactOptionalPropertyTypes не принимает undefined в
           Json-поле: «метки не пришли» для него — это Prisma.DbNull, а не
           отсутствие ключа. */
        utm: lead.utm ?? Prisma.DbNull,
        consentAt: hoursAgo(lead.hoursAgo),
        status: lead.status,
        managerComment: lead.managerComment ?? null,
        clientId: lead.clientKey === undefined ? null : (clientIds.get(lead.clientKey) ?? null),
        createdAt: hoursAgo(lead.hoursAgo),
      },
    });
    leadIds.push(created.id);
  }

  console.log('Отзывы…');
  for (const review of reviews) {
    await prisma.review.create({
      data: {
        name: review.name,
        rating: review.rating,
        text: review.text,
        photo:
          review.photo === true
            ? await makeImage({
                title: 'место установки',
                subtitle: review.name,
                from: '#0ea5b7',
                to: '#134e4a',
                width: 1000,
                height: 750,
              })
            : null,
        avatar:
          review.avatar === true
            ? await makeImage({
                title: review.name.slice(0, 1),
                subtitle: '',
                from: '#1d4ed8',
                to: '#0f172a',
                width: 400,
                height: 400,
              })
            : null,
        status: review.status,
        consentAt: daysAgo(review.daysAgo),
        createdAt: daysAgo(review.daysAgo),
      },
    });
  }

  console.log('Наряды…');
  for (const [index, order] of orders.entries()) {
    const clientId = clientIds.get(order.clientKey);
    if (clientId === undefined) throw new Error(`Нет клиента ${order.clientKey} для наряда`);

    await prisma.order.create({
      data: {
        number: index + 1,
        type: order.type,
        status: order.status,
        clientId,
        installerId:
          order.installerLogin === undefined ? null : (staffIds.get(order.installerLogin) ?? null),
        at: at(order.dayDelta, order.time),
        durationMin: order.durationMin,
        address: order.address,
        intercom: order.intercom ?? null,
        phone2: order.phone2 ?? null,
        floor: order.floor ?? null,
        heightWorks: order.heightWorks ?? false,
        payment: order.payment,
        price: order.price,
        installerFee: order.installerFee,
        deductionSum: order.deductionSum ?? 0,
        deductionReason: order.deductionReason ?? null,
        comment: order.comment ?? null,
        ownerNote: order.ownerNote ?? null,
        units: {
          create: order.units.map((unit, sort) => ({
            equip: unit.equip,
            model: unit.model ?? null,
            source: unit.source,
            trassaM: unit.trassaM ?? null,
            diameter: unit.diameter ?? null,
            shtrob: unit.shtrob ?? false,
            sort,
          })),
        },
      },
    });
  }

  /* Счётчик номеров догоняет заведённые наряды: следующий, созданный из
     панели, обязан продолжить нумерацию, а не начать с единицы заново. */
  await prisma.setting.upsert({
    where: { key: 'orderSeq' },
    create: { key: 'orderSeq', value: orders.length },
    update: { value: orders.length },
  });

  console.log('Календарь…');
  for (const event of events) {
    await prisma.crmEvent.create({
      data: {
        kind: event.kind,
        status: event.status,
        at: at(event.dayDelta, event.time),
        clientName: event.clientName,
        clientPhone: event.clientPhone ?? null,
        address: event.address ?? null,
        note: event.note ?? null,
        leadId: event.leadIndex === undefined ? null : (leadIds[event.leadIndex] ?? null),
      },
    });
  }

  console.log('Занятость…');
  for (const block of blocks) {
    const userId = staffIds.get(block.login);
    if (userId === undefined) throw new Error(`Нет монтажника ${block.login} для занятости`);

    await prisma.dayBlock.create({
      data: {
        userId,
        repeat: block.repeat,
        day: block.dayDelta === undefined ? null : msk(daysFromToday(block.dayDelta)),
        weekday: block.weekday ?? null,
        fromMin: block.fromMin ?? null,
        toMin: block.toMin ?? null,
        reason: block.reason,
      },
    });
  }

  console.log('Журнал доставки…');
  for (const item of notifications) {
    await prisma.notification.create({
      data: {
        channel: item.channel,
        kind: item.kind,
        payload: item.payload as never,
        status: item.status,
        attempts: item.attempts,
        lastError: item.lastError ?? null,
        nextTryAt: hoursAgo(item.hoursAgo),
        createdAt: hoursAgo(item.hoursAgo),
        sentAt: item.status === 'SENT' ? hoursAgo(item.hoursAgo) : null,
      },
    });
  }

  console.log('');
  console.log('Готово. На стенде теперь:');
  console.log(`  каталог — ${products.length} моделей, прайс — ${prices.length} строк`);
  console.log(`  статьи — ${articles.length} (одна черновиком)`);
  console.log(`  команда — ${staff.length} монтажников, пароль у всех: ${DEMO_PASSWORD}`);
  console.log(
    `  клиенты — ${clients.length}, обращения — ${leads.length}, отзывы — ${reviews.length}`,
  );
  console.log(
    `  наряды — ${orders.length}, дела календаря — ${events.length}, занятость — ${blocks.length}`,
  );
  console.log(`  журнал доставки — ${notifications.length} записей`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
