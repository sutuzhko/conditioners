/** Подписи формы настроек. */
export const settingsFormContent = {
  save: 'Сохранить',
  saving: 'Сохраняем…',
  saved: 'Сохранено',
  /* Правки данных компании видны на каждой странице сайта — предупреждаем,
     что кнопка меняет живой сайт, а не черновик. */
  savedNote: 'Изменения уже на сайте',
  discard: 'Отменить правки',

  listEmpty: 'Пока пусто',
  /* Предел приходит из схемы, а не из вкуса: пятая цифра не помещается в
     полосу первого экрана одним рядом. */
  listFull: (max: number): string => `Больше ${max} — не поместится в полосу`,
  remove: 'Удалить',
  removeItem: (itemLabel: string, position: number): string =>
    `Удалить: ${itemLabel.toLowerCase()} ${position}`,
  addItem: (itemLabel: string): string => `Добавить: ${itemLabel.toLowerCase()}`,

  /** Незаполненная группа: сайт показывает вместо неё заглушку. */
  placeholderWarning: 'Здесь ещё стоит заглушка — она видна посетителям сайта',
} as const;
