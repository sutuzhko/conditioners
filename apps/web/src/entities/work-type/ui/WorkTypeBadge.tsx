import type { WorkTypeMark } from '@/shared/lib/work-type';
import { Icon } from '@/shared/ui';

import styles from './WorkTypeBadge.module.css';

/**
 * Краска метки — та же палитра, что у записи календаря (ADR-343). Класс на
 * каждую краску, а не подстановка токена в стиль: значения пар «фон + текст»
 * живут в CSS, и контраст каждой пары в обеих темах меряет
 * `features/crm-calendar/palette.test.ts`.
 */
const TONE_CLASS: Record<WorkTypeMark['tone'], string> = {
  accent: styles.toneAccent ?? '',
  info: styles.toneInfo ?? '',
  ok: styles.toneOk ?? '',
  warn: styles.toneWarn ?? '',
  sale: styles.toneSale ?? '',
  error: styles.toneError ?? '',
  neutral: styles.toneNeutral ?? '',
};

export interface WorkTypeBadgeProps {
  readonly workType: WorkTypeMark;
  readonly className?: string | undefined;
}

/**
 * Вид работ ярлыком: краска, значок и слово.
 *
 * 🔴 Слово стоит рядом с краской всегда, и это не оформление, а требование
 * (ADR-093, WCAG 1.4.1, issue #840). Ярлык, различающий «монтаж» и «ремонт»
 * одним цветом, для восьми процентов мужчин не различает ничего, а на
 * распечатанном наряде не различает ничего ни для кого. Значок усиливает
 * краску, но подпись не заменяет — поэтому он и скрыт от озвучки: рядом с
 * названием он повторял бы его второй раз.
 *
 * Живёт у сущности, а не в фиче: тот же ярлык нужен очереди обращений,
 * карточке заявки и списку нарядов, а импорт вбок между фичами правило слоёв
 * запрещает.
 */
export function WorkTypeBadge({ workType, className }: WorkTypeBadgeProps) {
  return (
    <span
      className={[styles.badge, TONE_CLASS[workType.tone], className].filter(Boolean).join(' ')}
    >
      <Icon className={styles.icon} name={workType.icon} size={14} />
      {workType.title}
    </span>
  );
}
