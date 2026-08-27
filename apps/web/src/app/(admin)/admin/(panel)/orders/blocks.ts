/**
 * Занятость монтажников для формы наряда — ADR-115.
 *
 * Серверный помощник обеих страниц наряда: заведения и карточки. Живёт
 * отдельно от них, потому что нужен обеим, а копия разошлась бы с оригиналом
 * на первой же правке окна дат.
 *
 * 🔴 Занятость личная, и владельца записи задаёт сессия: `listRange` сам
 * сужает выборку — монтажник видит только свою (`repo/day-blocks`).
 */
import type { OrderBlock, OrderWorkSpan } from '@/features/order-manager';
import type { AdminSession } from '@/server/auth';
import { listOrdersRange } from '@/server/repo/crm';
import { listRange } from '@/server/repo/day-blocks';
import {
  dayKeyOf,
  minutesOfDay,
  momentOf,
  monthOfDay,
  shiftMonth,
  type DayKey,
} from '@/shared/lib/calendar';

/**
 * Окно, за которое поднимается занятость: месяц назад и три вперёд.
 *
 * Форма разрешает поставить любую дату, а тянуть занятость за все годы работы
 * ради предупреждения нельзя. Четырёх месяцев хватает: наряд, назначенный на
 * полгода вперёд, — это не выезд, а недоразумение. Повторяемые записи
 * («каждую среду») приходят вне зависимости от окна.
 */
const BACK_MONTHS = -1;
const FORWARD_MONTHS = 3;

const DAY_START = '00:00';

export async function loadBlocks(
  session: AdminSession,
  day: DayKey,
): Promise<readonly OrderBlock[]> {
  const month = monthOfDay(day);

  const rows = await listRange(
    { role: session.role, userId: session.userId },
    momentOf(`${shiftMonth(month, BACK_MONTHS)}-01`, DAY_START),
    momentOf(`${shiftMonth(month, FORWARD_MONTHS)}-01`, DAY_START),
  );

  return rows.map((row) => ({
    userId: row.userId,
    repeat: row.repeat,
    day: row.day,
    weekday: row.weekday,
    fromMin: row.fromMin,
    toMin: row.toMin,
    reason: row.reason,
  }));
}

/**
 * Выезды команды за то же окно.
 *
 * 🔴 Занятость человека — это не только его врач, но и его наряды (ADR-123):
 * форма, знающая про отлучки и не знающая про работу, промолчит ровно там,
 * где двое приедут к разным клиентам в одно время.
 *
 * Правящийся наряд из выборки убирается: сам себе он не помеха, а иначе
 * любая правка времени выглядела бы пересечением с самим собой.
 */
export async function loadWork(
  session: AdminSession,
  day: DayKey,
  exceptOrderId?: string,
): Promise<readonly OrderWorkSpan[]> {
  const month = monthOfDay(day);

  const rows = await listOrdersRange(
    { role: session.role, userId: session.userId },
    momentOf(`${shiftMonth(month, BACK_MONTHS)}-01`, DAY_START),
    momentOf(`${shiftMonth(month, FORWARD_MONTHS)}-01`, DAY_START),
  );

  return rows
    .filter((row) => row.installerId !== null && row.id !== exceptOrderId)
    .map((row) => {
      const at = new Date(row.at);
      const fromMin = minutesOfDay(at);

      return {
        userId: row.installerId ?? '',
        day: dayKeyOf(at),
        fromMin,
        toMin: fromMin + row.durationMin,
        reason: `Наряд № ${row.number}, ${row.address}`,
      };
    });
}
