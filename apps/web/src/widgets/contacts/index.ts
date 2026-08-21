/**
 * Публичный API блока контактов. Страница импортирует отсюда и передаёт
 * настройки компании пропсами — сам блок в базу не ходит
 * (docs/ORCHESTRATION.md).
 */
export { Contacts } from './Contacts';
export type { ContactsProps } from './Contacts';
export { addressLine, mapQuery, yandexMapsHref } from './lib';
