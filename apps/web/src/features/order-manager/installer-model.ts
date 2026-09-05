/**
 * Путь монтажника на объекте: окно дня, разбор итога и правила сдачи
 * (issue #619, #632, #633; макет `design/admin/Installer.body.html`).
 *
 * 🔴 Здесь только правила, без разметки и без текстов. Экран монтажника
 * смотрят с телефона в машине, и каждое число — часы дня, сколько снимков ещё
 * нужно, сколько метров трассы дописали — обязано проверяться тестом, а не
 * глазами на кадре.
 */
import { z } from 'zod';

import type { OrderCard, OrderPhotoCard, OrderStatus } from '@/entities/order/model';
import { dayKeyOf, shiftDay, todayKey, type DayKey } from '@/shared/lib/calendar';

import { ORDERS_PATH } from './model';

/**
 * Окно наряда дня. Стопок по состоянию у монтажника нет: он не разбирает
 * список, он едет по времени — «сегодня», «завтра», «на неделю» (макет,
 * первый кадр).
 */
export const installerWhenSchema = z.enum(['today', 'tomorrow', 'week']);
export type InstallerWhen = z.infer<typeof installerWhenSchema>;
export const INSTALLER_WHENS: readonly InstallerWhen[] = installerWhenSchema.options;

/** Мусор в адресе открывает сегодняшний день, а не роняет раздел. */
export function installerWhenFromParam(value: string | undefined): InstallerWhen {
  const parsed = installerWhenSchema.safeParse(value);
  return parsed.success ? parsed.data : 'today';
}

/** Границы выборки в днях: репозиторий переводит их в моменты пояса работ. */
export type AgendaWindow = {
  readonly from: DayKey;
  readonly days: number;
};

export function agendaWindow(when: InstallerWhen, today: DayKey = todayKey()): AgendaWindow {
  if (when === 'tomorrow') return { from: shiftDay(today, 1), days: 1 };
  if (when === 'week') return { from: today, days: 7 };
  return { from: today, days: 1 };
}

/** Наряды одного дня. Порядок внутри — тот, что пришёл из базы: по времени. */
export type AgendaGroup = {
  readonly day: DayKey;
  readonly orders: readonly OrderCard[];
};

/**
 * 🔴 Группировка по времени, а не по состоянию (issue #633).
 *
 * Владельцу список нарядов отвечает на вопрос «что где висит», и стопки у
 * него по состоянию. Монтажнику список отвечает на вопрос «куда я еду
 * дальше», и единственный порядок, в котором он его читает, — часы.
 */
export function agendaGroups(orders: readonly OrderCard[]): readonly AgendaGroup[] {
  const groups: AgendaGroup[] = [];

  for (const order of orders) {
    const day = dayKeyOf(new Date(order.at));
    const last = groups.at(-1);

    if (last !== undefined && last.day === day) {
      groups[groups.length - 1] = { day, orders: [...last.orders, order] };
      continue;
    }

    groups.push({ day, orders: [order] });
  }

  return groups;
}

/** Сводка окна: сколько выездов и сколько часов работы они занимают. */
export type AgendaSummary = {
  readonly count: number;
  readonly minutes: number;
};

/**
 * 🔴 Часы считаются по плановой длительности, а не по переработке: сводка
 * отвечает на вопрос «сколько сегодня работы», который задают утром, когда
 * переработки ещё нет (ADR-138 — её ставит сервер по факту).
 */
export function agendaSummary(orders: readonly OrderCard[]): AgendaSummary {
  return {
    count: orders.length,
    minutes: orders.reduce((total, order) => total + order.durationMin, 0),
  };
}

/**
 * Что монтажник делает с нарядом дальше.
 *
 * Переходов у него ровно два — «выехал» и «закончил» (CRM.md §6), и экран
 * показывает один из них, а не список статусов: выбор из выпадающего списка
 * в перчатках у машины — это не действие, а задача на внимание.
 */
export type InstallerStep = 'take' | 'handover' | 'closed' | 'none';

export function installerStep(status: OrderStatus): InstallerStep {
  if (status === 'assigned') return 'take';
  if (status === 'in_progress') return 'handover';
  if (status === 'done') return 'closed';
  return 'none';
}

/**
 * 🔴 Сколько снимков «после» нужно, чтобы сдать работу.
 *
 * Правило работы, а не факт о компании: снимок «после» остаётся в истории
 * клиента и служит доказательством, что работа сделана и сделана так. Двух
 * хватает на внутренний и наружный блок — то, о чём спрашивают в спорах.
 */
export const REQUIRED_AFTER_PHOTOS = 2;

/**
 * Сколько снимков ещё не хватает.
 *
 * 🔴 Число, а не признак «хватает / не хватает»: макет писал «нужно 2», и по
 * этой подписи нельзя понять, две сверх загруженной или две всего. Экран
 * обязан назвать остаток (issue #632).
 */
export function photosLeft(
  photos: readonly OrderPhotoCard[],
  required: number = REQUIRED_AFTER_PHOTOS,
): number {
  const done = photos.filter((photo) => photo.stage === 'after').length;
  return Math.max(0, required - done);
}

/** Что дописали сверх наряда, числами: трасса и короб в метрах. */
export type ExtraWorkBreakdown = {
  readonly trassaM: number | null;
  readonly boxM: number | null;
};

/** Метры рядом с числом: «1,5 м», «2 м». «9 мм» — не метры, и не считается. */
const METERS = /(\d+(?:[.,]\d+)?)\s*м(?![а-яё])/iu;

const ROOTS = { trassaM: 'трасс', boxM: 'короб' } as const;

/** Где в тексте начинается каждый из разбираемых кусков. */
function rootAt(text: string, root: string): number {
  return text.toLowerCase().indexOf(root);
}

/**
 * 🔴 Разбор итога на трассу и короб (макет, четвёртый кадр).
 *
 * Полей под эти метры в базе нет и заводить их незачем: владелец всё равно
 * правит смету сам, а монтажник пишет отчёт словами — так, как проговаривает
 * его клиенту. Разбор существует, чтобы главные числа отчёта было видно
 * сразу, не вычитывая строку: он читает то же поле, а не второе.
 *
 * Кусок каждого ключа обрывается на следующем ключе: иначе «трасса 1,5 м,
 * короб 2 м» отдавала бы трассе оба числа.
 */
export function parseExtraWork(text: string): ExtraWorkBreakdown {
  const bounds = Object.values(ROOTS)
    .map((root) => rootAt(text, root))
    .filter((at) => at >= 0)
    .sort((first, second) => first - second);

  const valueOf = (root: string): number | null => {
    const at = rootAt(text, root);
    if (at < 0) return null;

    const next = bounds.find((bound) => bound > at) ?? text.length;
    const found = METERS.exec(text.slice(at + root.length, next))?.[1];
    if (found === undefined) return null;

    const value = Number.parseFloat(found.replace(',', '.'));
    return Number.isFinite(value) ? value : null;
  };

  return { trassaM: valueOf(ROOTS.trassaM), boxM: valueOf(ROOTS.boxM) };
}

/**
 * Маршрут до объекта.
 *
 * 🔴 Яндекс, а не Google: панель открывают с телефона в Туле, и карты Google
 * там держатся хуже — а «Маршрут», который не открылся, стоит монтажнику
 * времени на объекте. Адрес приходит из наряда, в коде его нет (инвариант 8).
 */
export function routeHref(address: string): string {
  return `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
}

/** Адрес наряда дня: умолчание «сегодня» в адресе не пишется. */
export function agendaHref(when: InstallerWhen): {
  readonly pathname: string;
  readonly query: Record<string, string>;
} {
  return { pathname: ORDERS_PATH, query: when === 'today' ? {} : { when } };
}

/** Адрес сдачи работы — отдельный экран, а не вкладка карточки (issue #632). */
export function handoverPath(orderId: string): string {
  return `${ORDERS_PATH}/${orderId}/handover`;
}
