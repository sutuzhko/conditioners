import type { Contacts } from '@/entities/settings/model';

/**
 * Фикстуры историй и тестов. Они же документируют, что панель ждёт от каркаса:
 * в проде это настройки из БД, в коде нет ни одного факта о компании
 * (инвариант 8).
 */
export const contactsFixture: Contacts = {
  phones: ['+74872900000'],
  email: 'demo@example.com',
  telegram: '',
  whatsapp: '',
  hours: 'Пн–Вс, 8:00–21:00',
  responseTime: '',
  openingHours: ['Mo-Su 08:00-21:00'],
};

/** Настройки, которых владелец ещё не касался: телефона нет. */
export const contactsWithoutPhone: Contacts = {
  ...contactsFixture,
  phones: [],
};
