/**
 * Значки действий строки команды (issue #602, макет `Team.png`).
 *
 * 🔴 Локальные, а не в словаре кита. Словарь значков закрыт (ADR-194), и три
 * новых имени в нём — правка общего файла ради одной колонки. Здесь они живут
 * ровно до того, как кит получит свои: `IconButton` принимает значок узлом, и
 * подмена будет заменой импорта.
 *
 * Оба значка декоративны и помечены `aria-hidden` самим `IconButton`: имя
 * действия приходит из `label`.
 */

/** Открыть карточку — «глаз» из макета. */
export function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Удалить — «корзина» из макета. */
export function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M10 4h4M9 7v11m6-11v11M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
