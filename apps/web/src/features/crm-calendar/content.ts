import type { CrmEventKind, CrmEventStatus } from '@/entities/crm/model';
import type { IconName, ConfirmRequest } from '@/shared/ui';

/**
 * Тексты календаря работ.
 *
 * Здесь же — соответствие «вид дела → иконка и цвет»: один список кормит и
 * форму, и метки в сетке, и список дня. Вид дела, которого нет здесь, не
 * появится нигде.
 */
export type KindLook = {
  readonly title: string;
  readonly icon: IconName;
  /** Ключ оформления: цвет метки в сетке. Значения — в CSS-модуле. */
  readonly tone: 'call' | 'measure' | 'install' | 'service' | 'meeting' | 'note';
};

export const KIND_LOOK: Record<CrmEventKind, KindLook> = {
  call: { title: 'Звонок', icon: 'phone', tone: 'call' },
  measure: { title: 'Замер', icon: 'map-point', tone: 'measure' },
  install: { title: 'Монтаж', icon: 'wrench', tone: 'install' },
  service: { title: 'Обслуживание', icon: 'settings', tone: 'service' },
  meeting: { title: 'Встреча', icon: 'chat', tone: 'meeting' },
  note: { title: 'Заметка', icon: 'bill', tone: 'note' },
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
  today: 'Сегодня',
  gridLabel: 'Сетка месяца',

  add: 'Добавить дело',
  addShort: 'Добавить',
  addTitle: 'Новое дело',
  editTitle: 'Правка дела',

  dayEmpty: 'На этот день ничего не запланировано',
  dayEmptyHint: 'Добавьте звонок, замер или монтаж — он появится в сетке месяца.',

  leadsTitle: 'Заявки этого дня',
  /** Свёрнутый хвост дел в ячейке и счётчик заявок за день. */
  moreEvents: (count: number): string => `ещё ${count}`,
  leadsCount: (count: number): string => `заявок: ${count}`,
  eventsCount: (count: number): string => `дел: ${count}`,
  leadLink: 'Открыть в заявках',

  upcomingTitle: 'Ближайшее',
  upcomingEmpty: 'Запланированных дел нет',
  overdue: (count: number): string => `Просрочено: ${count}`,
  overdueMark: 'Просрочено',

  fieldKind: 'Что за дело',
  fieldDay: 'Дата',
  fieldTime: 'Время',
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

  fromLead: 'Из заявки',
  failure: 'Не удалось сохранить. Проверьте связь и попробуйте ещё раз.',
  removeFailure: 'Не удалось удалить. Попробуйте ещё раз.',
} as const;
