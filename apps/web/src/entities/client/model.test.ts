import { describe, expect, it } from 'vitest';

import { clientCreateSchema, clientUpdateSchema, pageNumber } from './model';

const valid = {
  name: 'Ирина Соколова',
  phone: '+7 (910) 155-24-68',
  address: 'Тула, Первомайская, 12',
  note: '',
};

describe('заведение клиента', () => {
  it('принимает заполненную карточку', () => {
    const parsed = clientCreateSchema.parse(valid);

    expect(parsed.name).toBe('Ирина Соколова');
    expect(parsed.address).toBe('Тула, Первомайская, 12');
  });

  it('🔴 пустое необязательное поле — это «не заполнено», а не пустая строка', () => {
    const parsed = clientCreateSchema.parse(valid);

    expect(parsed.note).toBeNull();
  });

  it('без телефона карточку не завести: по нему клиент опознаётся', () => {
    const parsed = clientCreateSchema.safeParse({ ...valid, phone: '' });

    expect(parsed.success).toBe(false);
  });

  it('номер принимается в любом написании — лишь бы цифр хватало', () => {
    for (const phone of ['89101552468', '9101552468', '+7 910 155-24-68']) {
      expect(clientCreateSchema.safeParse({ ...valid, phone }).success).toBe(true);
    }
  });

  it('короткий номер отклоняется с русским объяснением', () => {
    const parsed = clientCreateSchema.safeParse({ ...valid, phone: '12345' });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe('Похоже, в номере не хватает цифр');
  });

  it('имя из одной буквы не проходит', () => {
    expect(clientCreateSchema.safeParse({ ...valid, name: 'И' }).success).toBe(false);
  });
});

describe('правка карточки', () => {
  it('принимает подмножество полей', () => {
    const parsed = clientUpdateSchema.parse({ address: 'Тула, Ленина, 5' });

    expect(parsed).toEqual({ address: 'Тула, Ленина, 5' });
  });

  it('🔴 пустая правка отклоняется: молча ничего не менять хуже, чем отказать', () => {
    expect(clientUpdateSchema.safeParse({}).success).toBe(false);
  });

  it('чужие поля не принимаются: карточку правят по своим правилам', () => {
    expect(clientUpdateSchema.safeParse({ leadCount: 5 }).success).toBe(false);
  });

  it('телефон правится наравне с остальным — люди меняют номера', () => {
    expect(clientUpdateSchema.safeParse({ phone: '+7 910 000-00-00' }).success).toBe(true);
  });
});

describe('номер страницы из адреса', () => {
  it('берётся как есть, начиная со второй', () => {
    expect(pageNumber('3')).toBe(3);
  });

  it('🔴 мусор и ноль — это первая страница, а не ошибка', () => {
    // адрес правят руками и присылают друг другу: отказ вместо списка там
    // ничего не объясняет
    expect(pageNumber('нет')).toBe(1);
    expect(pageNumber('0')).toBe(1);
    expect(pageNumber('-2')).toBe(1);
    expect(pageNumber(undefined)).toBe(1);
  });
});
