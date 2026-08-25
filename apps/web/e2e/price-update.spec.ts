import { expect, test, type Page } from '@playwright/test';

import { BASE_URL, withAdmin, type PricesPayload } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Сквозной сценарий из docs/CLAUDE.md («Тестирование»): вход в админку →
 * правка цены → цена обновилась на сайте.
 *
 * 🔴 В дев-базе настоящий прайс владельца. До правки снимается снимок через
 * админ-API; цена возвращается на исходную тем же интерфейсом, а страховкой
 * в afterEach — PUT-ом снимка, так что даже упавший тест не оставляет чужих
 * цифр. В деве страницы рендерятся на каждый запрос, ревалидацию ждать не
 * нужно.
 */

test.use({ baseURL: BASE_URL });

/** «от 16 111 ₽» — так цену печатает таблица прайса (widgets/pricing). */
function priceFrom(value: number): string {
  const digits = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
  // сайт разделяет разряды неразрывным пробелом, но сравнение Playwright
  // нормализует пробелы — обычного достаточно
  return `от ${digits.replace(/\s/g, ' ')} ₽`;
}

/**
 * Форма прайса — клиентская: до гидрации ввод не попадает в состояние React,
 * и «Сохранить» ушёл бы со старыми цифрами. Признак живой формы — кнопка
 * «Добавить класс» реально добавляет строку; добавленное тут же убирается,
 * на сервер до нажатия «Сохранить» ничего не уходит.
 */
async function waitPricesFormAlive(page: Page): Promise<void> {
  const rows = page.locator('input[aria-label^="Класс "]');
  const before = await rows.count();

  await expect(async () => {
    await page.getByRole('button', { name: 'Добавить класс' }).click();
    expect(await rows.count()).toBeGreaterThan(before);
  }).toPass({ timeout: 45_000 });

  // повторные клики из цикла ожидания могли добавить несколько пустых строк
  for (let guard = 0; guard < 10 && (await rows.count()) > before; guard += 1) {
    await page
      .getByRole('button', { name: /^Удалить строку/ })
      .last()
      .click();
  }
  expect(await rows.count()).toBe(before);
}

test.describe('Правка цены монтажа', () => {
  let snapshot: PricesPayload | null = null;

  test.afterEach(async ({ page }) => {
    // сессия UI-входа гасится, чтобы прогоны не копили записи Session в базе
    await page.request.post('/api/auth/logout').catch(() => undefined);

    if (snapshot === null) return;
    // страховка на случай падения: прайс возвращается снимком, снятым до правок
    const restore = snapshot;
    snapshot = null;
    await withAdmin(async (admin) => admin.putPrices(restore));
  });

  test('новая цена доезжает до лендинга и возвращается обратно', async ({ page }) => {
    // шесть переходов по страницам: в деве каждую сервер может собирать с нуля
    test.slow();

    const current = await withAdmin(async (admin) => admin.getPrices());
    if (current.extras === null) {
      throw new Error('Ставки допработ не заполнены: PUT их не вернёт, прайс не трогаем');
    }
    const first = current.prices[0];
    if (first === undefined) {
      throw new Error('Прайс пуст — сценарию нечего править');
    }
    snapshot = current;

    const original = first.price;
    // величина не совпадает ни с одной строкой прайса: проверка «новая цена
    // видна, старой нет» не должна спотыкаться о соседний класс
    const taken = new Set(current.prices.map((row) => row.price));
    let updated = original + 111;
    while (taken.has(updated)) updated += 1;
    // старая цена первой строки уникальна? иначе «старой не осталось» не проверить
    const originalUnique = current.prices.filter((row) => row.price === original).length === 1;

    await loginViaUi(page);
    await page.goto('/admin/prices');
    await waitPricesFormAlive(page);

    const firstPrice = page.locator('input[aria-label="Цена монтажа, ₽ 1"]');
    await expect(firstPrice).toHaveValue(String(original));
    await firstPrice.fill(String(updated));
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(
      page.getByText('Сохранено. Калькулятор на сайте уже считает по новым цифрам'),
    ).toBeVisible({ timeout: 30_000 });

    // лендинг в деве рендерится на каждый запрос — новая цена видна сразу
    await page.goto('/');
    const prices = page.locator('#prices');
    await expect(prices.getByText(priceFrom(updated)).first()).toBeVisible({ timeout: 30_000 });
    if (originalUnique) {
      await expect(prices.getByText(priceFrom(original))).toHaveCount(0);
    }

    // возврат прежней цены — тем же путём, каким её правил бы владелец
    await page.goto('/admin/prices');
    await waitPricesFormAlive(page);
    await expect(firstPrice).toHaveValue(String(updated));
    await firstPrice.fill(String(original));
    await page.getByRole('button', { name: 'Сохранить' }).click();
    await expect(
      page.getByText('Сохранено. Калькулятор на сайте уже считает по новым цифрам'),
    ).toBeVisible({ timeout: 30_000 });

    await page.goto('/');
    await expect(prices.getByText(priceFrom(original)).first()).toBeVisible({ timeout: 30_000 });
    await expect(prices.getByText(priceFrom(updated))).toHaveCount(0);
  });
});
