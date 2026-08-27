import { describe, expect, it } from 'vitest';

import { guessOrderType } from './order-type';

describe('тип работ по теме обращения', () => {
  it('темы формы заявки разбираются все четыре', () => {
    /* Ровно те значения, которые предлагает форма на сайте
       (`features/lead-form/content.ts`): разойдись они — сюда и смотреть. */
    expect(guessOrderType('Монтаж и установка')).toBe('install');
    expect(guessOrderType('Сервис и ремонт')).toBe('repair');
    expect(guessOrderType('ТО и чистка')).toBe('service');
    expect(guessOrderType('Консультация')).toBe('install');
  });

  it('незнакомая тема остаётся монтажом', () => {
    expect(guessOrderType('Хочу кондиционер в спальню')).toBe('install');
    expect(guessOrderType('')).toBe('install');
    expect(guessOrderType(null)).toBe('install');
  });

  it('поломку узнаёт по словам, а не по теме из списка', () => {
    expect(guessOrderType('не охлаждает, дует тёплым')).toBe('repair');
    expect(guessOrderType('Течёт вода из внутреннего блока')).toBe('repair');
    expect(guessOrderType('Сломался пульт, кондиционер не включается')).toBe('repair');
  });

  it('«ё» и регистр на разбор не влияют', () => {
    expect(guessOrderType('ТЕЧЁТ')).toBe('repair');
    expect(guessOrderType('течет')).toBe('repair');
  });

  it('плановые работы — обслуживание', () => {
    expect(guessOrderType('Чистка внутреннего блока')).toBe('service');
    expect(guessOrderType('Годовое обслуживание')).toBe('service');
    expect(guessOrderType('Заправка фреоном')).toBe('service');
  });

  it('«ТО» — только сокращение заглавными и отдельным словом', () => {
    expect(guessOrderType('Плановое ТО')).toBe('service');
    expect(guessOrderType('ТО, сплит-система')).toBe('service');
    /* Строчное «то» — союз; «АВТО» и «ТОЧКА» — не сокращение. Иначе каждая
       вторая тема со словом «что-то» становилась бы обслуживанием. */
    expect(guessOrderType('Что-то шумит в квартире')).toBe('install');
    expect(guessOrderType('АВТОСЕРВИС на Одоевском')).toBe('install');
    expect(guessOrderType('ТОЧКА подключения')).toBe('install');
  });

  it('монтаж выигрывает у остального: ошибаться дешевле в его сторону', () => {
    expect(guessOrderType('Установка после ремонта квартиры')).toBe('install');
    expect(guessOrderType('Монтаж и ТО')).toBe('install');
    expect(guessOrderType('Демонтаж старого блока')).toBe('install');
  });
});
