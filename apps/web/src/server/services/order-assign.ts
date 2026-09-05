/**
 * Групповое назначение монтажника (issue #596, docs/API.md §13).
 *
 * 🔴 Обработчик маршрута — контроллер (ADR-142): порядок записей, компенсация
 * при сбое и очередь уведомлений живут здесь и ничего не знают ни про
 * `Request`, ни про `Response`.
 *
 * 🔴 Наряды назначаются по одному, а не одним `updateMany`, и это не
 * недосмотр: у каждого наряда своя запись истории, свой пересчёт статуса и
 * своё уведомление исполнителю. `updateMany` записал бы восемь строк и не
 * оставил бы следа ни в одной истории — а «кто и когда назначил» в наряде
 * важнее, чем в любом другом разделе панели.
 *
 * Отказ на середине не откатывает уже назначенное: назначенный наряд — это
 * работа, о которой монтажник уже узнал. Вызывающий получает счёт удачных и
 * список номеров, на которых остановились.
 */
import { findById, update } from '@/server/repo/orders';
import { notifyOrderUpdated } from '@/server/notifications/orders';

export type AssignManyResult = {
  /** Сколько нарядов действительно назначено. */
  readonly assigned: number;
  /** Номера нарядов, которые назначить не удалось. */
  readonly failed: readonly string[];
};

export async function assignMany(
  ids: readonly string[],
  installerId: string,
  authorId: string,
): Promise<AssignManyResult> {
  const failed: string[] = [];
  let assigned = 0;

  for (const id of ids) {
    /* Снимок «до» — владельческий, во всей полноте: разница, посчитанная по
       урезанной карточке, молча потеряла бы часть вводных (ADR-119). */
    const before = await findById(id, { role: 'owner', userId: authorId });

    if (before === null) {
      failed.push(id);
      continue;
    }

    try {
      /* Статус не присылается: его выводит за исполнителем сам репозиторий —
         наряд «Новый» становится «Назначенным», а наряд в работе остаётся в
         работе. Присланный статус спорил бы с половиной выбранных строк. */
      const updated = await update(id, { installerId }, authorId);

      /* Уведомление ставится после записи и не может её отменить — тот же
         порядок, что у заявки (инвариант 2). */
      await notifyOrderUpdated(before, updated);
      assigned += 1;
    } catch {
      /* Отказ по одному наряду не отменяет остальные: назначенное уже
         назначено, и вызывающий узнает, что доделать. */
      failed.push(id);
    }
  }

  return { assigned, failed };
}
