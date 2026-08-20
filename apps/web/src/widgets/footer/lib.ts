import type { Address, Legal } from '@/entities/settings/model';
import { footerContent } from './content';

/**
 * Наименование в реквизитах: «ИП Иванов Иван Иванович».
 *
 * Форма собственности хранится отдельным полем, но владелец легко впишет её и
 * в наименование — тогда получилось бы «ИП ИП Иванов». Поэтому префикс
 * добавляется, только если его там ещё нет.
 */
export function legalTitle(legal: Legal): string {
  const name = legal.name.trim();
  if (name === '') return legal.form;
  return name.toLowerCase().startsWith(legal.form.toLowerCase()) ? name : `${legal.form} ${name}`;
}

/** Подпись номера регистрации: у ИП это ОГРНИП, у ООО — ОГРН. */
export function ogrnLabel(legal: Legal): string {
  return legal.form === 'ИП' ? footerContent.ogrnipLabel : footerContent.ogrnLabel;
}

/**
 * Почтовый адрес одной строкой. Регион в строку не входит: он виден в разделе
 * обслуживания и в JSON-LD, а в футере удлинял бы строку без пользы.
 */
export function formatAddress(address: Address): string {
  const parts = [address.city, address.street, address.building, address.office]
    .map((part) => part.trim())
    .filter((part) => part !== '');

  const postal = address.postalCode.trim();
  if (parts.length === 0) return postal;
  return postal === '' ? parts.join(', ') : `${postal}, ${parts.join(', ')}`;
}
