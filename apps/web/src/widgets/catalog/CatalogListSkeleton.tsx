import { Skeleton } from '@/shared/ui';

import { ProductCardSkeleton } from './ui/ProductCardSkeleton';
import gridStyles from './ui/grid.module.css';
import styles from './CatalogList.module.css';

/**
 * Сколько карточек-заглушек рисовать. Два ряда на десктопе: столько же
 * помещается на первый экран каталога, и ровно столько ждёт человек, нажав
 * фильтр.
 */
const SKELETON_COUNT = 6;

/**
 * Каталог на время перехода — запасное содержимое `loading.tsx`.
 *
 * Каталог читает `searchParams` и потому рендерится динамически: нажатие на
 * фильтр, порядок или номер страницы — блокирующая навигация, во время
 * которой Next держит старую страницу. Без скелетона у неё нет ни одного
 * признака, что что-то происходит (CLAUDE.md, «Каждый асинхронный блок
 * данных имеет скелетон»).
 *
 * 🔴 Геометрию берёт у настоящего каталога — тот же модуль стилей: скелетон,
 * не совпадающий с раскладкой, которую он замещает, сам даёт прыжок вёрстки
 * в момент подстановки данных.
 *
 * Подбор слева не рисуется — он собирается по всему каталогу и на переходе не
 * меняется, — но место под него держится: иначе сетка карточек прыгнет вбок,
 * когда страница доедет.
 */
export function CatalogListSkeleton() {
  return (
    <section className={styles.section} aria-busy="true">
      <div className={styles.container}>
        <div className={styles.layout}>
          <div className={styles.filtersReserve} />

          <div className={styles.results}>
            <div className={styles.toolbar}>
              <Skeleton variant="text" width="140px" height="22px" />
              <Skeleton variant="block" width="200px" height="40px" />
            </div>

            <ul className={`${gridStyles.grid} ${styles.grid}`}>
              {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
