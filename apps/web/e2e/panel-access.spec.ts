import { expect, test, type Page } from '@playwright/test';

import { FORBIDDEN_CONTENT } from '@/app/forbidden-content';

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
        /* 🔴 Подписи вкладок в теле отказа остаются, и это не упущение
           проверки, а свойство потока: заготовку раздела (`loading.tsx`) Next
           отдаёт немедленно, ещё до того, как рубеж успевает отказать. Данных
           в ней нет — только подписи, которые монтажник и так знает: выплаты
           он получает. Проверять здесь надо то, чего он знать не должен, — и
           это имя с телефоном выше. Убрать подписи можно только заготовкой
           без подписей, а она перестанет повторять геометрию готовой
           страницы (ADR-239); решение об этом за владельцем. */
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

         Код при этом 200, а не 404, и это не поблажка проверке, а свойство
         потока: у карточки есть заготовка (`loading.tsx`), Next отдаёт её
         немедленно вместе с заголовками, и `notFound()` из страницы меняет уже
         только тело. Проверяется поэтому то, что действительно важно и что
         действительно достижимо: экрана наряда нет, данных чужого объекта нет.
         Честный код обсуждается в issue #525. */
      const alienCard = await get(page, `/admin/orders/${other.id}`);
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
