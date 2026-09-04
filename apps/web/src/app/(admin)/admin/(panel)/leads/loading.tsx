import Link from 'next/link';

import {
  LEAD_STATUSES,
  LeadSearch,
  leadManagerContent as texts,
  leadsHref,
} from '@/features/lead-manager';

import { LeadsSkeleton, SummarySkeleton } from './LeadsSkeleton';
import styles from './page.module.css';

/**
 * Заявки: шапка и фильтры настоящие, заготовка — у очереди с карточкой
 * (issue #334, #349).
 *
 * 🔴 Шапка, поиск и фильтры не зависят от данных, и рисовать их серыми
 * полосами значит обещать одну высоту и показать другую: фильтры на телефоне
 * переносятся во второй ряд, а поле поиска на 390 встаёт над кнопкой; никакая
 * полоса этого не повторит. Замер до правки: список начинался на 113px в
 * заготовке и на 180.7px на готовой странице.
 *
 * Строка счёта — единственное здесь, что приходит из базы: под неё стоит
 * заготовка той же высоты.
 *
 * Активный фильтр не подсвечивается: какой выбран, знает только адрес, а
 * подсветка на геометрию не влияет.
 */
export default function LeadsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
      </header>

      {/* Счёт очереди приходит из базы: под него резервируется строка той же
          высоты, а поиск и фильтры рисуются настоящими — они данных не ждут. */}
      <SummarySkeleton />

      <LeadSearch query="" />

      <nav className={styles.filters} aria-label={texts.filterLabel}>
        <Link className={styles.filter} href={leadsHref({})}>
          {texts.filterAll}
        </Link>
        {LEAD_STATUSES.map((value) => (
          <Link className={styles.filter} key={value} href={leadsHref({ status: value })}>
            {texts.statusTitle(value)}
          </Link>
        ))}
      </nav>

      <LeadsSkeleton />
    </div>
  );
}
