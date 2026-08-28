import { StaffCreateModal } from '@/features/staff-manager';
import { requireOwnerPage } from '@/server/guards';

export const dynamic = 'force-dynamic';

/**
 * Окно «Новый монтажник» поверх списка команды.
 *
 * 🔴 Проверка роли стоит здесь, а не только в layout панели (ADR-095): страж
 * выше успевает сменить адрес, но не остановить рендер — а форма заводит
 * доступ в панель и хранит ИНН человека.
 */
export default async function AdminTeamNewModal() {
  await requireOwnerPage();

  return <StaffCreateModal />;
}
