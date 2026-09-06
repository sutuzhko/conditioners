import { request, type APIRequestContext, type APIResponse } from '@playwright/test';
import { z } from 'zod';

/**
 * Доступ к админ-API из сквозных тестов: вход, чтение и уборка своих записей.
 *
 * Cookie сессии переносится вручную заголовком, а не кук-хранилищем контекста.
 * С ADR-102 флаг Secure стоит только на https-стендах, и по http хранилище
 * сессию удержит, — но перенос заголовком работает на любом стенде одинаково,
 * тогда как хранилище на https-прогоне снова стало бы зависеть от того, какой
 * адрес указан в E2E_BASE_URL.
 */

/**
 * Базовый адрес сценариев. Умолчание — localhost, а не `web:3000` из
 * playwright.config: тесты работают в том же контейнере, что и дев-сервер.
 */
export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

/** Дев-учётка панели. На другом стенде перекрывается переменными окружения. */
export const ADMIN_LOGIN = process.env.E2E_ADMIN_LOGIN ?? 'admin';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'admin';

/* Схемы ответов: тесту нужны только поля, по которым он находит и убирает
   свои записи, — остальное Zod отбрасывает. */

const crmEventSchema = z.object({ id: z.string() });

const staffSchema = z.object({ id: z.string(), login: z.string() });

/**
 * Наряд глазами владельца — ровно те поля, по которым сценарий доступа
 * выбирает наряд, переназначает его и потом ищет в теле ответа сумму,
 * которой монтажнику видеть не положено (CRM.md §6).
 */
const orderSchema = z.object({
  id: z.string(),
  number: z.number(),
  address: z.string(),
  price: z.number().optional(),
  installerFee: z.number(),
  installer: z.object({ id: z.string() }).nullable(),
});
export type AdminOrder = z.infer<typeof orderSchema>;

const searchSchema = z.object({ items: z.array(z.object({ id: z.string() })) });

const leadSchema = z.object({
  id: z.string(),
  /** Номер обращения — им сценарий находит свою строку в очереди (ADR-114). */
  number: z.number(),
  name: z.string(),
  phone: z.string(),
  status: z.string(),
});

/**
 * Списки админки приходят страницами: `{ items, total, page, pages }`
 * (docs/API.md §7, §8). Помощнику нужны сами записи — свежие лежат на первой
 * странице, а тесты ищут только что созданную.
 */
const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), page: z.number(), pages: z.number() });

const leadListSchema = pageOf(leadSchema);
const orderListSchema = pageOf(orderSchema);
export type AdminLead = z.infer<typeof leadSchema>;

/**
 * Модель и статья глазами сценария разбивки: id — чтобы убрать за собой,
 * имя и адрес — чтобы найти свою строку в списке панели (issue #616).
 */
const productSchema = z.object({ id: z.string(), name: z.string(), slug: z.string() });
export type AdminProduct = z.infer<typeof productSchema>;

const articleSchema = z.object({ id: z.string(), title: z.string(), slug: z.string() });
export type AdminArticle = z.infer<typeof articleSchema>;

const reviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
});
const reviewListSchema = pageOf(reviewSchema);
export type AdminReview = z.infer<typeof reviewSchema>;

const pricesSchema = z.object({
  prices: z.array(
    z.object({
      cls: z.string(),
      power: z.string(),
      area: z.string(),
      price: z.number(),
      term: z.string(),
    }),
  ),
  // ставки могут быть не заполнены владельцем — тогда прайс трогать нельзя:
  // PUT требует extras, и вернуть базу в состояние «не задано» уже не выйдет
  extras: z
    .object({
      trassaPerM: z.number(),
      shtrobPerM: z.number(),
      heightWorks: z.number(),
      trassaIncludedM: z.number(),
      heightFloorFrom: z.number(),
    })
    .nullable(),
});
export type PricesPayload = z.infer<typeof pricesSchema>;

export class AdminApi {
  private constructor(
    private readonly context: APIRequestContext,
    private readonly cookie: string,
  ) {}

  /**
   * Вход в панель; возвращает клиента с сессией.
   *
   * 🔴 Своё ожидание, длиннее общего: вход — это подготовка сценария, а не его
   * проверка, и на стенде обработчик собирается по первому обращению. Общие
   * пятнадцать секунд приходятся ровно на сборку, и сценарий падает на
   * подготовке — там, где ещё нечего проверять.
   */
  static async login(): Promise<AdminApi> {
    const context = await request.newContext({ baseURL: BASE_URL, timeout: 60_000 });
    const response = await context.post('/api/auth/login', {
      data: { login: ADMIN_LOGIN, password: ADMIN_PASSWORD },
    });
    if (response.status() !== 204) {
      throw new Error(`Вход в админку из теста не удался: код ${response.status()}`);
    }

    const header = response
      .headersArray()
      .find(
        ({ name, value }) => name.toLowerCase() === 'set-cookie' && value.startsWith('session='),
      );
    const cookie = header?.value.split(';')[0];
    if (cookie === undefined || cookie === '') {
      throw new Error('Сервер не выдал cookie сессии при входе');
    }

    return new AdminApi(context, cookie);
  }

  /** Разлогин и закрытие контекста: тест не оставляет сессий в базе. */
  async dispose(): Promise<void> {
    await this.context
      .post('/api/auth/logout', { headers: { Cookie: this.cookie } })
      .catch(() => undefined);
    await this.context.dispose();
  }

  /**
   * Отправка публичной формы тем же путём, каким она приходит с сайта:
   * `multipart/form-data`, без cookie панели.
   *
   * 🔴 Сценарию нужна настоящая заявка — со снимком согласия, происхождением и
   * записью в очередь уведомлений (инвариант 2). Вставить строку в базу мимо
   * формы значило бы проверять удаление того, чего форма не создаёт.
   */
  async postPublicForm(path: string, form: URLSearchParams): Promise<APIResponse> {
    return this.context.post(path, {
      multipart: Object.fromEntries(form.entries()),
    });
  }

  async listLeads(status?: string): Promise<readonly AdminLead[]> {
    const response = await this.context.get('/api/admin/leads', {
      headers: { Cookie: this.cookie },
      params: status === undefined ? {} : { status },
    });
    return leadListSchema.parse(await this.json(response, 'список заявок')).items;
  }

  /**
   * Мягкая уборка: своя запись закрывается отказом с пояснением, а не
   * удаляется. Так сценарий не трогает историю обращений на стенде — удаление
   * проверяется отдельным сценарием (`lead-delete.spec.ts`, #605).
   *
   * 🔴 Причина отказа обязательна (ADR-310): отмена без разбора причины
   * отклоняется схемой на границе.
   */
  async closeLead(id: string, managerComment: string): Promise<void> {
    const response = await this.context.patch(`/api/admin/leads/${id}`, {
      headers: { Cookie: this.cookie },
      data: { status: 'rejected', cancelReason: 'other', managerComment },
    });
    await this.json(response, 'закрытие заявки');
  }

  /**
   * 🔴 Уничтожение обращения — исполнение требования 152-ФЗ (#600). Отдельно
   * от `closeLead`: отменённое обращение остаётся в истории, удалённого не
   * остаётся нигде.
   */
  async deleteLead(id: string): Promise<void> {
    const response = await this.context.delete(`/api/admin/leads/${id}`, {
      headers: { Cookie: this.cookie },
    });
    if (response.status() !== 204) {
      throw new Error(`Удаление заявки не удалось: код ${response.status()}`);
    }
  }

  /** Есть ли обращение в базе — по нему сценарий удаления проверяет результат. */
  async findLead(id: string): Promise<AdminLead | null> {
    const response = await this.context.get(`/api/admin/leads/${id}`, {
      headers: { Cookie: this.cookie },
    });
    if (response.status() === 404) return null;

    return leadSchema.parse(await this.json(response, 'обращение'));
  }

  /**
   * Перевод заявки в статус: сценарии состояний освобождают статус от записей,
   * чтобы увидеть «ничего не найдено», и возвращают всё как было.
   */
  async setLeadStatus(id: string, status: string): Promise<void> {
    const response = await this.context.patch(`/api/admin/leads/${id}`, {
      headers: { Cookie: this.cookie },
      /* Отказ без причины схема не принимает (ADR-310): она обязательна
         ровно у этого перехода и запрещена у остальных. */
      data: status === 'rejected' ? { status, cancelReason: 'other' } : { status },
    });
    await this.json(response, `перевод заявки в «${status}»`);
  }

  /**
   * Монтажник, которому ничего не назначено: единственный способ увидеть
   * раздел нарядов пустым на стенде, где демо-данные есть у всех.
   */
  async createInstaller(input: {
    readonly name: string;
    readonly login: string;
    readonly phone: string;
    readonly password: string;
  }): Promise<{ id: string; login: string }> {
    const response = await this.context.post('/api/admin/staff', {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      /* Заведённый монтажник активен по умолчанию — это умолчание схемы базы;
         поля `active` у схемы заведения нет вовсе, и лишний ключ она отвергает. */
      data: { ...input, employment: '', inn: '' },
    });
    if (response.status() !== 201) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Создание монтажника вернуло код ${response.status()}${detail === '' ? '' : `: ${detail}`}`,
      );
    }
    return staffSchema.parse(await response.json());
  }

  /** Наряды владельца: сценарию доступа нужен чужой наряд и свой. */
  async listOrders(tab = 'all'): Promise<readonly AdminOrder[]> {
    const response = await this.context.get('/api/admin/orders', {
      headers: { Cookie: this.cookie },
      params: { tab },
    });
    return orderListSchema.parse(await this.json(response, 'список нарядов')).items;
  }

  /**
   * Переназначение наряда: сценарий доступа делает наряд «своим» для
   * заведённого монтажника и возвращает исполнителя как было.
   */
  /**
   * 🔴 Исполнитель и статус переносятся вместе, а не порознь: домен считает их
   * одной парой (`orderPairIssue`), и наряд «Новый» с исполнителем — как и
   * «Назначен» без него — состояние, из которого он сам не выйдет. Одиночный
   * `installerId` сервер отклоняет кодом 400, и правильно делает.
   */
  /**
   * Наряд под сценарий: со своей суммой, без исполнителя и без клиента.
   *
   * 🔴 Заводится, а не выбирается среди демонстрационных: наряд с суммой и
   * свободным исполнителем на стенде бывает, а бывает и нет — и сценарий,
   * который тогда пропускает себя, ничего не проверяет, но выглядит зелёным.
   */
  async createOrder(input: {
    readonly clientId: string;
    readonly address: string;
    readonly price: number;
  }): Promise<{ id: string; number: number }> {
    const response = await this.context.post('/api/admin/orders', {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      data: {
        type: 'install',
        clientId: input.clientId,
        day: new Date().toISOString().slice(0, 10),
        time: '10:00',
        durationMin: 120,
        address: input.address,
        payment: 'company',
        price: input.price,
        installerFee: 3_000,
      },
    });
    if (response.status() !== 201) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Создание наряда вернуло код ${response.status()}: ${detail}`);
    }
    return orderSchema.pick({ id: true, number: true }).parse(await response.json());
  }

  /** Клиент под сценарий: наряд без клиента завести нельзя. */
  async createClient(input: {
    readonly name: string;
    readonly phone: string;
    readonly address: string;
  }): Promise<{ id: string }> {
    const response = await this.context.post('/api/admin/clients', {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      data: { ...input, note: '' },
    });
    if (response.status() !== 201) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Создание клиента вернуло код ${response.status()}${detail === '' ? '' : `: ${detail}`}`,
      );
    }
    return z.object({ id: z.string() }).parse(await response.json());
  }

  async deleteClient(id: string): Promise<void> {
    await this.context.delete(`/api/admin/clients/${id}`, { headers: { Cookie: this.cookie } });
  }

  async deleteOrder(id: string): Promise<void> {
    await this.context.delete(`/api/admin/orders/${id}`, { headers: { Cookie: this.cookie } });
  }

  async assignOrder(id: string, installerId: string | null): Promise<void> {
    const response = await this.context.patch(`/api/admin/orders/${id}`, {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      data: { installerId, status: installerId === null ? 'new' : 'assigned' },
    });
    await this.json(response, 'назначение наряда');
  }

  /**
   * Групповое назначение — issue #596. Ответ говорит, сколько нарядов
   * действительно назначено: половина назначенных при отказе на середине
   * должна быть видна вызывающему, а не спрятана за общим «ошибка».
   */
  async assignMany(
    ids: readonly string[],
    installerId: string,
  ): Promise<{ assigned: number; failed: string[] }> {
    const response = await this.context.post('/api/admin/orders/assign', {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      data: { ids: [...ids], installerId },
    });

    return z
      .object({ assigned: z.number(), failed: z.array(z.string()) })
      .parse(await this.json(response, 'групповое назначение'));
  }

  /**
   * Перевод наряда в отказ — issue #627. Причина отдельным полем: без неё
   * сервер обязан отказать, и сценарий проверяет именно это.
   */
  async cancelOrder(
    id: string,
    body: Record<string, unknown>,
  ): Promise<{ status: number; text: string }> {
    const response = await this.context.patch(`/api/admin/orders/${id}`, {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      data: { status: 'cancelled', ...body },
    });

    return { status: response.status(), text: await response.text() };
  }

  /** Наряд целиком: сценарию нужны поля отказа, которых нет в списке. */
  async getOrder(id: string): Promise<Record<string, unknown>> {
    const response = await this.context.get(`/api/admin/orders/${id}`, {
      headers: { Cookie: this.cookie },
    });

    return z.record(z.unknown()).parse(await this.json(response, 'наряд'));
  }

  /**
   * Модель под сценарий разбивки каталога.
   *
   * 🔴 Скидки здесь нет: её задаёт отдельная ручка (ADR-011), и просить её
   * тут — значит заводить второе место рождения перечёркнутой цены.
   */
  async createProduct(input: {
    readonly name: string;
    readonly badge: string;
    readonly areaMax: number;
    readonly priceNum: number;
    readonly sort: number;
  }): Promise<AdminProduct> {
    const response = await this.context.post('/api/admin/models', {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      data: { ...input, visible: true, featured: false },
    });
    if (response.status() !== 201) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Создание модели вернуло код ${response.status()}${detail === '' ? '' : `: ${detail}`}`,
      );
    }
    return productSchema.parse(await response.json());
  }

  async deleteProduct(id: string): Promise<void> {
    await this.context.delete(`/api/admin/models/${id}`, { headers: { Cookie: this.cookie } });
  }

  /** Статья под сценарий разбивки базы знаний. */
  async createArticle(input: {
    readonly title: string;
    readonly category: string;
    readonly date: string;
    readonly minutes: number;
    readonly excerpt: string;
    readonly body: string;
    readonly published: boolean;
  }): Promise<AdminArticle> {
    const response = await this.context.post('/api/admin/articles', {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      data: input,
    });
    if (response.status() !== 201) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Создание статьи вернуло код ${response.status()}${detail === '' ? '' : `: ${detail}`}`,
      );
    }
    return articleSchema.parse(await response.json());
  }

  async deleteArticle(id: string): Promise<void> {
    await this.context.delete(`/api/admin/articles/${id}`, { headers: { Cookie: this.cookie } });
  }

  async deleteStaff(id: string): Promise<void> {
    await this.context.delete(`/api/admin/staff/${id}`, { headers: { Cookie: this.cookie } });
  }

  async listReviews(status?: string): Promise<readonly AdminReview[]> {
    const response = await this.context.get('/api/admin/reviews', {
      headers: { Cookie: this.cookie },
      params: status === undefined ? {} : { status },
    });
    return reviewListSchema.parse(await this.json(response, 'список отзывов')).items;
  }

  async deleteReview(id: string): Promise<void> {
    const response = await this.context.delete(`/api/admin/reviews/${id}`, {
      headers: { Cookie: this.cookie },
    });
    if (response.status() !== 204) {
      throw new Error(`Удаление отзыва не удалось: код ${response.status()}`);
    }
  }

  async getPrices(): Promise<PricesPayload> {
    const response = await this.context.get('/api/admin/prices', {
      headers: { Cookie: this.cookie },
    });
    return pricesSchema.parse(await this.json(response, 'прайс'));
  }

  /** Возврат прайса снимком, снятым до правок. Прайс заменяется целиком. */
  async putPrices(payload: PricesPayload): Promise<void> {
    if (payload.extras === null) {
      throw new Error('Снимок без ставок допработ: PUT требует extras, возвращать нечем');
    }
    const response = await this.context.put('/api/admin/prices', {
      headers: { Cookie: this.cookie },
      data: payload,
    });
    await this.json(response, 'запись прайса');
  }

  /** Группа настроек как есть — снимок для восстановления после теста. */
  async getSetting(key: string): Promise<unknown> {
    const response = await this.context.get(`/api/admin/settings/${key}`, {
      headers: { Cookie: this.cookie },
    });
    return this.json(response, `настройки «${key}»`);
  }

  async putSetting(key: string, value: unknown): Promise<void> {
    const response = await this.context.put(`/api/admin/settings/${key}`, {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      data: value,
    });
    if (response.status() !== 200) {
      throw new Error(`Сохранение настроек «${key}» вернуло код ${response.status()}`);
    }
  }

  /** Дело календаря — заводится ради проверки и удаляется в `finally`. */
  async createCrmEvent(input: Record<string, unknown>): Promise<{ id: string }> {
    const response = await this.context.post('/api/admin/crm', {
      headers: { Cookie: this.cookie, 'content-type': 'application/json' },
      data: input,
    });
    if (response.status() !== 201) {
      throw new Error(`Создание дела вернуло код ${response.status()}`);
    }
    return crmEventSchema.parse(await response.json());
  }

  async deleteCrmEvent(id: string): Promise<void> {
    await this.context.delete(`/api/admin/crm/${id}`, { headers: { Cookie: this.cookie } });
  }

  /** Находки поиска. Разбираем только `id`: остальное проверяют юниты. */
  async searchCrm(query: string): Promise<{ id: string }[]> {
    const response = await this.context.get(
      `/api/admin/crm/search?q=${encodeURIComponent(query)}`,
      { headers: { Cookie: this.cookie } },
    );
    const body = searchSchema.parse(await this.json(response, 'поиск по календарю'));
    return body.items;
  }

  private async json(response: APIResponse, what: string): Promise<unknown> {
    if (response.status() !== 200) {
      /* 🔴 Тело отказа — в сообщении. Код без причины превращает каждое
         падение сценария в угадайку: «400» одинаково выглядит и при опечатке
         в поле, и при нарушении доменного правила, а ответ уже содержит
         поле и объяснение. */
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Запрос «${what}» вернул код ${response.status()}${detail === '' ? '' : `: ${detail}`}`,
      );
    }
    const body: unknown = await response.json();
    return body;
  }
}

/** Вход, действие, разлогин — чтобы ни один путь не оставил сессию открытой. */
export async function withAdmin<T>(action: (api: AdminApi) => Promise<T>): Promise<T> {
  const api = await AdminApi.login();
  try {
    return await action(api);
  } finally {
    await api.dispose();
  }
}
