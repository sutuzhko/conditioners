import Link from 'next/link';

import { CATALOG_NEW_PATH, CATALOG_SPECS_PATH } from '@/features/product-form';
import { Skeleton, buttonClassName } from '@/shared/ui';
import { adminCatalogContent as texts } from '@/widgets/admin-catalog';

import styles from './page.module.css';

/**
 * Каталог: шапка с действиями настоящая, таблица моделей — заготовкой
 * (issue #334). Высота таблицы зависит от числа моделей; заготовка держит
 * верх и первый экран.
 */
export default function CatalogLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
        </div>

        <div className={styles.headActions}>
          <Link
            className={buttonClassName({ size: 'sm', variant: 'bordered' })}
            href={{ pathname: CATALOG_SPECS_PATH }}
          >
            {texts.specsDictionary}
          </Link>
          <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: CATALOG_NEW_PATH }}>
            {texts.add}
          </Link>
        </div>
      </header>

      <Skeleton variant="block" className={styles.tableSkeleton} />
    </div>
  );
}
