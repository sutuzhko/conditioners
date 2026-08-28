// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* Подменяется весь модуль, поэтому чистая `isOwner` обязана быть здесь же:
   без неё `withOwner` зовёт `undefined` и маршрут отвечает 500 вместо 403 —
   отказ выглядел бы поломкой сервера. */
vi.mock('@/server/auth', () => ({
  getAdminSession: vi.fn(),
  isOwner: (session: { role: string }) => session.role === 'owner',
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/server/repo/settings', () => ({
  getAll: vi.fn(),
  getGroup: vi.fn(),
  putGroup: vi.fn(),
  readiness: vi.fn(),
  getExtras: vi.fn(),
  checkReadiness: vi.fn(),
}));

import { revalidatePath } from 'next/cache';
import { getAdminSession } from '@/server/auth';
import * as settings from '@/server/repo/settings';
import { PLACEHOLDER } from '@/server/repo/settings-schemas';
import { GET as GET_ALL } from './route';
import { PUT } from './[key]/route';
import { GET as GET_PUBLIC } from '../../settings/[key]/route';

const session = {
  userId: 'u1',
  login: 'admin',
  name: null,
  role: 'owner',
  expiresAt: new Date('2026-12-31'),
} as const;

const contacts = {
  phones: ['8 (4872) 12-34-56'],
  email: 'info@example.ru',
  telegram: '',
  whatsapp: '',
  hours: 'Пн–Вс, 8:00–21:00',
};

function put(key: string, body: unknown): [NextRequest, { params: Promise<{ key: string }> }] {
  return [
    new NextRequest(new URL(`/api/admin/settings/${key}`, 'http://tulaklimat.localhost'), {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({ key }) },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAdminSession).mockResolvedValue(session);
  vi.mocked(settings.getAll).mockResolvedValue({ contacts });
  vi.mocked(settings.getGroup).mockResolvedValue(contacts);
});

describe('чтение настроек', () => {
  it('все группы разом — только с сессией', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await GET_ALL(
      new NextRequest('http://tulaklimat.localhost/api/admin/settings'),
      undefined,
    );

    expect(response.status).toBe(401);
  });

  it('публичное чтение отдаёт группу без сессии', async () => {
    const response = await GET_PUBLIC(
      new NextRequest('http://tulaklimat.localhost/api/settings/contacts'),
      { params: Promise.resolve({ key: 'contacts' }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ email: 'info@example.ru' });
  });

  it('настройки интеграций наружу не отдаются', async () => {
    const response = await GET_PUBLIC(
      new NextRequest('http://tulaklimat.localhost/api/settings/integrations'),
      { params: Promise.resolve({ key: 'integrations' }) },
    );

    expect(response.status).toBe(404);
  });

  /**
   * 🔴 Публичный маршрут отдавал группу реквизитов как есть — вместе с адресом
   * регистрации предпринимателя (домашний, то есть персональные данные) и
   * банковскими счетами. Проверять это глазами при каждой правке нельзя:
   * тест обязан краснеть, если непубликуемое поле снова доедет наружу.
   */
  it('🔴 реквизиты наружу идут без домашнего адреса и банка', async () => {
    vi.mocked(settings.getGroup).mockResolvedValue({
      form: 'ИП',
      name: 'Ковалёв Сергей Николаевич',
      inn: '710703123450',
      ogrn: '314710700012346',
      regDate: '2015-03-12',
      regAuthority: 'Межрайонная ИФНС России № 10 по Тульской области',
      address: '300026, Тула, ул. Рязанская, д. 24, кв. 71',
      bankName: 'Тульское отделение № 8604 ПАО Сбербанк',
      bankBik: '047003608',
      bankAccount: '40702810700000000001',
      bankCorrAccount: '30101810700000000004',
    });

    const response = await GET_PUBLIC(
      new NextRequest('http://tulaklimat.localhost/api/settings/legal'),
      { params: Promise.resolve({ key: 'legal' }) },
    );

    expect(response.status).toBe(200);
    const body = JSON.stringify(await response.json());

    expect(body).toContain('710703123450');
    expect(body).toContain('Ковалёв Сергей Николаевич');
    // ни одного непубликуемого значения — проверяем по строке ответа целиком,
    // чтобы поймать его на любой глубине, а не только на ожидаемом ключе
    expect(body).not.toContain('Рязанская');
    expect(body).not.toContain('40702810700000000001');
    expect(body).not.toContain('30101810700000000004');
    expect(body).not.toContain('047003608');
  });

  it('реквизиты общества наружу идут без КПП и руководителя', async () => {
    vi.mocked(settings.getGroup).mockResolvedValue({
      form: 'ООО',
      name: 'Общество с ограниченной ответственностью «Пример»',
      shortName: 'ООО «Пример»',
      inn: '7107023451',
      kpp: '710701001',
      ogrn: '1027107001239',
      address: '300041, Тула, проспект Ленина, 108',
      director: 'Ковалёв Сергей Николаевич',
      directorTitle: 'Директор',
    });

    const response = await GET_PUBLIC(
      new NextRequest('http://tulaklimat.localhost/api/settings/legal'),
      { params: Promise.resolve({ key: 'legal' }) },
    );

    const body = JSON.stringify(await response.json());

    // место нахождения общества публичное, в отличие от адреса предпринимателя
    expect(body).toContain('проспект Ленина');
    expect(body).not.toContain('710701001');
    expect(body).not.toContain('Директор');
  });

  /**
   * 🔴 Раздел владельца, а не любой сессии панели (ADR-092). Маршруты стояли
   * под `withAdmin`: монтажник читал данные компании и мог переписать
   * реквизиты продавца на всём сайте. Страница закрыта `requireOwnerPage`, но
   * защита в разметке — подсказка интерфейса, а не защита: адреса панели
   * монтажник знает, он в ней работает.
   */
  it('🔴 монтажник до данных компании не доходит', async () => {
    vi.mocked(getAdminSession).mockResolvedValue({ ...session, role: 'installer' });

    const read = await GET_ALL(
      new NextRequest('http://tulaklimat.localhost/api/admin/settings'),
      undefined,
    );
    expect(read.status).toBe(403);

    const write = await PUT(...put('legal', { form: 'ООО' }));
    expect(write.status).toBe(403);

    // отказ на запись означает, что и ревалидации сайта не случилось
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('несуществующая группа — 404', async () => {
    const response = await GET_PUBLIC(
      new NextRequest('http://tulaklimat.localhost/api/settings/выдумка'),
      { params: Promise.resolve({ key: 'выдумка' }) },
    );

    expect(response.status).toBe(404);
  });
});

describe('сохранение группы', () => {
  // Номер хранится машинным, человеку его показывает formatPhone: разные
  // записи одного номера поисковик считает разными организациями (ADR-009).
  it('телефон сохраняется в едином виде', async () => {
    const response = await PUT(...put('contacts', contacts));

    expect(response.status).toBe(200);
    expect(settings.putGroup).toHaveBeenCalledWith(
      'contacts',
      expect.objectContaining({ phones: ['+74872123456'] }),
    );
  });

  /**
   * 🔴 До сведения схем эта группа валидировалась серверной копией, которая не
   * знала про поля из ADR-029: владелец сохранял включённые метры трассы, а
   * запрос отвергался целиком. Калькулятор при этом считал по умолчаниям —
   * то есть показывал не ту цену, которую задал владелец.
   */
  it('ставки сохраняются вместе с включёнными метрами и порогом этажа', async () => {
    const extras = {
      trassaPerM: 700,
      shtrobPerM: 800,
      heightWorks: 2000,
      trassaIncludedM: 5,
      heightFloorFrom: 6,
    };

    const response = await PUT(...put('extras', extras));

    expect(response.status).toBe(200);
    expect(settings.putGroup).toHaveBeenCalledWith('extras', extras);
  });

  it('ревалидирует весь сайт: контакты стоят в шапке и футере', async () => {
    await PUT(...put('contacts', contacts));

    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  it('координаты вне диапазона не сохраняются', async () => {
    const response = await PUT(...put('geo', { lat: 999, lng: 37.61 }));

    expect(response.status).toBe(400);
    expect(settings.putGroup).not.toHaveBeenCalled();
  });

  it('неполные данные сохранить можно — владелец заполняет постепенно', async () => {
    const response = await PUT(
      ...put('company', {
        name: PLACEHOLDER,
        tagline: '',
        foundedYear: null,
      }),
    );

    expect(response.status).toBe(200);
  });

  it('без сессии настройки не меняются', async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await PUT(...put('contacts', contacts));

    expect(response.status).toBe(401);
    expect(settings.putGroup).not.toHaveBeenCalled();
  });
});
