import Link from 'next/link';

import { CATALOG_NEW_PATH, CATALOG_SPECS_PATH } from '@/features/product-form';
import { Skeleton, buttonClassName } from '@/shared/ui';
import { LineSkeleton } from '@/widgets/admin-shell';
import { CatalogSearch, adminCatalogContent as texts } from '@/widgets/admin-catalog';

import styles from './page.module.css';

/**
 * Каталог: шапка с действиями и отбор настоящие, таблица моделей — заготовкой
 * (issue #334). Высота таблицы зависит от числа моделей; заготовка держит
 * верх и первый экран.
 *
 * 🔴 Форма отбора рисуется как есть, а не серой полосой: она от данных не
 * зависит, а на узком экране переносится в два ряда — никакая полоса этого не
 * повторит (ADR-239).
 *
 * 🔴 Строка счётчиков зависит от данных, поэтому вместо неё стоит заготовка
 * в строчном боксе того же кегля (ADR-239): полоса другой высоты сдвинула бы
 * отбор и таблицу ещё до прихода данных.
 */
export default function CatalogLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{texts.title}</h1>
          <p className={styles.lead}>{texts.lead}</p>
          <p className={styles.summary}>
            <LineSkeleton width="min(280px, 70%)" />
          </p>
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

      <CatalogSearch filter={{ query: '', visibility: undefined }} />

      <Skeleton variant="block" className={styles.tableSkeleton} />
    </div>
  );
}
