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
  payment: 'Способы оплаты',
  social: 'Соцсети',
  seo: 'Метаданные главной',
  integrations: 'Счётчики и интеграции',
};

export const adminSummaryContent = {
  readinessTitle: 'Готовность к запуску',
  readinessDone: 'Все данные о компании заполнены. Сайт можно публиковать.',
  readinessPending:
    'Пока не заполнено — на сайте вместо этих данных стоят заглушки. Публиковать в таком виде нельзя.',
  readinessCta: 'Заполнить данные компании →',

  leads: 'Новые заявки',
  leadsNote: 'ждут ответа',
  reviews: 'Отзывы на модерации',
  reviewsNote: 'ждут решения',
  models: 'Моделей в каталоге',
  modelsNote: 'всего, включая скрытые',
  articles: 'Статей',
  articlesNote: 'всего, включая черновики',

  groupTitle: (key: string): string => GROUP_TITLES[key] ?? key,
} as const;
