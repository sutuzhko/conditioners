import { Badge } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import styles from './StaffLoadBar.module.css';

export interface StaffLoadBarProps {
  /** Минуты нарядов недели. */
  readonly minutes: number;
  /** Норма недели: рабочее окно × пять дней (ADR-138, ADR-310). */
  readonly normMin: number;
  /** Минуты за границей окна — переработка на момент записи наряда. */
  readonly overtimeMin: number;
}

/**
 * Загрузка недели полосой и числом (issue #629, макет `Team.png`).
 *
 * 🔴 Считается из нарядов, а не из своего поля в базе (ADR-310): у наряда есть
 * `durationMin` и `overtimeMin`, рабочее окно задаёт владелец. Отдельная
 * колонка «часов за неделю» неизбежно разошлась бы с суммой по нарядам.
 *
 * 🔴 У полосы стоит число — «32 ч», как в макете. Полоса без величины
 * сообщает «примерно столько», а владелец распределяет работу по часам.
 *
 * 🔴 Переработка помечена не только цветом: рядом с числом встаёт чип «+4 ч»
 * (DESIGN_BRIEF §14). Прозой она больше не пишется — абзац в ячейке растил
 * строку и ломал ритм таблицы. Полная величина вместе с нормой уходит в
 * подсказку и в озвучку: норма одна на всех, и повторять её в каждой строке
 * значит набрать восемь одинаковых «из 50».
 *
 * Серверный компонент: полоса ничего не делает, кроме показа.
 */
export function StaffLoadBar({ minutes, normMin, overtimeMin }: StaffLoadBarProps) {
  /* Норма нулевой не бывает — окно проверено схемой (fromMin < toMin), — но
     настройку правят руками в базе, и делить на ноль из-за этого нельзя. */
  const share = normMin <= 0 ? 0 : Math.min(minutes / normMin, 1);
  const over = minutes > normMin;

  const full = texts.loadOf(minutes, normMin);

  return (
    <div className={styles.load}>
      {/* Полная величина висит на всей группе: подсказка мыши, имя для
          озвучки и пояснение к числу — одно и то же предложение. */}
      <div className={styles.track} title={full} aria-hidden="true">
        <div
          className={over ? styles.fillOver : styles.fill}
          /* Ширина — единственное, что нельзя записать классом: доля приходит
             из данных. Значение то же, что в подписи рядом. */
          style={{ inlineSize: `${Math.round(share * 100)}%` }}
        />
      </div>

      <span className={over ? styles.valueOver : styles.value} title={full} aria-label={full}>
        {texts.hours(minutes)}
      </span>

      {overtimeMin > 0 ? (
        <Badge variant="danger" size="sm" title={texts.overtime(overtimeMin)}>
          {texts.overtimeChip(overtimeMin)}
        </Badge>
      ) : null}
    </div>
  );
}
