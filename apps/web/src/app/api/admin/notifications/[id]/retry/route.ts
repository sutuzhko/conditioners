import { json, notFound, withAdmin } from '@/server/http';
import { retryDelivery } from '@/server/repo/notifications';

/**
 * Повторная доставка уведомления — docs/API.md §9.
 *
 * 🔴 Ничего не создаёт заново: отправляется тот же снимок события, который
 * лежит в `payload`. Заявка при этом не дублируется — она давно в базе, речь
 * только об оповещении владельца.
 */
export const dynamic = 'force-dynamic';

export const POST = withAdmin(async (_request, context: { params: Promise<{ id: string }> }) => {
  const { id } = await context.params;

  // повторяем только отказы: у ждущего очереди уведомления попытки ещё есть
  const restored = await retryDelivery(id);
  return restored ? json({ id, status: 'pending' }) : notFound('Отказ доставки');
});
