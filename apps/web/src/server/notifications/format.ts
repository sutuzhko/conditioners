import {
  leadContextModelText,
  leadContextParamsText,
  leadContextPickText,
} from '@/entities/lead/lib/context';
import type { LeadContext } from '@/entities/lead/model';
import type { OrderEquip, OrderType, PaymentMode, UnitSource } from '@/entities/order/model';
import type { StockUnit } from '@/entities/stock/model';
import { env } from '@/shared/config/env';
import { STOCK_UNIT_SHORT } from '@/shared/config/units';
import { formatDateTime, formatMoney, formatQuantity } from '@/shared/lib/format';
import type {
  NotificationPayload,
  OrderBrief,
  OrderBriefField,
  OrderCancelReason,
  OrderUnitBrief,
} from './types';

/**
 * Тексты уведомлений. Формат заявки и отзыва повторяет тот, что сложился в
 * прототипе (docs/API.md §10): владелец читает эти сообщения каждый день, и
 * менять привычную раскладку строк без нужды не стоит.
 *
 * Ни одного факта о компании здесь нет — только то, что прислал человек или
 * что владелец записал в наряд.
 *
 * 🔴 В сообщении монтажнику нет ничего, чего он не видит в своей карточке:
 * ни заметки владельца, ни удержания, а сумма заказа — только при оплате
 * наличными (docs/API.md §13, ADR-114). Разграничение доступа не может
 * зависеть от того, каким путём данные вышли наружу.
 */
const DASH = '—';

/** Разделы админки, куда ведёт ссылка из письма. */
const ADMIN_LEADS_PATH = '/admin/leads';
const ADMIN_REVIEWS_PATH = '/admin/reviews';
const ADMIN_ORDERS_PATH = '/admin/orders';
const ADMIN_STOCK_PATH = '/admin/stock';

/**
 * Словари наряда для сообщения.
 *
 * Свои, а не из `features/order-manager`: слой `server` не имеет права
 * импортировать интерфейсные слои, а тащить подписи в `shared` ради двух
 * сообщений — лишний общий словарь. Расхождение видно тестом.
 */
const ORDER_TYPE_TITLES: Readonly<Record<OrderType, string>> = {
  install: 'Монтаж',
  service: 'Обслуживание',
  repair: 'Ремонт',
};

const EQUIP_TITLES: Readonly<Record<OrderEquip, string>> = {
  conditioner: 'Кондиционер',
  fridge: 'Холодильник',
  compressor: 'Компрессор',
  ventilation: 'Вентиляция',
  heat_curtain: 'Тепловая завеса',
  other: 'Другое',
};

const SOURCE_TITLES: Readonly<Record<UnitSource, string>> = {
  ours: 'наше',
  client: 'клиента',
};

const PAYMENT_TITLES: Readonly<Record<PaymentMode, string>> = {
  company: 'клиент платит в компанию',
  cash_to_installer: 'наличными на объекте',
};

/** Подписи изменившихся вводных — их читает монтажник первой строкой. */
const FIELD_TITLES: Readonly<Record<OrderBriefField, string>> = {
  type: 'вид работ',
  at: 'дата и время',
  durationMin: 'длительность',
  address: 'адрес',
  intercom: 'домофон',
  phone2: 'второй телефон',
  floor: 'этаж',
  heightWorks: 'высотные работы',
  client: 'клиент',
  payment: 'способ оплаты',
  price: 'сумма к приёму',
  installerFee: 'вознаграждение',
  comment: 'комментарий',
  units: 'состав оборудования',
};

/**
 * Сокращения единиц склада: «43,5 м», а не «43,5 метра». Владелец читает это с
 * телефона между выездами, и полное слово в такой строке — лишний шум.
 */
/* Число форматирует `shared/lib/format` — то же, что показывает панель:
   владелец читает сообщение и сверяет его с экраном, и «4,3» в письме против
   «4.3» на странице заставит его усомниться в обоих (инвариант 9 по духу).
   Словарь единиц — тот же, что в панели: владелец сверяет письмо с экраном. */
function quantityText(value: number, unit: StockUnit): string {
  return `${formatQuantity(value)} ${STOCK_UNIT_SHORT[unit]}`;
}

const CANCEL_TITLES: Readonly<Record<OrderCancelReason, string>> = {
  cancelled: 'отменён',
  reassigned: 'передан другому',
  unassigned: 'снят с вас',
};

/** Первая строка сообщения об отмене: она же объясняет, что произошло. */
const CANCEL_HEADS: Readonly<Record<OrderCancelReason, (number: number) => string>> = {
  cancelled: (number) => `🚫 Наряд № ${number} отменён`,
  reassigned: (number) => `↪️ Наряд № ${number} передан другому монтажнику`,
  unassigned: (number) => `↩️ Наряд № ${number} снят с вас`,
};

function orDash(value: string | null): string {
  return value === null || value === '' ? DASH : value;
}

/**
 * Что человек делал на сайте до отправки — коротко.
 *
 * 🔴 Именно коротко: владелец читает это с телефона, часто в жару и между
 * выездами. Разбивка сметы и полный список отметок остаются в карточке заявки,
 * сюда попадает то, с чего начинается разговор: сколько человек насчитал, что
 * ему подобралось и какие модели он отметил. Ссылка на админку в письме уже
 * есть — за подробностями идут по ней.
 */
function leadContextLines(context: LeadContext | null | undefined): readonly string[] {
  if (context === null || context === undefined) return [];

  const lines: string[] = [];

  if (context.estimate !== null) {
    lines.push(`🧮 Расчёт монтажа: ${formatMoney(context.estimate.total)}`);
    const params = leadContextParamsText(context.estimate.params);
    if (params !== '') lines.push(params);
  }

  if (context.pick !== null) {
    const picked = context.pick.model;
    lines.push(
      `🎯 Подбор по площади: ${leadContextPickText(context.pick)}` +
        (picked === null ? '' : ` → ${leadContextModelText(picked)}`),
    );
  }

  if (context.model !== null) {
    lines.push(`🛒 Заказ с карточки: ${leadContextModelText(context.model)}`);
  }

  if (context.liked.length > 0) {
    lines.push(`👍 Отмечено: ${context.liked.map(leadContextModelText).join(', ')}`);
  }

  return lines.length === 0 ? [] : ['', ...lines];
}

/** Длительность словами: `1 ч 30 мин`. Часы и минуты, а не «180 минут». */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

function unitLine(unit: OrderUnitBrief): string {
  const parts = [EQUIP_TITLES[unit.equip]];
  if (unit.model !== null && unit.model !== '') parts.push(unit.model);
  parts.push(SOURCE_TITLES[unit.source]);
  if (unit.trassaM !== null) parts.push(`трасса ${unit.trassaM} м`);
  if (unit.diameter !== null && unit.diameter !== '') parts.push(`⌀ ${unit.diameter}`);
  if (unit.shtrob) parts.push('штробление');

  return `• ${parts.join(' · ')}`;
}

/** Как попасть на объект: домофон и этаж — одной строкой, если они заданы. */
function entryLine(brief: OrderBrief): string | null {
  const parts: string[] = [];
  if (brief.intercom !== null && brief.intercom !== '') parts.push(`домофон ${brief.intercom}`);
  if (brief.floor !== null) parts.push(`этаж ${brief.floor}`);

  return parts.length === 0 ? null : `🚪 ${parts.join(', ')}`;
}

function moneyLines(brief: OrderBrief): readonly string[] {
  const lines = [`💰 Ваше вознаграждение: ${formatMoney(brief.installerFee)}`];

  /* 🔴 Сумма заказа — только при оплате наличными: там её нужно принять от
     клиента. В остальных случаях монтажник её не видит ни в карточке, ни
     здесь (docs/API.md §13). */
  if (brief.payment === 'cash_to_installer' && brief.price !== undefined) {
    lines.push(`💵 Принять от клиента: ${formatMoney(brief.price)}`);
  }

  return lines;
}

/** Тело наряда: одинаковое у назначения и у правки — монтажник читает его целиком. */
function orderBody(brief: OrderBrief): readonly string[] {
  const entry = entryLine(brief);

  return [
    `🧭 ${ORDER_TYPE_TITLES[brief.type]}`,
    `📅 ${formatDateTime(brief.at)} · ${formatDuration(brief.durationMin)}`,
    `📍 ${brief.address}`,
    ...(entry === null ? [] : [entry]),
    ...(brief.heightWorks ? ['🧗 Высотные работы'] : []),
    `👤 ${brief.clientName}`,
    `📞 ${brief.clientPhone}`,
    ...(brief.phone2 === null || brief.phone2 === '' ? [] : [`📞 Ещё телефон: ${brief.phone2}`]),
    ...(brief.units.length === 0 ? [] : ['', '🧰 Что везём:', ...brief.units.map(unitLine)]),
    '',
    `💳 Оплата: ${PAYMENT_TITLES[brief.payment]}`,
    ...moneyLines(brief),
    ...(brief.comment === null || brief.comment === '' ? [] : ['', `💬 ${brief.comment}`]),
  ];
}

export function changedFieldsText(changes: readonly OrderBriefField[]): string {
  return changes.map((field) => FIELD_TITLES[field]).join(', ');
}

export function notificationText(payload: NotificationPayload): string {
  if (payload.kind === 'lead') {
    return [
      '🆕 Новая заявка с сайта',
      '',
      `🧭 Тема: ${payload.topic}`,
      `👤 Имя: ${payload.name}`,
      `📞 Телефон: ${payload.phone}`,
      `📍 Адрес: ${orDash(payload.address)}`,
      `🏠 Тип помещения: ${orDash(payload.place)}`,
      `❄️ Кол-во кондиционеров: ${orDash(payload.qty)}`,
      `⏰ Удобное время звонка: ${orDash(payload.callTime)}`,
      `💬 Комментарий: ${orDash(payload.comment)}`,
      ...leadContextLines(payload.context),
    ].join('\n');
  }

  if (payload.kind === 'to-reminder') {
    return [
      '🔔 Запрос напоминания о ТО',
      `📞 Телефон: ${payload.phone}`,
      `📅 ${orDash(payload.when)}`,
    ].join('\n');
  }

  if (payload.kind === 'order-assigned') {
    return [`🔧 Вам назначен наряд № ${payload.number}`, '', ...orderBody(payload)].join('\n');
  }

  if (payload.kind === 'order-changed') {
    return [
      `✏️ Изменился наряд № ${payload.number}`,
      `Что поменялось: ${changedFieldsText(payload.changes)}`,
      '',
      ...orderBody(payload),
    ].join('\n');
  }

  if (payload.kind === 'order-cancelled') {
    return [
      CANCEL_HEADS[payload.reason](payload.number),
      '',
      `🧭 ${ORDER_TYPE_TITLES[payload.type]}`,
      `📅 ${formatDateTime(payload.at)}`,
      `📍 ${payload.address}`,
      '',
      'Выезжать не нужно.',
    ].join('\n');
  }

  if (payload.kind === 'stock-low') {
    return [
      `📦 Пора заказывать: ${payload.name}`,
      '',
      `📉 Осталось: ${quantityText(payload.qty, payload.unit)}`,
      `🎯 Порог заказа: ${quantityText(payload.minQty, payload.unit)}`,
      ...(payload.group === null || payload.group === '' ? [] : [`🗂 Группа: ${payload.group}`]),
    ].join('\n');
  }

  const who = payload.name;
  return [
    '⭐ Новый отзыв на модерации',
    '',
    `👤 ${who}`,
    `★ Оценка: ${payload.rating}/5`,
    `💬 ${payload.text}`,
    '',
    `ID: ${payload.reviewId}`,
  ].join('\n');
}

export function notificationSubject(payload: NotificationPayload): string {
  if (payload.kind === 'lead') return `Новая заявка с сайта: ${payload.topic}`;
  if (payload.kind === 'to-reminder') return 'Запрос напоминания о ТО';
  if (payload.kind === 'order-assigned') return `Вам назначен наряд № ${payload.number}`;
  if (payload.kind === 'order-changed') return `Изменился наряд № ${payload.number}`;
  if (payload.kind === 'order-cancelled') {
    return `Наряд № ${payload.number} ${CANCEL_TITLES[payload.reason]}`;
  }
  if (payload.kind === 'stock-low') return `Пора заказывать: ${payload.name}`;
  return `Новый отзыв на модерации: ${payload.rating}/5`;
}

/**
 * Строка события для журнала доставки: владелец копию адресного сообщения не
 * получает и должен понимать из журнала, что именно ушло человеку.
 */
export function deliveryTitle(payload: NotificationPayload): string {
  return notificationSubject(payload);
}

/** Ссылка в админку — чтобы из письма можно было сразу открыть обращение. */
export function adminLink(payload: NotificationPayload): string {
  if (payload.kind === 'review') return new URL(ADMIN_REVIEWS_PATH, env.SITE_URL).toString();
  if (payload.kind === 'lead' || payload.kind === 'to-reminder') {
    return new URL(ADMIN_LEADS_PATH, env.SITE_URL).toString();
  }
  if (payload.kind === 'stock-low') return new URL(ADMIN_STOCK_PATH, env.SITE_URL).toString();

  return new URL(`${ADMIN_ORDERS_PATH}/${payload.orderId}`, env.SITE_URL).toString();
}

/** Фото, приложенное к обращению; у остальных событий его не бывает. */
export function attachedPhoto(payload: NotificationPayload): string | null {
  if (payload.kind === 'lead' || payload.kind === 'review') return payload.photo;
  return null;
}
