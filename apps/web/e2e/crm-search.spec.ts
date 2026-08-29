import { expect, test } from '@playwright/test';

import { withAdmin } from './support/admin-api';

/**
 * Поиск по календарю — issue #126–#129.
 *
 * 🔴 Проверяется тем, ради чего поиск и заведён: находкой **вне видимого
 * периода**. Календарь показывает неделю, а дело лежит через год — и именно
 * тогда человек и ищет по адресу, потому что не помнит, когда это было.
 * Юнит-проверка условия запроса такого не показывает: она сверяет, что границ
 * по дате нет, а не что запись действительно находится.
 */
test.describe('поиск по календарю', () => {
  test('🔴 находит дело за пределами показанного периода и не путает его с чужими', async () => {
    /* Метка своя и заведомо уникальная: база живая, и совпадение с настоящим
       адресом сделало бы проверку недостоверной. */
    const mark = `E2E-поиск-${Date.now()}`;

    await withAdmin(async (api) => {
      const created = await api.createCrmEvent({
        kind: 'call',
        // через год: ни одна сетка календаря столько не показывает
        day: '2027-11-17',
        time: '10:00',
        clientName: `Клиент ${mark}`,
        address: `Тула, ${mark}, 1`,
      });

      try {
        const byAddress = await api.searchCrm(mark);
        expect(byAddress.map((hit) => hit.id)).toContain(created.id);

        const byClient = await api.searchCrm(`Клиент ${mark}`);
        expect(byClient.map((hit) => hit.id)).toContain(created.id);

        /* Чужого в выдаче нет: запрос по метке обязан вернуть только своё,
           иначе поиск сваливает в одну кучу всё, что похоже. */
        expect(byAddress.every((hit) => hit.id === created.id)).toBe(true);

        const miss = await api.searchCrm(`${mark}-нет-такого`);
        expect(miss).toEqual([]);
      } finally {
        await api.deleteCrmEvent(created.id);
      }
    });
  });
});
