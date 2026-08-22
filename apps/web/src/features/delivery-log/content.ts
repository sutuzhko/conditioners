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

  statusFailed: 'отказ',
  statusRetrying: 'повторяется',

  attempts: (count: number): string => `попыток: ${count}`,
  retry: 'Повторить',
  retrying: 'Отправляем...',
  retryDone: 'Вернули в очередь',
  retryError: 'Не получилось вернуть в очередь. Обновите страницу и попробуйте снова.',
} as const;

/** Человеческое имя события: `kind` в базе — технический код. */
export function kindTitle(kind: string): string {
  if (kind === 'lead') return deliveryLogContent.kindLead;
  if (kind === 'review') return deliveryLogContent.kindReview;
  if (kind === 'to-reminder') return deliveryLogContent.kindReminder;
  return kind;
}
