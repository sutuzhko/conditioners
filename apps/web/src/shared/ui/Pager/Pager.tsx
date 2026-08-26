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
}

/**
 * Разбивка длинного списка на страницы.
 *
 * 🔴 Ссылками, а не состоянием на клиенте: страница остаётся в адресе, её
 * можно сохранить и прислать, а сам компонент не стоит ни килобайта в бюджете
 * JS — списки панели рендерит сервер.
 *
 * Соседние страницы, а не полоса номеров: восемь записей на страницу дают
 * десятки страниц уже на второй сотне клиентов, и номера превратились бы в
 * ленту, по которой всё равно никто не целится. Ищут поиском, листают соседей.
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
}: PagerProps) {
  if (pages <= 1) return null;

  const href = (target: number): { pathname: string; query: Record<string, string> } => ({
    pathname: basePath,
    /* Первая страница живёт по чистому адресу: `?page=1` в ссылке, которую
       владелец кому-то пришлёт, — лишний параметр без смысла. */
    query: { ...query, ...(target > 1 ? { page: String(target) } : {}) },
  });

  return (
    <nav className={styles.pager} aria-label={label}>
      {page > 1 ? (
        <Link className={styles.step} href={href(page - 1)} rel="prev">
          ← {prevLabel}
        </Link>
      ) : (
        <span className={styles.stepOff}>← {prevLabel}</span>
      )}

      <span className={styles.position}>{position(page, pages)}</span>

      {page < pages ? (
        <Link className={styles.step} href={href(page + 1)} rel="next">
          {nextLabel} →
        </Link>
      ) : (
        <span className={styles.stepOff}>{nextLabel} →</span>
      )}
    </nav>
  );
}
