import type {
  Address,
  Company,
  Contacts,
  Geo,
  Payment,
  Seo,
  ServiceArea,
  Social,
} from '@/entities/settings/model';
import { SETTING_PLACEHOLDER } from '@/shared/config/placeholder';

/**
 * Фикстуры сборщиков разметки.
 *
 * 🔴 Это выдуманная компания для тестов, а не данные заказчика: настоящие
 * значения владелец заводит в админке, и ни одно из них не имеет права
 * оказаться в коде (инвариант 8). Рядом лежат «пустой» и «с заглушками»
 * наборы — разметка обязана вести себя разумно и на них.
 */

export const SITE_URL = 'https://example-klimat.ru';

export const companyFixture: Company = {
  name: 'Пример Климат',
  legalName: 'ИП Пример Пример Примерович',
  tagline: 'Монтаж под ключ за один день',
  foundedYear: 2015,
};

export const contactsFixture: Contacts = {
  phones: ['+74872000000', '+79000000000'],
  email: 'mail@example-klimat.ru',
  telegram: '@example',
  whatsapp: '+79000000000',
  hours: 'Пн–Вс, 8:00–21:00',
  responseTime: '15 минут',
  openingHours: ['Mo-Su 08:00-21:00'],
};

export const addressFixture: Address = {
  country: 'RU',
  region: 'Тульская область',
  city: 'Тула',
  street: 'Примерная улица',
  building: '1',
  office: 'офис 2',
  postalCode: '300000',
};

export const geoFixture: Geo = { lat: 54.193, lng: 37.617 };

export const areaFixture: ServiceArea = {
  served: 'Тула и Тульская область',
};

export const paymentFixture: Payment = {
  methods: ['Наличные', 'Карта'],
  vat: 'Без НДС',
};

export const socialFixture: Social = {
  links: ['https://example.com/klimat', ''],
};

export const seoFixture: Seo = {
  homeTitle: 'Кондиционеры — купить с установкой',
  homeDescription: 'Продажа и монтаж кондиционеров',
  titleSuffix: 'Пример Климат',
  ogImage: '/media/og.png',
};

/** Настройки, которых владелец ещё не касался: все группы со значениями по умолчанию. */
export const emptyCompany: Company = { name: '', legalName: '', tagline: '', foundedYear: null };

export const emptyContacts: Contacts = {
  phones: [],
  email: '',
  telegram: '',
  whatsapp: '',
  hours: '',
  responseTime: '',
  openingHours: [],
};

export const emptyAddress: Address = {
  country: 'RU',
  region: '',
  city: '',
  street: '',
  building: '',
  office: '',
  postalCode: '',
};

export const emptyGeo: Geo = { lat: null, lng: null };

export const emptyArea: ServiceArea = { served: '' };

/** Сиды заполняют группы явной заглушкой — в разметке её быть не должно. */
export const placeholderCompany: Company = {
  name: SETTING_PLACEHOLDER,
  legalName: SETTING_PLACEHOLDER,
  tagline: SETTING_PLACEHOLDER,
  foundedYear: null,
};

export const placeholderContacts: Contacts = {
  ...emptyContacts,
  phones: [SETTING_PLACEHOLDER],
  email: SETTING_PLACEHOLDER,
};

export const placeholderAddress: Address = {
  ...emptyAddress,
  region: SETTING_PLACEHOLDER,
  city: SETTING_PLACEHOLDER,
  street: SETTING_PLACEHOLDER,
};
