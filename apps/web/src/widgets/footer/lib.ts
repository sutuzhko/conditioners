import { formatAddress as sharedFormatAddress } from '@/entities/settings/lib/address';
import type { Address } from '@/entities/settings/model';

/**
 * Почтовый адрес одной строкой. Регион в строку не входит: он виден в разделе
 * обслуживания и в JSON-LD, а в футере удлинял бы строку без пользы.
 */
export function formatAddress(address: Address): string {
  // адрес приёма клиентов показывается с индексом: по нему пишут письма
  return sharedFormatAddress(address, { withPostalCode: true });
}
