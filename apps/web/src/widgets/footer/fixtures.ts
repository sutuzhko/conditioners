import { SETTING_PLACEHOLDER } from '@/entities/settings/lib/readiness';
import type {
  Address,
  Company,
  Contacts,
  LegalCompany,
  LegalEntrepreneur,
} from '@/entities/settings/model';
import type { ButtonLinkHref } from '@/shared/ui';
import type { NavItem } from './model';

/** Фикстуры историй и тестов — см. комментарий в widgets/header/fixtures.ts. */

export const navFixture: readonly NavItem[] = [
  { label: 'Каталог', href: '/#catalog' },
  { label: 'Цены на монтаж', href: '/#prices' },
  { label: 'Честно о цене', href: '/#honesty' },
  { label: 'Отзывы', href: '/#reviews' },
  { label: 'База знаний', href: '/knowledge' },
];

export const policyHrefFixture: ButtonLinkHref = '/privacy';

export const companyFixture: Company = {
  name: 'ТулаКлимат',
  tagline: 'Продажа, установка и обслуживание кондиционеров в Туле и области.',
  foundedYear: 2014,
};

export const contactsFixture: Contacts = {
  phones: ['+74872900000'],
  email: 'demo@example.com',
  telegram: '',
  whatsapp: '',
  hours: 'Пн–Вс, 8:00–21:00',
  responseTime: '',
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

/**
 * Номера с верными контрольными разрядами: они проходят схему реквизитов
 * (PROJECT §5.2). Придуманные, но арифметически настоящие — «7100000000»
 * проверяло бы длину строки, а не проверку.
 */
/* Тип ветви, а не общий `Legal`: истории и тесты читают у фикстуры поля
   заведомо одной формы, и объединение заставляло бы сужать её на каждой
   строчке проверки. */
export const legalIp: LegalEntrepreneur = {
  form: 'ИП',
  name: 'Демонстрационный Д. Д.',
  inn: '710703123450',
  ogrn: '314710700012346',
  regDate: '2015-03-12',
  regAuthority: 'Межрайонная ИФНС России № 10 по Тульской области',
  address: '300000, Тула, ул. Демонстрационная, 1',
  bankName: '',
  bankBik: '',
  bankAccount: '',
  bankCorrAccount: '',
};

export const legalOoo: LegalCompany = {
  form: 'ООО',
  name: '«Демонстрация»',
  shortName: '«Демо»',
  inn: '7107023451',
  kpp: '710701001',
  ogrn: '1027107001239',
  /* Место нахождения нарочно отличается от адреса приёма из группы `address`:
     у общества это разные адреса, и фикстура, где они совпадают, скрыла бы
     путаницу между колонкой контактов и колонкой реквизитов. */
  address: '300026, Тула, Одоевское шоссе, 71, оф. 4',
  director: 'Демонстрационный Д. Д.',
  directorTitle: 'Директор',
  bankName: '',
  bankBik: '',
  bankAccount: '',
  bankCorrAccount: '',
};

/** Реальное состояние проекта: сиды заполнены заметной заглушкой. */
export const companyPlaceholder: Company = {
  name: SETTING_PLACEHOLDER,
  tagline: SETTING_PLACEHOLDER,
  foundedYear: null,
};

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

export const legalPlaceholder: LegalEntrepreneur = {
  form: 'ИП',
  name: SETTING_PLACEHOLDER,
  inn: SETTING_PLACEHOLDER,
  ogrn: SETTING_PLACEHOLDER,
  /* Заглушка датой быть не может — незаполненная дата честнее пустой. */
  regDate: '',
  regAuthority: SETTING_PLACEHOLDER,
  address: SETTING_PLACEHOLDER,
  bankName: '',
  bankBik: '',
  bankAccount: '',
  bankCorrAccount: '',
};

/** Настройки, которых владелец ещё вообще не касался. */
export const companyEmpty: Company = { name: '', tagline: '', foundedYear: null };

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

export const legalEmpty: LegalEntrepreneur = {
  form: 'ИП',
  name: '',
  inn: '',
  ogrn: '',
  regDate: '',
  regAuthority: '',
  address: '',
  bankName: '',
  bankBik: '',
  bankAccount: '',
  bankCorrAccount: '',
};
