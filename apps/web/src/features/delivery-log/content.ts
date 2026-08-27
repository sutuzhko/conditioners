/** Подписи журнала доставки. Ни одного адреса и ни одного текста ошибки. */
export const deliveryLogContent = {
  summaryTitle: 'Доставка уведомлений',
  summaryEmpty: 'Уведомлений ещё не было: заявок с сайта пока не приходило.',

  columnChannel: 'Канал',
  columnPending: 'В очереди',
  columnSent: 'Доставлено',
  columnFailed: 'Не дошло',

  failuresTitle: 'Что не дошло',
  failuresHint:
    'Причина приходит от самого канала. Исправьте её — в настройках раздела ' +
    'или на сервере — и повторите отправку: уведомление уйдёт тем же текстом.',
  failuresEmpty: 'Сбоев доставки нет.',

  kindLead: 'Заявка',
  kindReview: 'Отзыв',
  kindReminder: 'Напоминание о ТО',
  kindOrderAssigned: 'Назначен наряд',
  kindOrderChanged: 'Изменился наряд',
  kindOrderCancelled: 'Наряд отменён',

  statusFailed: 'отказ',
  statusRetrying: 'повторяется',
  statusPending: 'в очереди',
  statusSent: 'доставлено',

  /** Получатель: у владельца адрес общий, у человека — свой. */
  recipientOwner: 'Владелец, общий адрес компании',
  recipientPrefix: 'Кому:',

  attempts: (count: number): string => `попыток: ${count}`,
  retry: 'Повторить',
  retrying: 'Отправляем...',
  retryDone: 'Вернули в очередь',
  retryError: 'Не получилось вернуть в очередь. Обновите страницу и попробуйте снова.',

  feedTitle: 'Что ушло людям',
  feedHint:
    'Копию сообщения монтажнику владелец не получает — иначе в сезон это ' +
    'двойной поток в телеграм. Здесь видно, что и кому ушло и дошло ли.',
  feedEmpty: 'Адресных уведомлений ещё не было: наряды никому не назначались.',

  addressesTitle: 'Адреса доставки',
  addressesHint:
    'Наряд, изменение вводных и отмена уходят тому, кому наряд назначен. ' +
    'Без адреса сообщение не потеряется — оно ляжет в журнал выше отказом, ' +
    'но человек о выезде не узнает.',
  addressesEmpty: 'В команде пока никого нет.',

  roleOwner: 'владелец',
  roleInstaller: 'монтажник',
  inactive: 'доступ отключён',

  telegramBound: 'телеграм привязан',
  telegramMissing: 'телеграм не привязан',
  emailMissing: 'почта не указана',

  codeLabel: 'Код привязки',
  codeHint:
    'Продиктуйте код человеку: он отправляет его сообщением боту, и бот ' +
    'запоминает чат. Код действует полчаса, потом обновляется сам.',

  emailLabel: 'Почта для уведомлений',
  emailPlaceholder: 'адрес@почта.рф',
  emailSave: 'Сохранить',
  emailSaving: 'Сохраняем...',
  emailSaved: 'Адрес сохранён',

  unbind: 'Отвязать телеграм',
  unbinding: 'Отвязываем...',
  unbound: 'Телеграм отвязан',

  addressError: 'Не получилось сохранить. Обновите страницу и попробуйте снова.',
  addressNetwork: 'Сеть не отвечает. Проверьте соединение и попробуйте снова.',
  addressSession: 'Сессия истекла — войдите в панель заново.',
} as const;

const KIND_TITLES: Readonly<Record<string, string>> = {
  lead: deliveryLogContent.kindLead,
  review: deliveryLogContent.kindReview,
  'to-reminder': deliveryLogContent.kindReminder,
  'order-assigned': deliveryLogContent.kindOrderAssigned,
  'order-changed': deliveryLogContent.kindOrderChanged,
  'order-cancelled': deliveryLogContent.kindOrderCancelled,
};

/** Человеческое имя события: `kind` в базе — технический код. */
export function kindTitle(kind: string): string {
  return KIND_TITLES[kind] ?? kind;
}
