import { stockManagerContent as texts } from '@/features/stock-manager';
import { Skeleton, StatTiles } from '@/shared/ui';

import styles from './page.module.css';

/**
 * Заготовка вкладки остатков (issue #334, #606, #609, #651, ADR-239).
 *
 * 🔴 Плитки резервируют место, а не появляются поверх готового списка: без
 * резерва таблица уезжала бы вниз на две плитки в момент прихода данных.
 * Сетка берётся у кита — раскладка совпадает по построению, а не по
 * совпадению чисел.
 *
 * 🔴 Фрагмент, а не обёртка: страница раскладывает блоки колонкой с общим
 * зазором, и лишний `<div>` съел бы зазор между плитками и таблицей.
 */
export function StockSkeleton() {
  return (
    <>
      {/* Плитки и строка счётчиков резервируют место каждая на своей ширине —
          ровно так же, как их показывает готовая страница (issue #609). */}
      <Skeleton variant="block" className={styles.countsSkeleton} />

      <StatTiles className={styles.tilesSkeleton} label={texts.tilesLabel}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} variant="block" className={styles.tileSkeleton} />
        ))}
      </StatTiles>

      <Skeleton variant="block" className={styles.filtersSkeleton} />
      <Skeleton variant="block" className={styles.tableSkeleton} />
    </>
  );
}

/** Заготовка журнала движений и зон: та же таблица без плиток остатка. */
export function StockTableSkeleton() {
  return <Skeleton variant="block" className={styles.tableSkeleton} />;
}
