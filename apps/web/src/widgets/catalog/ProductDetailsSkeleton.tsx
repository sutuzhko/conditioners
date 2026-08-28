import { Card, Skeleton } from '@/shared/ui';

import styles from './ProductDetails.module.css';

/** Сколько строк характеристик показать в заглушке — один короткий блок. */
const SPEC_ROWS = 6;

/**
 * Страница модели на время перехода — запасное содержимое `loading.tsx`.
 *
 * Сама страница пререндерится, но по прямой ссылке из выдачи и после
 * истечения ISR человек ждёт ответ сервера, и всё это время у него нет ни
 * одного признака, что страница едет (CLAUDE.md, «Каждый асинхронный блок
 * данных имеет скелетон»).
 *
 * 🔴 Раскладка та же, что у настоящей страницы, и тем же модулем стилей:
 * фото 4:3, панель цены справа, характеристики под фото. Скелетон другой
 * геометрии сам по себе даёт прыжок вёрстки при подстановке данных.
 */
export function ProductDetailsSkeleton() {
  return (
    <div className={styles.page} aria-busy="true">
      <div className={styles.container}>
        <div className={styles.head}>
          <Skeleton variant="text" width="min(420px, 80%)" height="34px" />
        </div>

        <div className={styles.main}>
          <div className={styles.gallery}>
            <Skeleton variant="block" className={styles.photoSkeleton} />
          </div>

          <div className={styles.aside}>
            <Card padding="lg" className={styles.offer}>
              <Skeleton variant="text" width="45%" />
              <Skeleton variant="text" width="65%" height="26px" />
              <Skeleton variant="block" height="var(--tap)" className={styles.cta} />
            </Card>
          </div>

          <div className={styles.specs}>
            <Skeleton variant="text" width="180px" height="24px" />
            <div className={styles.specsSkeleton}>
              <Skeleton variant="text" lines={SPEC_ROWS} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
