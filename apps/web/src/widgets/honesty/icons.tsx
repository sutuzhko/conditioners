/**
 * Иконки блока «Честность о цене». Декоративные: смысл несёт текст рядом,
 * поэтому обе скрыты от скринридера, а цвет наследуется через `currentColor`.
 */

type IconProps = { readonly size?: number };

/** Галочка: пункт входит в честный монтаж. */
export function CheckIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Крестик: на этом экономят ради низкой цены. */
export function CrossIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
