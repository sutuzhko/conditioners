// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { orderCardTabCounts, orderManagerContent as texts } from './content';
import { orderCanMarkDone } from './model';

/**
 * Правила карточки наряда у владельца (issue #598).
 *
 * 🔴 Оба разбираемых здесь решения тихие: они не падают, а показывают не то.
 * Кнопка закрытия у отменённого наряда превратила бы отказ в выручку одним
 * нажатием, а счётчик, посчитавший ноль вместо «не приехало», сообщил бы, что
 * списаний нет, там где их просто не прочитали.
 */
describe('Закрытие наряда из шапки карточки', () => {
  it('🔴 предлагается там, где следующий шаг очевиден', () => {
    expect(orderCanMarkDone('assigned')).toBe(true);
    expect(orderCanMarkDone('in_progress')).toBe(true);
  });

  it('🔴 не предлагается новому: исполнителя нет, закрывать некому', () => {
    expect(orderCanMarkDone('new')).toBe(false);
  });

  it('🔴 не предлагается выполненному: закрывать нечего', () => {
    expect(orderCanMarkDone('done')).toBe(false);
  });

  it('🔴 не предлагается отказу: иначе отказ молча становится выручкой', () => {
    expect(orderCanMarkDone('cancelled')).toBe(false);
  });
});

describe('Счётчики вкладок карточки наряда', () => {
  const tally = {
    checklist: [{ done: true }, { done: true }, { done: false }],
    docs: [{}, {}],
    photos: [{}],
    history: [{}, {}, {}, {}],
  };

  it('🔴 чеклист считается долей: «2 из 3», а не «3»', () => {
    expect(orderCardTabCounts(tally).checklist).toBe(texts.checklistCount(2, 3));
  });

  it('документы и фотографии живут на одной вкладке и считаются вместе', () => {
    expect(orderCardTabCounts(tally).documents).toBe(3);
  });

  it('история считается записями', () => {
    expect(orderCardTabCounts(tally).history).toBe(4);
  });

  it('🔴 у «Наряда» счётчика нет: за ним лежит наряд, а не набор строк', () => {
    expect(orderCardTabCounts(tally).job).toBeUndefined();
  });

  it('🔴 нет истории — нет и счётчика: монтажнику её не отдаёт сервер', () => {
    const { history, ...withoutHistory } = tally;
    /* С ключом счётчик есть — значит проверка ниже про его отсутствие, а не
       про то, что история пуста. */
    expect(history).toHaveLength(4);

    expect(orderCardTabCounts(withoutHistory).history).toBeUndefined();
  });

  it('расход приходит числом снаружи: он читается отдельным куском потока', () => {
    expect(orderCardTabCounts(tally, 5).materials).toBe(5);
  });

  it('🔴 расход не приехал — счётчика нет: ноль соврал бы, что списаний нет', () => {
    expect(orderCardTabCounts(tally).materials).toBeUndefined();
  });

  it('🔴 пустой чеклист счётчика не получает: «0 из 0» не отвечает ни на что', () => {
    expect(orderCardTabCounts({ ...tally, checklist: [] }).checklist).toBeUndefined();
  });
});
