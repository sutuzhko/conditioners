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

import { overtimeMinutes } from '@/entities/crm/lib/overtime';
import { env } from '@/shared/config/env';

import { productionReasons } from './guard';

const prisma = new PrismaClient();

/**
 * Предохранитель. Демо-данные — это выдуманная компания, выдуманные отзывы и
 * персональные данные несуществующих людей: на боевой базе им нечего делать
 * ни при каких обстоятельствах.
 *
 * Сами признаки живут в `guard.ts` — отдельным модулем, чтобы их можно было
 * покрыть тестом, не запуская сид.
 */
function assertNotProduction(): void {
  const reasons = productionReasons({
    nodeEnv: env.NODE_ENV,
    siteUrl: env.SITE_URL,
    databaseUrl: env.DATABASE_URL,
  });

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

/**
 * Рабочее окно компании — с девяти до семи. Живёт одной константой, потому что
 * его читают двое: группа настроек `schedule` (ADR-128) и расчёт переработки у
 * нарядов и дел. Разъедься они — стенд показал бы переработку, не совпадающую
 * с собственной настройкой.
 */
const WORK_WINDOW = { fromMin: 9 * 60, toMin: 19 * 60 } as const;

/**
 * Переработка записи — тем же расчётом, что и в панели (`entities/crm/lib`), а
 * не проставленным числом: наряд в 08:30 и звонок в 19:00 выходят за окно, и
 * стенд обязан показывать это так же, как показал бы после правки руками.
 */
function overtimeFor(when: Date, durationMin: number): number {
  return overtimeMinutes(when, durationMin, WORK_WINDOW);
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
const UPLOADS_DIR = env.UPLOADS_DIR;
const MEDIA_PREFIX = '/api/media';
/* Приложения к наряду лежат отдельной папкой и наружу отдаются только закрытым
   маршрутом — там же, где их держит админка (`server/repo/order-files`). */
const DOCS_SUBDIR = 'orders';

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

/**
 * «Скан» приложения к наряду. Отличается от снимка местом на диске: документы
 * лежат в подкаталоге и наружу выходят только закрытым маршрутом, поэтому в
 * базе хранится имя файла, а не адрес (`server/repo/order-files`).
 */
async function makeDocument(
  title: string,
  subtitle: string,
): Promise<{
  readonly filename: string;
  readonly sizeBytes: number;
}> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754">
    <rect width="1240" height="1754" fill="#f8fafc"/>
    <text x="50%" y="18%" text-anchor="middle" font-family="serif" font-size="64" fill="#0f172a">${title}</text>
    <text x="50%" y="24%" text-anchor="middle" font-family="serif" font-size="34" fill="#334155">${subtitle}</text>
    <text x="50%" y="52%" text-anchor="middle" font-family="sans-serif" font-size="40" fill="#94a3b8">демо-данные стенда</text>
  </svg>`;

  const filename = `${randomUUID()}.jpg`;
  const body = await sharp(Buffer.from(svg)).jpeg({ quality: 70 }).toBuffer();

  const dir = join(UPLOADS_DIR, DOCS_SUBDIR);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), body);

  return { filename, sizeBytes: body.length };
}

// ---------- Данные компании ----------

/* Адресаты уведомлений. Вынесены константами, потому что их читают двое:
   группа настроек `notifications` и снимок адреса в журнале доставки
   (ADR-061). Разъедься они — журнал показывал бы доставку туда, куда
   настройки никогда не слали. */
const NOTIFY_TELEGRAM_TO = '@tulaklimat_demo';
const NOTIFY_EMAIL_TO = 'zakaz@tulaklimat.example';

/**
 * Заполнено так, как заполнял бы владелец: без единой заглушки, чтобы стенд
 * показывал разметку, метаданные и футер в рабочем виде.
 *
 * 🔴 При этом данные обязаны быть **заведомо демонстрационными**, а не просто
 * выдуманными. Правдоподобный набор цифр со сходящимся контрольным разрядом
 * неотличим от настоящего, и ИНН физлица с верным разрядом может совпасть с
 * чужим — «мы это придумали» здесь непроверяемо. Отсюда три приёма:
 *
 *  · телефоны — из заведомо фиктивных наборов (`000-…`), у компании и у
 *    клиентов разные серии: совпадение телефона компании с телефоном
 *    демо-клиентки выглядело так, будто владелец оставил заявку сам себе;
 *  · почта и ссылки — на домене `.example`, зарезервированном RFC 2606;
 *  · реквизиты — с телом из нулей и с прямым словом «демо» в тех полях,
 *    которые схема не считает (ФИО, орган регистрации, банк, адрес).
 *
 * 🔴 Сами номера остаются вычислительно верными: ИНН, ОГРНИП, БИК и счета
 * проверяются контрольным разрядом (ADR-143), и на неверных стенд просто не
 * поднимется — готовность настроек станет красной, а публичный сайт уйдёт под
 * `noindex`. Сделать номер структурно невозможным нельзя: единственный
 * запрещённый код региона — `00`, и его отвергает та же проверка.
 */
const settings: Record<string, Prisma.InputJsonValue> = {
  company: {
    name: 'ТулаКлимат',
    tagline: 'Кондиционеры с монтажом под ключ за один день',
    foundedYear: 2015,
  },
  contacts: {
    // серия 00-00-xx — только у компании: телефон клиента с ней не совпадёт
    phones: ['+7 (4872) 00-00-10', '+7 (900) 000-00-20'],
    email: 'zakaz@tulaklimat.example',
    telegram: 'https://t.me/tulaklimat_demo',
    whatsapp: 'https://wa.me/79000000020',
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
  /* Список городов остаётся в `served` — он идёт в контакты и в разметку зоны
     обслуживания. В капсуле первого экрана только обещание, ради которого её
     читают: город и срок выезда (ADR-126). */
  area: {
    served: 'Тула и область: Щёкино, Новомосковск, Алексин, Ясногорск, Венёв',
    promise: 'Тула и область — выезд в день обращения',
  },
  /* Полный состав формы «ИП» (ADR-112, PROJECT §5.1).

     🔴 Тело каждого номера — нули: `710000000077`, `314710000000002`,
     `047000000`. Контрольные разряды при этом сходятся, иначе стенд не
     поднимется (ADR-143), но такой номер невозможно принять за чей-то
     настоящий — в отличие от прежнего правдоподобного набора цифр.

     ФИО, орган регистрации и банк схема не считает, поэтому демонстрационность
     сказана в них прямым словом: именно они печатаются в футере и в политике
     обработки персональных данных.

     Адрес — регистрации, то есть домашний: на стенде он показывает ровно то,
     чего на сайте быть не должно, — в футер и в политику уходит фактический
     адрес приёма из группы `address`.

     Банк заполнен, хотя на витрину не идёт: владелец должен видеть на стенде,
     что поля для счетов есть и где они. */
  legal: {
    form: 'ИП',
    name: 'Демонстрационный Стенд Демонстрационович',
    inn: '710000000077',
    ogrn: '314710000000002',
    regDate: '2015-03-12',
    regAuthority: 'Демо-данные стенда: органа регистрации не существует',
    address: '300000, Тульская область, г. Тула, ул. Демонстрационная, д. 0 (демо-данные)',
    bankName: 'Демо-банк стенда (реквизиты выдуманы)',
    bankBik: '047000000',
    bankAccount: '40802810500000000000',
    bankCorrAccount: '30101810800000000000',
  },
  extras: {
    trassaPerM: 700,
    shtrobPerM: 800,
    heightWorks: 2000,
    trassaIncludedM: 3,
    heightFloorFrom: 10,
  },
  /* Только сроки: и карточка «Гарантия по договору», и блок монтажа
     показывают их строкой определения. Что покрывает гарантия — в ответе
     «Частых вопросов», он собирается сам (ADR-125). */
  warranty: {
    installation: '3 года',
    equipment: 'от 1 до 5 лет',
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
    telegramChatId: NOTIFY_TELEGRAM_TO,
    emailTo: NOTIFY_EMAIL_TO,
  },
  /**
   * Рабочее окно календаря — с девяти до семи (ADR-128). Группа обязательна:
   * без неё `checkReadiness` отдаёт `ready: false`, а `layout` публичного
   * сайта при неготовности вешает `robots: { index: false }` — стенд,
   * наполненный только `seed:demo`, оставался бы под `noindex` целиком.
   *
   * Часы работы для посетителя живут отдельно, в `contacts.hours`: это разные
   * вопросы, и разбирать свободный текст ради сетки календаря нельзя.
   */
  schedule: { fromMin: WORK_WINDOW.fromMin, toMin: WORK_WINDOW.toMin },
  /**
   * Справочник характеристик (ADR-094). Вторая группа, без которой стенд
   * оставался под `noindex`, а карточка товара показывала характеристики
   * плоским списком в порядке заполнения.
   *
   * 🔴 Это подсказка и порядок, а не список допустимых характеристик
   * (инвариант 6). «Тип», «Напор вентилятора» и «Монтаж» у канального и
   * мобильного блоков сюда сознательно не внесены: их место в группе «Прочее»
   * — на стенде должно быть видно, что характеристика вне справочника
   * работает как прежде.
   */
  specs: {
    groups: [
      {
        title: 'Основное',
        fields: [
          {
            k: 'Рекомендуемая площадь',
            unit: 'м²',
            hint: 'До скольких квадратов модель тянет без запаса',
          },
          { k: 'Мощность охлаждения', unit: 'кВт', hint: 'Сколько тепла отводит из помещения' },
          { k: 'Мощность обогрева', unit: 'кВт', hint: '' },
          { k: 'Тип компрессора', unit: '', hint: 'Инверторный или обычный (on/off)' },
        ],
      },
      {
        title: 'Энергоэффективность',
        fields: [{ k: 'Класс энергоэффективности', unit: '', hint: 'От A до G' }],
      },
      {
        title: 'Шум и температуры',
        fields: [
          {
            k: 'Уровень шума внутреннего блока',
            unit: 'дБ',
            hint: 'Ночной режим — 19–23 дБ, обычный — 30–35 дБ',
          },
          {
            k: 'Обогрев при температуре снаружи',
            unit: '°C',
            hint: 'Ниже этой границы обогрев не работает',
          },
        ],
      },
      {
        title: 'Возможности',
        fields: [
          { k: 'Wi-Fi управление', unit: '', hint: '' },
          { k: 'Самоочистка', unit: '', hint: '' },
          { k: 'Гарантия производителя', unit: '', hint: 'Срок от завода, отдельно от монтажа' },
        ],
      },
    ],
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
    phone: '+7 (900) 000-02-01',
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
    phone: '+7 (900) 000-02-02',
    employment: 'CONTRACT',
    active: true,
    notes: ['Аккуратный, но медленный: на типовой монтаж закладывать 4 часа, а не 3.'],
  },
  {
    login: 'panov',
    name: 'Панов Дмитрий',
    phone: '+7 (900) 000-02-03',
    employment: 'STAFF',
    active: true,
    notes: [],
  },
  {
    login: 'gusev',
    name: 'Гусев Роман',
    phone: '+7 (900) 000-02-04',
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
 * Телефоны заведомо фиктивные (серия `000-01-xx`) и записаны по-разному:
 * владелец диктует номер как привык, и дедупликация обязана свести
 * «+7 (900) …», «8 900 …» и «9 00…» к одному ключу (ADR-105). Здесь нарочно
 * смешаны три способа записи.
 */
const clients: readonly DemoClient[] = [
  {
    key: 'orlova',
    name: 'Орлова Наталья Викторовна',
    phone: '+7 (900) 000-01-01',
    address: 'Тула, ул. Первомайская, 27, кв. 45',
    note: 'Две сплит-системы: спальня и гостиная. Просит звонить после 18:00.',
    createdDaysAgo: 310,
  },
  {
    key: 'sergeev',
    name: 'Сергеев Павел',
    phone: '8 900 000 01 02',
    address: 'Тула, ул. Октябрьская, 91, кв. 12',
    note: 'ТО раз в год, весной. Кондиционер Ballu 09, поставлен нами в 2023.',
    createdDaysAgo: 240,
  },
  {
    key: 'kuznecova',
    name: 'Кузнецова Ирина',
    phone: '9000000103',
    address: 'Щёкино, ул. Советская, 14',
    note: null,
    createdDaysAgo: 188,
  },
  {
    key: 'romashka',
    name: 'ООО «Ромашка», офис на Ленина',
    phone: '+7 (4872) 00-01-04',
    address: 'Тула, проспект Ленина, 85, 4 этаж',
    note: 'Юрлицо, оплата по счёту. Контактное лицо — Марина, завхоз.',
    createdDaysAgo: 165,
  },
  {
    key: 'demin',
    name: 'Дёмин Алексей Юрьевич',
    phone: '+7 (900) 000-01-05',
    address: 'Тула, ул. Металлургов, 62, кв. 118',
    note: '12 этаж, нужна автовышка. В прошлый раз согласовывали с управляющей компанией.',
    createdDaysAgo: 120,
  },
  {
    key: 'belyaeva',
    name: 'Беляева Ольга',
    phone: '+7 (900) 000-01-06',
    address: 'Тула, ул. Пузакова, 5, кв. 3',
    note: null,
    createdDaysAgo: 96,
  },
  {
    key: 'novikov',
    name: 'Новиков Станислав',
    phone: '+7 (900) 000-01-07',
    address: 'Новомосковск, ул. Комсомольская, 40, кв. 77',
    note: 'Дача под Новомосковском, выезд согласовывать заранее.',
    createdDaysAgo: 71,
  },
  {
    key: 'fedotova',
    name: 'Федотова Лидия Ивановна',
    phone: '+7 (900) 000-01-08',
    address: 'Тула, ул. Кирова, 12, кв. 9',
    note: 'Пенсионерка, просит подробно объяснять по телефону.',
    createdDaysAgo: 45,
  },
  {
    key: 'salon',
    name: 'Салон «Аврора»',
    phone: '+7 (4872) 00-01-09',
    address: 'Тула, ул. Советская, 47, помещение 2',
    note: 'Два канальных блока за потолком, обслуживание по договору дважды в год.',
    createdDaysAgo: 30,
  },
  {
    key: 'zhukov',
    name: 'Жуков Кирилл',
    phone: '+7 (900) 000-01-10',
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
    phone: '+7 (900) 000-01-10',
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
    phone: '+7 (4872) 00-01-04',
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
    phone: '+7 (900) 000-03-01',
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
    phone: '+7 (900) 000-01-08',
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
    phone: '+7 (900) 000-01-07',
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
    phone: '+7 (900) 000-01-05',
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
    phone: '+7 (900) 000-01-06',
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
    phone: '8 900 000 01 02',
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
    phone: '9000000103',
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
    phone: '+7 (900) 000-01-01',
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
    // наряд был 12 дней назад: отзыв не может быть старше работы
    daysAgo: 10,
    photo: true,
  },
  {
    name: 'Павел',
    rating: 4,
    // ТО было 20 дней назад; опоздание — то же, за которое в наряде удержание
    text: 'Всё сделали хорошо, но приехали на два часа позже, чем договаривались. Позвонили только когда я сам набрал.',
    status: 'APPROVED',
    daysAgo: 18,
  },
  {
    name: 'Беляева Ольга',
    rating: 5,
    text: 'Вызывала из-за течи, оказался забитый дренаж. Промыли, заодно почистили — и денег взяли как за обычную чистку.',
    status: 'APPROVED',
    // ремонт был 6 дней назад
    daysAgo: 4,
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
    /* Не Новиков: его наряд ещё впереди, и отзыв о несделанной работе выглядел
       бы поломкой стенда. Здесь другой человек и другой объект. */
    name: 'Вячеслав',
    rating: 4,
    text: 'Ставили на даче под Тулой. Ехать далеко, но за выезд не накинули. Единственное — пришлось подождать неделю из-за дождей.',
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

  /* Дальше — объём: с шестью одобренными лента начинает ехать сама
     (`DRIFT_FROM` в Reviews.tsx), и проверять её ход не на чем, пока отзывов
     четыре. Длины нарочно разные: короткий отзыв не должен растягивать ряд,
     длинный — обрезаться на трёх строках, а не выпирать из карточки. */
  {
    name: 'Марина Соколова',
    rating: 5,
    text: 'Ставили два блока в один выезд — в спальню и детскую. Мастера пришли в бахилах, накрыли мебель плёнкой, пыль собрали пылесосом. Ничего за ними не убирала.',
    status: 'APPROVED',
    daysAgo: 4,
    avatar: true,
  },
  {
    name: 'Андрей',
    rating: 5,
    text: 'Всё чётко, спасибо.',
    status: 'APPROVED',
    daysAgo: 7,
  },
  {
    name: 'Екатерина Прохорова-Величко',
    rating: 5,
    text: 'Долго выбирала между тремя фирмами. Здесь единственные посчитали смету по телефону и назвали итог сразу, остальные звали замерщика «а там посмотрим». Итог совпал с тем, что сказали.',
    status: 'APPROVED',
    daysAgo: 11,
    photo: true,
    avatar: true,
  },
  {
    name: 'Олег Титов',
    rating: 4,
    text: 'Монтаж хороший, но пришлось ждать доставку блока пять дней. Предупредили честно, поэтому претензий нет — просто закладывайте время.',
    status: 'APPROVED',
    daysAgo: 14,
  },
  {
    name: 'Светлана',
    rating: 5,
    text: 'Вызывала на чистку после зимы. Разобрали, промыли, собрали, показали, что вытащили. Запах из блока пропал в тот же день.',
    status: 'APPROVED',
    daysAgo: 17,
    avatar: true,
  },
  {
    name: 'Роман Ковалёв',
    rating: 5,
    text: 'Ставили в офис четыре штуки. Приехали к восьми утра, чтобы не мешать работе, к обеду всё запустили.',
    status: 'APPROVED',
    daysAgo: 21,
    photo: true,
  },
  {
    name: 'Ирина',
    rating: 4,
    text: 'Хорошо, но трассу пришлось вести дольше, чем считали по телефону — доплатила три метра. Объяснили почему, показали на месте.',
    status: 'APPROVED',
    daysAgo: 24,
  },
  {
    name: 'Дмитрий Лапшин',
    rating: 5,
    text: 'Второй кондиционер у этих ребят. Первый работает четвёртый год без единой поломки, поэтому и вернулся.',
    status: 'APPROVED',
    daysAgo: 28,
    avatar: true,
  },
  {
    name: 'Алла Викторовна',
    rating: 5,
    text: 'Спасибо, что подробно объяснили по пульту. Я человек немолодой, с техникой на вы — мастер сам всё настроил и показал два раза.',
    status: 'APPROVED',
    daysAgo: 33,
  },
  {
    name: 'Николай',
    rating: 3,
    text: 'Работу сделали, но мусор оставили на лестничной клетке — пришлось выносить самому. В остальном нормально.',
    status: 'APPROVED',
    daysAgo: 36,
  },
  {
    name: 'Владислав Гринёв',
    rating: 5,
    text: 'Штробили бетон под трассу. Боялся, что разнесут полстены — вышло аккуратно, штробу зашпаклевали ровно, обои подрезали по линии.',
    status: 'APPROVED',
    daysAgo: 40,
    photo: true,
  },
  {
    name: 'Юлия',
    rating: 5,
    text: 'Приехали в жару на следующий день после звонка. Спасли.',
    status: 'APPROVED',
    daysAgo: 45,
    avatar: true,
  },
  {
    name: 'Сергей Матвеев',
    rating: 5,
    text: 'Дом в Щёкино, ехать далеко. За выезд не накинули ни рубля, хотя я был готов.',
    status: 'APPROVED',
    daysAgo: 51,
  },
  {
    name: 'Оксана',
    rating: 4,
    text: 'Всё аккуратно. Единственное — счёт на юрлицо готовили два дня, хотелось бы быстрее.',
    status: 'APPROVED',
    daysAgo: 57,
    avatar: true,
  },
  {
    name: 'Пётр Игнатьев',
    rating: 5,
    text: 'Ремонтировали чужой монтаж: предыдущие мастера не сделали уклон дренажа, и текло на подоконник два сезона. Переделали за полдня, больше не течёт.',
    status: 'APPROVED',
    daysAgo: 63,
    photo: true,
  },
  {
    name: 'Анна',
    rating: 5,
    text: 'Тихий, как и обещали. Ночью не слышно вообще.',
    status: 'APPROVED',
    daysAgo: 68,
  },
  {
    name: 'Тимур Хайруллин',
    rating: 5,
    text: 'Заказывал канальный за подвесной потолок в салон. Приехали с проектом, согласовали трассы с электриком, сделали за два дня и убрали за собой.',
    status: 'APPROVED',
    daysAgo: 79,
    photo: true,
    avatar: true,
  },
  {
    name: 'Галина Петровна',
    rating: 5,
    text: 'Обслуживают нас третий год по договору. Приезжают сами, напоминать не приходится.',
    status: 'APPROVED',
    daysAgo: 88,
  },
  {
    name: 'Егор',
    rating: 4,
    text: 'Нормально всё. Мастер немного опоздал, но позвонил заранее.',
    status: 'PENDING',
    daysAgo: 3,
  },
  {
    name: 'Кондиционеры оптом дёшево',
    rating: 5,
    text: 'Оптовые поставки климатической техники по всей России, звоните прямо сейчас, скидки только сегодня!',
    status: 'REJECTED',
    daysAgo: 9,
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
    phone2: '+7 (900) 000-01-08',
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
    phone2: '+7 (4872) 00-01-04',
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
        /* Модель совпадает с той, что списана со склада в этот же наряд
           (`split-09-invertor`): в наряде стоял Haier, а списывался Electrolux,
           и стенд выглядел так, будто учёт техники ни к чему не привязан. */
        equip: 'CONDITIONER',
        model: 'Electrolux EACS/I-09HAT',
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
    /* Первый монтаж, о котором говорят и комментарий менеджера в заявке, и
       отзыв: без него у клиентки был единственный наряд `CANCELLED`, а
       менеджер в заявке писал «поставили, клиент доволен». */
    type: 'INSTALL',
    status: 'DONE',
    clientKey: 'kuznecova',
    installerLogin: 'panov',
    dayDelta: -46,
    time: '10:00',
    durationMin: 300,
    address: 'Щёкино, ул. Советская, 14',
    floor: 3,
    payment: 'CASH_TO_INSTALLER',
    price: 41200,
    installerFee: 7500,
    comment: 'Штробление по бетону, трасса 5 метров. Первый блок, в гостиную.',
    units: [
      {
        equip: 'CONDITIONER',
        model: 'Hisense AS-09HR4SYDDJ',
        source: 'OURS',
        trassaM: 5,
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
  /* 🔴 Задаётся у каждого дела, а не берётся из умолчания схемы: без своей
     длительности монтаж на весь день рисуется часовой полоской, и часовая
     сетка календаря на стенде показывает не то, что на ней проверяют
     (ADR-128). */
  readonly durationMin: number;
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
    durationMin: 30,
    clientName: 'Антон',
    clientPhone: '+7 (900) 000-03-01',
    note: 'Спрашивал про трассу 7 метров и штробление. Просрочено — перезвонить.',
    leadIndex: 2,
  },
  {
    kind: 'CALL',
    status: 'DONE',
    dayDelta: -1,
    time: '18:30',
    durationMin: 30,
    clientName: 'Федотова Лидия Ивановна',
    clientPhone: '+7 (900) 000-01-08',
    note: 'Согласовали замер на завтра, 10:00.',
    leadIndex: 3,
  },
  {
    kind: 'SERVICE',
    status: 'PLANNED',
    dayDelta: 0,
    time: '13:00',
    durationMin: 180,
    clientName: 'ООО «Ромашка»',
    clientPhone: '+7 (4872) 00-01-04',
    address: 'Тула, проспект Ленина, 85, 4 этаж',
    note: 'Чистка четырёх блоков, пропуск на Марину.',
    leadIndex: 1,
  },
  {
    kind: 'CALL',
    status: 'PLANNED',
    dayDelta: 0,
    time: '19:00',
    durationMin: 30,
    clientName: 'Жуков Кирилл',
    clientPhone: '+7 (900) 000-01-10',
    note: 'Новая заявка с сайта, просил звонить после 18:00.',
    leadIndex: 0,
  },
  {
    kind: 'MEASURE',
    status: 'PLANNED',
    dayDelta: 1,
    time: '10:00',
    durationMin: 60,
    clientName: 'Федотова Лидия Ивановна',
    clientPhone: '+7 (900) 000-01-08',
    address: 'Тула, ул. Кирова, 12, кв. 9',
    note: 'Второй этаж, балкон. Посмотреть, куда вешать наружный блок.',
    leadIndex: 3,
  },
  {
    kind: 'INSTALL',
    status: 'PLANNED',
    dayDelta: 1,
    time: '09:00',
    durationMin: 240,
    clientName: 'Федотова Лидия Ивановна',
    address: 'Тула, ул. Кирова, 12, кв. 9',
    note: 'Монтаж сразу после замера, если всё сойдётся.',
  },
  {
    kind: 'MEETING',
    status: 'PLANNED',
    dayDelta: 2,
    time: '15:00',
    durationMin: 60,
    clientName: 'Поставщик, склад на Одоевском',
    clientPhone: '+7 (4872) 00-03-02',
    address: 'Тула, Одоевское шоссе, 83',
    note: 'Забрать четыре внутренних блока и кронштейны.',
  },
  {
    kind: 'INSTALL',
    status: 'PLANNED',
    dayDelta: 3,
    time: '10:00',
    durationMin: 240,
    clientName: 'Жуков Кирилл',
    clientPhone: '+7 (900) 000-01-10',
    address: 'Тула, ул. Токарева, 88, кв. 204',
    leadIndex: 0,
  },
  {
    kind: 'NOTE',
    status: 'PLANNED',
    dayDelta: 4,
    time: '09:00',
    durationMin: 15,
    clientName: 'Внутреннее',
    note: 'Заказать фреон R32, остался один баллон.',
  },
  {
    kind: 'INSTALL',
    status: 'PLANNED',
    dayDelta: 5,
    time: '11:00',
    durationMin: 420,
    clientName: 'Новиков Станислав',
    clientPhone: '+7 (900) 000-01-07',
    address: 'Новомосковск, ул. Комсомольская, 40',
    note: 'Два блока, выезд на весь день.',
    leadIndex: 4,
  },
  {
    kind: 'SERVICE',
    status: 'PLANNED',
    dayDelta: 8,
    time: '12:00',
    durationMin: 180,
    clientName: 'Салон «Аврора»',
    clientPhone: '+7 (4872) 00-01-09',
    address: 'Тула, ул. Советская, 47',
    note: 'Плановое ТО по договору, второй раз за год.',
  },
  {
    kind: 'CALL',
    status: 'PLANNED',
    dayDelta: 12,
    time: '10:00',
    durationMin: 30,
    clientName: 'Сергеев Павел',
    clientPhone: '8 900 000 01 02',
    note: 'Напомнить про ТО следующей весной — договаривались заранее.',
  },
  {
    kind: 'INSTALL',
    status: 'DONE',
    dayDelta: -12,
    time: '09:00',
    durationMin: 360,
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
    durationMin: 60,
    clientName: 'Кузнецова Ирина',
    clientPhone: '9000000103',
    address: 'Щёкино, ул. Советская, 14',
    note: 'Отменили: клиент отложил второй блок до следующего лета.',
    leadIndex: 8,
  },
  {
    kind: 'SERVICE',
    status: 'DONE',
    dayDelta: -6,
    time: '15:00',
    durationMin: 90,
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

// ---------- Склад ----------

/**
 * Номенклатура списана с реальных прайсов профильных поставщиков (CRM.md
 * §11.1). Это демо-данные стенда, а не справочник в коде: владелец заводит
 * свои позиции сам, и здесь они лежат только чтобы раздел было на чём
 * смотреть.
 */
type DemoZone = {
  readonly key: string;
  readonly kind: 'WAREHOUSE' | 'VAN';
  readonly name: string;
  readonly staffLogin?: string;
};

const stockZones: readonly DemoZone[] = [
  { key: 'garage', kind: 'WAREHOUSE', name: 'Гараж на Оборонной' },
  { key: 'van-zaharov', kind: 'VAN', name: 'Газель Захарова', staffLogin: 'zaharov' },
  { key: 'van-mironov', kind: 'VAN', name: 'Кадди Миронова', staffLogin: 'mironov' },
  { key: 'van-panov', kind: 'VAN', name: 'Ларгус Панова', staffLogin: 'panov' },
];

type DemoStockItem = {
  readonly key: string;
  readonly name: string;
  readonly group: string;
  readonly unit:
    'PIECE' | 'METER' | 'KILOGRAM' | 'LITER' | 'PAIR' | 'PACK' | 'COIL' | 'ROLL' | 'CYLINDER';
  readonly minQty: number;
  readonly note?: string;
  readonly productSlug?: string;
};

const stockItems: readonly DemoStockItem[] = [
  {
    key: 'truba-14',
    name: 'Труба медная 1/4″ (6,35), отожжённая',
    group: 'Медная труба',
    unit: 'METER',
    minQty: 50,
  },
  {
    key: 'truba-38',
    name: 'Труба медная 3/8″ (9,52), отожжённая',
    group: 'Медная труба',
    unit: 'METER',
    minQty: 50,
  },
  {
    key: 'truba-12',
    name: 'Труба медная 1/2″ (12,7), отожжённая',
    group: 'Медная труба',
    unit: 'METER',
    minQty: 20,
    note: 'Берём только под «восемнадцатые» и канальные.',
  },
  {
    key: 'izol-9',
    name: 'Теплоизоляция трубок, стенка 9 мм',
    group: 'Теплоизоляция',
    unit: 'METER',
    minQty: 60,
  },
  {
    key: 'drenazh-16',
    name: 'Дренажный шланг 16 мм',
    group: 'Дренаж',
    unit: 'METER',
    minQty: 40,
  },
  {
    key: 'kabel-4',
    name: 'Кабель межблочный 4×1,5',
    group: 'Кабель',
    unit: 'METER',
    minQty: 50,
  },
  {
    key: 'kronshteyn',
    name: 'Кронштейны наружного блока 450×500',
    group: 'Кронштейны',
    unit: 'PAIR',
    minQty: 4,
  },
  {
    key: 'anker',
    name: 'Анкер клиновой 10×100',
    group: 'Крепёж',
    unit: 'PIECE',
    minQty: 100,
  },
  {
    key: 'korob-60',
    name: 'Короб ПВХ 60×60',
    group: 'Короб ПВХ',
    unit: 'METER',
    minQty: 20,
  },
  {
    key: 'freon-32',
    name: 'Фреон R32',
    group: 'Фреон',
    unit: 'KILOGRAM',
    minQty: 5,
    note: 'Баллон 9,5 кг. Остаток меряем по весам, отсюда дробные числа.',
  },
  {
    key: 'freon-410',
    name: 'Фреон R410A',
    group: 'Фреон',
    unit: 'KILOGRAM',
    minQty: 5,
  },
  {
    key: 'azot',
    name: 'Азот для опрессовки',
    group: 'Газы',
    unit: 'CYLINDER',
    minQty: 1,
  },
  {
    key: 'skotch',
    name: 'Скотч армированный',
    group: 'Расходная мелочь',
    unit: 'ROLL',
    minQty: 5,
  },
  {
    key: 'maslo',
    name: 'Масло для вакуумного насоса',
    group: 'Расходная мелочь',
    unit: 'LITER',
    minQty: 1,
  },
  {
    /* Техника: позиция ссылается на модель каталога. Витрина от остатка не
       зависит (ADR-134) — модель продаётся и при нулевом складе. */
    key: 'split-09-invertor',
    name: 'Сплит-система 09, инвертор',
    group: 'Техника',
    unit: 'PIECE',
    minQty: 0,
    productSlug: 'split-sistema-09-invertor',
  },
];

/**
 * Остаток — сумма движений (ADR-134), поэтому на стенде лежат именно движения,
 * а не проставленные числа. Три состояния показаны нарочно: обычный остаток,
 * позиция ниже порога заказа и уход в минус — он не запрещён, а помечен.
 */
type DemoMove = {
  readonly itemKey: string;
  readonly kind: 'INCOME' | 'TRANSFER' | 'CONSUME' | 'RETURN' | 'COUNT';
  readonly qty: number;
  readonly fromZoneKey?: string;
  readonly toZoneKey?: string;
  readonly orderIndex?: number;
  readonly serials?: string;
  readonly reason?: string;
  readonly authorLogin?: string;
  readonly daysAgo: number;
};

const stockMoves: readonly DemoMove[] = [
  /* Закупка сезона: всё пришло в гараж. */
  { itemKey: 'truba-14', kind: 'INCOME', qty: 150, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'truba-38', kind: 'INCOME', qty: 150, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'truba-12', kind: 'INCOME', qty: 50, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'izol-9', kind: 'INCOME', qty: 300, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'drenazh-16', kind: 'INCOME', qty: 200, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'kabel-4', kind: 'INCOME', qty: 200, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'kronshteyn', kind: 'INCOME', qty: 20, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'anker', kind: 'INCOME', qty: 400, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'korob-60', kind: 'INCOME', qty: 90, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'freon-32', kind: 'INCOME', qty: 19, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'freon-410', kind: 'INCOME', qty: 9.5, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'azot', kind: 'INCOME', qty: 2, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'skotch', kind: 'INCOME', qty: 24, toZoneKey: 'garage', daysAgo: 60 },
  { itemKey: 'maslo', kind: 'INCOME', qty: 4, toZoneKey: 'garage', daysAgo: 60 },
  {
    itemKey: 'split-09-invertor',
    kind: 'INCOME',
    qty: 3,
    toZoneKey: 'garage',
    serials: 'JP2401-0071, JP2401-0072, JP2401-0089',
    daysAgo: 34,
  },

  /* Утро понедельника: загрузили машины. */
  {
    itemKey: 'truba-14',
    kind: 'TRANSFER',
    qty: 30,
    fromZoneKey: 'garage',
    toZoneKey: 'van-zaharov',
    daysAgo: 14,
  },
  {
    itemKey: 'truba-38',
    kind: 'TRANSFER',
    qty: 30,
    fromZoneKey: 'garage',
    toZoneKey: 'van-zaharov',
    daysAgo: 14,
  },
  {
    itemKey: 'izol-9',
    kind: 'TRANSFER',
    qty: 60,
    fromZoneKey: 'garage',
    toZoneKey: 'van-zaharov',
    daysAgo: 14,
  },
  {
    itemKey: 'drenazh-16',
    kind: 'TRANSFER',
    qty: 40,
    fromZoneKey: 'garage',
    toZoneKey: 'van-zaharov',
    daysAgo: 14,
  },
  {
    itemKey: 'kronshteyn',
    kind: 'TRANSFER',
    qty: 4,
    fromZoneKey: 'garage',
    toZoneKey: 'van-zaharov',
    daysAgo: 14,
  },
  {
    itemKey: 'freon-32',
    kind: 'TRANSFER',
    qty: 4.5,
    fromZoneKey: 'garage',
    toZoneKey: 'van-zaharov',
    daysAgo: 14,
  },
  {
    itemKey: 'truba-14',
    kind: 'TRANSFER',
    qty: 25,
    fromZoneKey: 'garage',
    toZoneKey: 'van-mironov',
    daysAgo: 13,
  },
  {
    itemKey: 'izol-9',
    kind: 'TRANSFER',
    qty: 50,
    fromZoneKey: 'garage',
    toZoneKey: 'van-mironov',
    daysAgo: 13,
  },
  {
    itemKey: 'kabel-4',
    kind: 'TRANSFER',
    qty: 40,
    fromZoneKey: 'garage',
    toZoneKey: 'van-mironov',
    daysAgo: 13,
  },
  {
    itemKey: 'anker',
    kind: 'TRANSFER',
    qty: 40,
    fromZoneKey: 'garage',
    toZoneKey: 'van-panov',
    daysAgo: 12,
  },
  {
    itemKey: 'korob-60',
    kind: 'TRANSFER',
    qty: 20,
    fromZoneKey: 'garage',
    toZoneKey: 'van-panov',
    daysAgo: 12,
  },

  /* Выполненные наряды списали израсходованное. */
  {
    itemKey: 'truba-14',
    kind: 'CONSUME',
    qty: 4,
    fromZoneKey: 'van-zaharov',
    orderIndex: 4,
    authorLogin: 'zaharov',
    daysAgo: 12,
  },
  {
    itemKey: 'truba-38',
    kind: 'CONSUME',
    qty: 4,
    fromZoneKey: 'van-zaharov',
    orderIndex: 4,
    authorLogin: 'zaharov',
    daysAgo: 12,
  },
  {
    itemKey: 'izol-9',
    kind: 'CONSUME',
    qty: 8,
    fromZoneKey: 'van-zaharov',
    orderIndex: 4,
    authorLogin: 'zaharov',
    daysAgo: 12,
  },
  {
    itemKey: 'kronshteyn',
    kind: 'CONSUME',
    qty: 1,
    fromZoneKey: 'van-zaharov',
    orderIndex: 4,
    authorLogin: 'zaharov',
    daysAgo: 12,
  },
  {
    itemKey: 'freon-32',
    kind: 'CONSUME',
    qty: 0.35,
    fromZoneKey: 'van-zaharov',
    orderIndex: 4,
    authorLogin: 'zaharov',
    daysAgo: 12,
  },
  {
    itemKey: 'truba-14',
    kind: 'CONSUME',
    qty: 5,
    fromZoneKey: 'van-mironov',
    orderIndex: 5,
    authorLogin: 'mironov',
    daysAgo: 6,
  },
  {
    itemKey: 'izol-9',
    kind: 'CONSUME',
    qty: 10,
    fromZoneKey: 'van-mironov',
    orderIndex: 5,
    authorLogin: 'mironov',
    daysAgo: 6,
  },
  {
    itemKey: 'kabel-4',
    kind: 'CONSUME',
    qty: 6,
    fromZoneKey: 'van-mironov',
    orderIndex: 5,
    authorLogin: 'mironov',
    daysAgo: 6,
  },
  {
    itemKey: 'korob-60',
    kind: 'CONSUME',
    qty: 6,
    fromZoneKey: 'van-panov',
    orderIndex: 6,
    authorLogin: 'panov',
    daysAgo: 20,
  },
  {
    itemKey: 'anker',
    kind: 'CONSUME',
    qty: 8,
    fromZoneKey: 'van-panov',
    orderIndex: 6,
    authorLogin: 'panov',
    daysAgo: 20,
  },
  {
    itemKey: 'split-09-invertor',
    kind: 'CONSUME',
    qty: 1,
    fromZoneKey: 'garage',
    orderIndex: 4,
    serials: 'JP2401-0071',
    authorLogin: 'zaharov',
    daysAgo: 12,
  },

  /* Привезли обратно неизрасходованное. */
  {
    itemKey: 'drenazh-16',
    kind: 'RETURN',
    qty: 6,
    toZoneKey: 'garage',
    orderIndex: 5,
    reason: 'Остаток с объекта, трасса вышла короче',
    authorLogin: 'mironov',
    daysAgo: 6,
  },

  /* Расход, которого никто не записал: минус в машине Панова. Уход в минус не
     запрещён — это сигнал «пора провести инвентаризацию» (ADR-134). */
  {
    itemKey: 'korob-60',
    kind: 'CONSUME',
    qty: 16,
    fromZoneKey: 'van-panov',
    orderIndex: 3,
    authorLogin: 'panov',
    daysAgo: 1,
  },

  /* Правка руками — но движением с основанием, а не переписыванием числа. */
  {
    itemKey: 'freon-32',
    kind: 'COUNT',
    qty: -1.2,
    toZoneKey: 'garage',
    reason: 'Пересчитали баллоны по весам: расхождение с прошлой заправки',
    daysAgo: 4,
  },
  {
    itemKey: 'skotch',
    kind: 'COUNT',
    qty: -21,
    toZoneKey: 'garage',
    reason: 'Инвентаризация после сезона: часть мотков израсходована без записи',
    daysAgo: 4,
  },

  /* R410A ушёл на дозаправку длинных трасс и упал ниже порога заказа:
     состояние «пора заказывать» обязано быть видно на стенде. */
  {
    itemKey: 'freon-410',
    kind: 'CONSUME',
    qty: 2.8,
    fromZoneKey: 'garage',
    orderIndex: 6,
    authorLogin: 'panov',
    daysAgo: 20,
  },
  {
    itemKey: 'freon-410',
    kind: 'CONSUME',
    qty: 2.4,
    fromZoneKey: 'garage',
    orderIndex: 7,
    authorLogin: 'zaharov',
    daysAgo: 27,
  },
];

// ---------- Техника у клиентов ----------

/**
 * Что у человека уже стоит. Раздел живёт с первого дня, но пустым на стенде
 * его нельзя было ни посмотреть, ни принять.
 *
 * 🔴 Гарантия хранится датой, а не сроком: сроки в настройках владелец меняет,
 * а обещание конкретному человеку меняться не имеет права (schema.prisma).
 * Отсюда три состояния на стенде: гарантия действует, гарантия кончилась и
 * гарантии нет вовсе — техника поставлена не нами.
 */
type DemoClientUnit = {
  readonly clientKey: string;
  readonly model: string;
  readonly installedDaysAgo: number;
  /** Дней гарантии от установки. `null` — ставили не мы, гарантии нет. */
  readonly warrantyDays: number | null;
  /** Наряд, из которого выросла техника, по месту в списке нарядов. */
  readonly orderIndex?: number;
  readonly photo?: boolean;
};

const clientUnits: readonly DemoClientUnit[] = [
  {
    clientKey: 'orlova',
    model: 'Electrolux EACS/I-09HAT',
    installedDaysAgo: 55,
    warrantyDays: 1095,
    orderIndex: 8,
    photo: true,
  },
  {
    clientKey: 'orlova',
    model: 'Haier AS12TL4HRA',
    installedDaysAgo: 55,
    warrantyDays: 1095,
    orderIndex: 8,
  },
  {
    clientKey: 'demin',
    model: 'Electrolux EACS/I-09HAT',
    installedDaysAgo: 12,
    warrantyDays: 1095,
    orderIndex: 4,
    photo: true,
  },
  {
    clientKey: 'kuznecova',
    model: 'Hisense AS-09HR4SYDDJ',
    installedDaysAgo: 46,
    warrantyDays: 1095,
    orderIndex: 9,
  },
  {
    // гарантия кончилась: ставили в 2023-м, на стенде должно быть видно и это
    clientKey: 'sergeev',
    model: 'Ballu BSWI-09HN8',
    installedDaysAgo: 940,
    warrantyDays: 365,
  },
  {
    clientKey: 'salon',
    model: 'Канальный блок Tosot T24H',
    installedDaysAgo: 430,
    warrantyDays: 1095,
  },
  {
    clientKey: 'salon',
    model: 'Канальный блок Tosot T24H',
    installedDaysAgo: 430,
    warrantyDays: 1095,
  },
  {
    // техника клиента: ставили не мы, гарантии нет — только ремонт по счёту
    clientKey: 'belyaeva',
    model: 'Zanussi ZACS-09',
    installedDaysAgo: 870,
    warrantyDays: null,
  },
];

// ---------- Выезд: чеклист, снимки, документы, история ----------

/**
 * Чеклист выезда. Часть пунктов собрана из позиций наряда (`own: false`),
 * часть дописана человеком (`own: true`) — пересборка сохраняет только
 * вторые, и разница обязана быть видна на стенде.
 */
type DemoChecklistItem = {
  readonly orderIndex: number;
  readonly text: string;
  readonly done: boolean;
  readonly own: boolean;
};

const checklist: readonly DemoChecklistItem[] = [
  {
    orderIndex: 1,
    text: 'Кондиционер Ballu BSWI-07HN8 — внутренний блок',
    done: false,
    own: false,
  },
  { orderIndex: 1, text: 'Трасса 3 м, 1/4–3/8', done: false, own: false },
  { orderIndex: 1, text: 'Показать пульт и режимы, клиент пожилой', done: false, own: true },
  { orderIndex: 3, text: 'Блок 1 — чистка теплообменника', done: true, own: false },
  { orderIndex: 3, text: 'Блок 2 — чистка теплообменника', done: true, own: false },
  { orderIndex: 3, text: 'Блок 3 — чистка теплообменника', done: false, own: false },
  { orderIndex: 3, text: 'Блок 4 — чистка теплообменника', done: false, own: false },
  { orderIndex: 3, text: 'Забрать пропуск на вахте у Марины', done: true, own: true },
];

/** Снимки объекта: «до» ставит владелец, «после» — монтажник (CRM.md §9). */
type DemoOrderPhoto = {
  readonly orderIndex: number;
  readonly stage: 'BEFORE' | 'AFTER';
  readonly title: string;
};

const orderPhotos: readonly DemoOrderPhoto[] = [
  { orderIndex: 1, stage: 'BEFORE', title: 'место установки' },
  { orderIndex: 4, stage: 'BEFORE', title: 'фасад до монтажа' },
  { orderIndex: 4, stage: 'AFTER', title: 'наружный блок' },
  { orderIndex: 4, stage: 'AFTER', title: 'внутренний блок' },
  { orderIndex: 5, stage: 'AFTER', title: 'дренаж после промывки' },
];

/**
 * Приложения к наряду. В отличие от снимков, документы отдаются закрытым
 * маршрутом со сверкой сессии: это договоры с персональными данными клиента.
 */
type DemoOrderDoc = {
  readonly orderIndex: number;
  readonly kind: 'CONTRACT' | 'WARRANTY' | 'ACT' | 'INVOICE' | 'MEASURE' | 'OTHER';
  readonly name: string;
};

const orderDocs: readonly DemoOrderDoc[] = [
  { orderIndex: 4, kind: 'CONTRACT', name: 'Договор № 5 от 14 числа.jpg' },
  { orderIndex: 4, kind: 'ACT', name: 'Акт выполненных работ.jpg' },
  { orderIndex: 6, kind: 'ACT', name: 'Акт ТО.jpg' },
  { orderIndex: 3, kind: 'INVOICE', name: 'Счёт на оплату для ООО «Ромашка».jpg' },
];

/**
 * История наряда: кто и когда менял статус. Автор — учётная запись, поэтому
 * запись переживает увольнение монтажника (`SetNull` в схеме).
 */
type DemoOrderHistory = {
  readonly orderIndex: number;
  readonly authorLogin?: string;
  readonly text: string;
  readonly hoursAgo: number;
};

const orderHistory: readonly DemoOrderHistory[] = [
  { orderIndex: 0, text: 'Наряд заведён из обращения с сайта', hoursAgo: 3 },
  { orderIndex: 1, text: 'Наряд заведён', hoursAgo: 50 },
  { orderIndex: 1, text: 'Назначен исполнитель: Миронов Артём', hoursAgo: 48 },
  { orderIndex: 3, text: 'Назначен исполнитель: Панов Дмитрий', hoursAgo: 30 },
  { orderIndex: 3, authorLogin: 'panov', text: 'Взят в работу', hoursAgo: 2 },
  { orderIndex: 4, text: 'Назначен исполнитель: Захаров Илья', hoursAgo: 15 * 24 },
  { orderIndex: 4, authorLogin: 'zaharov', text: 'Взят в работу', hoursAgo: 12 * 24 },
  {
    orderIndex: 4,
    authorLogin: 'zaharov',
    text: 'Выполнен, оплата наличными принята',
    hoursAgo: 12 * 24 - 6,
  },
  { orderIndex: 6, authorLogin: 'panov', text: 'Выполнен', hoursAgo: 20 * 24 },
  {
    orderIndex: 6,
    text: 'Удержание 500 ₽: опоздание на два часа без предупреждения',
    hoursAgo: 19 * 24,
  },
  {
    orderIndex: 10,
    text: 'Отменён: клиент отложил второй блок до следующего лета',
    hoursAgo: 3 * 24,
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
  /* Значение типизировано входным JSON Prisma, а не `Record<string, unknown>`:
     ровно этот приём убрал приведения `as never` в repo/settings.ts (ADR-108). */
  readonly payload: Prisma.InputJsonObject;
  /** Снимок адреса, по которому сообщение ушло на самом деле (ADR-061). */
  readonly address: string;
};

const notifications: readonly DemoNotification[] = [
  {
    channel: 'telegram',
    address: NOTIFY_TELEGRAM_TO,
    kind: 'lead',
    status: 'SENT',
    hoursAgo: 3,
    attempts: 1,
    payload: {
      kind: 'lead',
      name: 'Жуков Кирилл',
      phone: '+7 (900) 000-01-10',
      topic: 'Установка кондиционера',
    },
  },
  {
    channel: 'email',
    address: NOTIFY_EMAIL_TO,
    kind: 'lead',
    status: 'SENT',
    hoursAgo: 3,
    attempts: 1,
    payload: {
      kind: 'lead',
      name: 'Жуков Кирилл',
      phone: '+7 (900) 000-01-10',
      topic: 'Установка кондиционера',
    },
  },
  {
    channel: 'telegram',
    address: NOTIFY_TELEGRAM_TO,
    kind: 'lead',
    status: 'SENT',
    hoursAgo: 9,
    attempts: 2,
    payload: { kind: 'lead', name: 'Марина', phone: '+7 (4872) 00-01-04', topic: 'Обслуживание' },
  },
  {
    channel: 'email',
    address: NOTIFY_EMAIL_TO,
    kind: 'lead',
    status: 'FAILED',
    hoursAgo: 9,
    attempts: 5,
    lastError: 'SMTP 421: соединение закрыто сервером после трёх попыток подряд',
    payload: { kind: 'lead', name: 'Марина', phone: '+7 (4872) 00-01-04', topic: 'Обслуживание' },
  },
  {
    channel: 'telegram',
    address: NOTIFY_TELEGRAM_TO,
    kind: 'review',
    status: 'SENT',
    hoursAgo: 26,
    attempts: 1,
    payload: { kind: 'review', name: 'Станислав', rating: 4 },
  },
  {
    channel: 'telegram',
    address: NOTIFY_TELEGRAM_TO,
    kind: 'to-reminder',
    status: 'SENT',
    hoursAgo: 50,
    attempts: 1,
    payload: { kind: 'to-reminder', phone: '8 900 000 01 02', when: 'Весной' },
  },
  {
    channel: 'telegram',
    address: NOTIFY_TELEGRAM_TO,
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
  /* Движения первыми: они ссылаются и на позиции, и на зоны, и на наряды. */
  await prisma.stockMovement.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.stockZone.deleteMany();
  await prisma.orderChecklistItem.deleteMany();
  await prisma.orderPhoto.deleteMany();
  await prisma.orderDocument.deleteMany();
  await prisma.orderHistory.deleteMany();
  await prisma.orderUnit.deleteMany();
  await prisma.order.deleteMany();
  await prisma.dayBlock.deleteMany();
  await prisma.crmEvent.deleteMany();
  await prisma.installerNote.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.review.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.clientUnit.deleteMany();
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
  for (const row of await prisma.orderPhoto.findMany({ select: { url: true } })) take(row.url);
  for (const row of await prisma.clientUnit.findMany({ select: { photo: true } })) take(row.photo);

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

  /* Приложения к нарядам лежат отдельной папкой, и в базе у них имя файла, а
     не адрес: без своего прохода каждый прогон оставлял бы там прежний
     комплект договоров. */
  const docsDir = join(UPLOADS_DIR, DOCS_SUBDIR);
  const docNames = await readdir(docsDir).catch(() => [] as string[]);
  const docsReferenced = new Set(
    (await prisma.orderDocument.findMany({ select: { url: true } })).map((row) => row.url),
  );

  for (const name of docNames) {
    if (!generated.test(name) || docsReferenced.has(name)) continue;
    await rm(join(docsDir, name), { force: true });
    removed += 1;
  }

  if (removed > 0) console.error(`  файлов без карточек убрано: ${removed}`);
}

/** Приведение телефона к ключу дедупликации — та же логика, что в `shared/lib/phone`. */
function phoneKeyOf(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
  if (digits.length === 10) return `7${digits}`;
  return digits;
}

/**
 * Вход в панель после наполнения стенда.
 *
 * 🔴 Демо-сид заводит только монтажников: владельца создаёт базовый `seed.ts`
 * из `ADMIN_LOGIN` и `ADMIN_PASSWORD_HASH`, а `migrate reset` его стирает.
 * Последовательность «reset → seed:demo» оставляет стенд без единого входа в
 * панель, и молчала она до самой страницы логина: каталог, наряды и склад на
 * месте, войти некем (ADR-154).
 *
 * Проверка идёт последней, а не первой: на чистой базе владельца нет
 * законно, и отказываться работать здесь не за что — сказать нужно ровно
 * тогда, когда человек читает итог.
 */
async function warnIfNoOwner(): Promise<void> {
  if ((await prisma.adminUser.count({ where: { role: 'OWNER' } })) > 0) return;

  console.error('');
  console.error('🔴 Владельца в базе нет — войти в панель сейчас невозможно.');
  console.error('   Демо-сид заводит только монтажников. Владельца создаёт базовый сид:');
  console.error('     docker compose -f docker-compose.dev.yml exec -T web pnpm --filter web seed');
  console.error('   Порядок после сброса базы: migrate reset → seed → seed:demo.');
}

async function main(): Promise<void> {
  assertNotProduction();

  console.error('Чищу прежние демо-данные…');
  await wipe();
  await sweepOrphans();

  console.error('Настройки компании…');
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  console.error('Прайс на монтаж…');
  for (const [index, row] of prices.entries()) {
    await prisma.priceRow.create({ data: { ...row, sort: index } });
  }

  console.error('Каталог…');
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

  console.error('Статьи…');
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

  console.error('Команда…');
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

  console.error('Клиенты…');
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

  console.error('Обращения…');
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

  console.error('Отзывы…');
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

  console.error('Наряды…');
  /* Списание материалов ссылается на наряд по его месту в списке. */
  const orderIds: string[] = [];

  for (const [index, order] of orders.entries()) {
    const clientId = clientIds.get(order.clientKey);
    if (clientId === undefined) throw new Error(`Нет клиента ${order.clientKey} для наряда`);

    const createdOrder = await prisma.order.create({
      data: {
        number: index + 1,
        type: order.type,
        status: order.status,
        clientId,
        installerId:
          order.installerLogin === undefined ? null : (staffIds.get(order.installerLogin) ?? null),
        at: at(order.dayDelta, order.time),
        durationMin: order.durationMin,
        // считаем тем же расчётом, что панель при сохранении (ADR-128, ADR-138)
        overtimeMin: overtimeFor(at(order.dayDelta, order.time), order.durationMin),
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

    orderIds.push(createdOrder.id);
  }

  /* Счётчик номеров догоняет заведённые наряды: следующий, созданный из
     панели, обязан продолжить нумерацию, а не начать с единицы заново. */
  await prisma.setting.upsert({
    where: { key: 'orderSeq' },
    create: { key: 'orderSeq', value: orders.length },
    update: { value: orders.length },
  });

  /* Автор записи по умолчанию — владелец: закупку, инвентаризацию и правки
     наряда из панели делает он. */
  const owner = await prisma.adminUser.findFirst({ where: { role: 'OWNER' } });

  console.error('Техника у клиентов…');
  for (const unit of clientUnits) {
    const clientId = clientIds.get(unit.clientKey);
    if (clientId === undefined) throw new Error(`Нет клиента ${unit.clientKey} для техники`);

    await prisma.clientUnit.create({
      data: {
        clientId,
        model: unit.model,
        installedAt: daysAgo(unit.installedDaysAgo),
        warrantyUntil:
          unit.warrantyDays === null ? null : daysAgo(unit.installedDaysAgo - unit.warrantyDays),
        photo:
          unit.photo === true
            ? await makeImage({
                title: 'техника клиента',
                subtitle: unit.model,
                from: '#0369a1',
                to: '#0f172a',
                width: 1000,
                height: 750,
              })
            : null,
        orderId: unit.orderIndex === undefined ? null : (orderIds[unit.orderIndex] ?? null),
      },
    });
  }

  console.error('Выезд: чеклист, снимки, документы, история…');
  for (const [index, item] of checklist.entries()) {
    const orderId = orderIds[item.orderIndex];
    if (orderId === undefined) throw new Error(`Нет наряда ${item.orderIndex} для чеклиста`);

    await prisma.orderChecklistItem.create({
      data: { orderId, text: item.text, done: item.done, own: item.own, sort: index },
    });
  }

  for (const [index, photo] of orderPhotos.entries()) {
    const orderId = orderIds[photo.orderIndex];
    if (orderId === undefined) throw new Error(`Нет наряда ${photo.orderIndex} для снимка`);

    await prisma.orderPhoto.create({
      data: {
        orderId,
        stage: photo.stage,
        url: await makeImage({
          title: photo.title,
          subtitle: photo.stage === 'BEFORE' ? 'до выезда' : 'после работ',
          from: photo.stage === 'BEFORE' ? '#475569' : '#0f766e',
          to: '#0f172a',
          width: 1000,
          height: 750,
        }),
        sort: index,
      },
    });
  }

  for (const doc of orderDocs) {
    const orderId = orderIds[doc.orderIndex];
    if (orderId === undefined) throw new Error(`Нет наряда ${doc.orderIndex} для документа`);

    const file = await makeDocument(doc.name.replace(/\.[a-z]+$/, ''), 'ТулаКлимат');
    await prisma.orderDocument.create({
      data: {
        orderId,
        kind: doc.kind,
        name: doc.name,
        // в `url` лежит имя файла на диске, а не адрес: наружу документ
        // выходит только закрытым маршрутом
        url: file.filename,
        sizeBytes: file.sizeBytes,
      },
    });
  }

  for (const entry of orderHistory) {
    const orderId = orderIds[entry.orderIndex];
    if (orderId === undefined) throw new Error(`Нет наряда ${entry.orderIndex} для истории`);

    await prisma.orderHistory.create({
      data: {
        orderId,
        authorId:
          entry.authorLogin === undefined
            ? (owner?.id ?? null)
            : (staffIds.get(entry.authorLogin) ?? null),
        text: entry.text,
        createdAt: hoursAgo(entry.hoursAgo),
      },
    });
  }

  console.error('Склад…');
  const zoneIds = new Map<string, string>();
  for (const [index, zone] of stockZones.entries()) {
    const userId = zone.staffLogin === undefined ? null : (staffIds.get(zone.staffLogin) ?? null);
    const created = await prisma.stockZone.create({
      data: { kind: zone.kind, name: zone.name, userId, sort: index },
    });

    zoneIds.set(zone.key, created.id);
  }

  const stockItemIds = new Map<string, string>();
  for (const item of stockItems) {
    const productId =
      item.productSlug === undefined
        ? null
        : ((await prisma.product.findUnique({ where: { slug: item.productSlug } }))?.id ?? null);

    const created = await prisma.stockItem.create({
      data: {
        name: item.name,
        group: item.group,
        unit: item.unit,
        minQty: item.minQty,
        note: item.note ?? null,
        productId,
      },
    });

    stockItemIds.set(item.key, created.id);
  }

  for (const move of stockMoves) {
    const itemId = stockItemIds.get(move.itemKey);
    if (itemId === undefined) throw new Error(`Нет позиции склада ${move.itemKey}`);

    const authorId =
      move.authorLogin === undefined
        ? (owner?.id ?? null)
        : (staffIds.get(move.authorLogin) ?? null);

    const orderId = move.orderIndex === undefined ? null : (orderIds[move.orderIndex] ?? null);

    await prisma.stockMovement.create({
      data: {
        itemId,
        kind: move.kind,
        qty: move.qty,
        fromZoneId: move.fromZoneKey === undefined ? null : (zoneIds.get(move.fromZoneKey) ?? null),
        toZoneId: move.toZoneKey === undefined ? null : (zoneIds.get(move.toZoneKey) ?? null),
        orderId,
        serials: move.serials ?? null,
        reason: move.reason ?? null,
        authorId,
        createdAt: daysAgo(move.daysAgo),
      },
    });
  }

  console.error('Календарь…');
  for (const event of events) {
    await prisma.crmEvent.create({
      data: {
        kind: event.kind,
        status: event.status,
        at: at(event.dayDelta, event.time),
        durationMin: event.durationMin,
        overtimeMin: overtimeFor(at(event.dayDelta, event.time), event.durationMin),
        clientName: event.clientName,
        clientPhone: event.clientPhone ?? null,
        address: event.address ?? null,
        note: event.note ?? null,
        leadId: event.leadIndex === undefined ? null : (leadIds[event.leadIndex] ?? null),
      },
    });
  }

  console.error('Занятость…');
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

  console.error('Журнал доставки…');
  for (const item of notifications) {
    await prisma.notification.create({
      data: {
        channel: item.channel,
        kind: item.kind,
        payload: item.payload,
        // куда сообщение ушло на самом деле — снимок, а не ссылка (ADR-061)
        address: item.address,
        status: item.status,
        attempts: item.attempts,
        lastError: item.lastError ?? null,
        nextTryAt: hoursAgo(item.hoursAgo),
        createdAt: hoursAgo(item.hoursAgo),
        sentAt: item.status === 'SENT' ? hoursAgo(item.hoursAgo) : null,
      },
    });
  }

  console.error('');
  console.error('Готово. На стенде теперь:');
  console.error(`  каталог — ${products.length} моделей, прайс — ${prices.length} строк`);
  console.error(`  статьи — ${articles.length} (одна черновиком)`);
  console.error(`  команда — ${staff.length} монтажников, пароль у всех: ${DEMO_PASSWORD}`);
  console.error(
    `  клиенты — ${clients.length}, обращения — ${leads.length}, отзывы — ${reviews.length}`,
  );
  console.error(
    `  наряды — ${orders.length}, дела календаря — ${events.length}, занятость — ${blocks.length}`,
  );
  console.error(
    `  склад — позиции: ${stockItems.length}, зоны: ${stockZones.length}, движения: ${stockMoves.length}`,
  );
  console.error(
    `  техника у клиентов — ${clientUnits.length}, чеклист — ${checklist.length} пунктов`,
  );
  console.error(
    `  приложения нарядов — снимков ${orderPhotos.length}, документов ${orderDocs.length}, записей истории ${orderHistory.length}`,
  );
  console.error(`  журнал доставки — ${notifications.length} записей`);

  await warnIfNoOwner();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
