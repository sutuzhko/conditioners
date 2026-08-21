/**
 * Иконки строк контактов. Здесь, а не в UI Kit: они нужны только этому блоку,
 * а инвентарь общих деталей — не свалка (см. комментарий в shared/ui/icons).
 *
 * Иконки декоративны — рядом с каждой стоит подпись строки, поэтому они
 * помечены `aria-hidden`, иначе скринридер прочитает её дважды.
 */

export type IconProps = {
  readonly size?: number | undefined;
};

/** Метка на карте — строка адреса. */
export function PinIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

/** Развёрнутая карта — строка про регион и районы выезда. */
export function MapIcon({ size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 4 3.8 6.1a1 1 0 0 0-.6.9v11.3c0 .7.7 1.2 1.4.9L9 17.6l6 2.4 5.2-2.1a1 1 0 0 0 .6-.9V5.7c0-.7-.7-1.2-1.4-.9L15 6.4 9 4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9 4v13.6M15 6.4V20" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
