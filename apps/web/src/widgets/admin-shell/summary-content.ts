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
  readinessTitle: 'Готовность к запуску',
  readinessDone: 'Все данные о компании заполнены. Сайт можно публиковать.',
  readinessPending:
    'Пока не заполнено — на сайте вместо этих данных стоят заглушки. Публиковать в таком виде нельзя.',
  readinessCta: 'Заполнить данные компании →',

  leads: 'Новые обращения',
  leadsNote: 'ждут ответа',
  orders: 'Заказы в работе',
  ordersNote: 'назначены и на объекте',
  clients: 'Клиентов в базе',
  clientsNote: 'всего карточек',
  installers: 'Монтажников на связи',
  installersNote: 'с открытым доступом в панель',
  reviews: 'Отзывы на модерации',
  reviewsNote: 'ждут решения',

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
