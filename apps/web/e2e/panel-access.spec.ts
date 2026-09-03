import { expect, test, type Page } from '@playwright/test';

import { FORBIDDEN_CONTENT } from '@/app/forbidden-content';

import { BASE_URL, withAdmin, type AdminOrder } from './support/admin-api';
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

const PROBE = {
  name: 'Монтажник Доступа',
  login: 'access-probe',
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

async function get(page: Page, path: string): Promise<{ status: number; body: string }> {
  const response = await page.request.get(path);
  return { status: response.status(), body: await response.text() };
}

/** Сумма в теле ответа: ищем и «60000», и «60 000» с любым видом пробела. */
function mentionsMoney(body: string, amount: number): boolean {
  const digits = String(amount);
  if (digits.length < 4) return false;

  const spaced = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '[\\s\\u00a0\\u202f]?');
  return new RegExp(spaced).test(body);
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

    try {
      await loginViaUi(page, { login: PROBE.login, password: PROBE.password });

      /* Свою карточку монтажник тоже не открывает: раздел «Монтажники» —
         владельческий целиком, а личные данные правятся в профиле. */
      for (const tab of ['account', 'orders', 'payouts', 'notes']) {
        const { status, body } = await get(page, `/admin/team/${created.id}?tab=${tab}`);

        expect(status, `вкладка ${tab} обязана отвечать отказом`).toBe(403);
        /* Ни выплат, ни удержаний, ни заметок владельца — ни одной подписи
           закрытых вкладок в теле отказа быть не может. */
        expect(body).not.toContain('Выплаты и удержания');
        expect(body).not.toContain('Заметки владельца');
      }
    } finally {
      await withAdmin((api) => api.deleteStaff(created.id));
    }
  });

  test('🔴 свой наряд открыт без выручки, чужого для монтажника нет', async ({ page }) => {
    const created = await withAdmin((api) => api.createInstaller(PROBE));

    /* Наряд с суммой — то, на чём проверка вообще имеет смысл: у наряда без
       денег «сумма не пришла» верно и при полном провале разграничения. */
    const orders = await withAdmin((api) => api.listOrders());
    const own = orders.find((order) => (order.price ?? 0) >= 1000);
    const alien = orders.find((order) => order.id !== own?.id);

    test.skip(
      own === undefined || alien === undefined,
      'на стенде нет двух нарядов, один из которых с суммой',
    );

    const mine = own as AdminOrder;
    const other = alien as AdminOrder;
    const wasMine = mine.installer?.id ?? null;

    try {
      await withAdmin((api) => api.assignOrder(mine.id, created.id));
      await loginViaUi(page, { login: PROBE.login, password: PROBE.password });

      const ownCard = await get(page, `/admin/orders/${mine.id}`);
      expect(ownCard.status, 'свой наряд открыт').toBe(200);
      expect(ownCard.body, 'номер своего наряда виден').toContain(String(mine.number));

      /* 🔴 Выручка компании монтажнику не приходит вовсе: своя выплата — его
         деньги, сумма заказа — нет (ADR-114). При оплате наличными сумма
         приходит намеренно, поэтому проверяем только безналичный наряд. */
      if (mine.price !== undefined) {
        expect(
          mentionsMoney(ownCard.body, mine.price),
          'сумма заказа не должна приезжать монтажнику',
        ).toBe(false);
      }

      const alienCard = await get(page, `/admin/orders/${other.id}`);
      expect(alienCard.status, 'чужого наряда для монтажника не существует').toBe(404);
      expect(alienCard.body, 'адреса чужого объекта в теле нет').not.toContain(other.address);
    } finally {
      await withAdmin(async (api) => {
        await api.assignOrder(mine.id, wasMine);
        await api.deleteStaff(created.id);
      });
    }
  });
});
