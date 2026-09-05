import { Card, Skeleton, StatTiles } from '@/shared/ui';

import { LineSkeleton } from './skeletons';
import styles from './AdminSummary.module.css';
import own from './AdminSummarySkeleton.module.css';

/** Сколько строк в таблице под графиками: столько же, сколько показывает сводка. */
const ROWS = 5;

/**
 * Скелетон сводки: та же раскладка, что у `AdminSummary`, — шапка, ряд
 * сегментов с периодом, четыре плитки, два графика, таблица (issue #334, #344,
 * #589, #591).
 *
 * 🔴 Шапка тоже полосами (issue #588). Раньше заголовок и пояснение были
 * постоянным текстом и рисовались настоящими; теперь это приветствие по имени
 * из сессии и строка дня с числом выездов — то есть данные, которых у
 * `loading.tsx` нет. Написать вместо них что угодно значит показать текст,
 * который через мгновение сменится другим.
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
        <div className={styles.headText}>
          <h1 className={styles.title}>
            <LineSkeleton width="min(280px, 70%)" />
          </h1>
          <p className={styles.lead}>
            <LineSkeleton width="min(360px, 90%)" />
          </p>
        </div>

        <Skeleton variant="block" className={own.action} />
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

      {/* Два графика той же высоты, что придут: место под холст известно из
          `viewBox`, и вёрстка не прыгает, когда данные приезжают. Второй
          прячет тот же класс, что у сводки, — ниже 1200 его нет и там. */}
      <div className={styles.charts}>
        <Card as="section" className={styles.chartCard}>
          <div className={styles.chartHead}>
            <h2 className={styles.cardTitle}>
              <LineSkeleton width="min(220px, 60%)" />
            </h2>
            <p className={styles.chartNote}>
              <LineSkeleton width="min(260px, 80%)" />
            </p>
          </div>
          <Skeleton variant="block" className={own.chart} />
        </Card>

        <Card as="section" className={`${styles.chartCard} ${styles.linesCard}`}>
          <div className={styles.chartHead}>
            <h2 className={styles.cardTitle}>
              <LineSkeleton width="min(200px, 55%)" />
            </h2>
            <p className={styles.chartNote}>
              <LineSkeleton width="min(280px, 85%)" />
            </p>
          </div>
          <Skeleton variant="block" className={own.chart} />
        </Card>
      </div>

      <Card as="section" className={styles.panel}>
        <h2 className={styles.cardTitle}>
          <LineSkeleton width="min(240px, 60%)" />
        </h2>
        <p className={styles.text}>
          <LineSkeleton width="min(420px, 80%)" />
        </p>

        {/* Ряд пилюль и поиск: три коротких полосы слева, длинная справа. */}
        <div className={own.bar}>
          <Skeleton variant="block" className={own.pill} />
          <Skeleton variant="block" className={own.pill} />
          <Skeleton variant="block" className={own.pill} />
          <Skeleton variant="block" className={own.search} />
        </div>

        <ul className={own.rows}>
          {Array.from({ length: ROWS }, (_, index) => (
            <li className={own.event} key={index}>
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
  );
}
