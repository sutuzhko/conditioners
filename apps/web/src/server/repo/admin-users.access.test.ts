// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Роль и разрешения в слое данных (ADR-344, issue #782, #784).
 *
 * 🔴 Второй рубеж под схемой запроса. Запрет, живущий в одном месте, обходится
 * следующим маршрутом, который забыл его позвать, — а «выдать вторую роль
 * владельца» стоит доступа ко всем деньгам компании.
 */
/**
 * Заглушки заводятся `vi.hoisted`, а не берутся из `vi.mocked(db.adminUser)`.
 * Второе принесло бы типы сгенерированного клиента Prisma, и заглушке
 * пришлось бы возвращать запись целиком — со всеми полями, до которых
 * проверяемому коду дела нет.
 */
const adminUser = vi.hoisted(() => ({ findUnique: vi.fn(), update: vi.fn() }));

vi.mock('@/server/db', () => ({ db: { adminUser } }));

import { setAccess } from './admin-users';

const row = {
  id: 'u3',
  login: 'petrova',
  name: 'Анна Петрова',
  phone: null,
  role: 'ADMIN' as const,
  permissions: ['LEADS' as const],
  employment: null,
  inn: null,
  active: true,
  createdAt: new Date('2026-09-01T09:00:00.000Z'),
  lastLoginAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  adminUser.findUnique.mockResolvedValue({ role: 'ADMIN' });
  adminUser.update.mockResolvedValue(row);
});

describe('setAccess', () => {
  it('набор уезжает в базу значениями перечисления', async () => {
    await setAccess('u3', { permissions: ['leads', 'data_delete'] });

    expect(adminUser.update).toHaveBeenCalledWith({
      where: { id: 'u3' },
      data: { permissions: { set: ['LEADS', 'DATA_DELETE'] } },
      select: expect.anything(),
    });
  });

  it('карточка возвращается со словарём приложения, а не значениями базы', async () => {
    await expect(setAccess('u3', { permissions: ['leads'] })).resolves.toMatchObject({
      role: 'admin',
      permissions: ['leads'],
    });
  });

  /* 🔴 Разрешения спрашивают у одной роли. Набор, оставшийся у менеджера,
     означал бы настройку, которая в карточке есть, а в доступе не работает. */
  it('🔴 смена роли на неадминистраторскую гасит набор', async () => {
    await setAccess('u3', { role: 'manager' });

    expect(adminUser.update).toHaveBeenCalledWith({
      where: { id: 'u3' },
      data: { role: 'MANAGER', permissions: { set: [] } },
      select: expect.anything(),
    });
  });

  it('🔴 вторую роль владельца слой данных тоже не выдаёт', async () => {
    await expect(setAccess('u3', { role: 'owner' })).rejects.toThrow(
      'Владелец в системе один — вторую такую роль выдать нельзя',
    );
    expect(adminUser.update).not.toHaveBeenCalled();
  });

  /* 🔴 Понизить единственного владельца — значит запереть панель снаружи:
     раздавать права станет некому. */
  it('🔴 учётную запись владельца эта ручка не правит вовсе', async () => {
    adminUser.findUnique.mockResolvedValue({ role: 'OWNER' });

    await expect(setAccess('u1', { role: 'manager' })).rejects.toThrow(
      'Права владельца не настраиваются: он их раздаёт',
    );
    expect(adminUser.update).not.toHaveBeenCalled();
  });

  it('несуществующий сотрудник — «не найден», а не тихий успех', async () => {
    adminUser.findUnique.mockResolvedValue(null);

    await expect(setAccess('нет', { permissions: [] })).rejects.toThrow('Сотрудник не найден');
  });

  /* 🔴 Сессии не закрываются: смысл разрешений в том, что снятый
     переключатель действует немедленно и без повторного входа. Выброс из
     панели превратил бы «убрал раздел» в «выгнал человека». */
  it('🔴 правка прав не закрывает сессии человека', async () => {
    await setAccess('u3', { permissions: [] });

    expect(adminUser.update).toHaveBeenCalledTimes(1);
  });
});
