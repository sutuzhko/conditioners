/** Подписи раздела заказов. */
import type {
  OrderDocKind,
  OrderEquip,
  OrderPeriod,
  OrderStatus,
  OrderTab,
  OrderType,
  PaymentMode,
  PhotoStage,
  UnitSource,
} from '@/entities/order/model';
import { timeOf } from '@/shared/lib/calendar';
import { formatDateShort, formatDateTime, formatMoney, formatQuantity } from '@/shared/lib/format';
import { STOCK_UNIT_SHORT } from '@/shared/config/units';
import { plural } from '@/shared/lib/plural';

import type { DeductionMode, OrderCardTab, StockUnit } from './model';

/**
 * Вид работ. `service` называется «Обслуживанием», а не «ТО»: тем же словом
 * подписан вид дела в календаре работ и услуга на сайте, а два названия
 * одной работы в соседних разделах панели владелец читает как сбой.
 */
export const ORDER_TYPE_TITLE: Record<OrderType, string> = {
  install: 'Монтаж',
  service: 'Обслуживание',
  repair: 'Ремонт',
};

export { ORDER_CANCEL_REASON_TITLE, ORDER_STATUS_VARIANT } from '@/entities/order/model';

export const ORDER_STATUS_TITLE: Record<OrderStatus, string> = {
  new: 'Новый',
  assigned: 'Назначен',
  in_progress: 'В работе',
  done: 'Выполнен',
  cancelled: 'Отказ',
};

export const ORDER_TAB_TITLE: Record<OrderTab, string> = {
  active: 'Активные',
  new: 'Новые',
  history: 'История',
  cancelled: 'Отказы',
  all: 'Все',
};

/** Подписи вкладок карточки наряда — ключи адреса из словаря (issue #339). */
export const ORDER_CARD_TAB_TITLE: Record<OrderCardTab, string> = {
  job: 'Наряд',
  materials: 'Расход',
  checklist: 'Чеклист выезда',
  documents: 'Документы и фото',
  history: 'История',
};

export const ORDER_PERIOD_TITLE: Record<OrderPeriod, string> = {
  all: 'Всё время',
  month: 'Этот месяц',
  prev: 'Прошлый месяц',
};

export const EQUIP_TITLE: Record<OrderEquip, string> = {
  conditioner: 'Кондиционер',
  fridge: 'Холодильник',
  compressor: 'Компрессор',
  ventilation: 'Вентиляция',
  heat_curtain: 'Тепловая завеса',
  other: 'Другое',
};

/** Чьё оборудование: от этого зависит, продажа это с монтажом или только работы. */
export const SOURCE_TITLE: Record<UnitSource, string> = {
  ours: 'Наше — продажа с монтажом',
  client: 'Клиента — только работы',
};

/** То же самое коротко: в карточке позиции места на полную подпись нет. */
export const SOURCE_SHORT: Record<UnitSource, string> = {
  ours: 'наше',
  client: 'клиента',
};

export const ORDER_DOC_KIND_TITLE: Record<OrderDocKind, string> = {
  contract: 'Договор',
  warranty: 'Гарантийный талон',
  act: 'Акт выполненных работ',
  invoice: 'Счёт',
  measure: 'Замерный лист',
  other: 'Другое',
};

/**
 * Этап съёмки назван работой, а не временем: «до» и «после» сами по себе
 * ничего не говорят человеку, который открыл наряд впервые.
 */
export const PHOTO_STAGE_TITLE: Record<PhotoStage, string> = {
  before: 'Место установки',
  after: 'Выполненные работы',
};

export const PAYMENT_TITLE: Record<PaymentMode, string> = {
  company: 'Клиент платит компании',
  cash_to_installer: 'Наличными монтажнику на объекте',
};

/**
 * 🔴 Что означает удержание — зависит от оформления монтажника (CRM.md §9).
 *
 * У работника по трудовому договору штрафов как вида взыскания в ТК РФ нет,
 * и запись остаётся внутренней пометкой. Интерфейс обязан сказать это словами:
 * иначе владелец решит, что система сама вычтет сумму из выплаты, и вычтет её
 * руками, нарушив закон.
 */
export const DEDUCTION_NOTE: Record<DeductionMode, string> = {
  reduces:
    'Самозанятый и подрядчик по ГПХ: удержание уменьшает вознаграждение — законно, если так записано в договоре.',
  internal:
    'Трудовой договор: это внутренняя пометка, из выплаты она не вычитается. Штрафов как вида взыскания в ТК РФ нет, а удержания из зарплаты ограничены статьёй 137.',
  unknown:
    'Оформление монтажника не заведено — считаем пометку внутренней: из выплаты она не вычитается.',
  unassigned: 'Монтажник не назначен — пока это просто пометка по наряду.',
};

/**
 * Единицы склада коротко — как их пишут в накладной: «4 м», «2 пар.», «1 бал.».
 *
 * Сокращения не склоняются намеренно: «2 пары» и «5 пар» потребовали бы
 * склонения на каждой строке таблицы, а сокращение с точкой — обычная запись
 * товароведа и читается одинаково при любом числе.
 */
/* Подписи единиц общие с разделом склада: одно и то же количество видно и
   там, и здесь, и расходиться эти два написания не имеют права. */
export { STOCK_UNIT_SHORT };

/* Число и единица — одна величина, рвать её переносом нельзя. */
const QTY_NBSP = '\u00A0';

/**
 * Минуты словами: «3 ч», «1 ч 30 мин», «45 мин».
 *
 * Отдельной функцией, а не только полем подписи: тем же способом читается
 * переработка, и два написания одной величины в соседних строках карточки
 * владелец прочитал бы как разные величины.
 */
function spanText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

export const orderManagerContent = {
  title: 'Заказы',
  installerTitle: 'Мои заказы',

  emptyTitle: 'Нарядов пока нет',
  emptyText:
    'Заведите первый — он появится в списке и в календаре работ, а монтажник увидит его у себя.',
  emptyFound: 'По этому фильтру ничего не нашлось',
  emptyFoundAction: 'Показать все наряды',
  emptyFoundText: 'Проверьте вкладку и период — возможно, наряд лежит в другой стопке.',
  emptyInstaller: 'На вас пока ничего не назначено',
  emptyInstallerText: 'Как только владелец назначит наряд, он появится здесь.',

  filtersLabel: 'Фильтр заказов',
  tabsLabel: 'Стопки заказов',
  periodLabel: 'Период',
  searchLabel: 'Поиск заказа',
  searchHint: 'Номер, имя клиента, адрес или модель в позициях',
  searchPlaceholder: 'Номер, клиент, адрес, модель',

  /* Пилюля фильтра и снятие отдельного условия — макет «Заказы» (issue #345).
     Условия остаются видимыми плашками: иначе непонятно, почему нарядов
     шесть вместо двадцати четырёх. */
  filterPill: 'Фильтр',
  filterApplied: (count: number): string =>
    `${count} ${plural(count, 'условие', 'условия', 'условий')}`,
  filterDrop: (title: string): string => `Убрать условие: ${title}`,
  queryChip: (query: string): string => `Поиск: ${query}`,

  /* Таблица нарядов. Подписи колонок короткие: ниже 600 они же становятся
     подписями строк в карточке. */
  tableLabel: 'Наряды',
  colNumber: 'Номер',
  colType: 'Тип',
  colWhen: 'Когда',
  colWork: 'Клиент и объект',
  colSource: 'Откуда',
  colCreated: 'Создан',
  colClosed: 'Закрыт',
  colDeclined: 'Отказ',
  colReason: 'Причина',
  colInstaller: 'Монтажник',
  colStatus: 'Статус',
  colSum: 'Сумма',
  colActions: 'Действия',
  /* 🔴 Единственное число — не стилистика: колонка действия вкладки стоит
     рядом с колонкой круглых действий, и два заголовка «Действия» подряд
     читалка объявляет одинаково. */
  colAction: 'Действие',
  colSelect: 'Выбор строки',
  /* 🔴 Просрочка — не статус, а срок (ADR-194): в словаре статусов её нет и
     заводить её там нельзя. Это отметка рядом со статусом. */
  overdueMark: 'Просрочен',
  moneyNone: '—',
  rowActions: (number: number): string => `Действия над нарядом № ${number}`,
  rowOpen: (number: number): string => `Открыть наряд № ${number}`,
  rowCall: (name: string): string => `Позвонить: ${name}`,
  rowChecklist: (number: number): string => `Чеклист выезда наряда № ${number}`,
  rowRemove: (number: number): string => `Удалить наряд № ${number}`,
  rowSelect: (number: number): string => `Выбрать наряд № ${number}`,
  found: (total: number): string => `Найдено: ${total}`,
  totalCount: (total: number): string =>
    `Всего: ${total} ${plural(total, 'наряд', 'наряда', 'нарядов')}`,

  /* 🔴 Строка счёта вместо прозы под заголовком (issue #593, макет «Заказы»).
     Три числа отвечают на три вопроса, которые владелец задаёт разделу
     первым: сколько всего, сколько в работе и сколько уже подводит. */
  countAll: (total: number): string => `${total} всего`,
  countActive: (count: number): string =>
    `${count} ${plural(count, 'активный', 'активных', 'активных')}`,
  countOverdue: (count: number): string =>
    `${count} ${plural(count, 'просрочен', 'просрочены', 'просрочено')}`,
  /* Счётчик вкладки словами — для озвучки: «Активные 7» читалка объявляет
     как «Активные семь», и это не значит ничего. */
  tabCount: (title: string, count: number): string =>
    `${title}: ${count} ${plural(count, 'наряд', 'наряда', 'нарядов')}`,

  /* Вид списка: сортировка, состав колонок, число строк (issue #594, #595). */
  sortPill: 'Сортировка',
  sortLabel: 'Чем сортировать',
  sortTitle: { date: 'По дате', number: 'По номеру', sum: 'По сумме' } as const,
  columnsPill: 'Колонки',
  columnsLabel: 'Какие колонки показывать',
  columnShow: (title: string): string => `Показать колонку «${title}»`,
  columnHide: (title: string): string => `Скрыть колонку «${title}»`,
  installerLabel: 'Монтажник',
  installerAny: 'Любой',
  installerNoneFilter: 'Не назначен',
  perPage: 'Строк на странице',
  perPageSet: (size: number): string => `Показывать по ${size} строк`,
  pagesLabel: 'Страницы списка',
  pageGo: (page: number): string => `Страница ${page}`,
  pageCurrent: (page: number): string => `Страница ${page}, текущая`,
  pagePrev: 'Предыдущая страница',
  pageNext: 'Следующая страница',
  rangeOf: (shown: number, total: number): string => `${shown} из ${total}`,

  /* Выбор строк и групповое действие (issue #596, макет «Заказы»). */
  selectAll: 'Выбрать все наряды на странице',
  selectedOf: (count: number, total: number): string => `Выбрано ${count} из ${total}`,
  selectionClear: 'Снять выбор',
  bulkAssign: 'Назначить',
  bulkAssignLabel: 'Кому назначить выбранные наряды',
  bulkPlaceholder: 'Выберите монтажника',
  bulkAssigning: 'Назначаем…',
  bulkAssigned: (count: number): string =>
    `${count} ${plural(count, 'наряд назначен', 'наряда назначено', 'нарядов назначено')}`,
  bulkAskTitle: (count: number, who: string): string =>
    `Назначить ${count} ${plural(count, 'наряд', 'наряда', 'нарядов')} на ${who}?`,
  bulkAskText:
    'Монтажник получит уведомление по каждому наряду, а сами наряды появятся у него в панели и в календаре.',
  bulkAskConfirm: 'Назначить',
  bulkEmpty: 'Отметьте наряды галочками — тогда появится, кому их назначить.',

  /* Действие вкладки в строке (issue #597, макет `OrdersTabs`). */
  assignRow: 'Назначить',
  assignRowLabel: (number: number): string => `Назначить монтажника наряду № ${number}`,
  restoreRow: 'Вернуть в работу',
  restoreRowLabel: (number: number): string => `Вернуть наряд № ${number} в работу`,
  restoreAskTitle: (number: number): string => `Вернуть наряд № ${number} в работу?`,
  restoreAskText:
    'Наряд снова станет новым, а причина отказа сотрётся: причина без отказа читается как действующая.',
  restoreAskConfirm: 'Вернуть в работу',
  restored: 'Наряд вернулся в работу',

  /* Итог периода над таблицей истории (issue #597, вкладка «История»). */
  historyClosed: 'Закрыто',
  historyRevenue: 'Выручка',
  /* 🔴 Маржи здесь нет: без закупочной цены позиции склада её нечем считать
     (ADR-310, issue #628). Разность «сумма минус выплата» маржой не является
     — материалы в монтаже заметная доля, и число врало бы в большую сторону
     ровно там, где владелец решает, какую цену ставить. */
  newsAlert: (count: number): string =>
    `${count} ${plural(count, 'заказ ждёт', 'заказа ждут', 'заказов ждут')} назначения`,
  newsAlertText:
    'Пока не назначен монтажник, наряд не попадает в календарь и не виден исполнителю.',
  /* 🔴 Без номера заявки: номера у обращения в схеме нет вовсе — макет рисует
     «из заявки № 41», а показать нечего. Сам факт «пришло с сайта, а не
     завели руками» отвечает на вопрос вкладки и без цифры. */
  sourceFrom: 'из заявки',
  sourceManual: 'вручную',
  reviewNone: 'нет',

  number: (value: number): string => `№ ${value}`,
  open: 'Открыть наряд',
  back: '← Все заказы',

  client: 'Клиент',
  installer: 'Монтажник',
  installerNone: 'Не назначен',
  when: 'Дата и время',
  duration: 'Длительность',
  address: 'Адрес',
  intercom: 'Подъезд и домофон',
  phone2: 'Телефон на объекте',
  floor: 'Этаж',
  heightWorks: 'Высотные работы',
  heightWorksOn: 'Нужна страховка: работы на высоте',

  mainTitle: 'Работа',
  objectTitle: 'Объект',
  moneyTitle: 'Деньги',
  notesTitle: 'Комментарии',

  type: 'Тип работ',
  status: 'Статус',
  day: 'Дата',
  time: 'Время',
  durationField: 'Длительность, минут',
  durationHint:
    'Шаг 15 минут: полтора часа на обслуживание — обычное дело. Время за границей рабочего окна компании пойдёт в переработку — завести наряд оно не мешает',

  payment: 'Оплата',
  price: 'Сумма заказа',
  installerFee: 'Выплата монтажнику',
  cashToTake: 'Принять от клиента',
  cashToTakeHint: 'Клиент платит наличными на объекте — эту сумму нужно взять с собой в отчёт.',

  deduction: 'Удержание',
  deductionHint: 'Брак, срыв выезда, испорченный материал',
  deductionReason: 'Основание',
  deductionReasonHint: 'Обязательно: сумма без причины через полгода не значит ничего',

  /* 🔴 Отказ без причины не записывается (ADR-310): вкладка «Отказы» заводится
     ради разбора воронки, а «просто отказ» не разбирает ничего. */
  cancelTitle: 'Отказ',
  cancelReason: 'Причина отказа',
  cancelReasonPlaceholder: 'Выберите причину',
  cancelReasonHint: 'Обязательно при переводе наряда в «Отказ»',
  cancelNote: 'Что именно произошло',
  cancelNoteHint: 'Необязательно: справочник обобщает воронку, эта строка объясняет частный случай',
  cancelAt: (iso: string): string => `Отказ ${formatDateShort(iso)}`,

  comment: 'Комментарий монтажнику',
  commentHint: 'Что важно на объекте: домофон, собака, узкая лестница. Монтажник это видит',
  ownerNote: 'Заметка владельца',
  ownerNoteHint: 'Только для вас. Монтажник её не видит',

  unitsTitle: 'Оборудование',
  unitsHint:
    'Позиций может быть несколько: в одном выезде ставят и наш блок, и купленный клиентом — условия у них разные.',
  unitsEmpty: 'Позиций нет. Наряд заводят по звонку, а что везти — выясняется на замере.',
  unitAdd: 'Добавить позицию',
  unitRemove: (index: number): string => `Удалить позицию ${index}`,
  unitTitle: (index: number): string => `Позиция ${index}`,
  unitEquip: 'Тип',
  unitModel: 'Модель',
  unitModelHint: 'Как в накладной или со слов клиента',
  unitSource: 'Чьё оборудование',
  unitTrassa: 'Трасса, метров',
  unitDiameter: 'Диаметр',
  unitDiameterHint: 'Как пишут в спецификации: 1/4–3/8',
  unitShtrob: 'Штробление',
  unitTrassaValue: (meters: number): string => `трасса ${meters} м`,
  unitDiameterValue: (value: string): string => `диаметр ${value}`,
  unitShtrobOn: 'со штроблением',
  unitsCount: (count: number): string =>
    `${count} ${plural(count, 'позиция', 'позиции', 'позиций')}`,

  clientPlaceholder: 'Выберите клиента',
  installerPlaceholder: 'Не назначен',
  /* Пометка в списке, а не после выбора: владелец назначает наряд, глядя в
     этот список, и «занят», узнанное постфактум, стоит ему второго захода. */
  installerBusy: (who: string): string => `${who} · занят`,

  addTitle: 'Новый наряд',
  addHint: 'Номер выдаёт система — его же диктуют клиенту по телефону.',
  add: 'Завести наряд',
  adding: 'Заводим…',
  added: 'Наряд заведён',

  cardTitle: 'Наряд',
  cardHint: 'Правка видна монтажнику сразу — он смотрит тот же наряд со своего телефона.',
  save: 'Сохранить',
  saving: 'Сохраняем…',
  saved: 'Сохранено',

  remove: 'Удалить наряд',
  removeAsk: 'Удалить наряд?',
  removeTitle: (value: number): string => `Удалить наряд № ${value}?`,
  removeText:
    'Наряд исчезнет вместе с позициями и деньгами. Отменённую работу лучше перевести в «Отказ» — она останется в истории.',
  removeConfirm: 'Удалить наряд',
  removed: 'Наряд удалён',

  statusTitle: 'Статус наряда',
  statusPlaceholder: 'Не выбрано',
  statusHint: 'Выехали — «В работе», закончили — «Выполнен». Остальное меняет владелец.',
  statusSaved: 'Статус обновлён',
  statusSaving: 'Сохраняем…',

  networkError: 'Не удалось связаться с сервером. Изменения не сохранены',
  serverError: 'Сервер не принял изменения. Попробуйте ещё раз',
  invalid: 'Проверьте подсвеченные поля',

  // ---------- Наряд в работе ----------

  workTabsLabel: 'Работа с нарядом',

  resultTitle: 'Итог работ',
  resultHint:
    'Что сделали по факту. Плановую сумму итог не меняет — её решает владелец в карточке наряда.',
  extraWork: 'Доп. работы и материалы',
  extraWorkHint: 'Что добавилось на объекте: лишние метры трассы, кронштейн, помпа',
  report: 'Отчёт о выезде',
  reportHint: 'Что сделано, что проверено, о чём предупредили клиента',
  resultAt: (iso: string): string => `Заполнен ${formatDateShort(iso)}`,
  resultEmpty: 'Итог ещё не заполняли',
  resultSave: 'Сохранить итог',
  resultSaving: 'Сохраняем…',
  resultSaved: 'Итог сохранён',

  checklistTitle: 'Чеклист выезда',
  checklistHint:
    'Собран из наряда: тип работ, позиции, штробление, высотные работы и оплата наличными. Отметьте при сборах, недостающее допишите.',
  checklistEmpty: 'Чеклист пуст. Соберите его из наряда — или допишите свои пункты.',
  checklistProgress: (done: number, total: number): string => `Собрано ${done} из ${total}`,
  checklistAdd: 'Добавить свой пункт',
  checklistAddLabel: 'Что ещё взять',
  checklistAddPlaceholder: 'Чехлы на мебель',
  checklistRebuild: 'Пересобрать из наряда',
  checklistRebuilding: 'Пересобираем…',
  checklistRebuildHint: 'Отметки и дописанные пункты сохранятся.',
  checklistOwn: 'свой пункт',
  checklistRemove: (text: string): string => `Удалить пункт «${text}»`,

  docsTitle: 'Документы',
  docsHint: 'Договор, акт, гарантийный талон, счёт и замерный лист. Открываются только из панели.',
  docsEmpty: 'Документов пока нет.',
  docsEmptyInstaller: 'Документов по этому наряду пока нет.',
  docKind: 'Вид документа',
  docFile: 'Файл',
  docFileHint: 'PDF или снимок в JPEG, PNG, WebP',
  docAdd: 'Приложить документ',
  docAdding: 'Загружаем…',
  docRemove: (name: string): string => `Удалить документ «${name}»`,
  docRemoveAsk: 'Удалить документ?',
  docRemoveText: 'Файл удалится вместе с записью. Восстановить его будет нечем.',
  docRemoveConfirm: 'Удалить',
  docOpen: (name: string): string => `Открыть «${name}»`,
  docSize: (bytes: number): string => `${Math.max(Math.round(bytes / 1024), 1)} КБ`,

  photosTitle: 'Фотографии',
  photosHintOwner:
    'Фото места установки грузите до выезда — монтажник увидит его у себя. Фото работ приходят с объекта.',
  photosHintInstaller: 'Место установки — от владельца. Выполненные работы снимаете и грузите вы.',
  photoAdd: (stage: string): string => `Добавить фото: ${stage.toLocaleLowerCase('ru-RU')}`,
  photoAdding: 'Загружаем…',
  photoEmpty: 'Снимков нет',
  photoAlt: (stage: string, index: number): string => `${stage}, снимок ${index}`,
  photoRemove: (stage: string, index: number): string =>
    `Удалить снимок ${index}: ${stage.toLocaleLowerCase('ru-RU')}`,
  photoRemoveAsk: 'Удалить снимок?',
  photoRemoveText: 'Фотография удалится вместе с файлом.',
  photoRemoveConfirm: 'Удалить',

  historyTitle: 'История наряда',
  historyHint: 'Кто и когда менял статус, кого назначили, когда заполнили итог.',
  historyEmpty: 'Записей пока нет.',
  historyAuthorless: 'Автор удалён из панели',

  /** 🔴 Занятость предупреждает, а не запрещает (ADR-115). */
  busyLabel: 'Монтажник занят',

  /** Даты и время — по Москве: работы идут в Туле, а не в поясе того, кто смотрит. */
  date: (iso: string): string => formatDateShort(iso),
  clock: (iso: string): string => timeOf(new Date(iso)),
  stamp: (iso: string): string => formatDateTime(iso),
  money: (value: number): string => formatMoney(value),

  /** Длительность словами: «3 ч», «1 ч 30 мин», «45 мин». */
  span: spanText,

  /**
   * 🔴 Переработка названа фактом, а не доплатой: пойдёт ли она в деньги,
   * зависит от оформления монтажника и договора и решается вместе с расчётами
   * с командой (ADR-138). Интерфейс, пообещавший доплату, обещает за владельца.
   */
  overtime: (minutes: number): string => `Переработка: ${spanText(minutes)}`,

  // ---------- Расход материалов ----------

  consumptionTitle: 'Израсходовано',
  consumptionHint:
    'Что ушло на эту работу по факту. Чеклист выезда знает, что нужно взять, склад — есть ли оно; списание сводит одно с другим.',
  consumptionBusy: 'Загружаем расход материалов',
  consumptionLoadError: 'Не удалось получить расход материалов и остатки склада.',
  consumptionRetry: 'Попробовать ещё раз',

  consumptionEmpty: 'По этому наряду ещё ничего не списано',
  consumptionEmptyText:
    'Пока материал не списан, он числится на складе — хотя давно в стене у клиента. Спишите израсходованное, и остаток перестанет расходиться с реальностью: именно из этой разницы потом рождается вопрос «куда делись тридцать метров трассы».',

  consumptionColItem: 'Позиция',
  consumptionColQty: 'Количество',
  consumptionColZone: 'Откуда',
  consumptionColWho: 'Кто и когда',
  consumptionColAction: 'Отмена списания',
  consumptionTableLabel: 'Движения склада по наряду',

  consumptionReturnMark: 'возврат',
  consumptionAuthorless: 'Автор удалён из панели',
  consumptionZoneless: 'Зона не указана',
  consumptionSerials: (value: string): string => `Серийные номера: ${value}`,

  /**
   * 🔴 Минус остаётся видимым и после списания: расхождение склада с
   * реальностью не заканчивается вместе с формой (ADR-134).
   */
  consumptionMinusTitle: 'Остаток по этим позициям ушёл в минус',
  consumptionMinusText:
    'Списали больше, чем числилось на складе — и это не ошибка формы, а расхождение склада с реальностью. Проведите инвентаризацию: остаток правится движением «инвентаризация» с основанием, а не переписыванием числа.',

  consumptionTotalsTitle: 'Израсходовано по факту',
  consumptionTotalsHint: 'Списания за вычетом возвратов — столько материала осталось на объекте.',

  /** 🔴 Отмена — возвратом, а не удалением: журнал движений не переписывается. */
  consumptionReturn: 'Вернуть на склад',
  consumptionReturnLabel: (name: string): string => `Вернуть на склад: ${name}`,
  consumptionReturnAsk: 'Вернуть материал на склад?',
  consumptionReturnText:
    'Списание не стирается: склад примет материал обратным движением, и в журнале останутся обе записи — сколько списали и сколько вернули. Так видно и ошибку, и её исправление.',
  consumptionReturnConfirm: 'Вернуть на склад',

  consumeTitle: 'Списать материал',
  consumeZone: 'Откуда списываем',
  consumeZonePlaceholder: 'Выберите зону',
  consumeZoneOnly: (name: string): string => `Откуда списываем: ${name}`,
  consumeZonesEmpty: 'Списывать неоткуда: ни одной зоны хранения не видно',
  consumeZonesEmptyText:
    'Материал уходит из машины или со склада. Попросите владельца завести вашу машину зоной хранения — до этого расход по наряду записать нечем.',

  consumeSearch: 'Поиск позиции',
  consumeSearchHint: 'Сузьте список, если позиций в справочнике много',
  consumeSearchPlaceholder: 'труба, кронштейн, фреон',
  consumeNothingFound: 'По этому запросу позиций нет — очистите поиск.',
  consumeItemsEmpty: 'Справочник склада пуст: позиции заводит владелец в разделе склада.',

  consumeItem: 'Позиция',
  consumeItemPlaceholder: 'Выберите позицию',
  consumeQty: 'Количество',
  consumeQtyHint: 'Дробное можно: «1,5» и «12 000» разбираются',
  consumeSerials: 'Серийные номера',
  consumeSerialsHint: 'Как записаны на блоке — по ним ищут технику в гарантийном случае',

  consumeSubmit: 'Списать',
  consumeSending: 'Списываем…',
  consumeDone: 'Списано',

  consumeBalance: (qty: string): string => `На складе в этой зоне: ${qty}`,

  /**
   * 🔴 Минус предупреждает, а не запрещает (ADR-134). Запрет означал бы, что
   * монтажник, у которого труба кончилась раньше, чем в системе, впишет
   * неправду, лишь бы закрыть наряд.
   */
  consumeShortfall: (qty: string): string =>
    `На складе меньше, чем списываете: не хватает ${qty}. Списать всё равно можно — остаток уйдёт в минус. Это значит, что склад разошёлся с реальностью: проведите инвентаризацию.`,

  consumeFromChecklist: 'Из чеклиста выезда',
  consumeFromChecklistHint:
    'Пунктам сборов нашлись позиции склада — нажмите, и позиция подставится в форму. Списать можно и без этого, выбрав её руками.',
  consumeHintLabel: (name: string): string => `Списать позицию: ${name}`,

  /**
   * Количество с единицей: «4 м», «1,5 кг», «2 пар.».
   *
   * Пробел неразрывный: «4» и «м» — одна величина, и перенос строки между
   * числом и единицей рвёт её пополам.
   */
  qty: (value: number, unit: StockUnit): string =>
    `${formatQuantity(value)}${QTY_NBSP}${STOCK_UNIT_SHORT[unit]}`,
} as const;
