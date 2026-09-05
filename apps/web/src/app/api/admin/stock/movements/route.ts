/**
 * Движения склада — docs/API.md §14.
 *
 * 🔴 Проведение открыто обеим ролям, но не одинаково: монтажник проводит
 * только списание в наряд и возврат, только по своему наряду и только из своей
 * машины. Разбирает это `assertMayMove` — проверка стоит на сервере, а не в
 * разметке: монтажник знает адреса панели, он в ней работает.
 *
 * Журнал целиком — владельческий: по нему видно, кто, что и куда двигал по
 * всей компании.
 */
import {
  isStockMoveKind,
  isStockPeriod,
  stockMovementCreateSchema,
  type StockMoveKind,
  type StockPeriod,
} from '@/entities/stock/model';
import { json, readJson, validationError, withAdmin, withOwner } from '@/server/http';
import { assertMayMove, move, movements } from '@/server/repo/stock';
import { pageNumber } from '@/shared/lib/paging';

export const dynamic = 'force-dynamic';

function kindOf(value: string | null): StockMoveKind | undefined {
  return value !== null && isStockMoveKind(value) ? value : undefined;
}

/** Период журнала (issue #610). Неизвестное значение — «за всё время». */
function periodOf(value: string | null): StockPeriod | undefined {
  return value !== null && isStockPeriod(value) ? value : undefined;
}

export const GET = withOwner(async (request) => {
  const params = request.nextUrl.searchParams;

  return json(
    await movements({
      item: params.get('item') ?? undefined,
      /* Вид приходит из адреса, а адрес правят руками: неизвестное значение —
         это «покажи всё», а не отказ. */
      kind: kindOf(params.get('kind')),
      period: periodOf(params.get('period')),
      /* Поиск по позиции, основанию и номеру наряда — тот же, что в панели:
         журнал за пределами интерфейса читают теми же вопросами. */
      query: params.get('q') ?? undefined,
      page: pageNumber(params.get('page') ?? undefined),
    }),
  );
});

export const POST = withAdmin(async (request, _context, session) => {
  const parsed = stockMovementCreateSchema.safeParse(await readJson(request));
  if (!parsed.success) return validationError(parsed.error);

  const viewer = { role: session.role, userId: session.userId };
  await assertMayMove(parsed.data, viewer);

  return json({ movement: await move(parsed.data, session.userId) }, 201);
});
