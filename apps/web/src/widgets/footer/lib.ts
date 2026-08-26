import { formatAddress as sharedFormatAddress } from '@/entities/settings/lib/address';
import type { Address, Legal } from '@/entities/settings/model';
import { footerContent } from './content';

/** Подпись номера регистрации: у ИП это ОГРНИП, у ООО — ОГРН. */
export function ogrnLabel(legal: Legal): string {
  return legal.form === 'ИП' ? footerContent.ogrnipLabel : footerContent.ogrnLabel;
}

/**
 * Почтовый адрес одной строкой. Регион в строку не входит: он виден в разделе
 * обслуживания и в JSON-LD, а в футере удлинял бы строку без пользы.
 */
export function formatAddress(address: Address): string {
  // в реквизитах адрес юридический — с индексом
  return sharedFormatAddress(address, { withPostalCode: true });
}
