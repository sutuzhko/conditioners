import type { InvariantRule, Violation } from './measure';

/**
 * Известные дефекты компонентов — допущения уровня кита, а не истории
 * (ADR-232, #457).
 *
 * 🔴 Один дефект компонента виден в десятках историй: ссылки-действия 22px
 * стояли в двадцати, строка чекбокса 21px — в сорока пяти. Ставить допущение
 * параметром в каждую историю значило бы размазать выключенное правило по
 * файлам — то, что ADR-232 отверг. Здесь дефект назван один раз, с issue, и
 * снимается тем же PR, что его чинит: записи про чекбокс, ссылки и чип
 * подбора ушли вместе со своими починками (issue #475 и #476). Раннер
 * применяет список поверх параметров историй; сводка показывает такие
 * допущения с той же причиной, что и параметры.
 *
 * Элемент сверяется по началу строки `тег._класс_` — хеш модуля в имя класса
 * не входит, чтобы запись не протухла от пересборки; история — по префиксу id,
 * когда один класс живёт в разных компонентах (чип календаря и чип подбора).
 */
export type KnownDefect = {
  readonly rule: InvariantRule;
  readonly element: RegExp;
  readonly story?: RegExp;
  readonly reason: string;
};

export const KNOWN_DEFECTS: readonly KnownDefect[] = [
  {
    rule: 'target-size',
    story: /^админка-календарь/,
    element: /^button\._(chip|close|toggle)_/,
    reason: 'issue #470 — чипы, кнопка закрытия и переключатель календаря ниже 24px',
  },
];

/** Причина известного дефекта для нарушения истории; `null` — дефект неизвестен. */
export function knownDefectReason(
  story: string,
  violation: Violation,
  defects: readonly KnownDefect[] = KNOWN_DEFECTS,
): string | null {
  for (const defect of defects) {
    if (defect.rule !== violation.rule) continue;
    if (defect.story !== undefined && !defect.story.test(story)) continue;
    if (!defect.element.test(violation.element)) continue;
    return defect.reason;
  }
  return null;
}
