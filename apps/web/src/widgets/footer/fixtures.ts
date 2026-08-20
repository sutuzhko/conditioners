import { SETTING_PLACEHOLDER } from '@/entities/settings/lib/readiness';
import type { Address, Company, Contacts, Legal } from '@/entities/settings/model';
import type { ButtonLinkHref } from '@/shared/ui';
import type { NavItem } from './model';

/** Фикстуры историй и тестов — см. комментарий в widgets/header/fixtures.ts. */

export const navFixture: readonly NavItem[] = [
  { label: 'Каталог', href: '#catalog' },
  { label: 'Цены на монтаж', href: '#ceny' },
  { label: 'Как обманывают', href: '#obman' },
  { label: 'Отзывы', href: '#otzyvy' },
  // Раздел ещё не создан (волна 2), поэтому маршрут записан объектом:
  // typedRoutes проверяет строковые литералы и пропускает UrlObject.
  { label: 'База знаний', href: { pathname: '/baza-znaniy' } },
];

/** Тот же случай, что и с «Базой знаний»: страница политики появится в волне 2. */
export const policyHrefFixture: ButtonLinkHref = { pathname: '/politika-konfidencialnosti' };

export const companyFixture: Company = {
  name: 'ТулаКлимат',
  legalName: 'ИП Демонстрационный Д. Д.',
  tagline: 'Продажа, установка и обслуживание кондиционеров в Туле и области.',
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

export const addressFixture: Address = {
  country: 'RU',
  region: 'Тульская область',
  city: 'Тула',
  street: 'ул. Демонстрационная',
  building: '1',
  office: 'оф. 5',
  postalCode: '300000',
};

export const legalIp: Legal = {
  form: 'ИП',
  name: 'Демонстрационный Д. Д.',
  inn: '710000000000',
  ogrn: '300000000000000',
  address: '300000, Тула, ул. Демонстрационная, 1',
};

export const legalOoo: Legal = {
  form: 'ООО',
  name: '«Демонстрация»',
  inn: '7100000000',
  ogrn: '1000000000000',
  address: '300000, Тула, ул. Демонстрационная, 1, оф. 5',
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

export const addressPlaceholder: Address = {
  country: 'RU',
  region: 'Тульская область',
  city: 'Тула',
  street: SETTING_PLACEHOLDER,
  building: SETTING_PLACEHOLDER,
  office: '',
  postalCode: SETTING_PLACEHOLDER,
};

export const legalPlaceholder: Legal = {
  form: 'ИП',
  name: SETTING_PLACEHOLDER,
  inn: SETTING_PLACEHOLDER,
  ogrn: SETTING_PLACEHOLDER,
  address: SETTING_PLACEHOLDER,
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

export const addressEmpty: Address = {
  country: 'RU',
  region: '',
  city: '',
  street: '',
  building: '',
  office: '',
  postalCode: '',
};

export const legalEmpty: Legal = { form: 'ИП', name: '', inn: '', ogrn: '', address: '' };
