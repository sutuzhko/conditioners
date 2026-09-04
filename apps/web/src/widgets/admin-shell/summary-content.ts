/**
 * Подписи сводки и человеческие названия групп настроек.
 *
 * Ключ группы (`company`, `geo`) — это имя в базе, а не то, что показывают
 * владельцу: «geo» ему ничего не говорит.
 */
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

export const adminSummaryContent = {
  /* Заголовок страницы. Совпадает с названием пункта навигации: человек
     нажал «Обзор» и обязан увидеть «Обзор», а не «Панель управления». */
  title: 'Обзор',
  lead: 'Что требует внимания прямо сейчас',

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

  leads: 'Новые обращения',
  leadsNote: 'ждут ответа →',
  orders: 'Заказы в работе',
  ordersNote: 'назначены и на объекте →',
  revenue: 'Выручка месяца',
  revenueNote: 'по выполненным нарядам →',
  reviews: 'Отзывы на модерации',
  reviewsNote: 'ждут решения →',

  upcomingTitle: 'Ближайшие дела',
  upcomingNote: 'Наряды и дела календаря по времени. Просроченное — первым.',
  upcomingEmpty: 'Ничего не запланировано.',
  upcomingCta: 'Открыть календарь →',
  /* Наряд и дело подписаны словами: одна и та же строка означает работу с
     деньгами и напоминание позвонить, и различать их цветом мало (ADR-093). */
  natureTitle: (nature: 'order' | 'event'): string => (nature === 'order' ? 'Наряд' : 'Дело'),
  /** Просроченное дело помечается словом, а не только цветом. */
  upcomingOverdue: 'просрочено',
  /* Ближайшие два дня называются словами: «сегодня 18:00» понятнее даты, а
     одинокое время без дня в списке из трёх дат читается как опечатка. */
  upcomingToday: (time: string): string => `сегодня ${time}`,
  upcomingTomorrow: (time: string): string => `завтра ${time}`,
  upcomingOn: (date: string, time: string): string => `${date}, ${time}`,

  groupTitle: (key: string): string => GROUP_TITLES[key] ?? key,
} as const;
