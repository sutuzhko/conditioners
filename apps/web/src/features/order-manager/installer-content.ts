/**
 * Подписи пути монтажника (issue #619, #632, #633).
 *
 * 🔴 Отдельный словарь, а не ветки «если монтажник» в общем: у владельца и у
 * монтажника разные экраны, а не один экран с урезанным набором кнопок.
 * Общее — названия статусов, видов работ и денег — берётся из `content.ts` и
 * здесь не переписывается: два названия одной работы в соседних разделах
 * панели читаются как сбой.
 */
import type { OrderCard, UnitSource } from '@/entities/order/model';
import type { BadgeVariant } from '@/shared/ui';
import { WORK_TIME_ZONE, momentOf, shiftDay, todayKey, type DayKey } from '@/shared/lib/calendar';
import { formatMoney } from '@/shared/lib/format';
import { plural } from '@/shared/lib/plural';

import { EQUIP_TITLE, ORDER_TYPE_TITLE, orderManagerContent as texts } from './content';
import type { InstallerWhen } from './installer-model';

/** Чьё оборудование — одним словом на плашке наряда. */
const SOURCE_MARK: Record<UnitSource, string> = {
  ours: 'Наше',
  client: 'Клиента',
};

/** День недели с числом: «пятница, 12 сентября». Пояс — рабочий (ADR-080). */
function longDay(day: DayKey): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: WORK_TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(momentOf(day, '12:00'));
}

export const installerContent = {
  // ——— Наряд дня (первый кадр макета)
  whenLabel: 'Какие дни показать',
  whenTitle: {
    today: 'Сегодня',
    tomorrow: 'Завтра',
    week: 'Неделя',
  } satisfies Record<InstallerWhen, string>,

  /** Сводка окна: «Сегодня 3 выезда · 8 ч». */
  summary: (when: InstallerWhen, count: number, minutes: number): string => {
    if (count === 0) return `${installerContent.whenTitle[when]} — выездов нет`;

    const trips = `${count} ${plural(count, 'выезд', 'выезда', 'выездов')}`;
    return `${installerContent.whenTitle[when]} ${trips} · ${texts.span(minutes)}`;
  },

  /**
   * Заголовок группы. Сегодня и завтра называются словами: «пятница, 12
   * сентября» под сегодняшним выездом читается на секунду дольше, а секунда
   * эта тратится на объекте.
   */
  dayTitle: (day: DayKey, today: DayKey = todayKey()): string => {
    if (day === today) return 'Сегодня';
    if (day === shiftDay(today, 1)) return 'Завтра';
    return longDay(day);
  },

  emptyTitle: 'Выездов нет',
  emptyText: (when: InstallerWhen): string =>
    when === 'week'
      ? 'На ближайшую неделю на вас ничего не назначено. Новый наряд появится здесь сам.'
      : 'На этот день на вас ничего не назначено. Проверьте неделю — работа может стоять дальше.',
  emptyWeek: 'Показать неделю',

  back: '← Мои заказы',
  open: 'Открыть наряд',
  openLabel: (number: number): string => `Открыть наряд ${texts.number(number)}`,
  call: 'Клиент',
  callLabel: (name: string): string => `Позвонить клиенту: ${name}`,
  route: 'Маршрут',
  routeLabel: (address: string): string => `Маршрут до объекта: ${address}`,

  heightWorks: 'Высотные работы',
  shtrobMark: 'Штробление',
  unitsMark: (count: number): string => `${count} ${plural(count, 'блок', 'блока', 'блоков')}`,
  cashMark: (sum: number): string => `Наличными · ${formatMoney(sum)}`,

  // ——— Наряд (второй кадр макета)
  objectTitle: 'Объект',
  intercom: 'Домофон',
  floor: 'Этаж',
  phone2: 'Телефон на объекте',
  callOnSite: 'Позвонить',
  unitsTitle: 'Что ставим',
  unitsEmpty: 'Позиций в наряде нет — что везти, уточните у владельца.',
  sourceMark: (source: UnitSource): string => SOURCE_MARK[source],
  trassaMark: (meters: number): string => `Трасса ${meters} м`,
  shtrobUnitMark: 'Штроба',
  noteTitle: 'На что обратить внимание',
  heightWorksNote: 'Нужна страховка: работы на высоте',
  cancelledNote: 'Наряд отменён. Ехать на объект не нужно.',

  // ——— Действия монтажника
  take: 'Принять в работу',
  takeHint: 'Владелец увидит, что вы на объекте',
  taking: 'Принимаем…',
  finish: 'Работа выполнена',
  finishHint: 'Откроется сдача: фото и итог работ',
  closed: 'Наряд сдан',
  closedHint: 'Вернуть его в работу может только владелец',
  openHandover: 'Открыть сдачу работы',
  noStep: 'Действий по этому наряду сейчас нет',

  // ——— Сдача работы (четвёртый кадр макета)
  handoverTitle: 'Сдача работы',
  handoverBack: '← Вернуться к наряду',
  photosTitle: 'Фото выполненных работ',
  /** 🔴 Остаток, а не «нужно N»: см. `photosLeft` в installer-model.ts. */
  photosLeft: (left: number): string => `Загрузите ещё ${left} фото`,
  photosReady: 'Фото загружены',
  photosHint: 'Снимки остаются в истории клиента: по ним разбирают спорные работы.',
  photoAdd: 'Добавить фото «после»',
  photoAdding: 'Загружаем…',

  resultTitle: 'Итог работ',
  extraWork: 'Что сделали сверх наряда',
  extraWorkHint: 'Словами, как скажете клиенту: «доп. трасса 1,5 м, короб 2 м».',
  report: 'Отчёт о выезде',
  reportHint: 'Что сделано, что осталось, на что обратить внимание владельцу.',
  breakdownTitle: 'Разобрано из текста',
  breakdownTrassa: 'Доп. трасса',
  breakdownBox: 'Короб',
  breakdownNone: 'не указано',
  meters: (value: number): string => `${String(value).replace('.', ',')} м`,

  paymentTitle: 'Оплата',
  /* 🔴 Карточка говорит о состоянии наряда, а не об устройстве панели: в
     макете здесь стояло объяснение, почему монтажнику не видно суммы
     (issue #632). */
  paymentCompany: 'Клиент платит компании',
  paymentCompanyMark: 'не принимать',
  paymentCompanyNote: 'Наличные по этому наряду брать не нужно.',
  paymentCash: 'Наличными на объекте',
  paymentCashMark: 'принять',
  paymentCashNote: (sum: number): string => `Возьмите с клиента ${formatMoney(sum)}.`,
  paymentCashPlain: 'Наличные по этому наряду принимает монтажник на объекте.',

  submit: 'Сдать работу',
  submitting: 'Сдаём…',
  submitted: 'Работа сдана',
  submittedNote: 'Владелец увидит итог и снимки в карточке наряда.',
  toOrders: 'К моим заказам',
  draft: 'Сохранить черновик',
  draftSaving: 'Сохраняем…',
  draftSaved: 'Черновик сохранён',
  blockedByPhotos: (left: number): string => `Сначала загрузите ещё ${left} фото выполненных работ`,
  blockedByStatus: 'Сдать можно наряд, который взят в работу',
  /* Сданный наряд закрыт для повторной сдачи, но итог по нему ещё правится:
     монтажник дописывает отчёт, а вернуть наряд в работу может владелец. */
  blockedByDone: 'Наряд уже сдан. Итог ещё можно поправить и сохранить',
} as const;

/** Плашка наряда: то, к чему готовятся заранее, — штроба, высота, наличные. */
export type OrderMark = {
  readonly key: string;
  readonly variant: BadgeVariant;
  readonly text: string;
};

/**
 * 🔴 Сумма попадает на плашку только при оплате наличными: её нужно принять
 * от клиента на объекте. В остальных случаях ключа `price` в ответе монтажнику
 * нет вовсе (CRM.md §6, ADR-114) — плашки не будет и здесь.
 */
export function orderMarks(order: OrderCard): readonly OrderMark[] {
  const marks: OrderMark[] = [];

  if (order.heightWorks) {
    marks.push({ key: 'height', variant: 'danger', text: installerContent.heightWorks });
  }

  if (order.units.some((unit) => unit.shtrob)) {
    marks.push({ key: 'shtrob', variant: 'warning', text: installerContent.shtrobMark });
  }

  if (order.units.length > 0) {
    marks.push({
      key: 'units',
      variant: 'neutral',
      text: installerContent.unitsMark(order.units.length),
    });
  }

  if (order.payment === 'cash_to_installer' && order.price !== undefined) {
    marks.push({ key: 'cash', variant: 'success', text: installerContent.cashMark(order.price) });
  }

  return marks;
}

/**
 * Что за работа — заголовок наряда и в списке, и в карточке.
 *
 * 🔴 Монтажник узнаёт наряд по работе, а не по номеру: «Монтаж · Сплит-система
 * 09» отвечает на вопрос «куда я еду», а «№ 128» — только на вопрос «как на
 * него сослаться». Номер поэтому остаётся моноширинной меткой рядом со
 * временем, одинаково на всех трёх экранах (issue #633: в макете он был то
 * заголовком, то подписью в углу).
 */
export function installerWorkTitle(order: Pick<OrderCard, 'type' | 'units'>): string {
  const first = order.units[0];
  if (first === undefined) return ORDER_TYPE_TITLE[order.type];

  const what = first.model ?? EQUIP_TITLE[first.equip];
  return `${ORDER_TYPE_TITLE[order.type]} · ${what}`;
}
