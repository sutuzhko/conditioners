import { describe, expect, it } from 'vitest';

import { isSelfEmployedWithoutInn, staffCreateSchema, staffUpdateSchema } from './model';

/** Настоящий ИНН физлица: контрольные разряды сходятся. */
const VALID_INN = '710703123450';

/** Тот же номер с опиской — ровно то, что даёт опечатка при наборе. */
const BROKEN_INN = '710512345678';

const base = {
  name: 'Иван Петров',
  login: 'petrov',
  phone: '',
  employment: '',
  password: 'временный-пароль',
};

describe('ИНН монтажника при заведении', () => {
  it('🔴 пустое поле проходит: человека заводят по телефону, ИНН узнают позже', () => {
    const parsed = staffCreateSchema.safeParse({ ...base, inn: '' });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.inn).toBeNull();
  });

  it('поля нет вовсе — тот же случай, что пустая строка', () => {
    const parsed = staffCreateSchema.safeParse(base);

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.inn).toBeNull();
  });

  it('верный номер проходит и остаётся строкой', () => {
    const parsed = staffCreateSchema.safeParse({ ...base, inn: VALID_INN });

    expect(parsed.success && parsed.data.inn).toBe(VALID_INN);
  });

  it('пробелы из документа вычищаются, а не ложатся в базу', () => {
    const parsed = staffCreateSchema.safeParse({ ...base, inn: ' 7107 0312 3450 ' });

    expect(parsed.success && parsed.data.inn).toBe(VALID_INN);
  });

  it('🔴 номер с опиской отвергается: проверяются разряды, а не длина', () => {
    const parsed = staffCreateSchema.safeParse({ ...base, inn: BROKEN_INN });

    expect(parsed.success).toBe(false);
  });

  it('десять цифр — это ИНН организации, а не человека', () => {
    const parsed = staffCreateSchema.safeParse({ ...base, inn: '7707083893' });

    expect(parsed.success).toBe(false);
  });

  it('буквы и знаки в номере не принимаются', () => {
    const parsed = staffCreateSchema.safeParse({ ...base, inn: '71070312345О' });

    expect(parsed.success).toBe(false);
  });
});

describe('ИНН монтажника при правке карточки', () => {
  it('поле необязательное: правка телефона ИНН не требует', () => {
    const parsed = staffUpdateSchema.safeParse({ phone: '+7 (910) 155-24-68' });

    expect(parsed.success).toBe(true);
    expect(parsed.success && 'inn' in parsed.data).toBe(false);
  });

  it('пустое значение снимает ИНН, а не остаётся пустой строкой', () => {
    const parsed = staffUpdateSchema.safeParse({ inn: '' });

    expect(parsed.success && parsed.data.inn).toBeNull();
  });

  it('верный номер сохраняется', () => {
    const parsed = staffUpdateSchema.safeParse({ inn: VALID_INN });

    expect(parsed.success && parsed.data.inn).toBe(VALID_INN);
  });

  it('номер с опиской отвергается', () => {
    expect(staffUpdateSchema.safeParse({ inn: BROKEN_INN }).success).toBe(false);
  });
});

describe('Самозанятый без ИНН', () => {
  it('🔴 предупреждаем: без номера статус на дату выплаты не проверить', () => {
    expect(isSelfEmployedWithoutInn('self_employed', null)).toBe(true);
  });

  it('черновик формы с пустой строкой — то же самое', () => {
    expect(isSelfEmployedWithoutInn('self_employed', '')).toBe(true);
    expect(isSelfEmployedWithoutInn('self_employed', '   ')).toBe(true);
  });

  it('с номером предупреждать не о чем', () => {
    expect(isSelfEmployedWithoutInn('self_employed', VALID_INN)).toBe(false);
  });

  it('у остальных оформлений ИНН система не спрашивает', () => {
    /* Подрядчика по ГПХ и штатного никто не проверяет по реестру: НДФЛ и
       взносы за них платит компания, и статус тут ни при чём (PROJECT §5.4). */
    expect(isSelfEmployedWithoutInn('contract', null)).toBe(false);
    expect(isSelfEmployedWithoutInn('staff', null)).toBe(false);
  });

  it('оформление не заведено — предупреждение не про ИНН, а про само оформление', () => {
    expect(isSelfEmployedWithoutInn(null, null)).toBe(false);
  });
});
