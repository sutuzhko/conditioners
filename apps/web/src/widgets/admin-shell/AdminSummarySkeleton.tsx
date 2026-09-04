import { Card, Skeleton, StatTiles } from '@/shared/ui';

import { LineSkeleton } from './skeletons';
import { adminSummaryContent as texts } from './summary-content';
import styles from './AdminSummary.module.css';
import own from './AdminSummarySkeleton.module.css';

/** Сколько строк в панели под плитками: столько же, сколько показывает сводка. */
const ROWS = 5;

/**
 * Скелетон сводки: та же раскладка, что у `AdminSummary`, — шапка, ряд
 * сегментов с периодом, четыре плитки, панель под ними (issue #334, #344).
 *
 * Шапка настоящая: заголовок и пояснение сводки не зависят от данных, и
 * рисовать их полосами значит обещать одну высоту, а показать другую.
 *
 * 🔴 Ряд сегментов заменён полосой той же высоты, а не настоящими ссылками:
 * какой сегмент открыт, знает только страница — `loading.tsx` параметров
 * адреса не получает вовсе. Настоящий ряд подсветил бы «Обзор» и мигнул бы
 * подсветкой, если открывали «Деньги».
 */
export function AdminSummarySkeleton() {
  return (
    <div className={styles.summary} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <div className={styles.bar}>
        <Skeleton variant="block" className={own.segments} />
        <Skeleton variant="block" className={own.period} />
      </div>

      {/* Сетка плиток берётся у кита, а прятанье третьей и четвёртой — у самой
          сводки: раскладка совпадает по построению, а не по совпадению чисел
          (ADR-239). */}
      <StatTiles className={styles.tiles}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            variant="block"
            className={[own.tile, index > 1 ? styles.wide : null].filter(Boolean).join(' ')}
          />
        ))}
      </StatTiles>

      {/* Пара блоков под плитками — та же, что у сводки: от 1200 расписание и
          готовность стоят рядом, ниже складываются в столбец. */}
      <div className={styles.pair}>
        <Card as="section" className={styles.panel}>
          <h2 className={styles.cardTitle}>
            <LineSkeleton width="min(240px, 60%)" />
          </h2>
          <p className={styles.text}>
            <LineSkeleton width="min(420px, 80%)" />
          </p>
          <ul className={styles.events}>
            {Array.from({ length: ROWS }, (_, index) => (
              <li className={`${styles.event} ${own.event}`} key={index}>
                <LineSkeleton width={index % 2 === 0 ? '72%' : '58%'} />
              </li>
            ))}
          </ul>
          <span className={styles.link}>
            <LineSkeleton width="160px" />
          </span>
        </Card>

        <Card as="section" variant="soft">
          <h2 className={styles.cardTitle}>
            <LineSkeleton width="min(220px, 70%)" />
          </h2>
          <p className={styles.text}>
            <LineSkeleton width="min(320px, 90%)" />
          </p>
        </Card>
      </div>
    </div>
  );
}
