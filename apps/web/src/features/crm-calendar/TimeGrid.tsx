import Link from 'next/link';

import { timeOfMinutes } from '@/entities/crm/lib/busy';
import { busyTitle, crmBusyContent, crmClashContent, loadTitle } from '@/entities/crm/content';
import { Icon } from '@/shared/ui';

import { AllDayBar } from './AllDayBar';
import { ColumnCanvas } from './ColumnCanvas';
import { CRM_PATH, crmContent as texts } from './content';
import { EventChip } from './EventChip';
import { GridScroll } from './GridScroll';
import type { CalendarView } from './model';
import {
  HOURS_IN_DAY,
  isOffHour,
  lanePlace,
  offsetPercent,
  type HourRange,
  type ScheduleColumn,
} from './schedule';
import styles from './TimeGrid.module.css';

export interface TimeGridProps {
  /** Колонки: дни недели или один день. Собирает их `schedule`. */
  readonly columns: readonly ScheduleColumn[];
  /** Вид — он же остаётся в адресе у ссылок внутри сетки. */
  readonly view: CalendarView;
  /** Часы суток и рабочее окно: к нему сетка прокручена при открытии. */
  readonly range: HourRange;
  /**
   * Минуты от московской полуночи на момент отрисовки: линия «сейчас».
   * Считает их сервер — у контейнера в UTC своего «сейчас» для Тулы нет.
   */
  readonly nowMin: number;
  /** Подпись сетки: у неё роль области, и называться она обязана словами. */
  readonly label: string;
  /**
   * Найденная поиском запись — её подсвечивают, чтобы глаз нашёл её в сетке
   * (issue #132). Признак идёт с адреса и передаётся вниз пропом: чип не
   * должен знать про маршрутизацию.
   */
  readonly focusId?: string | undefined;
}

/** Шапка колонки: день недели, число, занятость и загрузка. */
function Head({ column, view }: { readonly column: ScheduleColumn; readonly view: CalendarView }) {
  const title = (
    <>
      <span className={styles.headWeekday}>{column.weekday}</span>
      <span className={styles.headDate}>{column.date}</span>
    </>
  );

  return (
    <div
      className={[
        styles.head,
        column.today ? styles.headToday : null,
        column.outside ? styles.headOutside : null,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* В неделе шапка ведёт в день: это привычный способ «показать крупнее».
          В самом дне вести некуда — он уже открыт. */}
      {view === 'week' ? (
        <Link
          className={styles.headLink}
          href={{ pathname: CRM_PATH, query: { view: 'day', day: column.day } }}
          aria-label={texts.openDay(column.label)}
          prefetch={false}
        >
          {title}
        </Link>
      ) : (
        <span className={styles.headTitle}>{title}</span>
      )}

      <span className={styles.headMeta}>
        {column.busy.state === 'free' ? null : (
          <span className={styles.headBusy} title={busyTitle(column.busy)}>
            {/* значок, а не только цвет: занятость обязана читаться и в ч/б */}
            <Icon name={column.busy.state === 'full' ? 'danger' : 'clock'} size={11} />
            {column.busy.state === 'full' ? crmBusyContent.fullShort : crmBusyContent.partial}
          </span>
        )}

        {column.loadMin === 0 ? null : (
          <span className={styles.headLoad}>{crmClashContent.load(loadTitle(column.loadMin))}</span>
        )}

        {column.clashes === 0 ? null : (
          <span className={styles.headClash}>
            <Icon name="danger" size={11} />
            {crmClashContent.count(column.clashes)}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * День и неделя — часовая сетка (CRM §3.5.1, ADR-128).
 *
 * 🔴 Позиция и высота записи задаются строго её временем: «занято с 11 до 20»
 * закрашено ровно с 11 до 20. Именно этого владелец в старом календаре и не
 * нашёл.
 *
 * Серверный компонент: страница панели приходит готовой, вид и день живут в
 * адресе, а интерактивны только листья — сама запись, пустое место колонки и
 * полоса прокрутки.
 *
 * 🔴 Легенды слоя занятости здесь нет: список людей переехал в `TeamFilter`
 * (issue #49), где он одновременно и легенда, и управление. Две копии одного
 * списка разошлись бы на первой правке, а в месяце легенды не было вовсе.
 */
export function TimeGrid({ columns, view, range, nowMin, label, focusId }: TimeGridProps) {
  /* Раскладка колонок задаётся числом дней, а не оформлением: тот же шаблон
     нужен шапке, полосе «весь день» и сетке часов — иначе час в одной колонке
     перестаёт быть тем же часом в другой. */
  const template = `var(--cal-rail) repeat(${columns.length}, minmax(0, 1fr))`;
  const offHours = Array.from({ length: HOURS_IN_DAY }, (_, hour) => hour).filter((hour) =>
    isOffHour(range, hour),
  );

  return (
    <section className={styles.grid} aria-label={label}>
      <div className={styles.heads} style={{ gridTemplateColumns: template }}>
        <span className={styles.corner} aria-hidden="true" />
        {columns.map((column) => (
          <Head column={column} key={column.key} view={view} />
        ))}
      </div>

      <AllDayBar
        columns={columns.map((column) => ({ key: column.key, items: column.allDay }))}
        template={template}
        focusId={focusId}
      />

      <GridScroll className={styles.scroll} workFromMin={range.workFromMin} label={texts.hours}>
        <div className={styles.hours} style={{ gridTemplateColumns: template }}>
          <div className={styles.rail} aria-hidden="true">
            {range.hours.map((hour) => (
              <span className={styles.hour} key={hour}>
                {timeOfMinutes(hour * 60)}
              </span>
            ))}
          </div>

          {columns.map((column) => (
            <div
              className={[styles.track, column.outside ? styles.trackOutside : null]
                .filter(Boolean)
                .join(' ')}
              /* Полоса покрывает ровно сутки: и запись, и линия «сейчас», и
                 перевод пикселей в минуты при перетаскивании считают по ней. */
              data-track=""
              key={column.key}
            >
              {/* Клавиатура ходит по часам там, где колонка одна: в неделе
                  сто шестьдесят восемь остановок до первой записи мешали бы
                  больше, чем помогали (см. `ColumnCanvas`). */}
              <ColumnCanvas day={column.day} offHours={offHours} reachable={columns.length === 1} />

              {column.timed.map((placed) => {
                const lane = lanePlace(placed.lane, placed.lanes);

                return (
                  <EventChip
                    item={placed.item}
                    key={placed.item.id}
                    focused={placed.item.id === focusId}
                    place={{
                      topPercent: offsetPercent(placed.item.fromMin),
                      heightPercent:
                        offsetPercent(placed.item.toMin) - offsetPercent(placed.item.fromMin),
                      leftPercent: lane.leftPercent,
                      widthPercent: lane.widthPercent,
                      depth: lane.depth,
                      /* Под «+N» записи оставляют поле справа: иначе имя
                         уезжает под метку и обрывается без многоточия. */
                      crowded: column.more.some(
                        (mark) =>
                          placed.item.fromMin < mark.toMin && mark.fromMin < placed.item.toMin,
                      ),
                    }}
                    draggable
                  />
                );
              })}

              {/* 🔴 Остаток кучки — «+N», а не ещё одна доля ширины (issue
                  #47). Колонка недели около 120px: разделив её надвое, мы
                  оставляем имени тридцать пикселей, и от «Фёдоров» видно
                  «Фе…». Эталон в такой тесноте прячет остаток, а не ужимает
                  содержимое до бесконечности. Ведёт метка в день, где колонка
                  одна на весь экран и помещается всё. */}
              {column.more.map((mark) => (
                <Link
                  className={styles.more}
                  key={mark.key}
                  href={{ pathname: CRM_PATH, query: { view: 'day', day: mark.day } }}
                  style={{ top: `${offsetPercent(mark.fromMin)}%` }}
                  aria-label={mark.label}
                  prefetch={false}
                >
                  {texts.moreCount(mark.count)}
                </Link>
              ))}

              {/* 🔴 Линия «сейчас» — только в колонке сегодняшнего дня
                  (CRM §3.5.1): в остальных она означала бы неправду. */}
              {column.today ? (
                <span
                  className={styles.now}
                  style={{ top: `${offsetPercent(nowMin)}%` }}
                  aria-hidden="true"
                >
                  <span className={styles.nowDot} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </GridScroll>
    </section>
  );
}
