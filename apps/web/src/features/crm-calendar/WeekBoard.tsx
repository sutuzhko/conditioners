import { Agenda } from './Agenda';
import { crmContent as texts } from './content';
import { TimeGrid } from './TimeGrid';
import type { HourRange, ScheduleColumn } from './schedule';
import styles from './WeekBoard.module.css';

export interface WeekBoardProps {
  /** Семь колонок недели. Собирает их `weekColumns`. */
  readonly columns: readonly ScheduleColumn[];
  /** Часы суток и рабочее окно: к нему сетка прокручена при открытии. */
  readonly range: HourRange;
  /** Минуты от московской полуночи: линия «сейчас» в колонке сегодня. */
  readonly nowMin: number;
  /** Найденная поиском запись — её подсвечивают и в сетке, и в повестке. */
  readonly focusId?: string | undefined;
}

/**
 * Неделя: часовая сетка на большом экране, повестка на телефоне — issue #47.
 *
 * 🔴 Порог — 600px из набора [DESIGN_BRIEF §6](../../../../docs/DESIGN_BRIEF.md),
 * а не своя ширина под один телефон. Ниже него семи колонкам достаётся сорок
 * пикселей на день, и от записи остаётся один символ; выше — сетка читается,
 * и подменять её списком значило бы отнимать у владельца тот вид, ради
 * которого он в календарь и заходит.
 *
 * 🔴 Оба представления приходят с сервера, а выбирает между ними CSS. Ширину
 * окна сервер не знает, и любой другой способ — это либо угадывание по
 * `User-Agent`, либо сборка на клиенте: первое врёт на планшете, второе даёт
 * прыжок раскладки на каждом открытии. Скрытое `display: none` не читается ни
 * скринридером, ни проверкой инвариантов — второго календаря для человека не
 * существует.
 */
export function WeekBoard({ columns, range, nowMin, focusId }: WeekBoardProps) {
  return (
    <>
      <div className={styles.hours}>
        <TimeGrid
          columns={columns}
          view="week"
          range={range}
          nowMin={nowMin}
          label={texts.weekLabel}
          focusId={focusId}
        />
      </div>

      <div className={styles.agenda}>
        <Agenda columns={columns} focusId={focusId} />
      </div>
    </>
  );
}
