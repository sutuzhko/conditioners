import { formatMoney, formatNumber } from '@/shared/lib/format';

import {
  leadContextSchema,
  type LeadContext,
  type LeadContextLine,
  type LeadContextModel,
  type LeadContextPick,
} from '../model';

/**
 * Разбор и показ контекста заявки.
 *
 * Функции живут в домене, потому что читателей у снимка трое: форма на
 * сайте (что уедет вместе с заявкой), карточка заявки в админке и текст
 * уведомления владельцу. Слой `server` не имеет права импортировать
 * интерфейсные слои, а три копии одного форматирования разошлись бы на
 * первой же правке — и владелец увидел бы в письме одну цену, а в панели
 * другую (инвариант 9 по духу).
 */

/** Пустой контекст — это `null`, а не объект с четырьмя пустыми полями. */
export function isEmptyLeadContext(context: LeadContext): boolean {
  return (
    context.estimate === null &&
    context.pick === null &&
    context.model === null &&
    context.liked.length === 0
  );
}

/**
 * 🔴 Единственная дверь для контекста, откуда бы он ни пришёл: из тела формы,
 * из колонки `Json` в базе или из полезной нагрузки уведомления. Ничего не
 * бросает: подделанный или испорченный контекст обязан просто исчезнуть, а не
 * стоить владельцу заявки (инвариант 2).
 */
export function parseLeadContext(value: unknown): LeadContext | null {
  if (value === null || value === undefined) return null;

  const parsed = leadContextSchema.safeParse(value);
  if (!parsed.success) return null;

  return isEmptyLeadContext(parsed.data) ? null : parsed.data;
}

/**
 * Дополнение снимка. Человек считает смету, потом подбирает модель по площади —
 * второе действие не отменяет первого, поэтому части складываются, а не
 * замещают друг друга целиком.
 */
export function mergeLeadContext(
  base: LeadContext | null,
  patch: Partial<LeadContext>,
): LeadContext | null {
  const merged: LeadContext = {
    estimate: patch.estimate ?? base?.estimate ?? null,
    pick: patch.pick ?? base?.pick ?? null,
    model: patch.model ?? base?.model ?? null,
    liked: patch.liked ?? base?.liked ?? [],
  };

  return isEmptyLeadContext(merged) ? null : merged;
}

/**
 * «Сплит-07 — 34 900 ₽» либо «Сплит-07 — 34 900 ₽ вместо 39 900 ₽».
 *
 * 🔴 Перечёркнутая цена показывается только тогда, когда она стояла на экране:
 * снимок повторяет витрину, а не пересчитывает её (ADR-011, инвариант 14).
 */
export function leadContextModelText(model: LeadContextModel): string {
  if (model.price === null) return model.name;
  if (model.oldPrice === null) return `${model.name} — ${formatMoney(model.price)}`;

  return `${model.name} — ${formatMoney(model.price)} вместо ${formatMoney(model.oldPrice)}`;
}

/** «Класс мощности: 09 · до 27 м² · Длина трассы: 7 м» — условия расчёта в строку. */
export function leadContextParamsText(params: readonly LeadContextLine[]): string {
  return params.map((param) => `${param.label}: ${param.value}`).join(' · ');
}

/** «25 м², Квартира» — что человек задал в подборе. */
export function leadContextPickText(pick: LeadContextPick): string {
  return `${formatNumber(pick.area)} м², ${pick.place}`;
}
