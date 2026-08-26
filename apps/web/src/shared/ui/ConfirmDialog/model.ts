/**
 * Запрос подтверждения необратимого действия.
 *
 * 🔴 Действие называется словом, а не «ОК» (`confirmLabel`): системное окно
 * браузера выглядело одинаково для «удалить фотографию» и «удалить учётную
 * запись», и человек соглашался, не прочитав. См. ADR-113.
 */
export type ConfirmRequest = {
  /** Вопрос: «Удалить статью «Как выбрать кондиционер»?» */
  readonly title: string;
  /** Что именно исчезнет и что это навсегда. */
  readonly description?: string | undefined;
  /** Подпись опасной кнопки: «Удалить статью». */
  readonly confirmLabel: string;
  readonly cancelLabel?: string | undefined;
};

/**
 * Спросить и дождаться ответа. `false` — человек отказался или закрыл окно.
 *
 * Обещание вместо синхронного `boolean`: окно живёт в разметке, а не
 * останавливает поток выполнения, как `window.confirm`.
 */
export type Confirm = (request: ConfirmRequest) => Promise<boolean>;
