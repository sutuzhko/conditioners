import type { PanelTabKeys } from './PanelTabs';
import styles from './PanelTabs.module.css';

export interface PanelTabStripProps<T extends string> {
  readonly tabs: PanelTabKeys<T>;
  readonly titles: Readonly<Record<T, string>>;
  readonly label: string;
}

/**
 * Лента вкладок без переключения — то, что рисует заготовка раздела.
 *
 * 🔴 Заготовка обязана держать ту же геометрию, что готовая страница
 * (ADR-239): лента вкладок не зависит от данных, и серая полоса на её месте
 * сдвинула бы содержимое вниз в момент приезда данных. Настоящую ленту в
 * заготовку поставить нельзя — она клиентская и требует открытой вкладки,
 * которой `loading.tsx` не знает: параметров адреса ему не передают.
 *
 * Отсюда лента-близнец: те же классы, тот же кегль, те же отбивки — и ни
 * одной подсвеченной вкладки, потому что подсветить можно только не ту.
 * Кнопки отключены: нажимать в заготовке нечего.
 */
export function PanelTabStrip<T extends string>({ tabs, titles, label }: PanelTabStripProps<T>) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={label} aria-busy="true">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={styles.tab}
          role="tab"
          aria-selected={false}
          disabled
        >
          {titles[tab]}
        </button>
      ))}
    </div>
  );
}
