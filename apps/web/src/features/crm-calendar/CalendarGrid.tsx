import Link from 'next/link';

import type { PersonTone } from '@/entities/crm/lib/palette';
import type { WorkTypeTone } from '@/entities/work-type/model';

import { CRM_PATH, WEEKDAYS, crmContent as texts } from './content';
import { EventChip } from './EventChip';
import { monthBands, monthRows, type ScheduleColumn, type ScheduleItem } from './schedule';
import styles from './CalendarGrid.module.css';

/** Сколько записей помещается в клетку до того, как остаток свернётся в «Ещё N». */
const VISIBLE = 3;

/** Дней в неделе: ряд месячной сетки. */
const WEEK_DAYS = 7;

/**
 * Краска человека → класс модуля. Прямой перевод, а не сборка имени строкой:
 * так линтер видит, что все шесть классов используются.
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
 * Краска вида работ → класс модуля. Прямой перевод, а не сборка имени
 * строкой: так линтер видит, что все семь классов используются, а краска,
 * которой в модуле нет, не даёт запись без оформления (ADR-343).
 */
const TONE_CLASS: Record<WorkTypeTone, string> = {
  accent: styles.toneAccent ?? '',
  info: styles.toneInfo ?? '',
  ok: styles.toneOk ?? '',
  warn: styles.toneWarn ?? '',
  sale: styles.toneSale ?? '',
  error: styles.toneError ?? '',
  neutral: styles.toneNeutral ?? '',
};

/** Краска точки — та же, что у записи: человек из слоя перебивает вид работ. */
function dotClass(item: ScheduleItem): string {
  return item.person === null ? TONE_CLASS[item.tone] : PERSON_CLASS[item.person.tone];
}

export interface CalendarGridProps {
  /** Сорок две клетки месячной сетки. Собирает их `monthColumns`. */
  readonly columns: readonly ScheduleColumn[];
  /** Подпись сетки: у неё роль области, и называться она обязана словами. */
  readonly label?: string | undefined;
  /**
   * Найденная поиском запись — её подсвечивают, чтобы глаз нашёл её в сетке
   * (issue #132). Признак идёт с адреса и передаётся вниз пропом: чип не
   * должен знать про маршрутизацию.
   */
  readonly focusId?: string | undefined;
}

/**
 * Месяц — обзор, а не планировщик (ADR-128).
 *
 * 🔴 Часовой сетки здесь нет намеренно: в клетке высотой в сотню точек
 * честного времени не нарисовать, а нечестное хуже отсутствующего. Зато время
 * показывается всегда — строкой «цветная точка · время · название». Капсулы с
 * инициалами, из которых не следует, когда человек занят, владелец забраковал
 * прямо.
 *
 * 🔴 Ниже 600px клетка показывает точки, а не строки — решение владельца по
 * issue #547. Семь дней в 390px дают 43px на клетку, а голова строки — час со
 * значком — занимает 59: строка переливалась за край в любом виде, и резать
 * было уже нечего. У эталона (Apple Calendar) в тесной клетке тоже точки;
 * точка не обрезается вовсе, а подробности открываются нажатием на день.
 *
 * Серверный компонент: клетки приходят готовыми, интерактивна только запись.
 */
export function CalendarGrid({ columns, label = texts.gridLabel, focusId }: CalendarGridProps) {
  /* 🔴 Многодневная отлучка идёт сплошной плашкой через свои дни, а не
     повторяется словом «Отпуск» в каждой клетке (ADR-165). Плашка лежит в той
     же сетке, что и клетки, поэтому она перекрывает и зазоры между ними —
     ровно этим она и читается как одна запись, а не как четырнадцать. */
  const bands = monthBands(columns).filter((band) => band.item.span !== null);

  /* Сколько дорожек занято плашками в каждом ряду: под них клетка отводит
     место, иначе плашка накрыла бы собственные строки дня. */
  const lanesOf = (index: number): number =>
    bands
      .filter((band) => band.row === Math.floor(index / WEEK_DAYS))
      .reduce((max, band) => Math.max(max, band.lane + 1), 0);

  return (
    <section className={styles.grid} aria-label={label}>
      <div className={styles.weekdays} aria-hidden="true">
        {WEEKDAYS.map((title) => (
          <span className={styles.weekday} key={title}>
            {title}
          </span>
        ))}
      </div>

      <div className={styles.days}>
        {columns.map((column, index) => {
          const rows = monthRows(column);
          const lanes = lanesOf(index);

          /* Запись, ушедшая в плашку, из строк убирается: иначе она стоит в
             клетке дважды — плашкой и строкой под ней. В точках на телефоне
             она остаётся: там плашек нет вовсе, и потерять отлучку нельзя. */
          const plain = rows.filter((item) => item.span === null);
          const shown = plain.slice(0, Math.max(VISIBLE - lanes, 0));
          const rest = plain.length - shown.length;

          /* Точки на телефоне считают всё, что в дне есть, — плашки там нет, и
             отлучка обязана остаться видной (issue #547). */
          const dots = rows.slice(0, VISIBLE);
          const restDots = rows.length - dots.length;

          return (
            /* Клетка — не ссылка: внутри неё лежат записи, а ссылка внутри
               ссылки недопустима. Переход в день даёт число дня и «Ещё N». */
            <div
              className={[
                styles.cell,
                column.outside ? styles.outside : null,
                column.today ? styles.today : null,
              ]
                .filter(Boolean)
                .join(' ')}
              key={column.key}
              /* 🔴 Клетка стоит в сетке явно, а не автоматической раскладкой.
                 Плашка отлучки занимает свои ячейки, и автораскладка обходила
                 бы занятое: клетки поехали бы вправо, и месяц перестал бы
                 совпадать с календарём. */
              style={{
                gridRow: Math.floor(index / WEEK_DAYS) + 1,
                gridColumn: (index % WEEK_DAYS) + 1,
              }}
            >
              {/* 🔴 Подпись называет число записей и требующие внимания
                  словами (issue #547). Точка ничего не сообщает ни
                  скринридеру, ни человеку, который не различает цвета, а на
                  телефоне она — единственное, что в клетке остаётся. */}
              <Link
                className={styles.number}
                href={{ pathname: CRM_PATH, query: { view: 'day', day: column.day } }}
                aria-label={texts.openDay(column.label)}
                prefetch={false}
              >
                <span className={styles.date}>{column.date}</span>

                {rows.length === 0 ? null : (
                  <span className={styles.dots} aria-hidden="true">
                    {dots.map((item) => (
                      <span
                        className={[
                          styles.dot,
                          dotClass(item),
                          item.clash || item.overtimeMin > 0 ? styles.alert : null,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        key={item.id}
                      />
                    ))}
                    {restDots > 0 ? <span className={styles.rest}>{`+${restDots}`}</span> : null}
                  </span>
                )}
              </Link>

              {/* Место под плашки — настоящие элементы, а не отступ на глаз:
                  плашка лежит в сетке поверх клетки, и высота под неё обязана
                  считаться тем же числом дорожек. Их столько же у всех клеток
                  ряда, иначе строки дня встают лесенкой. */}
              {Array.from({ length: lanes }, (_, lane) => (
                <span className={styles.bandRoom} key={lane} aria-hidden="true" />
              ))}

              {shown.length === 0 ? null : (
                <ul className={styles.rows}>
                  {shown.map((item) => (
                    <li className={styles.row} key={item.id}>
                      <EventChip item={item} variant="row" focused={item.id === focusId} />
                    </li>
                  ))}
                </ul>
              )}

              {rest > 0 ? (
                <Link
                  className={styles.more}
                  href={{ pathname: CRM_PATH, query: { view: 'day', day: column.day } }}
                  prefetch={false}
                >
                  {texts.moreEvents(rest)}
                </Link>
              ) : null}
            </div>
          );
        })}

        {/* 🔴 Плашки идут последними: они лежат поверх клеток и перекрывают
            зазоры между ними — иначе отпуск на неделю читается как семь
            одинаковых записей подряд (ADR-165). */}
        {bands.map((band) => (
          <div
            className={[
              styles.band,
              band.clippedStart ? styles.fromEarlier : null,
              band.clippedEnd ? styles.toLater : null,
            ]
              .filter(Boolean)
              .join(' ')}
            /* Признак для проверок раскладки: плашка отличается от клетки не
               оформлением, а тем, что она плашка. */
            data-band=""
            key={band.key}
            style={{
              gridRow: band.row + 1,
              gridColumn: `${band.from + 1} / span ${band.span}`,
              marginTop: `calc(var(--cal-band-top) + ${band.lane} * var(--cal-band-step))`,
            }}
          >
            <EventChip item={band.item} variant="row" focused={band.item.id === focusId} />
          </div>
        ))}
      </div>
    </section>
  );
}
