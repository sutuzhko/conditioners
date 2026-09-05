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
  readonly prevLabel?: string;
  readonly nextLabel?: string;
  /** Подпись положения: «2 из 7». */
  readonly position?: ((page: number, pages: number) => string) | undefined;
  /**
   * Полоса номеров страниц между шагами (макет, issue #602).
   *
   * 🔴 Проп, а не поведение по умолчанию, и это временно. Полосу требует макет
   * во всех списках панели, но разделы приходят к нему разными вехами и
   * разными руками: включённая разом, она сдвинула бы геометрию шести списков
   * сразу, включая те, которые правит кто-то другой. Умолчание переключается
   * одним движением, когда к макету придёт последний раздел.
   */
  readonly numbers?: boolean | undefined;
  /** Имя ссылки на страницу для озвучки: «Страница 3». */
  readonly pageLabel?: ((page: number) => string) | undefined;
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
 * По умолчанию — соседние страницы и подпись положения: восемь записей на
 * страницу дают десятки страниц уже на второй сотне клиентов, и полная лента
 * номеров была бы рядом, по которому никто не целится.
 *
 * 🔴 `numbers` включает полосу из макета — но не всю ленту, а края, соседей
 * текущей страницы и многоточия на разрывах (`pageWindowNumbers`). Так прыжок
 * в начало и в конец стоит одного нажатия, а ряд остаётся коротким при любом
 * числе страниц.
 */
export function Pager({
  page,
  pages,
  basePath,
  query,
  label = 'Страницы списка',
  prevLabel = 'Назад',
  nextLabel = 'Дальше',
  position = (current, total) => `${current} из ${total}`,
  numbers = false,
  pageLabel = (target) => `Страница ${target}`,
}: PagerProps) {
  if (pages <= 1) return null;

  const href = (target: number): { pathname: string; query: Record<string, string> } => ({
    pathname: basePath,
    /* Первая страница живёт по чистому адресу: `?page=1` в ссылке, которую
       владелец кому-то пришлёт, — лишний параметр без смысла. */
    query: { ...query, ...(target > 1 ? { page: String(target) } : {}) },
  });

  /* 🔴 Полоса номеров ужимается на телефоне, а не переносится (issue #653).
     Пять номеров, два многоточия и два шага со словами требуют 362px в
     колонке 256 на ширине 320: ряд вставал в три строки и упирался в
     соседний блок подвала. Ниже 600px остаётся то, чем на телефоне и
     листают, — два шага и подпись положения; слова шагов уходят с глаз, но
     остаются в озвучке, номера уступают место подписи. Отступление от
     макета записано в PIXEL_SPEC. */
  const pagerClass = numbers ? `${styles.pager} ${styles.compact}` : styles.pager;

  return (
    <nav className={pagerClass} aria-label={label}>
      {page > 1 ? (
        <Link className={styles.step} href={href(page - 1)} rel="prev">
          ← <span className={styles.stepText}>{prevLabel}</span>
        </Link>
      ) : (
        <span className={styles.stepOff}>
          ← <span className={styles.stepText}>{prevLabel}</span>
        </span>
      )}

      {numbers ? (
        <>
          <span className={`${styles.position} ${styles.positionCompact}`}>
            {position(page, pages)}
          </span>

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
                    <span className={styles.position} aria-current="page">
                      {item}
                    </span>
                  ) : (
                    <Link className={styles.number} href={href(item)} aria-label={pageLabel(item)}>
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
        <Link className={styles.step} href={href(page + 1)} rel="next">
          <span className={styles.stepText}>{nextLabel}</span> →
        </Link>
      ) : (
        <span className={styles.stepOff}>
          <span className={styles.stepText}>{nextLabel}</span> →
        </span>
      )}
    </nav>
  );
}
