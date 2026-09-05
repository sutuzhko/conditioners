/**
 * Колонки списка нарядов: свой набор у каждой вкладки (issue #597).
 *
 * 🔴 Вкладка меняет не только фильтр, но и состав колонок — это и есть смысл
 * пяти стопок. «Новым» нужно, откуда взялся заказ и когда его завели;
 * «Истории» — когда закрыли и на сколько; «Отказам» — дата и причина, без
 * которых раздел превращается в свалку. Одна таблица на все пять показывала
 * бы «Статус: Отказ» пять строк подряд и не отвечала бы ни на один из этих
 * вопросов (макет `OrdersTabs`).
 *
 * Набор живёт данными, а не пятью ветками в разметке: добавить колонку —
 * значит дописать строку в словарь, а не найти все места, где рисуется `td`.
 */
import type { OrderTab } from '@/entities/order/model';

/** Ключ колонки. Совпадает с именем ячейки в таблице и в подписи карточки. */
export type OrderColumn =
  | 'number'
  | 'type'
  | 'client'
  | 'source'
  | 'created'
  | 'installer'
  | 'when'
  | 'closed'
  | 'declined'
  | 'reason'
  | 'status'
  | 'sum';

export const ORDER_COLUMNS: readonly OrderColumn[] = [
  'number',
  'type',
  'client',
  'source',
  'created',
  'installer',
  'when',
  'closed',
  'declined',
  'reason',
  'status',
  'sum',
];

export function isOrderColumn(value: string): value is OrderColumn {
  return ORDER_COLUMNS.some((column) => column === value);
}

/**
 * Порядок колонок по вкладкам — макет `OrdersTabs`, три ширины.
 *
 * 🔴 `number` и `client` есть везде и переключению не подлежат: это опознание
 * строки. Список, в котором нечем понять, чей это заказ, не список.
 */
const TAB_COLUMNS: Readonly<Record<OrderTab, readonly OrderColumn[]>> = {
  active: ['number', 'type', 'client', 'installer', 'when', 'status', 'sum'],
  new: ['number', 'type', 'client', 'source', 'created', 'sum'],
  history: ['number', 'type', 'client', 'installer', 'closed', 'status', 'sum'],
  cancelled: ['number', 'type', 'client', 'declined', 'reason'],
  all: ['number', 'type', 'client', 'when', 'status', 'sum'],
};

/**
 * Колонки, спрятанные на вкладке по умолчанию.
 *
 * Их не выкидывают из набора вовсе: «Тип» нужен, когда владелец ищет все
 * ремонты за месяц, — и тогда его включают пилюлей «Колонки». В умолчании
 * вкладки его нет, потому что вид работ у активного наряда спрашивают реже,
 * чем «кто едет и когда».
 */
const TAB_HIDDEN: Readonly<Record<OrderTab, readonly OrderColumn[]>> = {
  active: ['type'],
  new: ['type'],
  history: ['type', 'status'],
  cancelled: ['type'],
  all: [],
};

/** Колонки, которые вкладка вообще умеет показывать, — список пилюли «Колонки». */
export function columnsOf(tab: OrderTab): readonly OrderColumn[] {
  return TAB_COLUMNS[tab];
}

/** Колонки, которые нельзя выключить: по ним строку опознают. */
export function columnLocked(column: OrderColumn): boolean {
  return column === 'number' || column === 'client';
}

/**
 * Видимые колонки вкладки.
 *
 * `toggled` — колонки, перевёрнутые относительно умолчания вкладки: спрятанная
 * по умолчанию включается, показанная выключается. Один список вместо двух
 * («показать» и «скрыть»): у переключателя одно действие, и в адресе оно
 * выглядит одинаково в обе стороны.
 */
export function visibleColumns(
  tab: OrderTab,
  toggled: readonly OrderColumn[] = [],
): readonly OrderColumn[] {
  return TAB_COLUMNS[tab].filter((column) => {
    if (columnLocked(column)) return true;

    const hiddenByDefault = TAB_HIDDEN[tab].some((hidden) => hidden === column);
    const flipped = toggled.some((item) => item === column);

    return hiddenByDefault ? flipped : !flipped;
  });
}

/** Колонка показана при этом наборе переключений. */
export function columnShown(
  tab: OrderTab,
  toggled: readonly OrderColumn[],
  column: OrderColumn,
): boolean {
  return visibleColumns(tab, toggled).some((item) => item === column);
}

/**
 * Действие в строке, своё у вкладки (макет `OrdersTabs`).
 *
 * «Назначить» у новых и «Вернуть в работу» у отказов — это не украшение
 * строки, а единственное, ради чего эти две стопки открывают: наряд без
 * исполнителя не попадает ни в календарь, ни к монтажнику, а отказ, который
 * передумали, иначе пришлось бы заводить заново.
 */
export type OrderRowAction = 'assign' | 'restore';

const TAB_ACTION: Readonly<Record<OrderTab, OrderRowAction | null>> = {
  active: null,
  new: 'assign',
  history: null,
  cancelled: 'restore',
  all: null,
};

export function rowActionOf(tab: OrderTab): OrderRowAction | null {
  return TAB_ACTION[tab];
}

/**
 * Выбор строк включён на вкладке.
 *
 * 🔴 Групповое действие раздела — назначить монтажника нескольким нарядам
 * разом, и на закрытых стопках его не существует: назначать исполнителя
 * выполненной работе или отказу нечего. Галочки без действия — это колонка,
 * которая ничего не делает, и она не заводится (issue #596).
 */
export function selectableTab(tab: OrderTab): boolean {
  return tab === 'active' || tab === 'new' || tab === 'all';
}
