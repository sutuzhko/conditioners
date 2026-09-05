/**
 * Подписи сводки и человеческие названия групп настроек.
 *
 * Ключ группы (`company`, `geo`) — это имя в базе, а не то, что показывают
 * владельцу: «geo» ему ничего не говорит.
 */
import { WORK_TIME_ZONE } from '@/shared/lib/calendar';
import { formatMoney } from '@/shared/lib/format';
import { pluralize } from '@/shared/lib/plural';

/* Неразрывный пробел: «9,2 %» не должно переноситься между числом и знаком, а
   в чипе шириной в семь знаков перенос случается на первой же узкой плитке. */
const NBSP = '\u00A0';

const GROUP_TITLES: Record<string, string> = {
  company: 'Название и описание',
  contacts: 'Телефон и почта',
  address: 'Адрес',
  geo: 'Координаты на карте',
  area: 'Регион работы',
  legal: 'Реквизиты',
  extras: 'Ставки допуслуг',
  warranty: 'Гарантия',
  schedule: 'Рабочее окно календаря',
  payment: 'Способы оплаты',
  social: 'Соцсети',
  seo: 'Метаданные главной',
  achievements: 'Цифры первого экрана',
  specs: 'Справочник характеристик',
  notifications: 'Каналы уведомлений',
  integrations: 'Счётчики и интеграции',
};

/** Часть суток, которой владелец здоровается. */
export type DayPart = 'night' | 'morning' | 'afternoon' | 'evening';

const GREETINGS: Readonly<Record<DayPart, string>> = {
  night: 'Доброй ночи',
  morning: 'Доброе утро',
  afternoon: 'Добрый день',
  evening: 'Добрый вечер',
};

/**
 * Часть суток по московскому времени работ (ADR-080).
 *
 * 🔴 Принимает время строкой `«HH:MM»`, а не `Date`: час считает
 * `shared/lib/calendar` в поясе компании, и `new Date().getHours()` здесь дал
 * бы пояс сервера — в контейнере это UTC, и «доброе утро» приходило бы в
 * четвёртом часу ночи.
 */
export function dayPartOf(time: string): DayPart {
  const hour = Number.parseInt(time.slice(0, 2), 10);

  if (!Number.isFinite(hour) || hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * День словами: «Среда, 29 августа».
 *
 * Заглавная буква ставится вручную: `Intl` отдаёт «среда» строчной, а строка
 * стоит подзаголовком под приветствием и начинает предложение.
 */
export function dayTitle(at: Date): string {
  const text = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: WORK_TIME_ZONE,
  }).format(at);

  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Короткий день: «пт, 31» — так подписан день строки в макете «Обзор».
 *
 * Полная дата в колонке шириной 116px не помещается, а голое число без дня
 * недели не отвечает на вопрос, ради которого в список и смотрят: успеваем ли
 * до выходных.
 */
export function dayShort(at: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    timeZone: WORK_TIME_ZONE,
  }).format(at);
}

export const adminSummaryContent = {
  /* Заголовок страницы. Совпадает с названием пункта навигации: человек
     нажал «Обзор» и обязан увидеть «Обзор», а не «Панель управления». */
  title: 'Обзор',
  lead: 'Что требует внимания прямо сейчас',

  /* 🔴 Шапка «Обзора» (issue #588). Имя приходит из сессии, число выездов — из
     данных: ни одного факта о компании и её работе в коде (инвариант 8).
     Имени в учётной записи может не быть — тогда здоровается безымянно, а не
     логином: «Доброе утро, admin» звучит как обращение к серверу. */
  greeting: (part: DayPart, name: string | null): string =>
    name === null || name.trim() === '' ? GREETINGS[part] : `${GREETINGS[part]}, ${name.trim()}`,
  /** «Среда, 29 августа · 3 выезда сегодня». Ноль выездов тоже новость. */
  dayLine: (day: string, trips: number): string =>
    `${day} · ${trips === 0 ? 'выездов сегодня нет' : `${pluralize(trips, 'выезд', 'выезда', 'выездов')} сегодня`}`,
  newOrder: 'Новый заказ',

  readinessTitle: 'Готовность к запуску',
  readinessDone: 'Все данные о компании заполнены. Сайт можно публиковать.',
  readinessPending:
    'Пока не заполнено — на сайте вместо этих данных стоят заглушки. Публиковать в таком виде нельзя.',
  readinessCta: 'Заполнить данные компании →',

  /* Три сегмента входного экрана (issue #344). Сегменты, а не вкладки:
     разделы не равноправны — «Обзор» отвечает на главный вопрос, остальные
     два его раскрывают. */
  segmentsLabel: 'Разделы сводки',
  segmentTitle: {
    overview: 'Обзор',
    work: 'Работа',
    money: 'Деньги',
  },

  /* Сегмент «Работа»: успеваем ли. */
  workDone: 'Выполнено за месяц',
  workDoneNote: 'закрытых нарядов',
  workActive: 'В работе',
  workActiveNote: 'назначены и на объекте',
  workFresh: 'Новые наряды',
  workFreshNote: 'ждут исполнителя',
  workInstallers: 'Монтажников на связи',
  workInstallersNote: 'с открытым доступом в панель',
  attentionTitle: 'Требуют внимания',
  attentionNote: 'Наряды, по которым время вышло или некому ехать.',
  attentionEmpty: 'Ничего не горит: сроки соблюдаются, исполнители назначены.',
  attentionOverdue: 'Просрочен',
  attentionUnassigned: 'Не назначен',
  attentionCta: 'Открыть заказы →',

  /* Сегмент «Деньги». 🔴 Ни закупочных цен, ни себестоимости, ни маржи:
     их нет в базе, и решение владельца по ним не принято (CRM.md §11.7). */
  moneyRevenue: 'Выручка',
  moneyRevenueNote: 'по выполненным нарядам',
  moneyAverage: 'Средний чек',
  moneyAverageNote: 'выручка на наряд',
  moneyPayout: 'К выплате бригадам',
  moneyPayoutNote: 'вознаграждение за вычетом удержаний',
  moneyCash: 'Принято наличными',
  moneyCashNote: 'на объекте, у монтажников',
  moneyChartTitle: 'Выручка по неделям',
  moneySharesTitle: 'Из чего сложилась',
  moneySharesNote: 'Те же наряды, что в разделе «Заказы», — не отдельный отчёт.',
  moneyEmpty: 'В этом месяце ещё ничего не закрыто.',
  moneyShareType: 'Вид работ',
  moneyShareSum: 'Выручка',
  moneyShareShare: 'Доля',
  moneySharePercent: (percent: number): string => `${percent}%`,

  /* Плитки «Обзора» (issue #590). Состав — из макета «Обзор». */
  leads: 'Новые обращения',
  leadsNote: 'ждут ответа →',
  orders: 'Активные заказы',
  ordersNote: 'назначены и на объекте →',
  revenue: 'Выручка за месяц',
  revenueNote: 'по выполненным нарядам →',
  /* 🔴 Плитка называет ровно то, что считает. «Остаётся за месяц» из макета
     означало бы прибыль, а в этом числе нет ни материалов, ни налогов, ни
     закупки техники: закупочная цена появится на позиции склада (ADR-318), и
     до тех пор «остаётся» было бы завышенным числом, по которому владелец
     назначает цену монтажа. */
  retained: 'Выручка минус выплаты',
  retainedNote: 'до материалов и налогов →',

  /* Чипы изменения. Показываются только там, где есть с чем сравнивать. */
  leadsStale: (hours: number): string => pluralize(hours, 'час', 'часа', 'часов'),
  leadsStaleDay: (days: number): string => pluralize(days, 'сутки', 'суток', 'суток'),
  flowDelta: (delta: number): string => `${Math.abs(delta)} за неделю`,
  percentDelta: (percent: number): string =>
    `${Math.abs(percent).toLocaleString('ru-RU', { maximumFractionDigits: 1 })}${NBSP}%`,
  sharePercent: (percent: number): string => `${percent}${NBSP}%`,

  /* Графики «Обзора» (issue #589). */
  weeksChartTitle: 'Заказы по неделям',
  weeksChartNote: 'выполненные наряды, 12 недель',
  weeksChartSeries: 'Выполненные наряды',
  weeksChartEmpty: 'За двенадцать недель не закрыто ни одного наряда.',
  moneyLinesTitle: 'Выручка и выплаты',
  moneyLinesNote: 'обе величины в одной шкале, 8 месяцев',
  moneyLinesRevenue: 'Выручка',
  moneyLinesPayout: 'Выплаты монтажникам',
  moneyLinesEmpty: 'За восемь месяцев не закрыто ни одного наряда.',
  /** Тысячи рублей: восьмизначная подпись оси съедает треть ширины графика. */
  thousands: (value: number): string => `${Math.round(value / 1000)} т₽`,

  upcomingTitle: 'Ближайшие дела',
  upcomingNote: 'Наряды и дела календаря по времени. Просроченное — первым.',
  upcomingEmptyTitle: 'Ничего не запланировано',
  upcomingEmpty:
    'Ни одного наряда и ни одного дела на ближайшие дни. Работа заводится в разделе «Заказы», напоминание — в календаре.',
  upcomingNotFoundTitle: 'Ничего не нашлось',
  upcomingNotFound: 'По этому отбору дел нет. Снимите условие над таблицей или измените запрос.',
  upcomingCta: 'Открыть календарь →',
  upcomingCount: (total: number): string => String(total),
  upcomingCountLabel: (total: number): string =>
    pluralize(total, 'дело в списке', 'дела в списке', 'дел в списке'),
  /* Наряд и дело подписаны словами: одна и та же строка означает работу с
     деньгами и напоминание позвонить, и различать их цветом мало (ADR-093). */
  natureTitle: (nature: 'order' | 'event'): string => (nature === 'order' ? 'Наряд' : 'Дело'),
  /** Просроченное дело помечается словом, а не только цветом. */
  upcomingOverdue: 'просрочено',
  /* Ближайшие два дня называются словами: «сегодня» понятнее даты, а голое
     число без дня недели в списке из трёх дат читается как опечатка. */
  dayToday: 'сегодня',
  dayTomorrow: 'завтра',

  /* Колонки таблицы «Ближайших дел» (issue #591, макет «Обзор»). */
  colWhen: 'Когда',
  colWork: 'Работа и объект',
  colInstaller: 'Монтажник',
  colStatus: 'Статус',
  colSum: 'Сумма',
  colActions: 'Действия',
  tableLabel: 'Ближайшие наряды и дела',

  /* Пилюли над таблицей. */
  filterPill: 'Фильтр',
  sortPill: 'Сортировка',
  columnsPill: 'Колонки',
  showTitle: {
    all: 'Всё подряд',
    orders: 'Только наряды',
    events: 'Только дела',
    overdue: 'Просроченное',
    unassigned: 'Без исполнителя',
  },
  sortTitle: {
    time: 'По времени',
    sum: 'По сумме',
  },
  searchLabel: 'Поиск по клиенту и адресу',
  searchPlaceholder: 'Клиент или адрес',
  queryChip: (query: string): string => `«${query}»`,
  appliedLabel: 'Применённые условия',
  appliedCount: (count: number): string =>
    `${pluralize(count, 'условие применено', 'условия применены', 'условий применено')}`,
  dropFilter: (title: string): string => `Снять условие: ${title}`,
  /* 🔴 Ссылка называет действие, а не состояние: `aria-pressed` живёт у кнопок,
     а переключатель колонки — это переход по адресу. */
  columnShow: (title: string): string => `Показать колонку: ${title}`,
  columnHide: (title: string): string => `Скрыть колонку: ${title}`,

  /* Содержимое строк. */
  installerNone: 'не назначен',
  /** У дела исполнителя не бывает по построению (ADR-093) — это не пропуск. */
  installerNever: 'дело без выезда',
  sumNone: '—',
  eventPlanned: 'Запланировано',
  /* Длительность выезда: часы, минуты или и то и другое. «0 ч 30 мин» —
     не длительность, а способ занять место в колонке шириной 116px. */
  duration: (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    if (hours === 0) return `${rest} мин`;
    return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
  },
  /* Деньги печатает общий формат проекта: второй способ разошёлся бы с первым
     на разделителе разрядов уже в соседней колонке. */
  money: formatMoney,

  /* Действия строки. Подпись у каждой своя: десять одинаковых «Открыть»
     подряд читалке бесполезны — они не говорят, что именно открывается. */
  rowActions: (title: string): string => `Действия: ${title}`,
  rowOpenOrder: (number: number): string => `Открыть наряд № ${number}`,
  rowOpenEvent: (title: string): string => `Открыть в календаре: ${title}`,
  rowCall: (name: string): string => `Позвонить: ${name}`,
  rowDay: (title: string): string => `Открыть день календаря: ${title}`,

  /* Разбивка на страницы. */
  pagerLabel: 'Страницы ближайших дел',
  pagerPosition: (page: number, pages: number): string => `${page} из ${pages}`,

  groupTitle: (key: string): string => GROUP_TITLES[key] ?? key,
} as const;
