import { Card, Skeleton } from '@/shared/ui';

import { LineSkeleton } from './skeletons';
import { adminSummaryContent as texts } from './summary-content';
import styles from './AdminSummary.module.css';
import own from './AdminSummarySkeleton.module.css';

/** Сколько строк в «Ближайших делах»: столько же, сколько показывает сводка. */
const UPCOMING = 6;

/**
 * Скелетон сводки: та же раскладка, что у `AdminSummary`, — шапка, пять плиток,
 * карточка ближайших дел и строка готовности (issue #334).
 *
 * Шапка настоящая: заголовок и пояснение сводки не зависят от данных, и
 * рисовать их полосами значит обещать одну высоту, а показать другую.
 * Плитки и карточки берут классы самой сводки — сетка и отступы общие по
 * построению, а не по совпадению чисел.
 */
export function AdminSummarySkeleton() {
  return (
    <div className={styles.summary} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <div className={styles.tiles}>
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} variant="block" className={own.tile} />
        ))}
      </div>

      <Card as="section" className={styles.upcoming}>
        <h2 className={styles.cardTitle}>
          <LineSkeleton width="min(240px, 60%)" />
        </h2>
        <p className={styles.text}>
          <LineSkeleton width="min(420px, 80%)" />
        </p>
        <ul className={styles.events}>
          {Array.from({ length: UPCOMING }, (_, index) => (
            <li className={`${styles.event} ${own.event}`} key={index}>
              <LineSkeleton width={index % 2 === 0 ? '72%' : '58%'} />
            </li>
          ))}
        </ul>
        <span className={styles.link}>
          <LineSkeleton width="160px" />
        </span>
      </Card>

      <Card as="section" variant="soft" className={styles.readiness}>
        <h2 className={styles.cardTitle}>
          <LineSkeleton width="min(220px, 60%)" />
        </h2>
        <p className={styles.text}>
          <LineSkeleton width="min(360px, 80%)" />
        </p>
      </Card>
    </div>
  );
}
