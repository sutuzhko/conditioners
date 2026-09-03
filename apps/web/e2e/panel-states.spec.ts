import { expect, test, type Page, type Route } from '@playwright/test';

import { leadManagerContent as leadTexts } from '@/features/lead-manager/content';
import { orderManagerContent as orderTexts } from '@/features/order-manager/content';
import { blockErrorContent as errorTexts } from '@/widgets/admin-shell/content';

import { BASE_URL, withAdmin } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Состояния блока данных и клавиатура — issue #338 (веха «Панель · Фаза 6»).
 *
 * Четыре сценария: ошибка одного блока не роняет раздел (#336), пустота и
 * «ничего не найдено» разведены (#335), панель проходится табом с видимым и
 * не накрытым фокусом (#337), контрольный элемент не двигается между
 * состояниями (#334).
 *
 * 🔴 Данные разделов панели читаются на сервере (`force-dynamic`) и приезжают
 * RSC-потоком: отдельного запроса «за списком» браузер не делает. Поэтому
 * «уронить запрос раздела» здесь значит оборвать поток на куске блока —
 * так выглядит с клиента и упавшая база, и оборванная связь у монтажника на
 * объекте. Кусок узнаётся по маркеру `data-block` в JSON-строке потока.
 */
test.use({ baseURL: BASE_URL });

/* Ширины сценарии задают сами: профиль телефона повторял бы те же шаги. */
test.skip(({ isMobile }) => isMobile === true, 'ширины задаёт сам сценарий');

const LEADS = '/admin/leads';

/**
 * Маркер обёртки блока заявок в двух видах — их два, и путать их нельзя.
 * В RSC-потоке разметка приезжает JSON-строкой (`"data-block":"leads"`), в
 * документе — обычным атрибутом (`data-block="leads"`).
 */
const LEADS_FLIGHT = '"data-block":"leads"';
const LEADS_HTML = 'data-block="leads"';

/** Гидратация: до неё клик уходит обычным переходом, а не по роутеру (HANDOFF). */
async function settled(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
}

/** Значок дев-панели Next перехватывает первый Tab и точку в углу экрана. */
async function hideDevOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.querySelectorAll('nextjs-portal').forEach((overlay) => {
      overlay.remove();
    });
  });
}

const isRscOf =
  (pathname: string) =>
  (url: URL): boolean =>
    url.pathname === pathname && url.searchParams.has('_rsc');

/**
 * Обрыв потока на куске блока: RSC-ответ раздела приходит целиком, кроме
 * строки с маркером. Ссылка на кусок остаётся, сам кусок не приезжает, и,
 * когда поток закрывается, React отдаёт границе блока «Connection closed».
 */
async function dropChunk(route: Route, marker: string): Promise<void> {
  const response = await route.fetch();
  const body = (await response.body()).toString('utf8');
  const kept = body
    .split('\n')
    .filter((row) => !row.includes(marker))
    .join('\n');

  await route.fulfill({
    response,
    body: Buffer.from(kept, 'utf8'),
    headers: { ...response.headers(), 'content-length': String(Buffer.byteLength(kept, 'utf8')) },
  });
}

/**
 * Документ обрывается перед куском, который несёт данные блока, а скрипты не
 * грузятся: на экране остаётся серверный скелетон ровно в той геометрии, в
 * какой его видит человек до прихода данных.
 *
 * Потоковый HTML кладёт содержимое каждой границы `Suspense` в
 * `<div hidden id="S:n">` и подменяет им заглушку скриптом `$RC("B:n","S:n")`.
 * 🔴 Резать по куску с данными, а не по куску со скелетоном: где именно React
 * положит скелетон — в общую оболочку, в кусок страницы или в свой кусок —
 * зависит от того, что успело отрендериться к первому сбросу, и на холодной
 * сборке в CI раскладка кусков другая, чем на прогретом сервере. Кусок с
 * данными опознаётся однозначно — по маркеру `data-block` на обёртке блока, —
 * и он всегда последний: до него на экране скелетон, чем бы он ни был
 * доставлен. Прежний вариант резал по последнему куску с `aria-busy`, и в CI
 * скелетон оставался в скрытом куске: тест видел его `hidden`.
 */
function cutBeforeData(html: string, marker: string): string {
  const data = html.indexOf(marker);
  if (data < 0) {
    throw new Error(`В документе нет куска с данными блока (${marker}) — резать не по чему`);
  }

  const chunk = html.lastIndexOf('<div hidden id="S:', data);
  if (chunk > 0) return html.slice(0, chunk);

  /* Кусок с данными в отдельный сброс не выделен — значит блок отрисовался
     разом со страницей, и состояния загрузки в этом ответе нет вовсе. */
  const first = html.indexOf('<div hidden id="S:');
  if (first < 0) throw new Error('Ответ пришёл без потоковых кусков: скелетона в нём нет');
  return html.slice(0, first);
}

async function keepSkeletonOnly(page: Page, pathname: string, marker: string): Promise<void> {
  await page.route(
    (url) => url.pathname.endsWith('.js'),
    (route) => route.abort(),
  );
  await page.route(
    (url) => url.pathname === pathname && !url.searchParams.has('_rsc'),
    async (route) => {
      if (route.request().resourceType() !== 'document') return route.continue();

      const response = await route.fetch();
      const body = cutBeforeData((await response.body()).toString('utf8'), marker);
      await route.fulfill({
        response,
        body,
        headers: { ...response.headers(), 'content-length': String(Buffer.byteLength(body)) },
      });
    },
  );
}

/** Верх элемента, стоящего сразу под фильтрами заявок, в координатах документа. */
async function blockTop(page: Page): Promise<number> {
  return page.evaluate((label) => {
    const nav = document.querySelector(`nav[aria-label="${label}"]`);
    /* Заглушка `<template>` границы Suspense стоит перед скелетоном в
       потоковом HTML и места не занимает — сосед считается за ней. */
    let block = nav?.nextElementSibling ?? null;
    while (block !== null && block.tagName === 'TEMPLATE') block = block.nextElementSibling;
    if (!(block instanceof HTMLElement)) return Number.NaN;

    return Math.round((block.getBoundingClientRect().top + window.scrollY) * 10) / 10;
  }, leadTexts.filterLabel);
}

test.describe('состояния блока данных', () => {
  test('🔴 сценарий 1: скелетон был, ошибка локальна, соседи и навигация живы, «Повторить» повторяет', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginViaUi(page);

    /* Скелетон: сервер отдаёт его до списка. Ищем видимый узел, а не первый
       попавшийся — те же заготовки лежат и в скрытых кусках потока. */
    await keepSkeletonOnly(page, LEADS, LEADS_HTML);
    await page.goto(LEADS);

    await expect(page.locator('main [aria-busy="true"]:visible').first()).toBeVisible();
    await expect(page.getByRole('navigation', { name: leadTexts.filterLabel })).toBeVisible();
    await page.unrouteAll();

    /* Ошибка блока: переход на заявки, поток обрывается на куске списка. */
    await page.goto('/admin');
    await settled(page);
    await page.route(isRscOf(LEADS), (route) => dropChunk(route, LEADS_FLIGHT));

    const column = page.locator('aside');
    await column.getByRole('link', { name: 'Заявки' }).click();

    /* 🔴 Внутри `main`: у Next есть свой `role="alert"` — объявление маршрута
       для читалки, и по всей странице ошибок нашлось бы две. */
    const alert = page.locator('main').getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert.getByRole('heading', { name: leadTexts.loadFailed })).toBeVisible();
    await expect(alert).toContainText('не потеряны');
    await expect(alert.getByRole('button', { name: errorTexts.retry })).toBeVisible();
    await expect(alert.getByRole('button', { name: errorTexts.reload })).toBeVisible();

    /* Соседи живы: заголовок, фильтры, колонка разделов и нижние вкладки. */
    await expect(page.getByRole('heading', { level: 1, name: leadTexts.title })).toBeVisible();
    await expect(page.getByRole('navigation', { name: leadTexts.filterLabel })).toBeVisible();
    await expect(column.getByRole('link', { name: 'Заказы' })).toBeVisible();

    /* Навигация работает: другой раздел открывается, обратно — снова ошибка,
       потому что поток заявок всё ещё обрывается. */
    await column.getByRole('link', { name: 'Заказы' }).click();
    await expect(page.getByRole('heading', { level: 1, name: orderTexts.title })).toBeVisible();
    await column.getByRole('link', { name: 'Заявки' }).click();
    await expect(page.locator('main').getByRole('alert')).toBeVisible();

    /* «Повторить» действительно повторяет: связь восстановилась — список на месте. */
    await page.unrouteAll();
    await page.getByRole('button', { name: errorTexts.retry }).click();

    await expect(page.locator('[data-block="leads"]')).toBeVisible();
    await expect(page.locator('[data-block="leads"] article').first()).toBeVisible();
    await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  });

  test('сценарий 2: пустой раздел объясняет причину, пустой фильтр даёт выход к записям', async ({
    page,
    browser,
  }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });

    /* Раздел без записей: свежему монтажнику ничего не назначено. На стенде
       демо-данные есть у всех, и это единственный честный пустой раздел. */
    const installer = {
      name: 'E2E Пустой раздел',
      login: `e2e-empty-${Date.now().toString(36)}`,
      phone: '',
      password: 'e2e-parol-2026',
    };
    const created = await withAdmin((api) => api.createInstaller(installer));

    try {
      await loginViaUi(page, installer);
      await page.goto('/admin/orders');

      await expect(page.getByRole('heading', { name: orderTexts.emptyInstaller })).toBeVisible();
      await expect(page.getByText(orderTexts.emptyInstallerText)).toBeVisible();
      /* И не текст «ничего не найдено»: фильтра здесь нет. */
      await expect(page.getByRole('heading', { name: orderTexts.emptyFound })).toHaveCount(0);
    } finally {
      await withAdmin((api) => api.deleteStaff(created.id));
    }

    /* Ничего не найдено: статус освобождается от записей, и под ним пусто —
       но пусто из-за фильтра, с выходом к остальным заявкам. */
    const owner = await browser.newContext({
      baseURL: BASE_URL,
      viewport: { width: 1440, height: 900 },
    });
    const ownerPage = await owner.newPage();
    const moved = await withAdmin(async (api) => {
      const leads = await api.listLeads('in_progress');
      for (const lead of leads) await api.setLeadStatus(lead.id, 'new');
      return leads;
    });

    try {
      await loginViaUi(ownerPage);
      await ownerPage.goto(`${LEADS}?status=in_progress`);

      await expect(ownerPage.getByRole('heading', { name: leadTexts.emptyFiltered })).toBeVisible();
      await expect(ownerPage.getByText(leadTexts.emptyFilteredText)).toBeVisible();
      await expect(ownerPage.getByRole('heading', { name: leadTexts.emptyTitle })).toHaveCount(0);

      await ownerPage.getByRole('link', { name: leadTexts.emptyFilteredAction }).click();
      await ownerPage.waitForURL((url) => url.pathname === LEADS && url.search === '');
      await expect(ownerPage.locator('[data-block="leads"] article').first()).toBeVisible();
    } finally {
      await withAdmin(async (api) => {
        for (const lead of moved) await api.setLeadStatus(lead.id, 'in_progress');
      });
      await owner.close();
    }
  });

  test('🔴 сценарий 4: контрольный элемент не двигается между загрузкой, данными, пустотой и ошибкой', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginViaUi(page);

    const tops: Record<string, number> = {};

    /* Загрузка: серверный скелетон блока. */
    await keepSkeletonOnly(page, LEADS, LEADS_HTML);
    await page.goto(LEADS);
    await expect(page.locator('main [aria-busy="true"]:visible').first()).toBeVisible();
    tops['загрузка'] = await blockTop(page);
    await page.unrouteAll();

    /* Данные. */
    await page.goto(LEADS);
    await expect(page.locator('[data-block="leads"] article').first()).toBeVisible();
    tops['данные'] = await blockTop(page);

    /* Пусто: статус, из которого записи убраны. */
    const moved = await withAdmin(async (api) => {
      const leads = await api.listLeads('in_progress');
      for (const lead of leads) await api.setLeadStatus(lead.id, 'new');
      return leads;
    });
    try {
      await page.goto(`${LEADS}?status=in_progress`);
      await expect(page.getByRole('heading', { name: leadTexts.emptyFiltered })).toBeVisible();
      tops['пусто'] = await blockTop(page);
    } finally {
      await withAdmin(async (api) => {
        for (const lead of moved) await api.setLeadStatus(lead.id, 'in_progress');
      });
    }

    /* Ошибка: поток обрывается на куске списка. */
    await page.goto('/admin');
    await settled(page);
    await page.route(isRscOf(LEADS), (route) => dropChunk(route, LEADS_FLIGHT));
    await page.locator('aside').getByRole('link', { name: 'Заявки' }).click();
    await expect(page.locator('main').getByRole('alert')).toBeVisible();
    tops['ошибка'] = await blockTop(page);
    await page.unrouteAll({ behavior: 'ignoreErrors' });

    test.info().annotations.push({
      type: 'координаты верха блока',
      description: Object.entries(tops)
        .map(([state, top]) => `${state}: ${top}px`)
        .join(' · '),
    });

    for (const [state, top] of Object.entries(tops)) {
      expect(Number.isNaN(top), `${state}: под фильтрами есть блок`).toBe(false);
    }
    const spread = Math.max(...Object.values(tops)) - Math.min(...Object.values(tops));
    expect(spread, `разброс верха блока между состояниями: ${JSON.stringify(tops)}`).toBe(0);
  });
});

/** Один шаг обхода табом: кто получил фокус, виден ли он и не накрыт ли. */
type FocusStop = {
  readonly name: string;
  readonly tag: string;
  readonly ring: boolean;
  readonly onTop: boolean;
  readonly inView: boolean;
};

type ActiveInfo = FocusStop & {
  readonly matches: boolean;
};

/**
 * Что ищем на шаге: ключ, а не функция — предикат выполняется в браузере, и
 * через границу сериализации уходит только его имя.
 */
type Target =
  | { readonly kind: 'input'; readonly name: string }
  | { readonly kind: 'navLink'; readonly text: string }
  | { readonly kind: 'orderLink' }
  | { readonly kind: 'labelled'; readonly label: string; readonly tag: 'input' | 'select' }
  | { readonly kind: 'button'; readonly text: string };

async function readActive(page: Page, target: Target): Promise<ActiveInfo | null> {
  return page.evaluate((wanted): ActiveInfo | null => {
    const el = document.activeElement;
    if (el === null || el === document.body || !(el instanceof HTMLElement)) return null;

    /**
     * Фокус виден: кольцо (обводка или тень) либо заливка и рамка, которых
     * нет у такого же соседа без фокуса. Второе — про сегменты поля даты:
     * там фокус показан заливкой сегмента, а не кольцом вокруг него, и
     * кольцо между тремя сегментами в одной капсуле читалось бы хуже.
     */
    const focusVisible = (node: HTMLElement, computed: CSSStyleDeclaration): boolean => {
      if (computed.outlineStyle !== 'none' && Number.parseFloat(computed.outlineWidth) > 0)
        return true;
      if (computed.boxShadow !== 'none') return true;

      /* Нативное поле даты: Chromium ведёт Tab по своим частям — день, месяц,
         год и кнопка календаря. Пока фокус на частях, `:focus-visible` стоит
         на самом поле и кольцо его; на кнопке календаря он уходит внутрь
         теневого дерева, и кольцо там рисует браузер, а не наши стили. */
      const nativeParts = ['date', 'time', 'datetime-local', 'month', 'week'];
      if (node instanceof HTMLInputElement && nativeParts.includes(node.type)) {
        return !node.matches(':focus-visible');
      }

      /* Близнец — такой же узел по первому классу: у сегментов даты общий
         класс сегмента и свой — дня, месяца, года; у каждого своя обёртка. */
      const base = node.classList.item(0);
      const twin =
        base === null
          ? undefined
          : [...document.querySelectorAll(`${node.tagName}.${CSS.escape(base)}`)].find(
              (candidate) => candidate !== node,
            );
      if (!(twin instanceof HTMLElement)) return false;

      const other = getComputedStyle(twin);
      return (
        other.backgroundColor !== computed.backgroundColor ||
        other.borderColor !== computed.borderColor ||
        other.color !== computed.color
      );
    };

    const rects = el.getClientRects();
    const box = rects.item(0) ?? el.getBoundingClientRect();
    const style = getComputedStyle(el);

    /* Панель вкладки наряда выше окна: браузер ставит в окно её верх, а точка
       попадания берётся в видимой части, а не в геометрическом центре. */
    const fits = box.height <= window.innerHeight;
    const visibleTop = Math.max(box.top, 0);
    const visibleBottom = Math.min(box.bottom, window.innerHeight);
    const hit = document.elementFromPoint(
      box.left + box.width / 2,
      (visibleTop + visibleBottom) / 2,
    );
    const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ');
    const label =
      el instanceof HTMLInputElement || el instanceof HTMLSelectElement
        ? (el.labels?.[0]?.textContent ?? '').trim()
        : '';

    let matches = false;
    switch (wanted.kind) {
      case 'input':
        matches = el instanceof HTMLInputElement && el.name === wanted.name;
        break;
      case 'navLink':
        matches =
          el instanceof HTMLAnchorElement && el.closest('nav') !== null && text === wanted.text;
        break;
      case 'orderLink':
        matches =
          el instanceof HTMLAnchorElement &&
          el.closest('main') !== null &&
          /^\/admin\/orders\/(?!new$)[^/]+$/.test(el.getAttribute('href') ?? '');
        break;
      case 'labelled':
        matches = el.tagName.toLowerCase() === wanted.tag && label === wanted.label;
        break;
      case 'button':
        matches = el instanceof HTMLButtonElement && text === wanted.text;
        break;
    }

    return {
      name:
        (el.getAttribute('aria-label') ?? label ?? text ?? el.tagName).trim().slice(0, 40) ||
        text.slice(0, 40),
      tag: el.tagName.toLowerCase(),
      ring: focusVisible(el, style),
      onTop: hit !== null && (el === hit || el.contains(hit)),
      inView:
        box.top >= 0 &&
        box.left >= 0 &&
        box.right <= window.innerWidth &&
        (fits ? box.bottom <= window.innerHeight : box.top < window.innerHeight),
      matches,
    };
  }, target);
}

/**
 * Первый доступный пункт списка, к которому дошёл фокус.
 *
 * 🔴 Единственный шаг не с клавиатуры, и это допущение сценария, а не панели:
 * нативный `<select>` в headless Chromium под macOS не отзывается ни на
 * стрелки, ни на набор первых букв — меню у него системное, а системного
 * окна в headless нет. `selectOption` ставит значение и шлёт те же события
 * `input`/`change`, что и выбор человеком; сам список к этому моменту уже
 * получил фокус табом и прошёл проверки кольца и накрытия.
 */
async function chooseFirstOption(page: Page): Promise<void> {
  const active = page.locator(':focus');
  await expect(active, 'фокус стоит на списке').toHaveJSProperty('tagName', 'SELECT');

  const first = await active.evaluate((el) => {
    if (!(el instanceof HTMLSelectElement)) return '';
    const option = [...el.options].find(
      (candidate) => !candidate.disabled && candidate.value !== '',
    );
    return option === undefined ? '' : option.value;
  });
  expect(first, 'в списке есть пункт, который можно выбрать').not.toBe('');

  /* 🔴 Выбор повторяется, пока значение не удержалось. Список управляемый, и
     выбор, сделанный до гидратации, React откатывает молча: в CI холодная
     сборка карточки наряда идёт секунды, зона оставалась пустой, форма
     отвечала «Выберите, откуда списываем», и падало не списание, а сценарий. */
  await expect(async () => {
    await active.selectOption(first);
    await expect(active).toHaveValue(first, { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
}

/**
 * Табом до цели: каждый шаг записывается и тут же проверяется — фокус виден
 * (кольцо), в пределах окна и не накрыт липким элементом (`elementFromPoint`
 * в центре первого прямоугольника цели — она сама).
 */
async function tabTo(page: Page, target: Target, stops: FocusStop[], limit = 250): Promise<void> {
  await hideDevOverlay(page);

  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press('Tab');
    const active = await readActive(page, target);
    if (active === null) continue;

    const { matches, ...stop } = active;
    stops.push(stop);

    expect(stop.ring, `«${stop.name}» (${stop.tag}): кольцо фокуса видно`).toBe(true);
    expect(stop.inView, `«${stop.name}» (${stop.tag}): фокус в пределах окна`).toBe(true);
    expect(stop.onTop, `«${stop.name}» (${stop.tag}): фокус не накрыт липким элементом`).toBe(true);

    if (matches) return;
  }

  throw new Error(`Цель ${JSON.stringify(target)} не достигнута за ${limit} шагов`);
}

for (const shell of [
  { name: 'десктоп', width: 1440, height: 900 },
  { name: 'телефон', width: 390, height: 844 },
]) {
  test(`🔴 сценарий 3 · ${shell.name}: клавиатура насквозь — вход, «Заказы», наряд, расход, сохранение`, async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: shell.width, height: shell.height });
    /* Плавная прокрутка асинхронна: координата снималась бы на середине хода. */
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const stops: FocusStop[] = [];

    /* Вход — тоже с клавиатуры. Гидратацию ждём по клиентской ошибке пустой
       формы, как и `loginViaUi`: до неё Enter уходит нативным сабмитом. */
    await page.goto('/admin/login');
    await expect(async () => {
      await page.getByRole('button', { name: 'Войти' }).click();
      await expect(page.getByText('Введите логин')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 45_000 });

    await tabTo(page, { kind: 'input', name: 'login' }, stops);
    await page.keyboard.type(process.env.E2E_ADMIN_LOGIN ?? 'admin');
    await tabTo(page, { kind: 'input', name: 'password' }, stops);
    await page.keyboard.type(process.env.E2E_ADMIN_PASSWORD ?? 'admin');
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.pathname === '/admin');
    await settled(page);

    /* «Заказы»: на десктопе — колонка, на телефоне — нижняя полоса. */
    await tabTo(page, { kind: 'navLink', text: 'Заказы' }, stops);
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.pathname === '/admin/orders');
    await settled(page);

    /* Карточка наряда: первая ссылка на наряд в списке. */
    await tabTo(page, { kind: 'orderLink' }, stops);
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => /^\/admin\/orders\/[^/]+$/.test(url.pathname));
    await settled(page);

    /* Блок расхода: откуда списываем, что и сколько. До каждого поля — табом;
       пункт списка ставится `selectOption` (см. `chooseFirstOption`). */
    const moves = page.getByRole('region', { name: orderTexts.consumptionTableLabel });
    const rowsBefore = await moves.getByRole('row').count();

    const zone = page.getByLabel(orderTexts.consumeZone);
    if ((await zone.count()) > 0) {
      await tabTo(page, { kind: 'labelled', label: orderTexts.consumeZone, tag: 'select' }, stops);
      await chooseFirstOption(page);
    }
    await tabTo(page, { kind: 'labelled', label: orderTexts.consumeItem, tag: 'select' }, stops);
    await chooseFirstOption(page);
    await tabTo(page, { kind: 'labelled', label: orderTexts.consumeQty, tag: 'input' }, stops);
    await page.keyboard.type('1');
    await tabTo(page, { kind: 'button', text: orderTexts.consumeSubmit }, stops);
    await page.keyboard.press('Enter');

    /* Сохранение: форма отчиталась, списание встало строкой в журнал движений. */
    await expect(page.getByRole('status').filter({ hasText: orderTexts.consumeDone })).toBeVisible({
      timeout: 30_000,
    });
    await expect(moves.getByRole('row')).toHaveCount(rowsBefore === 0 ? 2 : rowsBefore + 1, {
      timeout: 30_000,
    });

    test.info().annotations.push({
      type: 'остановок табом',
      description: `${stops.length}, все с кольцом, в окне и не накрыты`,
    });
    expect(stops.length).toBeGreaterThan(10);
  });
}
