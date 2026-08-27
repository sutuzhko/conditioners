import Link from 'next/link';

import { timeOfMinutes } from '@/entities/crm/lib/busy';
import type { PersonTone } from '@/entities/crm/lib/palette';
import { busyTitle, crmBusyContent, crmClashContent, loadTitle } from '@/entities/crm/content';
import { Icon } from '@/shared/ui';

import { CRM_PATH, ORDERS_PATH, crmContent as texts } from './content';
import type { CalendarView } from './model';
import {
  hourRangeOf,
  offsetPercent,
  type HourRange,
  type ScheduleColumn,
  type ScheduleItem,
  type SchedulePersonMark,
} from './schedule';
import styles from './TimeGrid.module.css';

export interface TimeGridProps {
  /** Колонки: дни недели или один день. Собирает их `schedule`. */
  readonly columns: readonly ScheduleColumn[];
  /** Вид — он же остаётся в адресе у ссылок внутри сетки. */
  readonly view: CalendarView;
  /**
   * Минуты от московской полуночи на момент отрисовки: линия «сейчас».
   * Считает их сервер — у контейнера в UTC своего «сейчас» для Тулы нет.
   */
  readonly nowMin: number;
  /** Подпись сетки: у неё роль области, и называться она обязана словами. */
  readonly label: string;
  /**
   * Легенда наложения занятости команды: кто каким цветом (ADR-123). Пусто —
   * переключатель выключен. 🔴 Цвет не единственный признак: в легенде и на
   * записях стоят инициалы, а в подписи — имя целиком.
   */
  readonly team?: readonly SchedulePersonMark[] | undefined;
}

/** Ниже этой доли окна подпись в записи уже не читается. */
const MIN_SPAN_PERCENT = 3;

/**
 * Краска человека → класс модуля. Прямой перевод, а не сборка имени строкой:
 * так линтер видит, что все шесть классов используются, а неизвестная краска
 * не даёт запись без оформления.
 */
const PERSON_CLASS: Record<PersonTone, string> = {
  a: styles.personA ?? '',
  b: styles.personB ?? '',
  c: styles.personC ?? '',
  d: styles.personD ?? '',
  e: styles.personE ?? '',
  f: styles.personF ?? '',
};

/**
 * Строка ведёт в свою сущность: наряд — в свою карточку, дело открывается в
 * панели выбранного дня. 🔴 Это второе следствие ADR-093: раз наряд и дело
 * разные сущности, они и правятся в разных местах.
 */
function hrefOf(item: ScheduleItem, view: CalendarView) {
  if (item.entity === 'order') return { pathname: `${ORDERS_PATH}/${item.id}` };

  return { pathname: CRM_PATH, query: { view, day: item.day }, hash: `event-${item.id}` };
}

/** Оформление записи: краска человека перебивает краску вида работ (ADR-123). */
function chipClass(item: ScheduleItem, compact: boolean): string {
  return [
    styles.chip,
    item.person === null ? styles[item.tone] : PERSON_CLASS[item.person.tone],
    item.entity === 'order' ? styles.order : null,
    item.entity === 'event' ? styles.event : null,
    item.entity === 'block' ? styles.block : null,
    item.muted ? styles.muted : null,
    item.clash ? styles.clash : null,
    compact ? styles.compact : null,
  ]
    .filter(Boolean)
    .join(' ');
}

/** Содержимое записи — одинаковое у ссылки и у неинтерактивной отлучки. */
function ChipBody({ item }: { readonly item: ScheduleItem }) {
  return (
    <>
      <span className={styles.chipHead} aria-hidden="true">
        <Icon className={styles.chipIcon} name={item.icon} size={12} />
        <span className={styles.chipTime}>{item.time}</span>
        {item.number === null ? null : (
          <span className={styles.chipNumber}>{`№ ${item.number}`}</span>
        )}
        {/* Инициалы рядом с краской: цвет не может быть единственным признаком
            человека — при дальтонизме и в ч/б от него ничего не остаётся. */}
        {item.person === null ? null : (
          <span className={styles.chipWho}>{item.person.initials}</span>
        )}
      </span>

      <span className={styles.chipName} aria-hidden="true">
        {item.title}
      </span>

      {item.note === null ? null : (
        <span className={styles.chipNote} aria-hidden="true">
          {item.note}
        </span>
      )}

      {item.clash ? (
        <span className={styles.chipClash} aria-hidden="true">
          <Icon name="danger" size={11} />
          {crmClashContent.mark}
        </span>
      ) : null}
    </>
  );
}

/**
 * Запись в сетке.
 *
 * 🔴 Наряд отличается от дела не только цветом: номер в подписи, сплошная
 * полоса слева вместо пунктирной и слово «Наряд» в подписи для скринридера.
 * В монохромном режиме и у дальтоника различие остаётся.
 */
function Chip({
  item,
  view,
  compact,
}: {
  readonly item: ScheduleItem;
  readonly view: CalendarView;
  readonly compact: boolean;
}) {
  /* Чужая отлучка никуда не ведёт: это чужие семейные дела, открывать в них
     нечего, и ссылка обещала бы переход, которого нет. */
  if (item.entity === 'block') {
    return (
      <span className={chipClass(item, compact)} role="img" aria-label={item.label}>
        <ChipBody item={item} />
      </span>
    );
  }

  return (
    <Link
      className={chipClass(item, compact)}
      href={hrefOf(item, view)}
      aria-label={item.label}
      prefetch={false}
    >
      <ChipBody item={item} />
    </Link>
  );
}

/** Шапка колонки: подпись, занятость и загрузка человека. */
function Head({
  column,
  view,
  gridColumn,
}: {
  readonly column: ScheduleColumn;
  readonly view: CalendarView;
  /** Номер колонки в сетке: `.col` раскрыт в `display: contents`. */
  readonly gridColumn?: number | undefined;
}) {
  /* Пометки «сегодня» и «выбранный» имеют смысл только там, где колонки —
     разные дни. В видах «день» и «по монтажникам» день один и назван в
     заголовке, а подчёркнутыми оказались бы все колонки разом. */
  const marks = view === 'week';

  const title =
    view === 'week' ? (
      <Link
        className={styles.headLink}
        href={{ pathname: CRM_PATH, query: { view: 'day', day: column.day } }}
        prefetch={false}
      >
        {column.title}
      </Link>
    ) : (
      <span className={styles.headTitle}>{column.title}</span>
    );

  return (
    <div
      className={[
        styles.head,
        marks && column.today ? styles.headToday : null,
        marks && column.selected ? styles.headSelected : null,
        column.outside ? styles.headOutside : null,
      ]
        .filter(Boolean)
        .join(' ')}
      style={gridColumn === undefined ? undefined : { gridColumn }}
    >
      {title}

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
 * Сетка часов: неделя колонками дней, день одной колонкой, загрузка
 * монтажников колонкой на человека — CRM.md §3.5 и §8.5.
 *
 * Серверный компонент: страница панели приходит готовой, а вид и день живут в
 * адресе, поэтому переходы — ссылки, а не состояние на клиенте (ADR-080).
 *
 * На узком экране колонок больше одной не помещается ни при какой вёрстке,
 * поэтому там показывается не ужатая сетка, а список по дням: то же
 * содержимое, читаемое без горизонтальной прокрутки. Обе разметки выдаёт
 * сервер, лишнюю прячет CSS — выбор по ширине в JS дал бы расхождение
 * гидратации (ADR-082).
 */
export function TimeGrid({ columns, view, nowMin, label, team = [] }: TimeGridProps) {
  const range: HourRange = hourRangeOf(columns);
  const many = columns.length > 1;
  const hasUntimed = columns.some((column) => column.untimed.length > 0);
  const firstToday = columns.findIndex((column) => column.today);

  return (
    <section
      className={[styles.grid, many ? styles.many : styles.single].filter(Boolean).join(' ')}
      aria-label={label}
    >
      {team.length === 0 ? null : (
        <ul className={styles.legend} aria-label={texts.teamLegend}>
          {team.map((person) => (
            <li className={styles.legendItem} key={person.id}>
              <span className={`${styles.legendMark} ${PERSON_CLASS[person.tone]}`}>
                {person.initials}
              </span>
              {person.title}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.body}>
        <span className={styles.railLabel} aria-hidden="true">
          {texts.hours}
        </span>

        {hasUntimed ? (
          <span className={styles.spareLabel} aria-hidden="true">
            {texts.untimed}
          </span>
        ) : null}

        <div className={styles.rail} aria-hidden="true">
          {range.hours.map((hour) => (
            <span className={styles.hour} key={hour}>
              {timeOfMinutes(hour * 60)}
            </span>
          ))}
        </div>

        {columns.map((column, index) => (
          /* `display: contents`: шапка, группа без времени и полоса часов
             встают в свои строки общей сетки — иначе колонки разъезжаются по
             высоте, и час в одной колонке перестаёт быть тем же часом в другой. */
          <div className={styles.col} key={column.key}>
            <Head column={column} view={view} gridColumn={index + 2} />

            {hasUntimed ? (
              /* Список, а не набор ссылок: у группы «без времени» должно быть
                 имя и счёт — скринридер объявляет «список из двух». */
              <ul
                className={styles.spare}
                aria-label={texts.untimed}
                style={{ gridColumn: index + 2 }}
              >
                {column.untimed.map((item) => (
                  <li className={styles.spareItem} key={item.id}>
                    <Chip item={item} view={view} compact />
                  </li>
                ))}
              </ul>
            ) : null}

            <div
              className={[styles.track, column.outside ? styles.trackOutside : null]
                .filter(Boolean)
                .join(' ')}
              /* Номер колонки — свойство раскладки, а не оформления: он
                 вычисляется из порядка данных, а цвета остаются в модуле. */
              style={{ gridColumn: index + 2 }}
            >
              {range.hours.map((hour) => (
                <span className={styles.line} key={hour} aria-hidden="true" />
              ))}

              {column.timed.map((placed) => {
                const from = offsetPercent(range, placed.item.fromMin);
                const span = Math.max(
                  offsetPercent(range, placed.item.toMin) - from,
                  MIN_SPAN_PERCENT,
                );
                const width = 100 / placed.lanes;

                return (
                  <div
                    className={styles.slot}
                    key={placed.item.id}
                    style={{
                      top: `${from}%`,
                      height: `${span}%`,
                      left: `${width * placed.lane}%`,
                      width: `${width}%`,
                    }}
                  >
                    <Chip item={placed.item} view={view} compact={false} />
                  </div>
                );
              })}

              {column.today && nowMin >= range.fromMin && nowMin <= range.toMin ? (
                <span
                  className={styles.now}
                  style={{ top: `${offsetPercent(range, nowMin)}%` }}
                  aria-hidden="true"
                >
                  {/* Время подписывается один раз: в виде «по монтажникам»
                      сегодня во всех колонках, и четыре одинаковых значка
                      только загораживали бы записи. */}
                  {index === firstToday ? (
                    <span className={styles.nowTime}>{timeOfMinutes(nowMin)}</span>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {/* Узкий экран: те же записи списком по колонкам. Сетка в семь колонок на
          375 нечитаема при любой вёрстке, а прятать половину дня нельзя. */}
      {many ? (
        <ul className={styles.agenda}>
          {columns.map((column) => (
            <li className={styles.agendaDay} key={column.key}>
              <Head column={column} view={view} />

              {column.untimed.length + column.timed.length === 0 ? (
                <p className={styles.agendaEmpty}>{texts.columnEmpty}</p>
              ) : (
                <ul className={styles.agendaItems}>
                  {column.untimed.map((item) => (
                    <li key={item.id}>
                      <Chip item={item} view={view} compact />
                    </li>
                  ))}
                  {column.timed.map((placed) => (
                    <li key={placed.item.id}>
                      <Chip item={placed.item} view={view} compact />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
