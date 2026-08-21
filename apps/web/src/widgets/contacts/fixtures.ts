import { SETTING_PLACEHOLDER } from '@/entities/settings/lib/readiness';
import type { Address, Contacts, Geo, ServiceArea } from '@/entities/settings/model';

/**
 * Данные историй и тестов.
 *
 * 🔴 Это витрина вёрстки, а не контент: ни один из этих телефонов и адресов на
 * сайт не попадёт — блок рисует только то, что пришло из настроек.
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

/** У компании бывает два номера: городской и мобильный. */
export const contactsTwoPhones: Contacts = {
  ...contactsFixture,
  phones: ['+74872900000', '+79001234567'],
};

export const addressFixture: Address = {
  country: 'RU',
  region: 'Тульская область',
  city: 'Тула',
  street: 'ул. Демонстрационная',
  building: '1',
  office: 'оф. 5',
  postalCode: '300000',
};

export const areaFixture: ServiceArea = {
  served: 'Тула и Тульская область',
  districts: ['Центральный', 'Пролетарский', 'Зареченский', 'Привокзальный', 'Советский'],
};

export const geoFixture: Geo = { lat: 54.193122, lng: 37.617348 };

/** Реальное состояние проекта: сиды заполнены заметной заглушкой. */
export const contactsPlaceholder: Contacts = {
  phones: [SETTING_PLACEHOLDER],
  email: SETTING_PLACEHOLDER,
  telegram: '',
  whatsapp: '',
  hours: SETTING_PLACEHOLDER,
  responseTime: '',
  openingHours: [],
};

export const addressPlaceholder: Address = {
  country: 'RU',
  region: 'Тульская область',
  city: 'Тула',
  street: SETTING_PLACEHOLDER,
  building: SETTING_PLACEHOLDER,
  office: '',
  postalCode: SETTING_PLACEHOLDER,
};

/** Настройки, которых владелец ещё вообще не касался. */
export const contactsEmpty: Contacts = {
  phones: [],
  email: '',
  telegram: '',
  whatsapp: '',
  hours: '',
  responseTime: '',
  openingHours: [],
};

export const addressEmpty: Address = {
  country: 'RU',
  region: '',
  city: '',
  street: '',
  building: '',
  office: '',
  postalCode: '',
};

export const areaEmpty: ServiceArea = { served: '', districts: [] };

export const geoEmpty: Geo = { lat: null, lng: null };
