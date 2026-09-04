/**
 * Сколько обращение ждёт — относительным временем, как в макете очереди.
 *
 * 🔴 Не украшение. Раздел заявок открывают ради одного вопроса: кому звонить
 * первым. Абсолютное «03.09.2026, 10:19» отвечает на него вычитанием в уме, и
 * ошибка в этом вычитании стоит заявки. «2 часа назад» отвечает сразу.
 *
 * Считается в поясе работ, а не в поясе браузера (ADR-080): очередь разбирают
 * из Тулы, и «вчера» здесь — вчера по Москве, даже если панель открыли из
 * другого часового пояса.
 *
 * Момент «сейчас» приходит параметром, а не берётся из `Date.now()` внутри:
 * очередь рисует сервер, и одна страница обязана быть посчитана от одного
 * мгновения — иначе две соседние строки меряются разными «сейчас».
 */
import { ADMIN_TIME_ZONE } from '@/shared/lib/format';
import { dayKeyOf, shiftDay, timeOf } from '@/shared/lib/calendar';
import { plural } from '@/shared/lib/plural';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Первая минута — «только что»: обращение, пришедшее сию секунду, не должно
 * называться «0 минут назад».
 */
export function leadWaiting(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const elapsed = now.getTime() - at.getTime();

  /* Время из будущего — это рассинхронизация часов, а не будущее обращение.
     Показывать «через 3 минуты» в очереди бессмысленно: заявка уже пришла. */
  if (elapsed < MINUTE) return 'только что';

  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')} назад`;
  }

  const today = dayKeyOf(now);
  const day = dayKeyOf(at);

  if (day === today) {
    const hours = Math.floor(elapsed / HOUR);
    return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`;
  }

  /* «Вчера, 11:20» вместо «21 час назад»: за границей суток человек мыслит
     днями, и точное время говорит больше — по нему видно, звонили ли уже. */
  if (day === shiftDay(today, -1)) return `вчера, ${timeOf(at)}`;

  return shortDay(day, today);
}

/**
 * Старое обращение — днём и месяцем: «27 авг» (макет `Leads.png`).
 *
 * 🔴 Год дописывается только у чужого года. В колонке очереди, где почти всё
 * пришло на этой неделе, «27.08.2026» — четыре лишних знака в каждой строке;
 * но обращение двухлетней давности без года врало бы о своей давности вдвое.
 */
function shortDay(day: string, today: string): string {
  const sameYear = day.slice(0, 4) === today.slice(0, 4);

  return (
    new Intl.DateTimeFormat('ru-RU', {
      timeZone: ADMIN_TIME_ZONE,
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    })
      .format(new Date(`${day}T12:00:00.000Z`))
      /* Intl ставит точку после сокращения месяца («27 авг.»), а в колонке она
       читается как конец предложения. */
      .replace('.', '')
  );
}

/** Сутки без ответа — граница, после которой обращение считается залежавшимся. */
export const LEAD_STALE_HOURS = 24;

export function leadIsStale(iso: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(iso).getTime() >= LEAD_STALE_HOURS * HOUR;
}
