import {
  CLIENT_CARD_TABS,
  CLIENT_TAB_TITLES,
  clientManagerContent as texts,
} from '@/features/client-manager';
import { HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import { PanelTabStrip } from '../../PanelTabStrip';
import styles from '../page.module.css';

/**
 * Карточка клиента: лента вкладок настоящая, заготовка — только у содержимого
 * (ADR-239).
 *
 * 🔴 Лента вкладок не зависит от данных и обязана стоять на той же
 * координате, что на готовой карточке: серая полоса вместо неё сдвигала бы
 * содержимое вниз ровно в тот момент, когда данные приезжают.
 *
 * Открытая вкладка не подсвечивается: адреса `loading.tsx` не получает.
 */
export default function ClientLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />

      <PanelTabStrip tabs={CLIENT_CARD_TABS} titles={CLIENT_TAB_TITLES} label={texts.tabsLabel} />

      <RowsSkeleton rows={3} height="280px" />
    </div>
  );
}
