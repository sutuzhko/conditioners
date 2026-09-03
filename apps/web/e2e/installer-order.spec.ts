import { expect, test, type APIRequestContext } from '@playwright/test';
import { request } from '@playwright/test';

import {
  ORDER_CARD_TAB_TITLE,
  ORDER_STATUS_TITLE,
  PHOTO_STAGE_TITLE,
  orderManagerContent as texts,
} from '@/features/order-manager/content';

import { ADMIN_LOGIN, ADMIN_PASSWORD, BASE_URL } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * 🔴 Монтажник закрывает наряд с телефона — issue #348, веха «Панель · Фаза 8».
 *
 * Сценарий целиком, от входа до записи в базе: вход → «Мои наряды» → карточка
 * наряда → «В работе» → вкладка «Расход», две позиции с количеством →
 * вкладка «Документы», фото «после» → «Выполнен» → проверка статуса в базе.
 *
 * 🔴 Проверка идёт до базы, а не до экрана. Юнит на обработчик показывает, что
 * функция вызвана; что наряд действительно закрыт, а расход действительно
 * записан, видно только отсюда — тем же контрактом `/api/admin/*`, которым
 * данные и читаются.
 *
 * Всё, что нужно сценарию, он заводит сам и убирает за собой: свой монтажник,
 * свой клиент, своя зона хранения с материалом и свой наряд. Демо-данные
 * стенда для этого не годятся: наряд «в работе» у чужого монтажника сценарий
 * закрыл бы по-настоящему.
 */
test.use({ baseURL: BASE_URL });

/* Экран монтажника — телефонный: он смотрит наряд в машине. Ширину сценарий
   задаёт сам, чтобы не зависеть от профиля прогона. */
test.use({ viewport: { width: 390, height: 844 } });

const INSTALLER_PASSWORD = 'installer-e2e-password';

/** Наряд ставится на сегодня: он должен попасть в стопку «Активные». */
function today(): string {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

/** Односекундная уникальность: логин и названия не должны совпасть с чужими. */
const stamp = String(Date.now()).slice(-8);

type Fixture = {
  readonly installerId: string;
  readonly installerLogin: string;
  readonly clientId: string;
  readonly orderId: string;
  readonly zoneId: string;
  readonly itemIds: readonly string[];
};

/** Клиент API панели с cookie владельца: им и заводится, и проверяется. */
class OwnerApi {
  private constructor(
    private readonly context: APIRequestContext,
    private readonly cookie: string,
  ) {}

  static async login(): Promise<OwnerApi> {
    const context = await request.newContext({ baseURL: BASE_URL });
    const response = await context.post('/api/auth/login', {
      data: { login: ADMIN_LOGIN, password: ADMIN_PASSWORD },
    });
    if (response.status() !== 204) {
      throw new Error(`Вход владельца из сценария не удался: код ${response.status()}`);
    }

    const header = response
      .headersArray()
      .find(
        ({ name, value }) => name.toLowerCase() === 'set-cookie' && value.startsWith('session='),
      );
    const cookie = header?.value.split(';')[0];
    if (cookie === undefined || cookie === '') throw new Error('Сервер не выдал cookie сессии');

    return new OwnerApi(context, cookie);
  }

  async post(path: string, data: unknown): Promise<Record<string, unknown>> {
    const response = await this.context.post(path, {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      data,
    });
    if (response.status() !== 201 && response.status() !== 200) {
      throw new Error(`POST ${path} вернул ${response.status()}: ${await response.text()}`);
    }
    const body: unknown = await response.json();
    return body as Record<string, unknown>;
  }

  async get(path: string): Promise<Record<string, unknown>> {
    const response = await this.context.get(path, { headers: { Cookie: this.cookie } });
    if (response.status() !== 200) {
      throw new Error(`GET ${path} вернул ${response.status()}`);
    }
    const body: unknown = await response.json();
    return body as Record<string, unknown>;
  }

  async remove(path: string): Promise<void> {
    await this.context.delete(path, { headers: { Cookie: this.cookie } }).catch(() => undefined);
  }

  async dispose(): Promise<void> {
    await this.context
      .post('/api/auth/logout', { headers: { Cookie: this.cookie } })
      .catch(() => undefined);
    await this.context.dispose();
  }
}

/**
 * Телефон сценария: последние семь цифр метки прогона плюс номер записи.
 * Номера вида `+7 (9NN) NNN-NN-NN` не пересекаются между прогонами, и стенд,
 * оставшийся с прошлого раза, не роняет следующий.
 */
function phoneOf(index: number): string {
  const digits = `${stamp}`.slice(-7).padStart(7, '0');
  return `+7 (9${digits.slice(0, 2)}) ${digits.slice(2, 5)}-${digits.slice(5, 7)}-0${index}`;
}

/** Идентификатор из ответа: у всех разделов панели он лежит в `id`. */
function idOf(body: Record<string, unknown>, what: string): string {
  const id = body.id;
  if (typeof id !== 'string' || id === '') throw new Error(`Ответ «${what}» пришёл без id`);
  return id;
}

async function seed(api: OwnerApi): Promise<Fixture> {
  const installer = await api.post('/api/admin/staff', {
    name: `Монтажник сценария ${stamp}`,
    login: `e2e-installer-${stamp}`,
    /* 🔴 Телефон уникален на прогон: он ключ клиента и монтажника, и второй
       прогон на непочищенном стенде падал на «этот телефон уже записан».
       Метка та же, что в именах, — по ней записи сценария видно в базе. */
    phone: phoneOf(1),
    password: INSTALLER_PASSWORD,
    employment: '',
    inn: '',
  });
  const installerId = idOf(installer, 'монтажник');

  const client = await api.post('/api/admin/clients', {
    name: `Клиент сценария ${stamp}`,
    phone: phoneOf(2),
    address: 'Тула, Первомайская, 1',
    note: '',
  });
  const clientId = idOf(client, 'клиент');

  /* 🔴 Машина монтажника — зона хранения: без неё вкладка «Расход» честно
     говорит, что списывать неоткуда, и сценарий проверял бы пустой экран. */
  const zone = await api.post('/api/admin/stock/zones', {
    kind: 'van',
    name: `Газель сценария ${stamp}`,
    userId: installerId,
    sort: 90,
  });
  const zoneId = idOf(zone, 'зона хранения');

  const itemIds: string[] = [];
  for (const [name, unit] of [
    [`Труба медная сценария ${stamp}`, 'meter'],
    [`Кронштейны сценария ${stamp}`, 'pair'],
  ] as const) {
    const item = await api.post('/api/admin/stock/items', {
      name,
      group: 'Сценарий',
      unit,
      minQty: 0,
      productId: '',
      note: '',
    });
    const itemId = idOf(item, 'позиция склада');
    itemIds.push(itemId);

    /* Приход в машину: списывать можно и в минус, но сценарий проверяет
       обычный рабочий день, а не расхождение склада с реальностью. */
    await api.post('/api/admin/stock/movements', {
      kind: 'income',
      itemId,
      qty: 50,
      toZoneId: zoneId,
      reason: 'Загрузка машины по сценарию',
    });
  }

  const order = await api.post('/api/admin/orders', {
    type: 'install',
    clientId,
    installerId,
    day: today(),
    time: '10:00',
    durationMin: 120,
    address: 'Тула, Первомайская, 1, кв. 2',
    payment: 'company',
    price: 30_000,
    installerFee: 8_000,
    units: [{ equip: 'conditioner', model: 'Сплит-система 09', source: 'ours', trassaM: 4 }],
  });

  return {
    installerId,
    installerLogin: `e2e-installer-${stamp}`,
    clientId,
    orderId: idOf(order, 'наряд'),
    zoneId,
    itemIds,
  };
}

/** Уборка в обратном порядке: наряд, движения склада, позиции, зона, люди. */
async function cleanup(api: OwnerApi, fixture: Fixture | null): Promise<void> {
  if (fixture === null) return;

  await api.remove(`/api/admin/orders/${fixture.orderId}`);
  for (const itemId of fixture.itemIds) await api.remove(`/api/admin/stock/items/${itemId}`);
  await api.remove(`/api/admin/stock/zones/${fixture.zoneId}`);
  await api.remove(`/api/admin/clients/${fixture.clientId}`);
  await api.remove(`/api/admin/staff/${fixture.installerId}`);
}

test('🔴 монтажник закрывает наряд с телефона, и статус меняется в базе', async ({ page }) => {
  /* 🔴 Сценарий длиннее прочих, и это не запас «на всякий случай»: он заводит
     монтажника, клиента, зону хранения, две позиции склада с приходом и сам
     наряд, потом проходит вход, три вкладки карточки, два списания и загрузку
     снимка. На стенде каждый маршрут собирается по первому обращению — только
     сборка съедает больше минуты, — и общие 90 секунд заканчиваются на
     полпути. В CI приложение собрано заранее, и сценарий укладывается вчетверо
     быстрее. */
  test.setTimeout(300_000);

  const api = await OwnerApi.login();
  let fixture: Fixture | null = null;

  try {
    fixture = await seed(api);

    // ——— Вход монтажника и его наряды
    await loginViaUi(page, { login: fixture.installerLogin, password: INSTALLER_PASSWORD });

    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(texts.installerTitle);

    /* 🔴 У монтажника в списке только свои наряды и ни одной суммы: колонки
       «Сумма» на его экране нет вовсе (ADR-114, CRM.md §3.1). */
    await expect(page.getByRole('columnheader', { name: texts.colSum })).toHaveCount(0);

    /* Открывается тот самый наряд, который завёл сценарий, — по его адресу, а
       не по первой попавшейся строке: на стенде у монтажника может оказаться
       и чужая работа, назначенная другим сценарием. */
    await page.locator(`a[href="/admin/orders/${fixture.orderId}"]`).first().click();
    await page.waitForURL(new RegExp(`/admin/orders/${fixture.orderId}`));

    /* 🔴 Смена статуса ждёт дольше умолчания: на стенде обработчик
       `/api/admin/orders/[id]` собирается по первому обращению, и «Сохраняем…»
       держится секунды. Пять секунд по умолчанию попадают ровно в эту сборку —
       падает не форма, а холодный старт. */
    const statusSaved = page.getByText(texts.statusSaved);

    // ——— Принять в работу
    await page.getByLabel(texts.statusTitle).selectOption(ORDER_STATUS_TITLE.in_progress);
    await expect(statusSaved).toBeVisible({ timeout: 30_000 });

    // ——— Расход: две позиции с количеством
    await page.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.materials }).click();
    await expect(page).toHaveURL(/tab=materials/);

    for (const [index, qty] of [4, 2].entries()) {
      const item = fixture.itemIds[index];
      if (item === undefined) throw new Error('Фикстура завела меньше позиций, чем нужно');

      /* 🔴 `exact: true`: у чеклиста выезда галочки подписаны «Позиция 1, …»,
         и нестрогий поиск по подписи «Позиция» цепляет их вместе с полем
         выбора — три узла на одно имя. */
      await page.getByLabel(texts.consumeItem, { exact: true }).selectOption(item);
      await page.getByLabel(texts.consumeQty, { exact: true }).fill(String(qty));
      await page.getByRole('button', { name: texts.consumeSubmit }).click();
      await expect(page.getByText(texts.consumeDone)).toBeVisible();
    }

    /* Обе строки видны в журнале движений по наряду — это и есть «расход
       записан», а не «форма отправилась». */
    await expect(page.getByRole('row').filter({ hasText: 'Труба медная' })).toHaveCount(1);
    await expect(page.getByRole('row').filter({ hasText: 'Кронштейны' })).toHaveCount(1);

    // ——— Документы: фото «после»
    await page.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.documents }).click();
    await expect(page).toHaveURL(/tab=documents/);

    await page.getByLabel(texts.photoAdd(PHOTO_STAGE_TITLE.after)).setInputFiles({
      name: 'after.png',
      mimeType: 'image/png',
      /* Однопиксельный PNG: проверяется путь загрузки, а не картинка. */
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      ),
    });

    /* Тот же холодный старт, что у статуса: обработчик `/photos` собирается по
       первому обращению, и список снимков обновляется после ответа. */
    await expect(page.getByAltText(texts.photoAlt(PHOTO_STAGE_TITLE.after, 1))).toBeVisible({
      timeout: 30_000,
    });

    // ——— Закрыть наряд
    await page.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.job }).click();
    await page.getByLabel(texts.statusTitle).selectOption(ORDER_STATUS_TITLE.done);
    await expect(statusSaved).toBeVisible({ timeout: 30_000 });

    // ——— 🔴 Проверка в базе, а не на экране
    const stored = await api.get(`/api/admin/orders/${fixture.orderId}`);
    expect(stored.status).toBe('done');

    const consumption = await api.get(`/api/admin/orders/${fixture.orderId}/consumption`);
    const items = consumption.items;
    expect(Array.isArray(items) ? items.length : 0).toBe(2);
  } finally {
    await cleanup(api, fixture);
    await api.dispose();
  }
});
