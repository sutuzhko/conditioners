/**
 * Отмена ошибочного списания — docs/API.md §14.
 *
 * 🔴 Возвратом в ту же зону, а не удалением движения: журнал не
 * переписывается. Ответ — сам возврат, потому что произошло именно это: в
 * складе не исчезла строка, в нём появилась новая (ADR-134).
 *
 * Монтажнику доступно только своё списание и только пока наряд не закрыт —
 * разбирает это репозиторий.
 */
import { json, withAdmin } from '@/server/http';
import { cancelConsumption } from '@/server/repo/stock';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string; move: string }> };

export const DELETE = withAdmin(async (_request, context: Context, session) => {
  const { id, move } = await context.params;

  const movement = await cancelConsumption(id, move, {
    role: session.role,
    userId: session.userId,
  });

  return json({ movement }, 201);
});
