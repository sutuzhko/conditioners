import Link from 'next/link';

import { Card, Input, Select, buttonClassName } from '@/shared/ui';

import { adminCatalogContent as texts } from './content';
import {
  CATALOG_PATH,
  CATALOG_VISIBILITIES,
  catalogFilterOn,
  type CatalogFilter,
  type CatalogVisibility,
} from './model';
import styles from './CatalogSearch.module.css';

export interface CatalogSearchProps {
  /** Отбор, с которым страница отрисована: поля открываются заполненными. */
  readonly filter: CatalogFilter;
}

const VISIBILITY_LABELS: Record<CatalogVisibility, string> = {
  visible: texts.filterVisible,
  hidden: texts.filterHidden,
};

/**
 * Отбор моделей: поиск и видимость (issue #612).
 *
 * 🔴 Серверный компонент без единой строки своего JavaScript. Обычная форма с
 * `method="get"` уводит условия в адрес сама, и раздел не платит за поиск ни
 * байтом бюджета. Найденное остаётся ссылкой — её можно прислать себе.
 *
 * Сортировки здесь нет намеренно: порядок списка и есть порядок витрины, и
 * второй порядок в панели заставил бы гадать, какой из них увидит посетитель.
 */
export function CatalogSearch({ filter }: CatalogSearchProps) {
  return (
    <Card as="section" className={styles.card}>
      <form className={styles.form} action={CATALOG_PATH} method="get" role="search">
        <Input
          label={texts.searchLabel}
          hint={texts.searchHint}
          placeholder={texts.searchPlaceholder}
          name="q"
          type="search"
          defaultValue={filter.query}
          autoComplete="off"
          wrapperClassName={styles.field}
        />

        <Select
          label={texts.filterVisibility}
          name="show"
          defaultValue={filter.visibility ?? ''}
          wrapperClassName={styles.select}
          options={[
            { value: '', label: texts.filterVisibilityAll },
            ...CATALOG_VISIBILITIES.map((value) => ({
              value,
              label: VISIBILITY_LABELS[value],
            })),
          ]}
        />

        <div className={styles.actions}>
          <button className={buttonClassName({ size: 'sm' })} type="submit">
            {texts.searchSubmit}
          </button>

          {/* Сброс — ссылка, а не кнопка: условия живут в адресе, и снять их
              значит уйти на адрес раздела без хвоста. */}
          {catalogFilterOn(filter) ? (
            <Link className={`${styles.reset} tapAction`} href={{ pathname: CATALOG_PATH }}>
              {texts.reset}
            </Link>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
