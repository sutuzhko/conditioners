import { expect, test } from '@playwright/test';

import { withAdmin } from './support/admin-api';
import { loginViaUi } from './support/admin-ui';

/**
 * Перенос отлучки перетаскиванием — issue #144.
 *
 * 🔴 Сценарий доходит до базы, и это здесь не формальность. Дефект, ради
 * которого он заведён, выглядит как успех: интерфейс объявляет «перенесено»,
 * полоса встаёт на новое место, а запись остаётся прежней — и в понедельник
 * монтажник выходит на работу в свой отпуск. Ни один тест компонента такого
 * не покажет: он видит вызов действия, а не строку в базе.
 *
 * Новые даты читаются **отдельным запросом**, а не из ответа на правку: ответ
 * доказывал бы, что сервер повторил присланное, а не что он это записал.
 */

/** Неделя 1–7 марта 2027: заведомо пустая и заведомо в будущем. */
const WEEK_DAY = '2027-03-03';
const FROM = '2027-03-02';
const TO = '2027-03-15';
const MOVED_FROM = '2027-03-03';
const MOVED_TO = '2027-03-16';

/* Полоса «весь день» есть только в часовой сетке; ниже 600px неделя
   показывается повесткой, и перетаскивать там нечего (issue #47). */
test.skip(({ isMobile }) => isMobile === true, 'полосы «весь день» ниже 600px нет');

test.describe('перенос отлучки перетаскиванием', () => {
  test('🔴 полоса едет на день вперёд, и в базе оказываются новые даты', async ({ page }) => {
    /* Причина своя и заведомо уникальная: база живая, и совпадение с настоящей
       отлучкой сделало бы проверку недостоверной. */
    const mark = `E2E-отпуск-${Date.now()}`;

    await withAdmin(async (api) => {
      /* Отлучка заводится тем же ключом, каким потом открывается панель: своя
         правится, чужую подвинуть нельзя вовсе (ADR-115). */
      const block = await api.createBlock({
        repeat: 'once',
        day: FROM,
        endDay: TO,
        weekday: null,
        fromMin: null,
        toMin: null,
        reason: mark,
      });

      try {
        await loginViaUi(page);
        await page.goto(`/admin/crm?view=week&day=${WEEK_DAY}`);

        const band = page.getByRole('button', { name: new RegExp(mark) });
        await expect(band).toBeVisible({ timeout: 30_000 });

        /* Ширину колонки меряет сама полоса: она лежит поперёк всех семи
           колонок недели, и её ширина, делённая на семь, и есть день. Общая с
           CSS константа разошлась бы с раскладкой на первой правке шаблона. */
        const railBox = await page.locator('[data-days]').first().boundingBox();
        expect(railBox).not.toBeNull();

        const column = (railBox?.width ?? 0) / 7;
        expect(column).toBeGreaterThan(10);

        const box = await band.boundingBox();
        expect(box).not.toBeNull();
        const startX = (box?.x ?? 0) + 20;
        const startY = (box?.y ?? 0) + (box?.height ?? 0) / 2;

        /* Шагами, а не прыжком: жест обязан пройти через `pointermove`, иначе
           проверяется не перетаскивание, а мгновенный телепорт указателя. */
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + column / 2, startY, { steps: 5 });
        await page.mouse.move(startX + column, startY, { steps: 5 });
        await page.mouse.up();

        /* Объявление — признак того, что правка дошла до ответа сервера: до
           него `done` не зовётся вовсе. */
        await expect(page.getByRole('status')).toContainText(/перенесена/i, { timeout: 15_000 });

        /* 🔴 И только теперь — база. Читаем месяц целиком и находим свою
            запись по номеру: так проверка не зависит ни от порядка, ни от
            соседних отлучек стенда. */
        await expect(async () => {
          const after = (await api.listBlocks('2027-03')).find((entry) => entry.id === block.id);

          expect(after?.day).toBe(MOVED_FROM);
          // 🔴 длительность прежняя: обоим концам достался один и тот же сдвиг
          expect(after?.endDay).toBe(MOVED_TO);
        }).toPass({ timeout: 15_000 });
      } finally {
        await api.deleteBlock(block.id);
      }
    });
  });
});
