import { describe, expect, it } from 'vitest';

import {
  isSelfEmployedWithoutInn,
  passwordChangeSchema,
  profileUpdateSchema,
  staffCreateSchema,
  staffUpdateSchema,
  staffTitle,
} from './model';

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

describe('логин для входа', () => {
  it('латиница, цифры и три знака — и ничего больше', () => {
    for (const login of ['petrov', 'petrov.d', 'petrov_d', 'petrov-2026', 'p2026']) {
      expect(staffCreateSchema.safeParse({ ...base, login }).success).toBe(true);
    }
  });

  it('🔴 кириллица не проходит: логин диктуют по телефону и набирают на чужом телефоне', () => {
    expect(staffCreateSchema.safeParse({ ...base, login: 'петров' }).success).toBe(false);
  });

  it('пробелы, собака и слэш — не логин', () => {
    for (const login of ['иван петров', 'petrov@mail', 'petrov/2', 'ПЕТРОВ']) {
      expect(staffCreateSchema.safeParse({ ...base, login }).success).toBe(false);
    }
  });

  it('начинается с буквы или цифры, а не со знака', () => {
    expect(staffCreateSchema.safeParse({ ...base, login: '.petrov' }).success).toBe(false);
    expect(staffCreateSchema.safeParse({ ...base, login: '-petrov' }).success).toBe(false);
    expect(staffCreateSchema.safeParse({ ...base, login: '_petrov' }).success).toBe(false);
  });

  it('границы длины — три и тридцать два символа', () => {
    expect(staffCreateSchema.safeParse({ ...base, login: 'ab' }).success).toBe(false);
    expect(staffCreateSchema.safeParse({ ...base, login: 'abc' }).success).toBe(true);
    expect(staffCreateSchema.safeParse({ ...base, login: 'a'.repeat(32) }).success).toBe(true);
    expect(staffCreateSchema.safeParse({ ...base, login: 'a'.repeat(33) }).success).toBe(false);
  });
});

describe('пароль', () => {
  it('границы — восемь и двести символов', () => {
    expect(staffCreateSchema.safeParse({ ...base, password: 'a'.repeat(7) }).success).toBe(false);
    expect(staffCreateSchema.safeParse({ ...base, password: 'a'.repeat(8) }).success).toBe(true);
    expect(staffCreateSchema.safeParse({ ...base, password: 'a'.repeat(200) }).success).toBe(true);
    expect(staffCreateSchema.safeParse({ ...base, password: 'a'.repeat(201) }).success).toBe(false);
  });

  it('🔴 пробелы в пароле значимы: он не обрезается', () => {
    const parsed = staffCreateSchema.safeParse({ ...base, password: '  пароль  ' });

    expect(parsed.success && parsed.data.password).toBe('  пароль  ');
  });
});

describe('смена своего пароля', () => {
  it('текущий пароль обязателен: сессия могла остаться на чужом компьютере', () => {
    expect(passwordChangeSchema.safeParse({ next: 'новый-пароль' }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ current: '', next: 'новый-пароль' }).success).toBe(
      false,
    );
  });

  it('🔴 новый пароль, совпадающий со старым, — это не смена пароля', () => {
    const parsed = passwordChangeSchema.safeParse({ current: 'пароль-1', next: 'пароль-1' });

    expect(parsed.success).toBe(false);
    expect(!parsed.success && parsed.error.issues[0]?.path).toEqual(['next']);
  });

  it('новый пароль проходит те же границы, что и при заведении', () => {
    expect(passwordChangeSchema.safeParse({ current: 'пароль-1', next: 'корот' }).success).toBe(
      false,
    );
    expect(passwordChangeSchema.safeParse({ current: 'пароль-1', next: 'пароль-2' }).success).toBe(
      true,
    );
  });
});

describe('свой профиль', () => {
  it('меняются имя и телефон', () => {
    expect(profileUpdateSchema.safeParse({ name: 'Иван Петров' }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ phone: '+7 (910) 155-24-68' }).success).toBe(true);
  });

  it('🔴 ни роли, ни логина, ни оформления себе не меняют', () => {
    expect(profileUpdateSchema.safeParse({ role: 'owner' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ login: 'owner' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ employment: 'staff' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ active: true }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ password: 'новый-пароль' }).success).toBe(false);
  });

  it('пустое тело отвергается: сохранять нечего', () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe('телефон человека в команде', () => {
  it('пустое поле — «не заполнено»', () => {
    expect(staffCreateSchema.parse({ ...base, phone: '' }).phone).toBeNull();
  });

  it('🔴 мусор не проходит: из карточки по этому номеру звонят', () => {
    expect(staffCreateSchema.safeParse({ ...base, phone: 'asdf' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ phone: '+7 (910)' }).success).toBe(false);
  });
});

describe('подпись человека', () => {
  it('имя, пока оно есть, иначе логин', () => {
    expect(staffTitle({ name: 'Иван Петров', login: 'petrov' })).toBe('Иван Петров');
    expect(staffTitle({ name: null, login: 'petrov' })).toBe('petrov');
  });
});
