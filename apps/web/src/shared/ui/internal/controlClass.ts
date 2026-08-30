import type { FieldVariant } from './Field';
import control from './control.module.css';

export interface ControlClassInput {
  variant?: FieldVariant | undefined;
  /** поле в ошибке: тинт и красная граница */
  invalid?: boolean | undefined;
  /** у поля есть подпись — в панели она уходит внутрь, и значению нужно место */
  labelled?: boolean | undefined;
  /** классы самого компонента: своя высота у многострочного, стрелка у списка */
  own?: readonly (string | undefined)[] | undefined;
}

/**
 * Собирает набор классов шкуры поля. Общий на input, textarea и select:
 * вид и фокус у них обязаны совпадать до пикселя, а совпадение, собранное
 * тремя одинаковыми списками в трёх файлах, разъезжается с первой правкой.
 */
export function controlClassName({
  variant = 'flat',
  invalid = false,
  labelled = false,
  own = [],
}: ControlClassInput): string {
  return [
    control.control,
    control[variant],
    labelled ? control.withLabel : null,
    invalid ? control.invalid : null,
    ...own,
  ]
    .filter(Boolean)
    .join(' ');
}
