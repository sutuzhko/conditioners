/**
 * Счётчики ожидающего у пунктов навигации панели (ADR-309, issue #570).
 *
 * 🔴 Считается в одном месте, а не разделом по запросу. Раздел, заводящий
 * свой счётчик, видит только себя: цифра у «Заявок» появлялась бы, лишь пока
 * открыты сами заявки, — а смысл её ровно обратный. Оболочка при этом к базе
 * не ходит: числа приходят к ней пропсами из layout (инвариант 1).
 *
 * Сервис, а не запрос из компонента: порядок обращений к базе и решение
 * «кому какие очереди показывать» — это правило, а не разметка (ADR-142).
 */
import type { AdminRole } from '@/entities/staff/model';
import { countByStatus } from '@/server/repo/leads';
import { countActive } from '@/server/repo/orders';
import { countPending } from '@/server/repo/reviews';
import type { AdminCounts } from '@/shared/config/admin-counters';

/**
 * Что ждёт внимания прямо сейчас.
 *
 * 🔴 Монтажнику счётчиков не показывается ни одного, и это не экономия
 * запросов. Все три очереди — очереди владельца: «в работе» считает наряды
 * всей бригады, а не его собственные, и цифра 7 у монтажника с двумя
 * выездами читалась бы как его долг. Макет монтажника счётчиков и не рисует.
 */
export async function navCounts(role: AdminRole): Promise<AdminCounts> {
  if (role !== 'owner') return {};

  /* Три счётных запроса разом: они не зависят друг от друга, и последовательно
     они удлинили бы каждую страницу панели на сумму трёх обращений. */
  const [orders, leads, reviews] = await Promise.all([
    countActive(),
    countByStatus('new'),
    countPending(),
  ]);

  return { orders, leads, reviews };
}
