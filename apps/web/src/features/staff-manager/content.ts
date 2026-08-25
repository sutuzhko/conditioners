/** Подписи раздела команды. */

export const staffManagerContent = {
  title: 'Монтажники',
  lead: 'Команда: доступ в панель, телефоны и заметки. Монтажник видит только назначенные ему наряды, календарь и свой профиль.',

  emptyTitle: 'Монтажников пока нет',
  emptyText:
    'Заведите первого — он получит логин и пароль и сможет войти в панель со своего телефона.',

  addTitle: 'Новый монтажник',
  addHint: 'Пароль временный: человек меняет его сам в разделе «Профиль».',
  add: 'Добавить',
  adding: 'Добавляем…',
  added: 'Монтажник заведён. Передайте ему логин и пароль',
  addOpen: 'Добавить монтажника',
  addClose: 'Свернуть форму',

  name: 'Имя и фамилия',
  login: 'Логин',
  loginHint: 'Латиницей: его придётся диктовать по телефону',
  phone: 'Телефон',
  password: 'Временный пароль',
  passwordNew: 'Новый пароль',
  passwordKeepHint: 'Пусто — пароль остаётся прежним',

  accountTitle: 'Аккаунт монтажника',
  accountHint:
    'Логин и пароль выдаёт владелец. Смена пароля закрывает все открытые сессии этого человека.',
  save: 'Сохранить',
  saving: 'Сохраняем…',
  saved: 'Сохранено',

  active: 'Работает',
  inactive: 'Доступ закрыт',
  disable: 'Закрыть доступ',
  enable: 'Открыть доступ',
  disableHint:
    'Закрытый доступ не пускает в панель и закрывает уже открытые сессии. Выполненные наряды остаются в истории.',

  remove: 'Удалить монтажника',
  removeConfirm: (who: string): string =>
    `Удалить ${who}? Учётная запись исчезнет, выполненные наряды останутся в истории.`,

  notesTitle: 'Заметки владельца',
  notesHint: 'Монтажник их не видит.',
  notesEmpty: 'Заметок пока нет.',
  noteAdd: 'Добавить',
  notePlaceholder: 'Например: аккуратный монтаж, можно доверять сложные объекты',
  noteRemove: 'Удалить заметку',

  open: 'Карточка',
  back: '← Все монтажники',
  since: (iso: string): string => `в команде с ${staffManagerContent.date(iso)}`,
  lastLogin: (iso: string | null): string =>
    iso === null ? 'ни разу не заходил' : `последний вход ${staffManagerContent.when(iso)}`,

  networkError: 'Не удалось связаться с сервером. Изменения не сохранены',
  serverError: 'Сервер не принял изменения. Попробуйте ещё раз',

  /** Даты — по Москве: команда работает в Туле, а не в поясе того, кто смотрит. */
  date: (iso: string): string =>
    new Date(iso).toLocaleDateString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  when: (iso: string): string =>
    new Date(iso).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
} as const;
