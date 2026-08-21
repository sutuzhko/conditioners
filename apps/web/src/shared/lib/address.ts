import type { Address } from '@/entities/settings/model';

/**
 * Сборка почтового адреса из частей. Адрес хранится по полям, потому что
 * разметка `PostalAddress` требует их отдельно, а Яндекс.Бизнес сверяет
 * построчно: из частей строку собрать можно, из строки части — нет (ADR-009).
 *
 * Третья по счёту реализация этой сборки в проекте — первые две написали
 * независимо футер и контакты, потому что правило слоёв запрещает импорт
 * вбок между виджетами.
 */
export type AddressFormatOptions = {
  /**
   * Добавить индекс в начало. Нужен в реквизитах футера — там адрес
   * юридический; в контактах индекс только удлиняет строку.
   */
  readonly withPostalCode?: boolean;
};

export function formatAddress(address: Address, options: AddressFormatOptions = {}): string {
  const parts = [address.city, address.street, address.building, address.office]
    .map((part) => part.trim())
    .filter((part) => part !== '');

  const postal = address.postalCode.trim();
  if (options.withPostalCode !== true || postal === '') return parts.join(', ');
  return parts.length === 0 ? postal : `${postal}, ${parts.join(', ')}`;
}
