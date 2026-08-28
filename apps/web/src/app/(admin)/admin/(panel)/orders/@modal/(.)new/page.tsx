import { leadManagerContent as leadTexts } from '@/features/lead-manager';
import { OrderCreateModal } from '@/features/order-manager';

import { orderFormData } from '../../data';

export const dynamic = 'force-dynamic';

/**
 * Окно «Новый наряд» поверх списка.
 *
 * 🔴 Проверка роли стоит в самом загрузчике данных (ADR-095): страж выше
 * страницы успевает сменить адрес, но не остановить чтение. Заводить наряды
 * может только владелец, и то, чего монтажнику знать не положено, — телефоны
 * клиентов и вознаграждения — до него не доезжает вовсе.
 */
export default async function AdminOrderNewModal({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  const { clients, installers, blocks, work, lead } = await orderFormData(await searchParams);

  return (
    <OrderCreateModal
      clients={clients}
      installers={installers}
      blocks={blocks}
      work={work}
      {...(lead === null
        ? {}
        : {
            initial: lead.draft,
            title: leadTexts.orderFormTitle,
            hint: `${lead.from}. ${leadTexts.orderFormHint}`,
          })}
    />
  );
}
