import Link from 'next/link';

import { loadTitle } from '@/entities/crm/content';
import type { PersonTone } from '@/entities/crm/lib/palette';
import { Icon } from '@/shared/ui';

import { CRM_PATH, KIND_FILTER_TITLE, crmContent as texts, windowTitle } from './content';
import { SCHEDULE_KINDS, type ScheduleKind } from './model';
import { kindsQuery, whoQuery, type CalendarPlace } from './navigation';
import { DEFAULT_WORK_WINDOW, type SchedulePersonMark } from './schedule';
import styles from './TeamFilter.module.css';

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

/** Краска вида записи — та же, что у макета: наряд, заявка, всё остальное. */
const KIND_CLASS: Record<ScheduleKind, string> = {
  orders: styles.kindOrders ?? '',
  leads: styles.kindLeads ?? '',
  notes: styles.kindNotes ?? '',
};

export interface TeamFilterProps {
  /** Где мы сейчас: из места собираются все адреса фильтра. */
  readonly place: CalendarPlace;
  /** Люди слоя с закреплённой краской — их же список служит легендой. */
  readonly team: readonly SchedulePersonMark[];
  /** Часы каждого за показанный промежуток. Считает `teamLoad`. */
  readonly load?: ReadonlyMap<string, number> | undefined;
  /**
   * Рабочее окно в минутах от полуночи — подвал карточки (ADR-138). Не
   * передали — умолчание настройки: истории и тесты в базу не ходят.
   */
  readonly workFromMin?: number | undefined;
  readonly workToMin?: number | undefined;
}

/** Галочка макета: заливка краской, когда включено, и пустой контур, когда нет. */
function Box({ on, className }: { readonly on: boolean; readonly className: string }) {
  return (
    <span className={[styles.box, on ? className : null].filter(Boolean).join(' ')}>
      {on ? <Icon name="check" size={13} /> : null}
    </span>
  );
}

/**
 * Карточка «Показывать» — ADR-123, issue #49, макет `design/admin/Calendar.body.html`.
 *
 * 🔴 Список имён здесь и легенда, и управление разом, и отдельного
 * переключателя слоя над сеткой нет: галочка человека и есть слой. Слой,
 * включаемый целиком, на пяти монтажниках даёт ту же кашу, ради которой он и
 * затевался, — владелец спрашивает «кто свободен в четверг в десять», а
 * получает сетку, из которой лишнее приходится вычитать глазами.
 *
 * 🔴 Оба крайних состояния берутся одним нажатием: «Только» рядом с человеком
 * и галочка вида записей. Обход списка по одному был бы не фильтром, а
 * наказанием — это основной сценарий планирования дня.
 *
 * Серверный компонент: состав живёт в адресе (`?team=on&who=…&kinds=…`),
 * поэтому каждое переключение — ссылка, и открытый экран переживает
 * обновление страницы и пересылку.
 */
export function TeamFilter({
  place,
  team,
  load,
  workFromMin = DEFAULT_WORK_WINDOW.fromMin,
  workToMin = DEFAULT_WORK_WINDOW.toMin,
}: TeamFilterProps) {
  /* Выбор снимается в локальные переменные: сужение по `null` переживает
     границу колбэка только у константы, а не у свойства объекта. */
  const who = place.who;
  const kinds = place.kinds;

  const all = team.map((person) => person.id);
  const shown = place.team ? (who === null ? all : all.filter((id) => who.includes(id))) : [];
  const kindsShown =
    kinds === null ? SCHEDULE_KINDS : SCHEDULE_KINDS.filter((k) => kinds.includes(k));

  return (
    <section className={styles.card} aria-label={texts.filterLabel}>
      {team.length === 0 ? null : (
        <>
          <p className={styles.cap}>{texts.filterPeople}</p>

          <ul className={styles.list}>
            {team.map((person) => {
              const visible = shown.includes(person.id);
              const next = visible ? shown.filter((id) => id !== person.id) : [...shown, person.id];
              const minutes = load?.get(person.id) ?? 0;

              /* «Только он» показывается там, где сужает выбор: у одного
                 оставшегося сужать нечего, а с выключенным слоем то же самое
                 делает его собственная галочка. */
              const canSolo = shown.length > 1 || (!visible && shown.length > 0);

              return (
                <li className={styles.row} key={person.id}>
                  <Link
                    className={[styles.line, visible ? null : styles.off].filter(Boolean).join(' ')}
                    href={{
                      pathname: CRM_PATH,
                      /* Список сохраняет порядок команды: тот же выбор обязан
                         давать тот же адрес, иначе кнопка «назад» ведёт на
                         экран, отличающийся только перестановкой номеров. */
                      query: whoQuery(
                        place,
                        all.filter((id) => next.includes(id)),
                      ),
                    }}
                    aria-pressed={visible}
                    aria-label={
                      visible
                        ? next.length === 0
                          ? texts.filterNobody
                          : texts.filterHide(person.title)
                        : texts.filterShow(person.title)
                    }
                    prefetch={false}
                  >
                    {/* 🔴 Галочка красится краской человека — она же легенда:
                        цвет не единственный признак, рядом стоит имя целиком
                        (WCAG 1.4.1, ADR-123). */}
                    <Box on={visible} className={PERSON_CLASS[person.tone]} />
                    {/* Видимое имя короткое, полное остаётся в подписи
                        действия: колонка 240px делится на четыре части. */}
                    <span className={styles.name}>{person.short}</span>
                    <span className={styles.hours}>
                      {minutes === 0 ? texts.filterIdle : loadTitle(minutes)}
                    </span>
                  </Link>

                  {/* «Только он» — крайнее состояние одним нажатием. У
                      последнего оставшегося его нет: нажимать не на что. */}
                  {canSolo ? (
                    <Link
                      className={styles.only}
                      href={{ pathname: CRM_PATH, query: whoQuery(place, [person.id]) }}
                      aria-label={texts.filterOnlyOf(person.title)}
                      prefetch={false}
                    >
                      {texts.filterOnly}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <hr className={styles.rule} />
        </>
      )}

      <p className={styles.cap}>{texts.filterKinds}</p>

      <ul className={styles.list}>
        {SCHEDULE_KINDS.map((kind) => {
          const visible = kindsShown.includes(kind);
          const next = visible
            ? kindsShown.filter((entry) => entry !== kind)
            : [...kindsShown, kind];
          const title = KIND_FILTER_TITLE[kind];

          return (
            <li className={styles.row} key={kind}>
              <Link
                className={[styles.line, visible ? null : styles.off].filter(Boolean).join(' ')}
                href={{
                  pathname: CRM_PATH,
                  query: kindsQuery(
                    place,
                    SCHEDULE_KINDS.filter((entry) => next.includes(entry)),
                  ),
                }}
                aria-pressed={visible}
                aria-label={visible ? texts.kindHide(title) : texts.kindShow(title)}
                prefetch={false}
              >
                <Box on={visible} className={KIND_CLASS[kind]} />
                <span className={styles.name}>{title}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <hr className={styles.rule} />

      {/* 🔴 Рабочее окно и переработка — из настройки, а не из кода (ADR-138):
          владелец сдвигает начало дня на лето, и подпись едет за ним. */}
      <p className={styles.window}>
        <span className={styles.windowLabel}>{texts.windowTitle}</span>
        <span className={styles.windowValue}>{windowTitle(workFromMin, workToMin)}</span>
      </p>

      <p className={styles.note}>{texts.overtimeNote}</p>
    </section>
  );
}
