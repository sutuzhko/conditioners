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

const leadSchema = z.object({
  id: z.string(),
  name: z.string(),
  phone: z.string(),
  status: z.string(),
});
const leadListSchema = z.array(leadSchema);
export type AdminLead = z.infer<typeof leadSchema>;

const reviewSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
});
const reviewListSchema = z.array(reviewSchema);
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

  /** Вход в панель; возвращает клиента с сессией. */
  static async login(): Promise<AdminApi> {
    const context = await request.newContext({ baseURL: BASE_URL });
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

  async listLeads(status?: string): Promise<readonly AdminLead[]> {
    const response = await this.context.get('/api/admin/leads', {
      headers: { Cookie: this.cookie },
      params: status === undefined ? {} : { status },
    });
    return leadListSchema.parse(await this.json(response, 'список заявок'));
  }

  /**
   * Единственная «уборка», которую контракт даёт для заявки: DELETE в
   * docs/API.md §8 нет, поэтому запись закрывается статусом «отклонена»
   * с пояснением в комментарии менеджера.
   */
  async closeLead(id: string, managerComment: string): Promise<void> {
    const response = await this.context.patch(`/api/admin/leads/${id}`, {
      headers: { Cookie: this.cookie },
      data: { status: 'rejected', managerComment },
    });
    await this.json(response, 'закрытие заявки');
  }

  async listReviews(status?: string): Promise<readonly AdminReview[]> {
    const response = await this.context.get('/api/admin/reviews', {
      headers: { Cookie: this.cookie },
      params: status === undefined ? {} : { status },
    });
    return reviewListSchema.parse(await this.json(response, 'список отзывов'));
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

  private async json(response: APIResponse, what: string): Promise<unknown> {
    if (response.status() !== 200) {
      throw new Error(`Запрос «${what}» вернул код ${response.status()}`);
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
