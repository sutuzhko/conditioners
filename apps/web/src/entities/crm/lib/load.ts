/**
 * Загрузка людей и пересечения времени — CRM.md §8.5.
 *
 * Календарь показывает, что запланировано, но на вопрос «влезет ли ещё один
 * монтаж к Дмитрию в четверг» не отвечает: для этого нужно сложить занятые
 * промежутки и найти те, что налезают друг на друга.
 *
 * 🔴 Пересечение предупреждает, а не запрещает (ADR-115): срочный ремонт в
 * июльскую жару важнее запрета. Здесь считаются факты, решение принимает
 * владелец.
 *
 * 🔴 Чистые функции домена, а не условия в разметке: тот же расчёт нужен и
 * сетке недели, и колонке монтажника, и предупреждению в форме. Второй расчёт
 * в разметке разошёлся бы с первым на первой же правке.
 */
import { MINUTES_IN_DAY } from '../model';
import type { DayBusy } from './busy';

/** Промежуток внутри суток: минуты от местной полуночи, конец не включается. */
export type TimeSpan = {
  readonly fromMin: number;
  readonly toMin: number;
};

/** Занятый промежуток с хозяином: наряд, дело или что угодно со временем. */
export type Booking = TimeSpan & {
  readonly id: string;
  /**
   * Кому назначено. `null` — исполнителя ещё нет, и спорить такому не с кем:
   * два неназначенных наряда на десять утра — это работа для двоих, а не
   * конфликт.
   */
  readonly ownerId: string | null;
};

/** Промежуток с местом в колонке: сколько дорожек в кучке и какая эта. */
export type Placed<Item> = {
  readonly item: Item;
  readonly lane: number;
  readonly lanes: number;
};

/**
 * Начало и длительность → промежуток.
 *
 * Конец прижимается к концу суток: наряд на 23:00 длиной три часа рисуется до
 * полуночи, а не уезжает в следующий день — календарь показывает сутки, и
 * промежуток, вылезший за них, ломает и раскладку, и подсчёт загрузки.
 */
export function spanOf(fromMin: number, durationMin: number): TimeSpan {
  const from = Math.min(Math.max(Math.trunc(fromMin), 0), MINUTES_IN_DAY);
  const to = Math.min(from + Math.max(Math.trunc(durationMin), 0), MINUTES_IN_DAY);
  return { fromMin: from, toMin: to };
}

/**
 * Налезают ли промежутки друг на друга.
 *
 * Границы полуоткрытые: монтаж 14:00–16:00 и следующий 16:00–18:00 не спорят —
 * человек успевает закончить и поехать. Пустой промежуток (нулевая
 * длительность) не пересекается ни с чем.
 */
export function overlaps(left: TimeSpan, right: TimeSpan): boolean {
  if (left.toMin <= left.fromMin || right.toMin <= right.fromMin) return false;

  return left.fromMin < right.toMin && right.fromMin < left.toMin;
}

/**
 * Кто с кем спорит по времени — номера всех записей, у которых есть хотя бы
 * одно пересечение.
 *
 * 🔴 Считается по каждому человеку отдельно. Дмитрий с 10 до 12 и Сергей с 11
 * до 14 — это два занятых человека, а не конфликт; сложить их значило бы
 * запретить компании работать двумя бригадами.
 */
export function clashingIds(bookings: readonly Booking[]): ReadonlySet<string> {
  const clashing = new Set<string>();

  const byOwner = new Map<string, Booking[]>();
  for (const booking of bookings) {
    if (booking.ownerId === null) continue;

    const ready = byOwner.get(booking.ownerId);
    if (ready === undefined) byOwner.set(booking.ownerId, [booking]);
    else ready.push(booking);
  }

  for (const own of byOwner.values()) {
    for (const left of own) {
      for (const right of own) {
        if (left.id === right.id || !overlaps(left, right)) continue;

        clashing.add(left.id);
        clashing.add(right.id);
      }
    }
  }

  return clashing;
}

/**
 * С чем спорит новая запись — для предупреждения в форме.
 *
 * Отбор идёт по тому же человеку: назначая наряд Дмитрию, владелец должен
 * узнать про наряды Дмитрия, а не про чужие. `owner` в `null` — исполнителя
 * ещё не выбрали, и сравнивать не с чем.
 */
export function clashesWith(
  span: TimeSpan,
  owner: string | null,
  bookings: readonly Booking[],
): readonly Booking[] {
  if (owner === null) return [];

  return bookings.filter((booking) => booking.ownerId === owner && overlaps(span, booking));
}

/**
 * Сколько минут дня занято.
 *
 * Пересечения не считаются дважды: два наряда с 10 до 12 у одного человека —
 * это две ошибки в плане, но не четыре часа работы. Поэтому идёт слияние, а не
 * сумма длительностей.
 */
export function loadMinutes(spans: readonly TimeSpan[]): number {
  const sorted = [...spans]
    .filter((span) => span.toMin > span.fromMin)
    .sort((left, right) => left.fromMin - right.fromMin);

  let total = 0;
  let edge = -1;

  for (const span of sorted) {
    const from = Math.max(span.fromMin, edge);
    if (span.toMin > from) total += span.toMin - from;
    edge = Math.max(edge, span.toMin);
  }

  return total;
}

/**
 * Раскладка колонки: пересекающиеся записи встают рядом, а не друг на друга.
 *
 * Кучка — группа записей, связанных пересечениями напрямую или через соседа:
 * ширину внутри кучки делят поровну, чтобы два монтажа на одно время были
 * одинаково читаемы. Записи, ни с чем не спорящие, занимают колонку целиком.
 */
export function laneOf<Item extends TimeSpan>(items: readonly Item[]): readonly Placed<Item>[] {
  const sorted = [...items].sort(
    (left, right) => left.fromMin - right.fromMin || left.toMin - right.toMin,
  );

  const placed: Placed<Item>[] = [];
  /* Кучка накапливается, пока очередная запись хоть за что-то в ней цепляется;
     ширину она узнаёт только на закрытии — раньше число дорожек неизвестно. */
  let cluster: { item: Item; lane: number }[] = [];
  let clusterEnd = -1;

  const close = (): void => {
    const lanes = cluster.reduce((max, entry) => Math.max(max, entry.lane + 1), 1);
    for (const entry of cluster) placed.push({ item: entry.item, lane: entry.lane, lanes });
    cluster = [];
    clusterEnd = -1;
  };

  for (const item of sorted) {
    if (cluster.length > 0 && item.fromMin >= clusterEnd) close();

    const taken = new Set(
      cluster.filter((entry) => overlaps(entry.item, item)).map((entry) => entry.lane),
    );

    let lane = 0;
    while (taken.has(lane)) lane += 1;

    cluster.push({ item, lane });
    clusterEnd = Math.max(clusterEnd, item.toMin);
  }

  if (cluster.length > 0) close();

  return placed;
}

/**
 * Спорит ли промежуток с занятостью человека.
 *
 * Закрытый целиком день спорит с любым временем; у окна граница конца
 * открытая, как и у самой занятости: выезд с 16:00 после «14:00–16:00» ни с
 * чем не спорит.
 */
export function busyClash(busy: DayBusy, span: TimeSpan): boolean {
  if (busy.state === 'free') return false;
  if (busy.state === 'full') return span.toMin > span.fromMin;

  return busy.windows.some((window) => overlaps(window, span));
}
