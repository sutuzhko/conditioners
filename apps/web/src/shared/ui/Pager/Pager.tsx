import Link from 'next/link';

import styles from './Pager.module.css';

export interface PagerProps {
  /** Текущая страница, считая с единицы. */
  readonly page: number;
  /** Всего страниц. Одна — компонент не показывается вовсе. */
  readonly pages: number;
  /** Адрес списка: `/admin/clients`. */
  readonly basePath: string;
  /** Что сохраняется при переходе — поиск, выбранный фильтр. */
  readonly query?: Readonly<Record<string, string>> | undefined;
  readonly label?: string;
  /** Видимое слово шага назад. Только вне полосы номеров: в панели шаг — шеврон. */
  readonly prevLabel?: string;
  readonly nextLabel?: string;
  /** Имя шага для озвучки в полосе номеров: шеврон сам по себе не имя. */
  readonly prevPageLabel?: string;
  readonly nextPageLabel?: string;
  /** Подпись положения: «2 из 7». */
  readonly position?: ((page: number, pages: number) => string) | undefined;
  /**
   * Полоса номеров страниц между шагами (макет, issue #602).
   *
   * 🔴 Проп — это выбор контура, а не украшение. Полосу номеров показывают все
   * восемь списков панели и не показывает ни один экран витрины: там разбивка
   * остаётся тремя пилюлями со словами, потому что стоит под каталогом на
   * длинной странице и читается текстом, а не сеткой номеров. Отсюда и
   * геометрия: с полосой ряд собран по макету панели — одинаковые ячейки
   * 32×32 с радиусом `--r-pager`; без полосы остаётся язык витрины (issue
   * #748).
   */
  readonly numbers?: boolean | undefined;
  /** Имя ссылки на страницу для озвучки: «Страница 3». */
  readonly pageLabel?: ((page: number) => string) | undefined;
  /**
   * Что читалка слышит после перехода: «Показана страница 3 из 9».
   *
   * 🔴 Отдельно от `position` и словами, а не цифрами. Подпись положения —
   * надпись в ряду: её видно, вокруг неё два шага, и «3 из 9» там понятно.
   * Объявление звучит без ряда вокруг и в момент, когда на экране не
   * шевельнулось ничего, — оно обязано сказать, что именно произошло.
   */
  readonly announce?: ((page: number, pages: number) => string) | undefined;
}

/**
 * Какие номера показывать: края всегда, вокруг текущего — по соседу с каждой
 * стороны, разрывы — многоточием.
 *
 * 🔴 Не вся лента подряд. Восемь записей на страницу дают двадцать шесть
 * страниц уже на второй сотне клиентов, и полный ряд номеров превращается в
 * ленту, по которой всё равно никто не целится: ищут поиском, листают
 * соседей. Края нужны, чтобы прыжок в начало и конец стоил одного нажатия.
 */
export function pageWindowNumbers(page: number, pages: number): readonly (number | 'gap')[] {
  const shown = new Set<number>([1, pages, page - 1, page, page + 1]);
  const inRange = [...shown].filter((value) => value >= 1 && value <= pages).sort((a, b) => a - b);

  const items: (number | 'gap')[] = [];
  let previous = 0;

  for (const value of inRange) {
    /* Разрыв в одну страницу многоточием не сворачивается: «1 … 3» занимает
       столько же места, сколько «1 2 3», и прячет доступную страницу. */
    if (previous !== 0 && value - previous > 1) items.push('gap');
    items.push(value);
    previous = value;
  }

  return items;
}

/**
 * Разбивка длинного списка на страницы.
 *
 * 🔴 Ссылками, а не состоянием на клиенте: страница остаётся в адресе, её
 * можно сохранить и прислать, а сам компонент не стоит ни килобайта в бюджете
 * JS — списки панели рендерит сервер.
 *
 * 🔴 Разбивка в панели одна на все списки (issue #748). До этой правки их было
 * три: кит, подвал склада со своими ступенями шага и целиком свой пагинатор
 * заказов с третьим радиусом и своим окном номеров. Владелец увидел результат
 * на сводке и назвал его прямо: «на каждой странице своя». Своих реализаций
 * больше нет — есть этот компонент и ступень шага `PageSize` рядом с ним.
 *
 * 🔴 Все ячейки ряда — одна коробка (issue #748). Раньше в одном ряду стояли
 * три разных вида: шаг — обведённая пилюля со словом, номер — пилюля без
 * рамки, текущая страница — залитая пилюля с другим внутренним полем (14px
 * против 8px у номера). Форма сообщает «это элемент другого назначения», и
 * текущая страница читалась кнопкой, а не номером. Теперь она отличается
 * заливкой и весом — тем, чем и должна.
 *
 * 🔴 Шаги в полосе номеров — шевроны, как в макете (`.pg`, `_base.css`), а
 * имя им даёт `aria-label`. Родного `title` на них нет намеренно: подсказка
 * браузера появляется через секунду, не приходит по фокусу и не гасится по
 * Escape (та же причина, что у действий строки таблицы, ADR-159).
 *
 * 🔴 Переход не двигает прокрутку (issue #735). Умолчание Next — бросить
 * документ в начало, потому что обычно смена адреса означает другую страницу;
 * у разбивки она означает другое содержимое того же блока, и прыжок наверх
 * уносил из-под глаз тот самый список, ради которого нажали «Дальше».
 *
 * Вместе с прокруткой Next гасит и перевод фокуса в начало документа
 * (`focusAndScrollRef.apply` в `layout-router`), поэтому фокус остаётся на
 * нажатом шаге, а о смене страницы сообщает область `role="status"`.
 */
export function Pager({
  page,
  pages,
  basePath,
  query,
  label = 'Страницы списка',
  prevLabel = 'Назад',
  nextLabel = 'Дальше',
  prevPageLabel = 'Предыдущая страница',
  nextPageLabel = 'Следующая страница',
  position = (current, total) => `${current} из ${total}`,
  numbers = false,
  pageLabel = (target) => `Страница ${target}`,
  announce = (current, total) => `Показана страница ${current} из ${total}`,
}: PagerProps) {
  if (pages <= 1) return null;

  const href = (target: number): { pathname: string; query: Record<string, string> } => ({
    pathname: basePath,
    /* Первая страница живёт по чистому адресу: `?page=1` в ссылке, которую
       владелец кому-то пришлёт, — лишний параметр без смысла. */
    query: { ...query, ...(target > 1 ? { page: String(target) } : {}) },
  });

  /* 🔴 Полоса номеров ужимается на телефоне, а не переносится (issue #653).
     Пять номеров, два многоточия и два шага требуют больше места, чем есть в
     колонке 256 на ширине 320: ряд вставал в три строки и упирался в соседний
     блок подвала. Ниже 600px остаются два шага и подпись положения — то, чем
     на телефоне и листают. Отступление от макета записано в PIXEL_SPEC. */
  const pagerClass = numbers ? `${styles.pager} ${styles.compact}` : styles.pager;

  return (
    <nav className={pagerClass} aria-label={label}>
      {page > 1 ? (
        <Link
          className={styles.step}
          href={href(page - 1)}
          rel="prev"
          scroll={false}
          aria-label={numbers ? prevPageLabel : undefined}
        >
          {numbers ? <span aria-hidden="true">‹</span> : `← ${prevLabel}`}
        </Link>
      ) : (
        /* Край списка: шаг остаётся на месте, чтобы номера не прыгали вбок.
           Целью он больше не является, и в полосе номеров озвучке не нужен
           вовсе — шеврон без ссылки ей нечего сказать. */
        <span className={styles.stepOff} aria-hidden={numbers || undefined}>
          {numbers ? '‹' : `← ${prevLabel}`}
        </span>
      )}

      {numbers ? (
        <>
          <span className={styles.count}>{position(page, pages)}</span>

          <ol className={styles.numbers}>
            {pageWindowNumbers(page, pages).map((item, index) =>
              item === 'gap' ? (
                /* Многоточие — не цель: оно сообщает о пропуске, а не ведёт
                 никуда, и из табуляции выпадает вместе с ролью ссылки. */
                <li className={styles.gap} key={`gap-${index}`} aria-hidden="true">
                  …
                </li>
              ) : (
                <li key={item}>
                  {item === page ? (
                    /* Текущая страница — не ссылка: переход на самого себя
                       ничего не делает, а озвучка объявила бы его обычной
                       целью. */
                    <span className={styles.current} aria-current="page">
                      {item}
                    </span>
                  ) : (
                    <Link
                      className={styles.number}
                      href={href(item)}
                      aria-label={pageLabel(item)}
                      scroll={false}
                    >
                      {item}
                    </Link>
                  )}
                </li>
              ),
            )}
          </ol>
        </>
      ) : (
        <span className={styles.position}>{position(page, pages)}</span>
      )}

      {page < pages ? (
        <Link
          className={styles.step}
          href={href(page + 1)}
          rel="next"
          scroll={false}
          aria-label={numbers ? nextPageLabel : undefined}
        >
          {numbers ? <span aria-hidden="true">›</span> : `${nextLabel} →`}
        </Link>
      ) : (
        <span className={styles.stepOff} aria-hidden={numbers || undefined}>
          {numbers ? '›' : `${nextLabel} →`}
        </span>
      )}

      {/* 🔴 Смена страницы объявляется, потому что видимого события больше нет
          (issue #735). Пока переход бросал экран наверх, читалка теряла место
          вместе с глазом, но хотя бы получала новую страницу под курсором;
          с погашенной прокруткой не меняется ничто, кроме содержимого блока,
          и молчание здесь означало бы, что человек не знает о переходе вовсе.

          Область живёт в разметке всегда, а не появляется в момент перехода:
          вставленную вместе с текстом читалки не объявляют (тот же приём и та
          же причина, что у `CopyField`). */}
      <p className="srOnly" role="status" aria-live="polite" aria-atomic="true">
        {announce(page, pages)}
      </p>
    </nav>
  );
}
