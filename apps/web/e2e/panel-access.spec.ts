import { expect, test, type Page } from '@playwright/test';

import { PANEL_NOT_FOUND_CONTENT } from '@/app/(admin)/admin/not-found-content';
import { FORBIDDEN_CONTENT } from '@/app/forbidden-content';
import { leadManagerContent } from '@/features/lead-manager/content';
import { adminShellContent } from '@/widgets/admin-shell/content';

import { DEMO_MANAGER_LOGIN, DEMO_PASSWORD } from '../prisma/demo-accounts';

import { BASE_URL, withAdmin } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Матрица доступа CRM.md §6 проверяется на сервере — issue #353.
 *
 * 🔴 Скрытый пункт меню — подсказка интерфейса, а не защита: монтажник знает
 * адреса панели, он в ней работает. Поэтому сценарий не открывает страницы
 * кликами, а бьёт по адресам напрямую и читает **тело** ответа: данные не
 * должны приходить и прятаться на клиенте (ADR-095).
 *
 * 🔴 Закрытый раздел отвечает 403, а чужой наряд — 404, и это не
 * непоследовательность. Раздел существует, и отказ в нём ничего не выдаёт;
 * существование чужого наряда монтажника не касается вовсе, и `403` на него
 * подтвердил бы, что наряд с таким адресом есть (ADR-114).
 */
test.use({ baseURL: BASE_URL });

/* Ширины сценарий не касается: проверяется код ответа и его тело. */
test.skip(({ isMobile }) => isMobile === true, 'доступ не зависит от ширины');

/** Метка прогона: по ней записи сценария видно в базе, если уборка не дошла. */
const stamp = String(Date.now()).slice(-8);

/** Сумма своего наряда — её монтажник видеть не должен (ADR-114). */
const ORDER_PRICE = 30_000;

/** Адрес чужого объекта: его не должно быть в теле отказа. */
const ALIEN_ADDRESS = `Тула, Чужая, ${stamp}, кв. 2`;

/** Посторонний человек: его карточку и запрашивает сценарий. */
const TARGET = {
  name: 'Монтажник Посторонний',
  login: `access-target-${stamp}`,
  phone: `+7 (9${stamp.slice(0, 2)}) ${stamp.slice(2, 5)}-${stamp.slice(5, 7)}-04`,
  password: 'access-target-353',
};

const PROBE = {
  name: 'Монтажник Доступа',
  /* Логин уникален на прогон: брошенная прошлым падением запись иначе
     занимает его, и заведение отвечает 409. */
  login: `access-probe-${stamp}`,
  phone: '+79003330353',
  password: 'access-probe-353',
};

/** Разделы владельца: монтажник обязан получить отказ по прямому адресу. */
const CLOSED: readonly string[] = [
  '/admin',
  '/admin/leads',
  '/admin/clients',
  '/admin/team',
  '/admin/stock',
  '/admin/settings',
  '/admin/prices',
  '/admin/company',
  '/admin/notifications',
  '/admin/catalog',
  '/admin/knowledge',
  '/admin/reviews',
];

/**
 * Ответ страницы как есть — код и тело, без браузерного разбора.
 *
 * 🔴 Ожидание длиннее общих пятнадцати секунд: сценарий обходит тринадцать
 * разделов, и каждый из них на стенде собирается по первому обращению. Общий
 * предел приходится ровно на сборку, и сценарий падает на ожидании страницы,
 * а не на том, что проверяет. В пайплайне приложение собрано заранее, и
 * запас не тратится.
 */
async function get(page: Page, path: string): Promise<{ status: number; body: string }> {
  const response = await page.request.get(path, { timeout: 60_000 });
  return { status: response.status(), body: await response.text() };
}

/**
 * Пришла ли сумма — и отрисованной, и полем данных.
 *
 * 🔴 Ищутся две точные формы, а не «цифры где-нибудь в теле»: «30 000» с любым
 * пробелом-разделителем (так её печатает страница) и `"price":30000` (так её
 * везёт полезная нагрузка сервера). Поиск по одним цифрам ложно срабатывал на
 * адресах чанков: в разработке они несут метку времени, а в ней такие
 * последовательности встречаются сами собой.
 */
function mentionsMoney(body: string, amount: number): boolean {
  const digits = String(amount);
  if (digits.length < 4) return false;

  const spaced = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00a0\\u202f]');
  const rendered = new RegExp(`(^|[^\\d])${spaced}([^\\d]|$)`);
  const payload = new RegExp(`\\\\?"price\\\\?":\\s*${digits}\\b`);

  return rendered.test(body) || payload.test(body);
}

test.describe('🔴 закрытые разделы панели', () => {
  test('монтажнику отвечают 403, и данных в теле нет', async ({ page }) => {
    const created = await withAdmin((api) => api.createInstaller(PROBE));

    try {
      await loginViaUi(page, { login: PROBE.login, password: PROBE.password });

      for (const path of CLOSED) {
        const { status, body } = await get(page, path);

        expect(status, `${path} обязан отвечать отказом`).toBe(403);
        expect(body, `${path} показывает страницу отказа`).toContain(FORBIDDEN_CONTENT.title);
      }
    } finally {
      await withAdmin((api) => api.deleteStaff(created.id));
    }
  });

  test('карточка чужого монтажника закрыта на всех вкладках', async ({ page }) => {
    const created = await withAdmin((api) => api.createInstaller(PROBE));
    /* 🔴 Карточка запрашивается **чужая**, а не своя: под своей учётной записью
       имя стоит в оболочке панели законно, и проверка «имени нет в теле» на
       ней ничего не значила бы. Утечка, ради которой сценарий и написан,
       касается именно постороннего человека. */
    const target = await withAdmin((api) => api.createInstaller(TARGET));

    try {
      await loginViaUi(page, { login: PROBE.login, password: PROBE.password });

      /* Раздел «Монтажники» владельческий целиком: свою карточку монтажник
         тоже не открывает, личные данные правятся в профиле. */
      for (const tab of ['account', 'orders', 'payouts', 'notes']) {
        const { status, body } = await get(page, `/admin/team/${target.id}?tab=${tab}`);

        expect(status, `вкладка ${tab} обязана отвечать отказом`).toBe(403);
        /* 🔴 Ни имени постороннего человека, ни его телефона: отказ обязан не
           отвечать даже на вопрос «а кто там». Именно это и утекало — не через
           страницу, а через `generateMetadata`, которая читала карточку из
           базы без проверки роли и клала имя в заголовок вкладки браузера. */
        expect(body).not.toContain(TARGET.name);
        expect(body).not.toContain(TARGET.phone);
      }
    } finally {
      await withAdmin(async (api) => {
        await api.deleteStaff(target.id);
        await api.deleteStaff(created.id);
      });
    }
  });

  test('🔴 свой наряд открыт без выручки, чужого для монтажника нет', async ({ page }) => {
    /* 🔴 Сценарий длиннее прочих и это не запас «на всякий случай»: он заводит
       клиента, монтажника и два наряда, входит в панель, открывает две
       карточки и убирает за собой. На стенде каждый маршрут собирается по
       первому обращению — одна сборка съедает десятки секунд, — и общие
       девяносто заканчиваются на полпути. В пайплайне приложение собрано
       заранее, и запас не тратится. */
    test.setTimeout(300_000);

    const created = await withAdmin((api) => api.createInstaller(PROBE));

    /* 🔴 Оба наряда заводятся сценарием, а не выбираются среди
       демонстрационных. Наряд с суммой и свободным исполнителем на стенде
       бывает, а бывает и нет — и сценарий, пропускающий сам себя, ничего не
       проверяет, оставаясь зелёным. Сумма нужна по существу: у наряда без
       денег «выручка не пришла» верно и при полном провале разграничения. */
    const client = await withAdmin((api) =>
      api.createClient({
        name: `Клиент доступа ${stamp}`,
        phone: `+7 (9${stamp.slice(0, 2)}) ${stamp.slice(2, 5)}-${stamp.slice(5, 7)}-03`,
        address: `Тула, Доступа, ${stamp}`,
      }),
    );
    const mine = await withAdmin((api) =>
      api.createOrder({
        clientId: client.id,
        address: `Тула, Доступа, ${stamp}, кв. 1`,
        price: ORDER_PRICE,
      }),
    );
    const other = await withAdmin((api) =>
      api.createOrder({ clientId: client.id, address: ALIEN_ADDRESS, price: 20_000 }),
    );

    try {
      await withAdmin((api) => api.assignOrder(mine.id, created.id));
      await loginViaUi(page, { login: PROBE.login, password: PROBE.password });

      const ownCard = await get(page, `/admin/orders/${mine.id}`);
      expect(ownCard.status, 'свой наряд открыт').toBe(200);
      expect(ownCard.body, 'номер своего наряда виден').toContain(String(mine.number));

      /* 🔴 Выручка компании монтажнику не приходит вовсе: своя выплата — его
         деньги, сумма заказа — нет (ADR-114). При оплате наличными сумма
         приходит намеренно, поэтому проверяем только безналичный наряд. */
      expect(
        mentionsMoney(ownCard.body, ORDER_PRICE),
        'сумма заказа не должна приезжать монтажнику',
      ).toBe(false);

      /* 🔴 Чужой наряд отвечает «не найдено» — не «нельзя»: отказ подтвердил бы,
         что наряд существует (ADR-114).

         🔴 Код теперь честный — 404 (issue #651). До правки он был 200: у
         карточки была заготовка (`loading.tsx`), Next отдавал её немедленно
         вместе с заголовками, и `notFound()` из страницы менял уже только
         тело. Заготовки уехали внутрь страницы, и до первого байта успевает
         пройти чтение самого наряда. */
      const alienCard = await get(page, `/admin/orders/${other.id}`);
      expect(alienCard.status, 'чужого наряда для монтажника не существует').toBe(404);
      expect(alienCard.body, 'адреса чужого объекта в теле нет').not.toContain(ALIEN_ADDRESS);
      expect(alienCard.body, 'номера чужого наряда в теле нет').not.toContain(`№ ${other.number}`);
    } finally {
      await withAdmin(async (api) => {
        await api.deleteOrder(mine.id);
        await api.deleteOrder(other.id);
        await api.deleteClient(client.id);
        await api.deleteStaff(created.id);
      });
    }
  });
});

/**
 * 🔴 Менеджер входит и видит свои разделы — план «Роли», Фаза 1 (issue #771).
 *
 * Проверяется ровно то, чем фаза объявлена готовой: заведённый менеджер
 * входит, «Заявки» ему открыты, «Каталог» отвечает отказом, а отказ выводит
 * из тупика, а не во второй отказ.
 *
 * 🔴 Учётная запись берётся из демонстрационного сида, а не заводится
 * сценарием, и это вынужденно: заведение через панель и API пока создаёт
 * только монтажника (Фаза 6). Логин и пароль импортируются из того же модуля,
 * который читает сид, — выписанные сюда второй раз, они разъехались бы молча,
 * и сценарий перестал бы входить, а не упал бы понятной ошибкой.
 *
 * Стенд для сквозных сценариев поднимается с демо-данными (`pnpm e2e:stand`,
 * тот же порядок в пайплайне), поэтому запись на месте.
 */
test.describe('🔴 менеджер в панели', () => {
  const MANAGER = { login: DEMO_MANAGER_LOGIN, password: DEMO_PASSWORD };

  /** Разделы, которых у менеджера нет: сайт, склад, команда, сводка. */
  const CLOSED_FOR_MANAGER: readonly string[] = [
    '/admin',
    '/admin/catalog',
    '/admin/knowledge',
    '/admin/reviews',
    '/admin/stock',
    '/admin/team',
    '/admin/settings',
  ];

  test('заявки открыты, разделы про сайт отвечают отказом', async ({ page }) => {
    /* Семь адресов, и каждый на стенде собирается по первому обращению. */
    test.setTimeout(300_000);

    await loginViaUi(page, MANAGER);

    const leads = await get(page, '/admin/leads');
    expect(leads.status, 'менеджеру раздел заявок открыт').toBe(200);
    expect(leads.body, 'на странице заголовок раздела').toContain(leadManagerContent.title);

    for (const path of CLOSED_FOR_MANAGER) {
      const { status, body } = await get(page, path);

      expect(status, `${path} менеджеру закрыт`).toBe(403);
      expect(body, `${path} показывает страницу отказа`).toContain(FORBIDDEN_CONTENT.title);
    }
  });

  /* 🔴 Колонка — подсказка интерфейса, а не защита, но подсказка обязана
     совпадать с защитой: пункт, который отвечает отказом, хуже отсутствующего
     (CRM §6). */
  test('в колонке стоят «Заявки» и нет ни «Каталога», ни «Заказов»', async ({ page }) => {
    await loginViaUi(page, MANAGER);
    await page.goto('/admin/leads', { timeout: 60_000 });

    const nav = page.getByRole('navigation', { name: adminShellContent.navLabel });

    await expect(nav.getByRole('link', { name: 'Заявки' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Каталог' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Заказы' })).toHaveCount(0);
  });

  /**
   * 🔴 Отказ обязан выводить из тупика.
   *
   * Пока ролей было две, выход со страницы отказа был один — календарь
   * выездов монтажника. Менеджеру он тоже отвечает отказом, то есть кнопка
   * «выхода» вела бы во второй 403, и человек ходил бы по кругу (ADR-344).
   */
  test('со страницы отказа кнопка ведёт в открытый ему раздел', async ({ page }) => {
    await loginViaUi(page, MANAGER);

    const response = await page.goto('/admin/catalog', { timeout: 60_000 });
    expect(response?.status(), 'каталог менеджеру закрыт').toBe(403);

    const exit = page.getByRole('link', { name: FORBIDDEN_CONTENT.manager.label });
    await expect(exit).toHaveAttribute('href', FORBIDDEN_CONTENT.manager.href);

    await Promise.all([
      page.waitForURL((url) => url.pathname === FORBIDDEN_CONTENT.manager.href, {
        timeout: 60_000,
      }),
      exit.click(),
    ]);

    /* 🔴 Сначала код ответа, потом заголовок. Отказ на этом месте обязан
       читаться как 403, а не как «в заголовке не то слово»: первая версия
       сценария падала именно на заголовке, и по её выводу нельзя было
       отличить закрытый раздел от переиспользованной раскладки. */
    const landed = await get(page, FORBIDDEN_CONTENT.manager.href);
    expect(landed.status, 'выход со страницы отказа обязан открывать раздел').toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(leadManagerContent.title, {
      timeout: 60_000,
    });
  });
});

/**
 * Ошибка в адресе панели — issue #631.
 *
 * 🔴 Проверяется не только код 404, но и то, **чья** это страница. До правки
 * `/admin/nosuchpage` разбирался корневым `not-found.tsx`, отдавал честный 404
 * и рисовал витрину сайта: меню разделов сайта и кнопку заявки. Вошедший
 * терял панель на ровном месте, а монтажник видел цены вместо своих нарядов.
 *
 * 🔴 Смотреть надо **отрисованную** страницу, а не тело ответа. В теле лежит
 * весь поток RSC, и подвал витрины встречается в нём на любом экране панели:
 * первая версия этой проверки падала именно на этом и врала про дефект, а не
 * про код.
 */
test.describe('🔴 несуществующий адрес панели', () => {
  const MISSING = '/admin/nosuchpage';

  /** Колонка разделов — признак того, что человек остался в панели. */
  const PANEL_NAV = 'Разделы панели управления';

  /** Кнопка шапки сайта: если она видна, показана витрина, а не панель. */
  const SITE_CTA = 'Оставить заявку';

  test('владельцу отвечают 404 страницей панели, а не витриной сайта', async ({ page }) => {
    await loginViaUi(page);

    const response = await page.goto(MISSING, { timeout: 60_000 });

    expect(response?.status(), 'адрес не существует — код обязан быть 404').toBe(404);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      PANEL_NOT_FOUND_CONTENT.address.title,
    );
    await expect(
      page.getByRole('link', { name: PANEL_NOT_FOUND_CONTENT.owner.label }),
    ).toBeVisible();
    await expect(page.getByRole('navigation', { name: PANEL_NAV })).toBeVisible();
    await expect(page.getByRole('link', { name: SITE_CTA })).toHaveCount(0);
  });

  test('монтажнику отвечают 404 с выходом на его выезды, а не 403', async ({ page }) => {
    const created = await withAdmin((api) => api.createInstaller(PROBE));

    try {
      await loginViaUi(page, { login: PROBE.login, password: PROBE.password });

      const response = await page.goto(MISSING, { timeout: 60_000 });

      /* 🔴 Именно 404, а не 403: раздела нет вовсе, и отказ здесь соврал бы —
         он значит «есть, но не для вас». */
      expect(response?.status(), 'несуществующего раздела нет ни для кого').toBe(404);

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        PANEL_NOT_FOUND_CONTENT.address.title,
      );
      await expect(
        page.getByRole('link', { name: PANEL_NOT_FOUND_CONTENT.installer.label }),
      ).toBeVisible();
      await expect(page.getByText(FORBIDDEN_CONTENT.title)).toHaveCount(0);
    } finally {
      await withAdmin((api) => api.deleteStaff(created.id));
    }
  });
});

/**
 * Адрес удалённой записи — issue #651.
 *
 * 🔴 Проверяется **код ответа**, и это не педантизм. До правки такой адрес
 * отвечал 200 с телом «Запись не найдена»: у каждого раздела была заготовка
 * загрузки (`loading.tsx`), она уходила в ответ первой, статус к тому моменту
 * был отправлен, и `notFound()` менял потом лишь содержимое. Наружу это
 * выглядит как рабочая страница: поисковик такую индексирует, `curl` в
 * скрипте считает удавшейся, а браузер не показывает ошибку.
 *
 * 🔴 Адреса взяты по одному на устройство страницы, а не все подряд: правка
 * общая для всех разделов, и разница между ними — только в том, какой
 * репозиторий отвечает `null`. Зато взяты **все** способы: правка карточки
 * (каталог, знания), карточка с вкладками (клиенты, монтажники), карточка с
 * ролью (наряды) и вложенный раздел (склад).
 */
test.describe('🔴 адрес удалённой записи в панели', () => {
  /** Идентификатор, которого в базе нет и не будет: форма та же, записи нет. */
  const GONE = 'record-that-does-not-exist-651';

  const ADDRESSES: readonly string[] = [
    `/admin/catalog/${GONE}`,
    `/admin/knowledge/${GONE}`,
    `/admin/clients/${GONE}`,
    `/admin/team/${GONE}`,
    `/admin/orders/${GONE}`,
    `/admin/stock/items/${GONE}`,
  ];

  test('владельцу отвечают 404, а не 200 с текстом «не найдено»', async ({ page }) => {
    /* Шесть разделов, и каждый на стенде собирается по первому обращению. */
    test.setTimeout(300_000);

    await loginViaUi(page);

    for (const path of ADDRESSES) {
      const { status, body } = await get(page, path);

      expect(status, `${path} обязан отвечать 404`).toBe(404);
      expect(body, `${path} показывает страницу «Запись не найдена»`).toContain(
        PANEL_NOT_FOUND_CONTENT.record.title,
      );
    }
  });

  test('🔴 удалённая запись отвечает 404, а не разбирается адресной страницей', async ({
    page,
  }) => {
    await loginViaUi(page);

    const response = await page.goto(`/admin/clients/${GONE}`, { timeout: 60_000 });

    expect(response?.status(), 'записи нет — код обязан быть 404').toBe(404);

    /* 🔴 Именно «Запись не найдена», а не «Страница не найдена»: адрес верный,
       и отправлять владельца проверять опечатку в нём значит послать его
       искать несуществующую ошибку (issue #631). */
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      PANEL_NOT_FOUND_CONTENT.record.title,
    );

    /* Человек остался в панели, а не уехал на витрину сайта. */
    await expect(page.getByRole('navigation', { name: 'Разделы панели управления' })).toBeVisible();
  });
});
