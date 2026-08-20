/**
 * Общие иконки интерфейса.
 *
 * 🔴 Правило слоёв запрещает импорт вбок между блоками, поэтому иконка, которая
 * нужна двум блокам, обязана лежать здесь: стрелка успела разойтись по шапке и
 * блоку доверия посимвольно одинаковыми копиями (ADR-030).
 *
 * Иконки декоративны: они всегда стоят рядом с текстом, который их объясняет,
 * поэтому помечены `aria-hidden` — иначе скринридер прочитает подпись дважды.
 * Цвет наследуется через `currentColor`, размер задаётся пропом.
 *
 * Иконка, которая нужна одному блоку и больше нигде, остаётся у него: UI Kit —
 * не свалка, а инвентарь общих деталей.
 */

export type IconProps = {
  /** сторона в пикселях; по умолчанию — размер из макета для этого места */
  readonly size?: number | undefined;
};

export function ArrowIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PhoneIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 3h2.2l1.5 3.6-1.8 1.3a11.5 11.5 0 0 0 5.7 5.7l1.3-1.8L19 13.3v2.2c0 1.4-1.1 2.5-2.5 2.5A12.5 12.5 0 0 1 4 5.5C4 4.1 5.1 3 6.5 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ClockIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3l7 3v5c0 4.4-3 8-7 10-4-2-7-5.6-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function CheckIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5 10 17.5 19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
