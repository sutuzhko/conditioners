import { STOCK_TABS, stockManagerContent as texts } from '@/features/stock-manager';
import { Skeleton, StatTiles } from '@/shared/ui';

import { PanelTabLinks } from '../PanelTabLinks';
import { StockHeader } from './StockHeader';
import styles from './page.module.css';

/**
 * Склад: шапка и лента вкладок настоящие, заготовка — только у содержимого
 * вкладки (issue #334, ADR-239).
 *
 * 🔴 Шапка с действием на 390 занимает четыре строки, а лента вкладок на той
 * же ширине переносится во второй ряд — ни одна серая полоса этого не
 * повторит, и содержимое начиналось бы не там, где начнётся на готовой
 * странице. Обе рисуются тем же кодом, что и страница.
 *
 * Открытая вкладка не подсвечивается: какая выбрана, знает только адрес, а
 * `loading.tsx` параметров адреса не получает — подсветить он может лишь не ту.
 */
export default function StockLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <StockHeader />

      <PanelTabLinks
        tabs={STOCK_TABS}
        titleOf={texts.tabTitle}
        label={texts.tabsLabel}
        hrefOf={(tab) => ({ pathname: '/admin/stock', query: tab === 'stock' ? {} : { tab } })}
      />

      {/* 🔴 Плитки резервируют место, а не появляются поверх готового списка
          (issue #606): без резерва таблица уезжала бы вниз на две плитки в
          момент прихода данных. Сетка берётся у кита — раскладка совпадает по
          построению, а не по совпадению чисел (ADR-239). */}
      <StatTiles label={texts.tilesLabel}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} variant="block" className={styles.tileSkeleton} />
        ))}
      </StatTiles>

      <Skeleton variant="block" className={styles.filtersSkeleton} />
      <Skeleton variant="block" className={styles.tableSkeleton} />
    </div>
  );
}
