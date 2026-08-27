/**
 * История наряда: кто и когда менял статус, кого назначили, когда заполнили итог.
 *
 * 🔴 Формулировки собраны здесь, а не рассыпаны по репозиторию. История — это
 * то, что владелец читает через полгода, когда разбирается, почему выезд
 * сорвался; две записи об одном и том же разными словами делают её
 * бесполезной ровно тогда, когда в неё смотрят (docs/CRM.md §3.3).
 *
 * Имя монтажника подставляется через двоеточие, а не склоняется: русских
 * падежей в коде не бывает, а «Назначен Дмитрий Соколов» читается как ошибка.
 */
import type { OrderStatus } from '../model';

export const ORDER_HISTORY_TEXT = {
  created: 'Наряд заведён',
  assigned: (who: string): string => `Назначен: ${who}`,
  unassigned: 'Исполнитель снят',
  result: 'Заполнен итог работ',
  resultCleared: 'Итог работ очищен',
} as const;

/**
 * Смена статуса словами монтажника и владельца, а не именем поля.
 *
 * `assigned` здесь тоже есть: владелец возвращает наряд в назначенные и без
 * этой строки история молчит о том, что работа снова ждёт выезда.
 */
const STATUS_TEXT: Readonly<Record<OrderStatus, string>> = {
  new: 'Возвращён в новые',
  assigned: 'Назначен',
  in_progress: 'Взят в работу',
  done: 'Выполнен',
  cancelled: 'Отказ',
};

export function orderStatusHistory(status: OrderStatus): string {
  return STATUS_TEXT[status];
}

/** Назначение и снятие — одна запись: «кого назначили» либо «сняли». */
export function orderAssignHistory(who: string | null): string {
  return who === null ? ORDER_HISTORY_TEXT.unassigned : ORDER_HISTORY_TEXT.assigned(who);
}

/** Итог заполняют и стирают — записи об этом разные: пустой отчёт тоже событие. */
export function orderResultHistory(filled: boolean): string {
  return filled ? ORDER_HISTORY_TEXT.result : ORDER_HISTORY_TEXT.resultCleared;
}
