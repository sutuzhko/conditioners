import { Icon } from '@/shared/ui';

import { crmClashContent as texts } from '../content';
import styles from './ClashNote.module.css';

export interface ClashNoteProps {
  /**
   * Что уже стоит на это время, готовыми строками: «10:00–12:00 · Наряд
   * № 1059, Ирина». Форматирует их тот, кто знает сущность, — компонент только
   * показывает: наряд и дело называются по-разному.
   */
  readonly items: readonly string[];
  readonly className?: string | undefined;
}

/**
 * Предупреждение о наложении по времени — CRM.md §8.5.
 *
 * 🔴 Предупреждает, а не запрещает, как и занятость (ADR-115): срочный ремонт
 * в июльскую жару важнее запрета, и система не должна знать о бизнесе больше
 * владельца. Поэтому здесь нет ни блокировки кнопки, ни подтверждения — список
 * того, с чем спорит запись, и решение за человеком.
 *
 * Отдельно от `BusyNote`: занятость отвечает «человека нет», пересечение —
 * «человек уже занят другим выездом». Свалить их в одну строку значило бы
 * заставить читателя догадываться, что именно случилось.
 */
export function ClashNote({ items, className }: ClashNoteProps) {
  if (items.length === 0) return null;

  return (
    /* role=status, а не alert: это не ошибка, и перебивать человека посреди
       заполнения формы ей незачем — она сообщается следующей паузой */
    <div className={[styles.note, className].filter(Boolean).join(' ')} role="status">
      {/* значок, а не только цвет: предупреждение обязано читаться и в ч/б */}
      <Icon className={styles.icon} name="clock" size={18} />

      <div className={styles.body}>
        <p className={styles.title}>{texts.title}</p>

        <ul className={styles.list}>
          {items.map((item) => (
            <li className={styles.item} key={item}>
              {item}
            </li>
          ))}
        </ul>

        <p className={styles.hint}>{texts.hint}</p>
      </div>
    </div>
  );
}
