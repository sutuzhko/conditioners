import type { CrmEventKind, CrmEventStatus, DayBlockRepeat } from '@/entities/crm/model';
import type { OrderStatus, OrderType } from '@/entities/order/model';
import type { IconName, ConfirmRequest } from '@/shared/ui';

import type { CalendarView } from './model';

/** Раздел календаря. Адрес по-английски, как и все адресуемое (инвариант 17). */
export const CRM_PATH = '/admin/crm';

/** Наряд правится в своём разделе: запись календаря ведёт туда, а не сюда. */
export const ORDERS_PATH = '/admin/orders';

/** Заявка правится в своём разделе — календарь только показывает, что она пришла. */
export const LEADS_PATH = '/admin/leads';

/**
 * Тексты календаря работ.
 *
 * Здесь же — соответствие «вид дела → иконка и цвет»: один список кормит и
 * форму, и записи в сетке, и карточку записи. Вид дела, которого нет здесь, не
 * появится нигде.
 */
export type KindLook = {
  readonly title: string;
  readonly icon: IconName;
  /** Ключ оформления: цвет метки в сетке. Значения — в CSS-модуле. */
  readonly tone: 'call' | 'measure' | 'install' | 'service' | 'meeting' | 'note' | 'repair';
};

export const KIND_LOOK: Record<CrmEventKind, KindLook> = {
  call: { title: 'Звонок', icon: 'phone', tone: 'call' },
  measure: { title: 'Замер', icon: 'map-point', tone: 'measure' },
  install: { title: 'Монтаж', icon: 'wrench', tone: 'install' },
  service: { title: 'Обслуживание', icon: 'settings', tone: 'service' },
  meeting: { title: 'Встреча', icon: 'chat', tone: 'meeting' },
  note: { title: 'Заметка', icon: 'bill', tone: 'note' },
};

/**
 * Наряд в календаре: свой значок и своя краска у каждого типа работ.
 *
 * 🔴 Наряд и дело в сетке обязаны различаться не только цветом (ADR-093): у
 * наряда есть номер, сплошная полоса слева и слово «Наряд» в подписи для
 * скринридера — в монохромном режиме различие остаётся.
 */
export const ORDER_LOOK: Record<OrderType, KindLook> = {
  install: { title: 'Монтаж', icon: 'wrench', tone: 'install' },
  service: { title: 'ТО', icon: 'settings', tone: 'service' },
  repair: { title: 'Ремонт', icon: 'pulse', tone: 'repair' },
};

/** Статус наряда словами — в подписи записи календаря. */
export const ORDER_STATUS_TITLE: Record<OrderStatus, string> = {
  new: 'Новый',
  assigned: 'Назначен',
  in_progress: 'В работе',
  done: 'Выполнен',
  cancelled: 'Отказ',
};

export const STATUS_TITLE: Record<CrmEventStatus, string> = {
  planned: 'Запланировано',
  done: 'Сделано',
  cancelled: 'Отменено',
};

/** Дни недели с понедельника — сокращения для шапки сетки. */
export const WEEKDAYS: readonly string[] = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const MONTHS: readonly string[] = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

/** «Август 2026» — заголовок сетки. Год пишется всегда: график ведут на годы вперёд. */
export function monthTitle(month: string): string {
  const [year = '', index = '01'] = month.split('-');
  return `${MONTHS[Number.parseInt(index, 10) - 1] ?? ''} ${year}`;
}

export const crmContent = {
  title: 'Календарь работ',
  lead: 'Замеры, монтажи и звонки. Заявки с сайта попадают сюда сами — в день обращения.',

  prevMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',
  prevWeek: 'Предыдущая неделя',
  nextWeek: 'Следующая неделя',
  prevDay: 'Предыдущий день',
  nextDay: 'Следующий день',
  today: 'Сегодня',
  gridLabel: 'Сетка месяца',

  // ---------- Виды ----------

  viewLabel: 'Вид календаря',
  weekLabel: 'Неделя по часам',
  dayLabel: 'День по часам',
  /** 🔴 Полоса над сеткой часов: записи без времени и заявки с сайта. */
  allDay: 'Весь день',
  hours: 'Часы',
  columnEmpty: 'Пусто',
  openDay: (date: string): string => `${date}, открыть день`,

  // ---------- Занятость команды (ADR-123) ----------

  team: 'Занятость монтажников',
  teamOn: 'Показать занятость монтажников',
  teamOff: 'Скрыть занятость монтажников',
  teamLegend: 'Кто каким цветом',
  teamEmpty: 'Монтажников пока нет',
  teamEmptyHint:
    'Заведите учётные записи в разделе «Монтажники» — тогда их занятость ляжет на эту сетку.',

  orderMark: (number: number): string => `Наряд № ${number}`,
  orderOpen: 'Открыть наряд',

  // ---------- Создание и правка ----------

  add: 'Новое дело',
  addShort: 'Добавить',
  addTitle: 'Новое дело',
  editTitle: 'Правка дела',
  /** Подпись пустого часа: с клавиатуры и с тача запись заводится отсюда. */
  createAt: (date: string, time: string): string => `Новое дело: ${date}, ${time}`,

  /** Заголовок карточки записи — её же читает скринридер при открытии. */
  cardLabel: 'Запись календаря',
  close: 'Закрыть',

  moreEvents: (count: number): string => `Ещё ${count}`,
  leadsTitle: 'Заявка с сайта',
  leadLink: 'Открыть в заявках',

  overdue: (count: number): string => `Просрочено: ${count}`,

  // ---------- Переработка (ADR-138) ----------

  /** 🔴 Число приходит с сервера готовым: пересчитывать при показе нельзя. */
  overtime: 'Переработка',
  overtimeOf: (title: string): string => `Переработка: ${title}`,
  /** Часы за рабочим окном помечены фоном — иначе переработку неоткуда увидеть. */
  offHours: 'Нерабочее время',

  fieldKind: 'Что за дело',
  fieldDay: 'Дата',
  fieldTime: 'Время',
  fieldDuration: 'Длительность',
  fieldName: 'Клиент',
  fieldNamePlaceholder: 'Имя или адрес объекта',
  fieldPhone: 'Телефон',
  fieldAddress: 'Адрес',
  fieldNote: 'Заметка',
  fieldNotePlaceholder: 'Что важно помнить: этаж, обещанная цена, кто из бригады',

  save: 'Сохранить',
  saving: 'Сохраняем…',
  cancel: 'Отмена',
  markDone: 'Сделано',
  markPlanned: 'Вернуть в план',
  markCancelled: 'Отменить',
  edit: 'Изменить',
  remove: 'Удалить',
  removeConfirm: {
    title: 'Удалить дело из календаря?',
    description: 'Отменить это будет нельзя.',
    confirmLabel: 'Удалить дело',
  } satisfies ConfirmRequest,

  /** Сохранение и удаление объявляются словами: сетка молча перерисовывается. */
  savedNote: 'Сохранено',
  removedNote: 'Дело удалено',
  movedNote: (time: string): string => `Перенесено на ${time}`,

  fromLead: 'Из заявки',
  failure: 'Не удалось сохранить. Проверьте связь и попробуйте ещё раз.',
  removeFailure: 'Не удалось удалить. Попробуйте ещё раз.',

  // ---------- Занятость ----------

  busyTitle: 'Занятость',
  busyAdd: 'Отметить занятость',
  busyAddTitle: 'Новая занятость',
  busyEditTitle: 'Правка занятости',
  busySaved: 'Занятость сохранена',
  busyDrop: 'Снять',
  busyEdit: 'Изменить',
  busyMine: 'Моя занятость',
  busyOthers: (names: string): string => `Занят: ${names}`,
  busyRepeatNote: 'Повторяется каждую неделю',
  busyFailure: 'Не удалось сохранить занятость. Проверьте связь и попробуйте ещё раз.',
  busyRemoveFailure: 'Не удалось снять занятость. Попробуйте ещё раз.',
  busyRemoveConfirm: {
    title: 'Снять занятость?',
    description: 'День снова станет свободным для планирования.',
    confirmLabel: 'Снять занятость',
  } satisfies ConfirmRequest,

  fieldRepeat: 'Как часто',
  fieldWeekday: 'День недели',
  fieldAllDay: 'Занят весь день',
  fieldFrom: 'С',
  fieldTo: 'До',
  fieldReason: 'Причина',
  fieldReasonPlaceholder: 'Семейные дела, врач, отпуск',
  fieldReasonHint: 'Её увидят рядом с днём — «день закрыт» без причины ничего не объясняет',
} as const;

/** Названия видов — подписи переключателя в шапке. */
/**
 * Подсказка по клавишам. Буквы названы латиницей — это позиции клавиш, а не
 * набираемые символы: на русской раскладке та же клавиша даёт «в», «ц», «ь»,
 * «е», и календарь слушается её так же.
 */
export const CALENDAR_KEYS: readonly { readonly keys: string; readonly what: string }[] = [
  { keys: 'D', what: 'День' },
  { keys: 'W', what: 'Неделя' },
  { keys: 'M', what: 'Месяц' },
  { keys: 'T', what: 'Сегодня' },
  { keys: '← →', what: 'Предыдущий и следующий период' },
  { keys: '?', what: 'Эта подсказка' },
];

export const calendarKeysContent = {
  title: 'Клавиши календаря',
  description:
    'Работают, когда курсор не в поле ввода. Раскладка не важна: клавиши читаются по месту на клавиатуре, а не по букве.',
  open: 'Клавиши',
  openLabel: 'Показать клавиши календаря',
  close: 'Понятно',
} as const;

export const VIEW_TITLE: Record<CalendarView, string> = {
  month: 'Месяц',
  week: 'Неделя',
  day: 'День',
};

/** Месяцы в родительном падеже: «17–23 августа», а не «17–23 август». */
const MONTHS_OF: readonly string[] = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/** «17–23 августа 2026». Месяц пишется один раз, если он один. */
export function weekTitle(from: string, to: string): string {
  const [, fromMonth = '01', fromDay = '01'] = from.split('-');
  const [toYear = '', toMonth = '01', toDay = '01'] = to.split('-');

  const left = Number.parseInt(fromDay, 10);
  const right = Number.parseInt(toDay, 10);
  const name = MONTHS_OF[Number.parseInt(toMonth, 10) - 1] ?? '';

  if (fromMonth === toMonth) return `${left}–${right} ${name} ${toYear}`;

  const fromName = MONTHS_OF[Number.parseInt(fromMonth, 10) - 1] ?? '';
  return `${left} ${fromName} – ${right} ${name} ${toYear}`;
}

/** «27 августа» — подпись дня в карточке записи и в кнопке пустого часа. */
export function dayTitle(day: string): string {
  const [, month = '01', date = '01'] = day.split('-');
  return `${Number.parseInt(date, 10)} ${MONTHS_OF[Number.parseInt(month, 10) - 1] ?? ''}`;
}

/** Повтор занятости: разовый день или каждая такая-то неделя. */
export const REPEAT_TITLE: Record<DayBlockRepeat, string> = {
  once: 'Один день',
  weekly: 'Каждую неделю',
};

/** Дни недели по ISO-8601: 1 — понедельник … 7 — воскресенье. */
export const WEEKDAY_TITLE: Record<number, string> = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
  7: 'Воскресенье',
};
