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
import { formatDateShort, formatDateTime, formatMoney } from '@/shared/lib/format';
import { plural } from '@/shared/lib/plural';
import type { BadgeVariant } from '@/shared/ui';

import type { DeductionMode } from './model';

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

export const ORDER_STATUS_TITLE: Record<OrderStatus, string> = {
  new: 'Новый',
  assigned: 'Назначен',
  in_progress: 'В работе',
  done: 'Выполнен',
  cancelled: 'Отказ',
};

/** Оттенок плашки: новый наряд требует действия, отказ — уже нет. */
export const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeVariant> = {
  new: 'accent',
  assigned: 'dark',
  in_progress: 'warning',
  done: 'success',
  cancelled: 'neutral',
};

export const ORDER_TAB_TITLE: Record<OrderTab, string> = {
  active: 'Активные',
  new: 'Новые',
  history: 'История',
  cancelled: 'Отказы',
  all: 'Все',
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

export const orderManagerContent = {
  title: 'Заказы',
  lead: 'Наряды на монтаж, обслуживание и ремонт: кто едет, когда, на сколько и за какие деньги.',
  installerTitle: 'Мои заказы',
  installerLead: 'Наряды, назначенные вам. Статус меняется здесь же — владелец видит его сразу.',

  emptyTitle: 'Нарядов пока нет',
  emptyText:
    'Заведите первый — он появится в списке и в календаре работ, а монтажник увидит его у себя.',
  emptyFound: 'По этому фильтру ничего не нашлось.',
  emptyFoundText: 'Проверьте вкладку и период — возможно, наряд лежит в другой стопке.',
  emptyInstaller: 'На вас пока ничего не назначено',
  emptyInstallerText: 'Как только владелец назначит наряд, он появится здесь.',

  filtersLabel: 'Фильтр заказов',
  tabsLabel: 'Стопки заказов',
  periodLabel: 'Период',
  searchLabel: 'Поиск заказа',
  searchHint: 'Номер, имя клиента, адрес или модель в позициях',
  searchPlaceholder: '1059, Соколова, Первомайская',
  search: 'Найти',
  searchReset: 'Сбросить фильтр',
  found: (total: number): string => `Найдено: ${total}`,
  totalCount: (total: number): string =>
    `Всего: ${total} ${plural(total, 'наряд', 'наряда', 'нарядов')}`,

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
  durationHint: 'Шаг 15 минут: полтора часа на обслуживание — обычное дело',

  payment: 'Оплата',
  price: 'Сумма заказа',
  installerFee: 'Выплата монтажнику',
  cashToTake: 'Принять от клиента',
  cashToTakeHint: 'Клиент платит наличными на объекте — эту сумму нужно взять с собой в отчёт.',

  deduction: 'Удержание',
  deductionHint: 'Брак, срыв выезда, испорченный материал',
  deductionReason: 'Основание',
  deductionReasonHint: 'Обязательно: сумма без причины через полгода не значит ничего',

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
  tabOrder: 'Наряд',
  tabChecklist: 'Чеклист выезда',
  tabFiles: 'Документы и фото',

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
  span: (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    if (hours === 0) return `${rest} мин`;
    if (rest === 0) return `${hours} ч`;
    return `${hours} ч ${rest} мин`;
  },
} as const;
