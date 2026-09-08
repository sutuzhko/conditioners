import { EMPTY_ACTIVITY_FILTER } from '@/entities/activity/model';
import { ActivityFilters, activityLogContent as texts } from '@/features/activity-log';

import { ActivitySkeleton } from './ActivitySkeleton';
import styles from './page.module.css';

/**
 * Журнал: шапка и ряд отбора настоящие, заготовка — только у списка
 * (issue #334). Статичная часть страницы рисуется как есть: только так её
 * высота совпадает при любом переносе строк.
 *
 * 🔴 Ряд отбора — тот же компонент, что и на готовой странице, но с пустым
 * списком людей. Полос-заготовки под него нет намеренно: её высоту пришлось бы
 * назначить числом, а ряд из шести условий переносится по-разному на каждой
 * ширине. Здесь высота совпадает по построению — полей столько же, и
 * переносятся они одинаково; отличается только содержимое списка «Кто», а оно
 * ширину поля не двигает.
 *
 * Условия из адреса сюда не доезжают: `loading.tsx` их не получает. Поля
 * заполнятся, как только приедет сама страница, — это смена содержимого, а не
 * раскладки.
 */
export default function ActivityLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <ActivityFilters filter={EMPTY_ACTIVITY_FILTER} people={[]} />

      <ActivitySkeleton />
    </div>
  );
}
