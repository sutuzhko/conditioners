import { describe, expect, it, vi, afterEach } from 'vitest';

import { LEGAL_GROUP } from './fields';
import {
  dropPath,
  filledFieldLabels,
  minutesToTime,
  putGroup,
  readPath,
  timeToMinutes,
  toDateValue,
  toGroupValue,
  visibleFields,
  withoutHiddenFields,
  writePath,
} from './lib';
import type { GroupDescriptor } from './model';

describe('Настройки — путь внутри группы', () => {
  it('читает вложенное значение', () => {
    expect(readPath({ messengerButtons: { telegram: true } }, 'messengerButtons.telegram')).toBe(
      true,
    );
  });

  it('отсутствующая ветка не ошибка: группу могли сохранить до появления поля', () => {
    expect(readPath({}, 'messengerButtons.telegram')).toBeUndefined();
    expect(readPath({ messengerButtons: null }, 'messengerButtons.telegram')).toBeUndefined();
  });

  it('запись возвращает копию, а не правит исходное значение', () => {
    const before = { email: 'a@b.c' };
    const after = writePath(before, 'email', 'x@y.z');

    expect(after).toEqual({ email: 'x@y.z' });
    expect(before).toEqual({ email: 'a@b.c' });
  });

  it('запись во вложенный путь создаёт недостающую ветку', () => {
    expect(writePath({}, 'callback.enabled', true)).toEqual({ callback: { enabled: true } });
  });

  it('запись во вложенный путь сохраняет соседей', () => {
    const value = { messengerButtons: { telegram: true, whatsapp: false } };

    expect(writePath(value, 'messengerButtons.whatsapp', true)).toEqual({
      messengerButtons: { telegram: true, whatsapp: true },
    });
  });
});

describe('Настройки — разбор сохранённой группы', () => {
  it('объект открывается как есть', () => {
    expect(toGroupValue({ lat: 54.19, lng: 37.61 })).toEqual({ lat: 54.19, lng: 37.61 });
  });

  it('любой другой JSON означает пустую форму, а не падение', () => {
    // группа могла не сохраняться ни разу, а могла быть записана до появления
    // схемы — форма обязана открыться в обоих случаях
    expect(toGroupValue(null)).toEqual({});
    expect(toGroupValue(undefined)).toEqual({});
    expect(toGroupValue([1, 2])).toEqual({});
    expect(toGroupValue('строка')).toEqual({});
    expect(toGroupValue(42)).toEqual({});
  });
});

describe('Настройки — рабочее окно временем и минутами', () => {
  it('минуты показываются временем с ведущим нулём', () => {
    expect(minutesToTime(9 * 60)).toBe('09:00');
    expect(minutesToTime(19 * 60 + 30)).toBe('19:30');
    expect(minutesToTime(0)).toBe('00:00');
  });

  it('конец суток показывается полуночью: «24:00» поле времени не принимает', () => {
    expect(minutesToTime(24 * 60)).toBe('00:00');
  });

  it('время разбирается в минуты от полуночи', () => {
    expect(timeToMinutes('09:00')).toBe(9 * 60);
    expect(timeToMinutes('9:05')).toBe(9 * 60 + 5);
    expect(timeToMinutes('23:59')).toBe(23 * 60 + 59);
  });

  it('пустое поле и мусор — не полночь, а «значения нет»', () => {
    // ноль означал бы, что владелец сам открыл календарь с нуля часов
    expect(timeToMinutes('')).toBeNull();
    expect(timeToMinutes('утром')).toBeNull();
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('09:75')).toBeNull();
  });
});

describe('Настройки — сохранение группы', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('200 — сохранено', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200 })),
    );

    await expect(putGroup('geo', { lat: 1, lng: 2 })).resolves.toEqual({ ok: true });
  });

  it('ошибка валидации показывается у своего поля', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: { code: 'validation_error', message: 'Проверьте адрес почты', field: 'email' },
            }),
            { status: 422 },
          ),
      ),
    );

    const result = await putGroup('contacts', { email: 'не-почта' });

    // Сообщение Zod точнее любого нашего обобщения — показываем его как есть.
    expect(result).toEqual({
      ok: false,
      message: 'Проверьте адрес почты',
      fieldErrors: { email: 'Проверьте адрес почты' },
    });
  });

  it('истёкшая сессия объясняется отдельно', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    );

    const result = await putGroup('geo', {});

    expect(result).toEqual({ ok: false, message: 'Сессия истекла. Войдите заново' });
  });

  it('нечитаемое тело ошибки не превращается в отказ разбора', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>502</html>', { status: 502 })),
    );

    const result = await putGroup('geo', {});

    expect(result.ok).toBe(false);
  });

  it('упавшая сеть сообщает, что изменения не сохранены', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      }),
    );

    const result = await putGroup('geo', {});

    expect(result).toEqual({
      ok: false,
      message: 'Не удалось связаться с сервером. Изменения не сохранены',
    });
  });
});

/** Две формы с одинаковым путём: ровно тот случай, ради которого есть условие. */
const conditioned: GroupDescriptor = {
  key: 'legal',
  title: 'Реквизиты',
  description: 'Проверочная группа.',
  fields: [
    { path: 'form', label: 'Форма', kind: 'select', options: ['ИП', 'ООО'], resetsGroup: true },
    { path: 'name', label: 'ФИО полностью', kind: 'text', when: { path: 'form', equals: ['ИП'] } },
    {
      path: 'kpp',
      label: 'КПП',
      kind: 'text',
      when: { path: 'form', equals: ['ООО'] },
    },
    { path: 'bankBik', label: 'БИК', kind: 'text' },
  ],
};

describe('Настройки — состав группы по значению', () => {
  it('поле без условия видно всегда, поле с условием — по значению', () => {
    expect(visibleFields(conditioned, { form: 'ИП' }).map((field) => field.path)).toEqual([
      'form',
      'name',
      'bankBik',
    ]);
    expect(visibleFields(conditioned, { form: 'ООО' }).map((field) => field.path)).toEqual([
      'form',
      'kpp',
      'bankBik',
    ]);
  });

  it('незаполненный переключатель не показывает поля ни одной из форм', () => {
    expect(visibleFields(conditioned, {}).map((field) => field.path)).toEqual(['form', 'bankBik']);
  });

  it('🔴 скрытое поле уходит из тела запроса, а не прячется в нём', () => {
    // спрятанное значение всплывает в выгрузке тогда, когда его никто не ждёт
    expect(
      withoutHiddenFields(conditioned, { form: 'ООО', name: 'Иванов', kpp: '710701001' }),
    ).toEqual({ form: 'ООО', kpp: '710701001' });
  });

  it('видимое значение остаётся тем же объектом: лишней перерисовки нет', () => {
    const value = { form: 'ИП', name: 'Иванов' };

    expect(withoutHiddenFields(conditioned, value)).toBe(value);
  });

  it('ключ убирается, а не обнуляется', () => {
    expect(dropPath({ form: 'ИП', name: 'Иванов' }, 'name')).toEqual({ form: 'ИП' });
    expect(dropPath({ callback: { enabled: true, note: 'x' } }, 'callback.enabled')).toEqual({
      callback: { note: 'x' },
    });
    expect(dropPath({ form: 'ИП' }, 'kpp')).toEqual({ form: 'ИП' });
  });

  it('подтверждению перечисляются подписи заполненных полей, кроме самого переключателя', () => {
    expect(
      filledFieldLabels(conditioned, { form: 'ИП', name: 'Иванов', bankBik: '' }, 'form'),
    ).toEqual(['ФИО полностью']);
  });

  it('пустая группа терять нечего — список пуст, и спрашивать не о чем', () => {
    expect(filledFieldLabels(conditioned, { form: 'ИП', name: '   ' }, 'form')).toEqual([]);
    expect(filledFieldLabels(conditioned, {}, 'form')).toEqual([]);
  });
});

describe('Настройки — реквизиты по формам регистрации', () => {
  it('🔴 у предпринимателя нет КПП и руководителя, у общества — органа регистрации', () => {
    const entrepreneur = visibleFields(LEGAL_GROUP, { form: 'ИП' }).map((field) => field.path);
    const company = visibleFields(LEGAL_GROUP, { form: 'ООО' }).map((field) => field.path);

    expect(entrepreneur).toContain('regAuthority');
    expect(entrepreneur).not.toContain('kpp');
    expect(entrepreneur).not.toContain('director');
    expect(company).toContain('kpp');
    expect(company).toContain('shortName');
    expect(company).not.toContain('regDate');
  });

  it('🔴 непубликуемое поле сказано подсказкой: иначе владелец опубликует домашний адрес', () => {
    const hint = (form: string, path: string): string | undefined =>
      visibleFields(LEGAL_GROUP, { form }).find((field) => field.path === path)?.hint;

    expect(hint('ИП', 'address')).toMatch(/не выводится/);
    expect(hint('ООО', 'kpp')).toMatch(/не выводится/);
    expect(hint('ООО', 'director')).toMatch(/не выводится/);
    expect(hint('ИП', 'bankAccount')).toMatch(/не выводится/);
  });

  it('одноимённые поля разведены подписью: ФИО человека и фирменное наименование', () => {
    const label = (form: string, path: string): string | undefined =>
      visibleFields(LEGAL_GROUP, { form }).find((field) => field.path === path)?.label;

    expect(label('ИП', 'name')).not.toBe(label('ООО', 'name'));
    expect(label('ИП', 'ogrn')).toBe('ОГРНИП');
    expect(label('ООО', 'ogrn')).toBe('ОГРН');
  });

  it('🔴 условие сериализуемо: описание переживает границу сервер→клиент', () => {
    // функция в описании роняет рендер всей страницы (docs/HANDOFF.md)
    expect(JSON.parse(JSON.stringify(LEGAL_GROUP))).toEqual(LEGAL_GROUP);
  });
});

describe('Настройки — дата регистрации', () => {
  it('машинная дата показывается как есть', () => {
    expect(toDateValue('2015-03-12')).toBe('2015-03-12');
  });

  it('всё, что датой не является, — пустое поле, а не мусор в календаре', () => {
    expect(toDateValue('')).toBe('');
    expect(toDateValue('12.03.2015')).toBe('');
    expect(toDateValue(undefined)).toBe('');
    expect(toDateValue(20150312)).toBe('');
  });
});
