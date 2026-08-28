import { ClientCreateModal } from '@/features/client-manager';
import { requireOwnerPage } from '@/server/guards';

export const dynamic = 'force-dynamic';

/**
 * Окно «Новый клиент» поверх списка.
 *
 * 🔴 Проверка роли стоит здесь, а не только в layout панели (ADR-095): страж
 * выше успевает сменить адрес, но не остановить рендер — а в базе клиентов
 * адреса и телефоны живых людей.
 */
export default async function AdminClientNewModal() {
  await requireOwnerPage();

  return <ClientCreateModal />;
}
