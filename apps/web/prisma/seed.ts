/**
 * Сиды. Данные каталога, цен и статей перенесены из дизайн-прототипа
 * (prisma/seed-data.json), данные компании — заведомо заметные заглушки.
 *
 * Два правила, см. docs/PROJECT.md §3:
 *  - отзывы НЕ сидируются: публиковать выдуманные отзывы нельзя;
 *  - заглушки видны глазом, иначе правдоподобный «+7 (4872) 00-00-00»
 *    уедет в прод незаметно и проживёт там год.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TODO = 'ЗАПОЛНИТЕ В АДМИНКЕ';

type SeedSpec = { k: string; v: string };
type SeedModel = {
  id: string;
  badge: string;
  name: string;
  areaMax: number;
  tag: string;
  priceNum: number;
  specs: SeedSpec[];
};
type SeedPrice = { cls: string; power: string; area: string; price: number; term: string };
type SeedArticle = {
  slug: string;
  title: string;
  category: string;
  date: string;
  minutes: number;
  excerpt: string;
  body: string;
};
type SeedData = {
  models: SeedModel[];
  prices: SeedPrice[];
  extras: { trassaPerM: number; shtrobPerM: number; heightWorks: number };
  articles: SeedArticle[];
};

const data = JSON.parse(
  readFileSync(join(process.cwd(), 'prisma', 'seed-data.json'), 'utf-8'),
) as SeedData;

/** Настройки компании. Всё, что в прототипе было выдумано и зашито в разметку. */
const settings: Record<string, unknown> = {
  company: {
    name: TODO,
    legalName: TODO,
    tagline: TODO,
    foundedYear: null,
  },
  contacts: {
    phones: [TODO],
    email: TODO,
    telegram: '',
    whatsapp: '',
    hours: TODO,
    responseTime: TODO,
  },
  address: {
    country: 'RU',
    region: 'Тульская область',
    city: 'Тула',
    street: TODO,
    building: TODO,
    office: '',
    postalCode: TODO,
  },
  geo: { lat: null, lng: null },
  area: {
    served: 'Тула и Тульская область',
    districts: [] as string[],
  },
  legal: {
    form: 'ИП',
    name: TODO,
    inn: TODO,
    ogrn: TODO,
    address: TODO,
  },
  extras: data.extras,
  warranty: { installation: TODO, equipment: TODO },
  payment: { methods: [TODO], vat: TODO },
  social: { links: [] as string[] },
  seo: {
    homeTitle: TODO,
    homeDescription: TODO,
    titleSuffix: TODO,
    ogImage: '',
  },
  /* Полоса цифр первого экрана. Пустая осознанно: «1200 установок» и прочие
     счётчики выполненных работ выдумывать запрещено (инвариант 10) — их
     вносит владелец в админке, отвечая за каждое число. */
  achievements: { items: [] as { value: number; suffix: string; label: string }[] },
  // Клиентские сервисы. Онлайн-чат сознательно не подключается:
  // общение идёт через Telegram по желанию клиента и через заявку (ADR-024).
  integrations: {
    metrikaId: '',
    messengerButtons: { telegram: false, whatsapp: false },
    callback: { enabled: true },
  },
};

const slugFor = (badge: string) => `split-sistema-${badge}`;

async function main() {
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value: value as never },
    });
  }

  for (const [i, p] of data.prices.entries()) {
    await prisma.priceRow.upsert({
      where: { cls: p.cls },
      update: {},
      create: { ...p, sort: i },
    });
  }

  for (const [i, m] of data.models.entries()) {
    const slug = slugFor(m.badge);
    await prisma.product.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        badge: m.badge,
        name: m.name,
        areaMax: m.areaMax,
        tag: m.tag,
        priceNum: m.priceNum,
        visible: true,
        sort: i,
        specs: {
          create: m.specs.map((s, si) => ({ k: s.k, v: s.v, sort: si })),
        },
      },
    });
  }

  for (const a of data.articles) {
    await prisma.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        slug: a.slug,
        title: a.title,
        category: a.category,
        date: new Date(a.date),
        minutes: a.minutes,
        excerpt: a.excerpt,
        body: a.body,
        published: true,
      },
    });
  }

  const login = process.env.ADMIN_LOGIN;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (login && passwordHash && passwordHash !== 'CHANGE_ME') {
    await prisma.adminUser.upsert({
      where: { login },
      update: {},
      create: { login, passwordHash },
    });
  }

  const counts = {
    настройки: await prisma.setting.count(),
    цены: await prisma.priceRow.count(),
    товары: await prisma.product.count(),
    характеристики: await prisma.productSpec.count(),
    статьи: await prisma.article.count(),
    отзывы: await prisma.review.count(),
  };
  console.error('Сиды применены:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
