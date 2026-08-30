/**
 * Разбор цвета токена и контраст по WCAG 2.1.
 *
 * Реализация одна на всех: ею меряет палитру проверка `shared/styles`, ею же
 * подписывает образцы витрина токенов в Storybook. Две реализации одной
 * формулы разошлись бы молча — и разошлись бы именно в том знаке после
 * запятой, вокруг которого стоит порог.
 *
 * 🔴 Прозрачность раскладывается явно (`blend`). Половина поверхностей панели
 * тонирована, и краска ложится на подложку, произведённую от неё же: счёт по
 * номиналу токена давал 5,5:1 там, где на экране 4,5:1 (ADR-181).
 */

export type Color = {
  readonly channels: readonly [number, number, number];
  readonly alpha: number;
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*(?:[/,]\s*(\d*\.?\d+)(%?)\s*)?\)$/i;

/** `#rgb`, `#rrggbb`, `rgb(r g b)`, `rgb(r g b / N%)` — и запятые тоже. */
export function parseColor(raw: string): Color | null {
  const value = raw.trim();

  const hex = HEX.exec(value);
  if (hex?.[1] !== undefined) {
    const digits = hex[1];
    const full =
      digits.length === 3
        ? digits
            .split('')
            .map((c) => c + c)
            .join('')
        : digits;
    const channel = (from: number): number => Number.parseInt(full.slice(from, from + 2), 16);

    return { channels: [channel(0), channel(2), channel(4)], alpha: 1 };
  }

  const rgb = RGB.exec(value);
  if (rgb === null) return null;

  const [, r, g, b, amount, percent] = rgb;
  if (r === undefined || g === undefined || b === undefined) return null;

  const alpha = amount === undefined ? 1 : Number(amount) / (percent === '%' ? 100 : 1);

  return { channels: [Number(r), Number(g), Number(b)], alpha };
}

/** Полупрозрачный цвет поверх непрозрачной подложки — так же, как в браузере. */
export function blend(top: Color, bottom: Color): Color {
  const mix = (index: 0 | 1 | 2): number =>
    top.channels[index] * top.alpha + bottom.channels[index] * (1 - top.alpha);

  return { channels: [mix(0), mix(1), mix(2)], alpha: 1 };
}

/** Относительная яркость по WCAG 2.1. */
function luminance({ channels }: Color): number {
  const weights = [0.2126, 0.7152, 0.0722] as const;

  return channels.reduce((sum, value, index) => {
    const channel = value / 255;
    const linear = channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

    return sum + linear * (weights[index] ?? 0);
  }, 0);
}

/**
 * Контраст пары. Прозрачность не учитывается: цвет с альфой сначала кладётся
 * на подложку через `blend`, иначе число окажется тем самым «по номиналу».
 */
export function contrastRatio(first: Color, second: Color): number {
  const one = luminance(first);
  const two = luminance(second);

  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

/** «3,30» — как в журнале и в брифе: запятая, два знака. */
export function formatRatio(value: number): string {
  return value.toFixed(2).replace('.', ',');
}
