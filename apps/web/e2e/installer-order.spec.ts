import { expect, test, type APIRequestContext } from '@playwright/test';
import { request } from '@playwright/test';

import {
  ORDER_CARD_TAB_TITLE,
  orderManagerContent as texts,
} from '@/features/order-manager/content';
import { installerContent as own } from '@/features/order-manager/installer-content';

import { ADMIN_LOGIN, ADMIN_PASSWORD, BASE_URL } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * 🔴 Путь монтажника на объекте целиком — issue #621, веха «Соответствие ·
 * Фаза 10». Отменяет прежний сценарий закрытия наряда выпадающим списком
 * статуса (issue #348): такого экрана больше нет.
 *
 * От входа до записи в базе: вход → наряд дня → «Открыть наряд» → «Принять в
 * работу» → «Расход», две позиции с количеством → «Работа выполнена» → сдача:
 * снимки «после», итог работ → «Сдать работу» → проверка в базе.
 *
 * 🔴 Проверка идёт до базы, а не до экрана. Юнит на обработчик показывает, что
 * функция вызвана; что наряд действительно закрыт, отчёт записан, а расход
 * действительно списан, видно только отсюда — тем же контрактом
 * `/api/admin/*`, которым данные и читаются.
 *
 * 🔴 Проверяется и то, чего монтажник видеть не должен: своей же сессией он
 * читает свой наряд (в ответе нет ни суммы, ни заметки владельца, ни
 * удержания — ADR-114) и чужой (404, а не 403 — существование чужого наряда
 * его не касается).
 *
 * Всё, что нужно сценарию, он заводит сам и убирает за собой: свой монтажник,
 * свой клиент, своя зона хранения с материалом и свои наряды. Демо-данные
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
  /** Наряд без исполнителя: монтажник его не видит и не должен находить. */
  readonly foreignOrderId: string;
  readonly orderNumber: number;
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

  /* 🔴 Наряд без исполнителя: для монтажника его не существует. Заводится
     здесь, а не отдельным сценарием, — проверка стоит одного запроса. */
  const foreign = await api.post('/api/admin/orders', {
    type: 'service',
    clientId,
    day: today(),
    time: '16:00',
    durationMin: 60,
    address: 'Тула, Первомайская, 1, кв. 9',
    payment: 'company',
    price: 4_000,
    installerFee: 1_000,
    units: [],
  });

  const number = order.number;

  return {
    installerId,
    installerLogin: `e2e-installer-${stamp}`,
    clientId,
    orderId: idOf(order, 'наряд'),
    foreignOrderId: idOf(foreign, 'чужой наряд'),
    orderNumber: typeof number === 'number' ? number : 0,
    zoneId,
    itemIds,
  };
}

/** Уборка в обратном порядке: наряд, движения склада, позиции, зона, люди. */
async function cleanup(api: OwnerApi, fixture: Fixture | null): Promise<void> {
  if (fixture === null) return;

  await api.remove(`/api/admin/orders/${fixture.orderId}`);
  await api.remove(`/api/admin/orders/${fixture.foreignOrderId}`);
  for (const itemId of fixture.itemIds) await api.remove(`/api/admin/stock/items/${itemId}`);
  await api.remove(`/api/admin/stock/zones/${fixture.zoneId}`);
  await api.remove(`/api/admin/clients/${fixture.clientId}`);
  await api.remove(`/api/admin/staff/${fixture.installerId}`);
}

test('🔴 монтажник проходит объект целиком, и записи появляются в базе', async ({ page }) => {
  /* 🔴 Сценарий длиннее прочих, и это не запас «на всякий случай»: он заводит
     монтажника, клиента, зону хранения, две позиции склада с приходом и два
     наряда, потом проходит вход, наряд дня, приём в работу, два списания,
     загрузку снимков и сдачу. На стенде каждый маршрут собирается по первому
     обращению — только сборка съедает больше минуты, — и общие 90 секунд
     заканчиваются на полпути. В CI приложение собрано заранее, и сценарий
     укладывается вчетверо быстрее. */
  test.setTimeout(300_000);

  const api = await OwnerApi.login();
  let fixture: Fixture | null = null;

  try {
    fixture = await seed(api);

    // ——— Вход монтажника и его наряд дня
    await loginViaUi(page, { login: fixture.installerLogin, password: INSTALLER_PASSWORD });

    await page.goto('/admin/orders');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(texts.installerTitle);

    /* 🔴 Это не таблица владельца в карточках (issue #633): ни колонок, ни
       фильтра по исполнителю — вместо них сводка дня и группы по времени. */
    await expect(page.getByRole('columnheader')).toHaveCount(0);
    await expect(page.getByLabel(texts.installerLabel)).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: own.whenLabel })).toBeVisible();

    /* 🔴 Свой наряд читается его же сессией: ни суммы, ни заметки владельца,
       ни удержания в ответе нет вовсе — они не приходят, а не прячутся
       стилем (ADR-114). */
    const mine = await page.request.get(`/api/admin/orders/${fixture.orderId}`);
    expect(mine.status()).toBe(200);
    const projection: Record<string, unknown> = await mine.json();
    expect(projection.price).toBeUndefined();
    expect(projection.ownerNote).toBeUndefined();
    expect(projection.deductionSum).toBeUndefined();
    expect(projection.history).toBeUndefined();

    /* 🔴 Чужой наряд — 404, а не 403: отказ подтвердил бы, что он есть. */
    const foreign = await page.request.get(`/api/admin/orders/${fixture.foreignOrderId}`);
    expect(foreign.status()).toBe(404);

    /* Открывается тот самый наряд, который завёл сценарий, — по его адресу, а
       не по первой попавшейся карточке: на стенде у монтажника может оказаться
       и чужая работа, назначенная другим сценарием. */
    await page.locator(`a[href="/admin/orders/${fixture.orderId}"]`).first().click();
    await page.waitForURL(new RegExp(`/admin/orders/${fixture.orderId}`));

    // ——— Приём в работу: одно действие, а не выбор из списка статусов
    await page.getByRole('button', { name: own.take }).click();
    await expect(page.getByRole('link', { name: own.finish })).toBeVisible({ timeout: 30_000 });

    const takenUp = await api.get(`/api/admin/orders/${fixture.orderId}`);
    expect(takenUp.status).toBe('in_progress');

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

    // ——— Сдача работы: свой экран, а не вкладка карточки (issue #632)
    await page.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.job }).click();
    await page.getByRole('link', { name: own.finish }).click();
    await page.waitForURL(new RegExp(`/admin/orders/${fixture.orderId}/handover`));

    /* 🔴 Без снимков сдать нельзя, и экран называет остаток числом, а не
       пишет «нужно 2»: дефект макета, снятый в issue #632. */
    const submit = page.getByRole('button', { name: new RegExp(own.submit) });
    await expect(submit).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByText(/Загрузите ещё/)).toBeVisible();

    // ——— Снимки «после»: грузим, пока экран не скажет, что хватает
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (
        await page
          .getByText(own.photosReady)
          .isVisible()
          .catch(() => false)
      )
        break;

      await page.getByLabel(own.photoAdd).setInputFiles({
        name: `after-${attempt}.png`,
        mimeType: 'image/png',
        /* Однопиксельный PNG: проверяется путь загрузки, а не картинка. */
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64',
        ),
      });

      /* Холодный старт: обработчик `/photos` собирается по первому обращению,
         и список снимков обновляется только после ответа сервера. */
      await expect(page.getByAltText(new RegExp(`${attempt + 1}$`))).toBeVisible({
        timeout: 30_000,
      });
    }

    await expect(page.getByText(own.photosReady)).toBeVisible();

    // ——— Итог работ и его разбор на трассу и короб
    await page.getByLabel(own.extraWork).fill('Доп. трасса 1,5 м, короб 60×60 — 2 м');
    await expect(page.getByText(own.meters(1.5))).toBeVisible();
    await expect(page.getByText(own.meters(2))).toBeVisible();

    await page.getByLabel(own.report).fill('Блок повешен, вакуумирование 20 минут, проверен.');

    // ——— Сдать работу
    await expect(submit).not.toHaveAttribute('aria-disabled', 'true');
    await submit.click();
    await expect(page.getByText(own.submitted)).toBeVisible({ timeout: 30_000 });

    // ——— 🔴 Проверка в базе, а не на экране
    const stored = await api.get(`/api/admin/orders/${fixture.orderId}`);
    expect(stored.status).toBe('done');
    expect(stored.extraWork).toBe('Доп. трасса 1,5 м, короб 60×60 — 2 м');
    expect(stored.report).toBe('Блок повешен, вакуумирование 20 минут, проверен.');
    expect(stored.resultAt).not.toBeNull();

    const consumption = await api.get(`/api/admin/orders/${fixture.orderId}/consumption`);
    const items = consumption.items;
    expect(Array.isArray(items) ? items.length : 0).toBe(2);

    const photos = stored.photos;
    expect(Array.isArray(photos) ? photos.length : 0).toBeGreaterThanOrEqual(2);
  } finally {
    await cleanup(api, fixture);
    await api.dispose();
  }
});
