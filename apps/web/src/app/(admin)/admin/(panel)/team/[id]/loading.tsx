import {
  STAFF_CARD_TABS,
  STAFF_TAB_TITLES,
  staffManagerContent as texts,
} from '@/features/staff-manager';
import { FieldsSkeleton, HeadSkeleton, RowsSkeleton } from '@/widgets/admin-shell';

import { PanelTabStrip } from '../../PanelTabStrip';
import styles from '../page.module.css';

/**
 * Карточка монтажника: лента вкладок настоящая, заготовка — у содержимого
 * первой вкладки (ADR-239).
 *
 * 🔴 Лента не зависит от данных и стоит на той же координате, что на готовой
 * карточке: серая полоса на её месте сдвигала бы форму вниз ровно в тот
 * момент, когда данные приезжают.
 */
export default function TeamMemberLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <HeadSkeleton />

      <PanelTabStrip tabs={STAFF_CARD_TABS} titles={STAFF_TAB_TITLES} label={texts.tabsLabel} />

      {/* Шесть полей аккаунта: имя, логин, телефон, пароль, ИНН, оформление. */}
      <FieldsSkeleton fields={6} />
      <RowsSkeleton rows={2} height="72px" />
    </div>
  );
}
