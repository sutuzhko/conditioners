import { StockCreateModal } from '@/features/stock-manager';

import { zoneFormData } from '../../../data';

export const dynamic = 'force-dynamic';

/** Окно «Новая зона» поверх списка зон. */
export default async function StockZoneNewModal() {
  const { people } = await zoneFormData();

  return <StockCreateModal creation={{ kind: 'zone', people }} />;
}
