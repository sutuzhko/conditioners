import { SETTING_PLACEHOLDER } from '@/entities/settings/lib/readiness';
import type { Company, Contacts } from '@/entities/settings/model';
import type { NavItem } from './model';

/**
 * Фикстуры историй и тестов. Они же документируют, какие данные блок ждёт от
 * страницы: в проде всё это приходит из настроек, в коде нет ни одного факта
 * о компании (инвариант 8).
 */

export const navFixture: readonly NavItem[] = [
  { label: 'Каталог', href: '#catalog' },
  { label: 'Цены', href: '#ceny' },
  { label: 'Монтаж', href: '#etapy', current: true },
  { label: 'Сервис', href: '#diagnostika' },
  // Раздел ещё не создан (волна 2), поэтому маршрут записан объектом:
  // typedRoutes проверяет строковые литералы и пропускает UrlObject.
  { label: 'База знаний', href: { pathname: '/baza-znaniy' } },
  { label: 'Контакты', href: '#kontakty' },
];

export const companyFixture: Company = {
  name: 'ТулаКлимат',
  legalName: 'ИП Демонстрационный Д. Д.',
  tagline: 'кондиционеры в Туле',
  foundedYear: 2014,
};

export const contactsFixture: Contacts = {
  phones: ['+74872900000'],
  email: 'demo@example.com',
  telegram: '',
  whatsapp: '',
  hours: 'Пн–Вс, 8:00–21:00',
  openingHours: ['Mo-Su 08:00-21:00'],
};

/** Реальное состояние проекта: сиды заполнены заметной заглушкой. */
export const companyPlaceholder: Company = {
  name: SETTING_PLACEHOLDER,
  legalName: SETTING_PLACEHOLDER,
  tagline: SETTING_PLACEHOLDER,
  foundedYear: null,
};

export const contactsPlaceholder: Contacts = {
  phones: [SETTING_PLACEHOLDER],
  email: SETTING_PLACEHOLDER,
  telegram: '',
  whatsapp: '',
  hours: SETTING_PLACEHOLDER,
  openingHours: [],
};

/** Настройки, которых владелец ещё вообще не касался. */
export const companyEmpty: Company = { name: '', legalName: '', tagline: '', foundedYear: null };

export const contactsEmpty: Contacts = {
  phones: [],
  email: '',
  telegram: '',
  whatsapp: '',
  hours: '',
  openingHours: [],
};
