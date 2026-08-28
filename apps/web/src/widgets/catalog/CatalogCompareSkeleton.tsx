import { Skeleton } from '@/shared/ui';

import styles from './CatalogCompare.module.css';

/** Сколько пилюль отмеченного показать — типичный выбор из двух-трёх моделей. */
const CHIP_COUNT = 3;

/**
 * Сравнение на время перехода — запасное содержимое `loading.tsx`.
 *
 * Страница читает `?compare=` и рендерится динамически, а снятие отметки —
 * обычная навигация: без скелетона она проходит вовсе без признаков жизни
 * (CLAUDE.md, «Каждый асинхронный блок данных имеет скелетон»).
 *
 * 🔴 Тот же модуль стилей, что у настоящей страницы: контейнер, строка
 * отмеченного и место под таблицу совпадают по геометрии, поэтому подстановка
 * данных не двигает вёрстку.
 */
export function CatalogCompareSkeleton() {
  return (
    <div className={styles.compare} aria-busy="true">
      <div className={styles.container}>
        <div className={styles.head}>
          <ul className={styles.chosen}>
            {Array.from({ length: CHIP_COUNT }, (_, index) => (
              <li key={index}>
                <Skeleton variant="block" width="160px" height="38px" />
              </li>
            ))}
          </ul>
        </div>

        <Skeleton variant="block" width="100%" height="320px" />
      </div>
    </div>
  );
}
