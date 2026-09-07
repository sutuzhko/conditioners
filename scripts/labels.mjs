#!/usr/bin/env node
/**
 * Словарь ярлыков GitHub — четыре оси разметки задач
 * (issue #695, план `docs/plan-issue-labels-taxonomy.md`).
 *
 * 🔴 Источник правды здесь, а не на GitHub. Новый ярлык приезжает Pull
 * Request'ом и проходит ревью; до этого словарь жил только в вебе и не был
 * описан ни строкой, отчего `ui` и `design`, `data` и `infra` разошлись —
 * граница между ними нигде не записана, и каждый ставил их по-своему.
 *
 * 🔴 Словарь — модуль, а не YAML. Разбор YAML потребовал бы парсера в
 * зависимостях ради одного файла, а карта `путь → ярлык` всё равно нужна
 * коду: из неё генерируется `.github/labeler.yml`. Прецедент в проекте —
 * `scripts/e2e-groups.mjs`, где состав групп тоже лежит замороженным
 * объектом.
 *
 * 🔴 GitHub про оси не знает. Он не помешает поставить две `часть/` или ни
 * одной — это держится проверкой `checkAxes`, а не настройкой репозитория.
 *
 * Запуск:
 *   node scripts/labels.mjs --list        → имена всех ярлыков, по одному в строке
 *   node scripts/labels.mjs --paths       → карта «ярлык → пути» для labeler
 */
import { parseArgs } from 'node:util';

/**
 * Оси разметки. `required` — сколько ярлыков оси обязано стоять на задаче:
 * `one` ровно один, `any` ноль или больше.
 *
 * Цвет один на ось: GitHub рисует ярлыки строкой и оси не показывает, так
 * что группирует их только цвет.
 */
export const AXES = Object.freeze({
  area: { title: 'часть', prefix: 'area/', color: '0366D6', required: 'one' },
  module: { title: 'раздел', prefix: 'module/', color: '0E8A16', required: 'any' },
  kind: { title: 'тип', prefix: 'kind/', color: 'D93F0B', required: 'one' },
  quality: { title: 'качество', prefix: 'quality/', color: '8250DF', required: 'any' },
});

/**
 * Ось «часть» — где в продукте лежит задача. Пути ведут к слоям целиком:
 * раздел уточняется своей осью.
 */
const AREA = {
  'area/site': {
    description: 'Публичные страницы: лендинг, каталог, статьи, отзывы, формы',
    paths: ['apps/web/src/app/(site)/**'],
  },
  'area/panel': {
    description: 'Админка: разделы, оболочка, формы и таблицы панели',
    paths: ['apps/web/src/app/(admin)/**', 'apps/web/src/widgets/admin-*/**'],
  },
  'area/api': {
    description: 'Маршруты, сервисы, доступ к данным, схема БД',
    paths: ['apps/web/src/app/api/**', 'apps/web/src/server/**', 'apps/web/prisma/**'],
  },
  'area/infra': {
    description: 'CI, Docker, сборка, бюджеты, сквозные проверки, наблюдаемость',
    paths: [
      '.github/workflows/**',
      'scripts/**',
      'infra/**',
      'apps/web/e2e/**',
      'docker-compose*.yml',
    ],
  },
  'area/process': {
    description: 'Маршрут задачи: ветки, Pull Request, стенды, хуки, скиллы',
    paths: ['.agents/skills/**', '.husky/**'],
  },
  'area/shared': {
    description: 'Код, служащий сразу сайту и панели: кит, токены, доменные сущности',
    paths: ['apps/web/src/shared/**', 'apps/web/src/entities/**'],
  },
  'area/docs': {
    description: 'ADR, журналы, PRD и планы, PIXEL_SPEC',
    paths: ['docs/**', '*.md'],
  },
};

/**
 * Ось «раздел» — что именно затронуто. Разделов у задачи может быть больше
 * одного, и это норма: расход материалов в наряде — это и `наряды`, и
 * `склад`.
 */
const MODULE = {
  'module/catalog': {
    description: 'Модели кондиционеров: карточки, фотографии, витрина, справочник моделей',
    paths: [
      'apps/web/src/app/(site)/catalog/**',
      'apps/web/src/app/(admin)/admin/(panel)/catalog/**',
      'apps/web/src/app/api/admin/models/**',
      'apps/web/src/entities/product/**',
      'apps/web/src/features/product-form/**',
      'apps/web/src/features/product-photos/**',
      'apps/web/src/widgets/catalog/**',
      'apps/web/src/widgets/admin-catalog/**',
    ],
  },
  'module/specs': {
    description: 'Справочник характеристик и таблица сравнения (инвариант 6)',
    paths: [
      'apps/web/src/app/(admin)/admin/(panel)/catalog/specs/**',
      'apps/web/src/features/specs-dictionary/**',
    ],
  },
  'module/prices': {
    description: 'Цены монтажа, калькулятор сметы, прайс-лист',
    paths: [
      'apps/web/src/app/(admin)/admin/(panel)/prices/**',
      'apps/web/src/app/api/prices/**',
      'apps/web/src/app/api/admin/prices/**',
      'apps/web/src/entities/price/**',
      'apps/web/src/features/prices-form/**',
      'apps/web/src/widgets/pricing/**',
    ],
  },
  'module/discounts': {
    description: 'Действующая цена, период акции, перечёркнутая цена (инвариант 14)',
    paths: ['apps/web/src/features/product-sale/**', 'apps/web/src/app/api/admin/models/*/sale/**'],
  },
  'module/leads': {
    description: 'Заявка с сайта, её обработка в панели, напоминания (инвариант 2)',
    paths: [
      'apps/web/src/app/(admin)/admin/(panel)/leads/**',
      'apps/web/src/app/api/leads/**',
      'apps/web/src/app/api/admin/leads/**',
      'apps/web/src/entities/lead/**',
      'apps/web/src/features/lead-form/**',
      'apps/web/src/features/lead-manager/**',
      'apps/web/src/features/reminder-form/**',
      'apps/web/src/widgets/lead/**',
    ],
  },
  'module/clients': {
    description: 'Карточка клиента и его техника',
    paths: [
      'apps/web/src/app/(admin)/admin/(panel)/clients/**',
      'apps/web/src/app/api/admin/clients/**',
      'apps/web/src/entities/client/**',
      'apps/web/src/features/client-manager/**',
    ],
  },
  'module/orders': {
    description: 'Заказы и наряды: чек-лист, расход, документы, сдача работы',
    paths: [
      'apps/web/src/app/(admin)/admin/(panel)/orders/**',
      'apps/web/src/app/api/admin/orders/**',
      'apps/web/src/entities/order/**',
      'apps/web/src/features/order-manager/**',
    ],
  },
  'module/calendar': {
    description: 'Календарь работ и назначение монтажников. Эталон — Apple Calendar, не HeroUI',
    paths: [
      'apps/web/src/app/(admin)/admin/(panel)/crm/**',
      'apps/web/src/app/api/admin/crm/**',
      'apps/web/src/entities/crm/**',
      'apps/web/src/features/crm-calendar/**',
    ],
  },
  'module/stock': {
    description: 'Позиции, зоны, перемещения, журнал склада',
    paths: [
      'apps/web/src/app/(admin)/admin/(panel)/stock/**',
      'apps/web/src/app/api/admin/stock/**',
      'apps/web/src/entities/stock/**',
      'apps/web/src/features/stock-manager/**',
    ],
  },
  'module/team': {
    description: 'Бригада: карточки, занятость, заработок, заметки',
    paths: [
      'apps/web/src/app/(admin)/admin/(panel)/team/**',
      'apps/web/src/app/api/admin/staff/**',
      'apps/web/src/entities/staff/**',
      'apps/web/src/features/staff-manager/**',
    ],
  },
  'module/reviews': {
    description: 'Отзывы и их модерация (инварианты 7 и 10)',
    paths: [
      'apps/web/src/app/api/reviews/**',
      'apps/web/src/app/(admin)/admin/(panel)/reviews/**',
      'apps/web/src/app/api/admin/reviews/**',
      'apps/web/src/entities/review/**',
      'apps/web/src/features/review-form/**',
      'apps/web/src/features/review-modal/**',
      'apps/web/src/features/review-moderation/**',
      'apps/web/src/widgets/reviews/**',
    ],
  },
  'module/knowledge': {
    description: 'База знаний: статьи, блоки, листинг и страница статьи',
    paths: [
      'apps/web/src/app/(site)/knowledge/**',
      'apps/web/src/app/(admin)/admin/(panel)/knowledge/**',
      'apps/web/src/app/api/admin/articles/**',
      'apps/web/src/app/api/admin/blocks/**',
      'apps/web/src/entities/article/**',
      'apps/web/src/features/article-form/**',
      'apps/web/src/widgets/knowledge/**',
      'apps/web/src/widgets/article/**',
      'apps/web/src/widgets/admin-knowledge/**',
    ],
  },
  'module/settings': {
    description: 'Настройки и данные компании: NAP, реквизиты, готовность (инвариант 8)',
    paths: [
      'apps/web/src/app/(admin)/admin/(panel)/settings/**',
      'apps/web/src/app/(admin)/admin/(panel)/company/**',
      'apps/web/src/app/api/settings/**',
      'apps/web/src/app/api/admin/settings/**',
      'apps/web/src/entities/settings/**',
      'apps/web/src/features/settings-form/**',
    ],
  },
  'module/notifications': {
    description: 'Очередь, воркер, Telegram и SMTP, журнал доставки, получатели',
    paths: [
      'apps/web/src/server/notifications/**',
      'apps/web/src/app/api/admin/notifications/**',
      'apps/web/src/app/api/telegram/**',
      'apps/web/src/features/delivery-log/**',
    ],
  },
  'module/auth': {
    description: 'Вход в панель, сессии, пароль, профиль, права',
    paths: [
      'apps/web/src/app/(admin)/admin/login/**',
      'apps/web/src/app/(admin)/admin/(panel)/profile/**',
      'apps/web/src/app/api/auth/**',
      'apps/web/src/app/api/admin/profile/**',
      'apps/web/src/features/admin-login/**',
      'apps/web/src/features/profile-form/**',
      'apps/web/src/server/auth.ts',
      'apps/web/src/server/repo/sessions.ts',
      'apps/web/src/server/repo/admin-users.ts',
    ],
  },
  'module/landing': {
    description: 'Коммерческие секции главной: первый экран, честность, доверие, FAQ, монтаж',
    paths: [
      'apps/web/src/app/(site)/page.tsx',
      'apps/web/src/widgets/hero/**',
      'apps/web/src/widgets/honesty/**',
      'apps/web/src/widgets/trust/**',
      'apps/web/src/widgets/faq/**',
      'apps/web/src/widgets/installation/**',
      'apps/web/src/widgets/service/**',
      'apps/web/src/widgets/contacts/**',
    ],
  },
  'module/compare': {
    description: 'Страница сравнения моделей',
    paths: ['apps/web/src/app/(site)/compare/**'],
  },
  'module/kit': {
    description: 'UI Kit, токены, витрина Storybook, дизайн-система',
    paths: ['apps/web/src/shared/ui/**', 'apps/web/src/shared/styles/**', 'apps/web/.storybook/**'],
  },
  'module/media': {
    description: 'Загрузка и отдача файлов, изображения, обложки',
    paths: ['apps/web/src/app/api/media/**', 'apps/web/public/**'],
  },
  'module/weather': {
    description: 'Погода на сайте и в панели',
    paths: ['apps/web/src/app/api/weather/**', 'apps/web/src/features/weather-chip/**'],
  },
};

/**
 * Ось «тип» — что делаем. Ярлыками, а не нативным полем issue types:
 * типы — функция организации, а репозиторий пока личный. При переносе
 * ось конвертируется в типы один в один, переразметки не потребуется.
 */
const KIND = {
  'kind/bug': { description: 'Работает не так, как задумано' },
  'kind/enhancement': { description: 'Новая возможность или развитие существующей' },
  'kind/audit': { description: 'Найдено ревью или проверкой, журнал docs/BUGS.md' },
  'kind/refactor': { description: 'Внутреннее устройство без изменения поведения' },
  'kind/verification': { description: 'Приёмка фазы: тесты, замеры, снимки, сквозные сценарии' },
  'kind/decision': { description: 'Требует решения владельца и записи ADR' },
};

/**
 * Ось «качество» — сквозное требование, идущее поперёк разделов. Это не
 * «плохой код» (для него есть `kind/refactor`), а нефункциональные
 * требования: по ним считают долг и по ним же принимают работу.
 */
const QUALITY = {
  'quality/a11y': { description: 'Клавиатура, фокус, роли и имена, контраст AA' },
  'quality/perf': { description: 'Core Web Vitals, бюджет JS, число запросов' },
  'quality/security': { description: 'Секреты, права, ограничение частоты, загрузки' },
  'quality/seo': { description: 'Каноникал, метаданные, JSON-LD, sitemap, индексируемость' },
  'quality/responsive': { description: 'Поведение раскладки между 320 и 1440' },
  'quality/dark-theme': { description: 'Вторая тема: палитра, контраст, снимки' },
  'quality/privacy': { description: 'Персональные данные и 152-ФЗ: согласие, хранение, доступ' },
};

/**
 * Плоские служебные ярлыки — вне осей, потому что описывают не задачу, а её
 * состояние или машинный шлюз.
 *
 * 🔴 `vr:accepted` переименованию не подлежит: его имя читает CI в
 * `.github/workflows/ci.yml` (строки 609 и 1111) — там ярлык открывает
 * приём разошедшихся кадров по ADR-230.
 */
const SERVICE = {
  'vr:accepted': {
    description:
      'Визуальное изменение принято автором: расхождения снимков не красят проверку (ADR-230)',
    color: 'FBCA04',
  },
  blocked: { description: 'Ждёт другой задачи или решения владельца', color: '6E7781' },
  duplicate: { description: 'Повторяет уже заведённую задачу', color: '6E7781' },
  wontfix: { description: 'Решено не делать', color: '6E7781' },
};

/** Все ярлыки словаря: имя → { description, color, axis, paths }. */
export const LABELS = Object.freeze(
  Object.fromEntries([
    ...Object.entries(AREA).map(([n, v]) => [n, { ...v, axis: 'area', color: AXES.area.color }]),
    ...Object.entries(MODULE).map(([n, v]) => [
      n,
      { ...v, axis: 'module', color: AXES.module.color },
    ]),
    ...Object.entries(KIND).map(([n, v]) => [n, { ...v, axis: 'kind', color: AXES.kind.color }]),
    ...Object.entries(QUALITY).map(([n, v]) => [
      n,
      { ...v, axis: 'quality', color: AXES.quality.color },
    ]),
    ...Object.entries(SERVICE).map(([n, v]) => [n, { ...v, axis: null }]),
  ]),
);

/** Ярлыки одной оси, в порядке словаря. */
export function labelsOf(axis) {
  return Object.keys(LABELS).filter((name) => LABELS[name].axis === axis);
}

/**
 * Проверка осей у одной задачи: обязательная ось обязана стоять ровно один
 * раз, ярлык вне словаря считается нарушением — иначе старая разметка
 * доживёт до следующей ревизии незамеченной.
 *
 * Возвращает список проблем на человеческом языке; пустой список — порядок.
 */
export function checkAxes(names) {
  const problems = [];
  for (const { title, prefix, required } of Object.values(AXES)) {
    const found = names.filter((name) => name.startsWith(prefix));
    if (required === 'one' && found.length === 0) problems.push(`нет ярлыка оси «${title}»`);
    if (required === 'one' && found.length > 1) {
      problems.push(`ось «${title}» стоит ${found.length} раза: ${found.join(', ')}`);
    }
  }
  const unknown = names.filter((name) => !(name in LABELS));
  if (unknown.length > 0) problems.push(`нет в словаре: ${unknown.join(', ')}`);
  return problems;
}

/** Карта «ярлык → пути» для генерации `.github/labeler.yml`. */
export function pathMap() {
  return Object.fromEntries(
    Object.entries(LABELS)
      .filter(([, value]) => Array.isArray(value.paths) && value.paths.length > 0)
      .map(([name, value]) => [name, value.paths]),
  );
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const { values } = parseArgs({
    options: { list: { type: 'boolean' }, paths: { type: 'boolean' } },
  });
  if (values.list) console.log(Object.keys(LABELS).join('\n'));
  else if (values.paths) console.log(JSON.stringify(pathMap(), null, 2));
  else console.log(`ярлыков в словаре: ${Object.keys(LABELS).length}`);
}
