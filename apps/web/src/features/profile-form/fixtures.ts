/** Данные для историй и тестов профиля. */
import type { ProfileApi, StaffCard } from './model';

export const ownerMe: StaffCard = {
  id: 'u1',
  login: 'admin',
  name: 'Алексей',
  phone: '+7 (4872) 00-00-00',
  role: 'owner',
  /* У владельца оформления нет: наряды ему не назначают. */
  employment: null,
  active: true,
  createdAt: '2026-01-15T09:00:00.000Z',
  lastLoginAt: '2026-08-25T05:00:00.000Z',
};

export const installerMe: StaffCard = {
  ...ownerMe,
  id: 'u2',
  login: 'sokolov',
  name: 'Дмитрий Соколов',
  phone: '+7 (910) 155-24-68',
  role: 'installer',
  employment: 'self_employed',
};

/** Оформление ещё не заведено — профиль показывает это, а не пустую строку. */
export const unsetEmploymentMe: StaffCard = { ...installerMe, employment: null };

export const acceptingApi: ProfileApi = {
  save: async () => ({ ok: true }),
  changePassword: async () => ({ ok: true }),
  logoutEverywhere: async () => ({ ok: true }),
};

export const failingApi: ProfileApi = {
  save: async () => ({ ok: false, message: 'Сервер не принял изменения. Попробуйте ещё раз' }),
  changePassword: async () => ({ ok: false, message: 'Текущий пароль не подошёл' }),
  logoutEverywhere: async () => ({
    ok: false,
    message: 'Сервер не принял изменения. Попробуйте ещё раз',
  }),
};

/** Ни одного входа: учётная запись заведена, но человек ещё не заходил. */
export const neverLoggedInMe: StaffCard = { ...installerMe, lastLoginAt: null };
