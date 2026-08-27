import { minutesOfDay } from '@/shared/lib/calendar';

/**
 * Переработка: сколько минут записи вышло за рабочее окно компании.
 *
 * 🔴 Считается один раз, при сохранении записи, и хранится числом (ADR-138).
 * Пересчитывать при показе нельзя: владелец сдвигает окно в настройках — и
 * переработка, случившаяся в прошлый четверг, поменялась бы задним числом. На
 * эти минуты смотрят при расчётах с людьми, и число, зависящее от настройки,
 * — это спор с монтажником на ровном месте.
 *
 * Окно задаётся минутами от полуночи по Москве: пояс задаёт город работ, а не
 * браузер того, кто открыл панель (ADR-080).
 */
export type WorkWindow = {
  readonly fromMin: number;
  readonly toMin: number;
};

/**
 * Работа, вышедшая за полночь, считается по тому же окну следующего дня.
 *
 * Монтаж, начавшийся в 18:00 и занявший пять часов, заканчивается в 23:00 —
 * это три часа переработки при окне до двадцати. Случай редкий, но
 * единственная альтернатива — объявить всё после полуночи переработкой
 * целиком, а это неправда: в шесть утра следующего дня рабочее окно уже
 * открыто.
 */
export function overtimeMinutes(at: Date, durationMin: number, window: WorkWindow): number {
  if (durationMin <= 0) return 0;

  const start = minutesOfDay(at);
  const end = start + durationMin;

  let overtime = 0;

  /* Идём по суткам, которые задевает запись: каждый день даёт своё окно. */
  for (let dayStart = 0; dayStart < end; dayStart += 24 * 60) {
    const dayEnd = dayStart + 24 * 60;

    /* Пересечение записи с этими сутками. */
    const from = Math.max(start, dayStart);
    const to = Math.min(end, dayEnd);
    if (to <= from) continue;

    /* Пересечение с рабочим окном этих суток. */
    const workFrom = Math.max(from, dayStart + window.fromMin);
    const workTo = Math.min(to, dayStart + window.toMin);
    const inside = Math.max(0, workTo - workFrom);

    overtime += to - from - inside;
  }

  return overtime;
}
