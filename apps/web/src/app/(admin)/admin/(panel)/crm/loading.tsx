import { crmContent as texts } from '@/features/crm-calendar';
import { Skeleton } from '@/shared/ui';

import styles from './page.module.css';

/**
 * Календарь работ: название раздела настоящее, период и сетка — заготовками
 * по замеру готовой страницы (issue #334). Панель на 390 переносится в
 * несколько рядов, и её высота задана по ширине экрана.
 *
 * 🔴 В заголовке стоит название раздела, а не период: периода на этот момент
 * ещё нет, а страница без `h1` — нарушение инварианта 4 даже на полсекунды.
 */
export default function CrmLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <div className={styles.calendar}>
        <Skeleton variant="block" className={styles.navSkeleton} />

        {/* Заготовка повторяет раскладку готовой страницы: карточка
            «Показывать» слева, сетка справа. Иначе после загрузки сетка
            прыгает влево на ширину карточки. */}
        <div className={styles.board}>
          <Skeleton variant="block" className={styles.cardSkeleton} />
          <Skeleton variant="block" className={styles.gridSkeleton} />
        </div>
      </div>
    </div>
  );
}
