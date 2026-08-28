import {
  catalogSearchParams,
  withCatalogQuery,
  type CatalogFacets,
  type CatalogQuery,
} from '@/entities/product/lib/catalogQuery';

import { areaChipLabel, catalogListText as t } from '../content';
import { FilterLink } from './FilterLink';
import styles from './CatalogFilters.module.css';

export interface CatalogFiltersProps {
  readonly facets: CatalogFacets;
  readonly query: CatalogQuery;
  /** Адрес каталога: маршрут приносит страница, блок его не знает. */
  readonly basePath: string;
}

/**
 * Подбор моделей по параметрам (ADR-109, место — ADR-121).
 *
 * 🔴 Целиком на ссылках: ни одного клиентского компонента, ни одного
 * килобайта в бюджете JS публичной страницы (ADR-088). Каждое значение —
 * обычный переход по адресу, поэтому отфильтрованный каталог приходит из
 * HTML сервера (инвариант 1) и открывается по пересланной ссылке.
 *
 * 🔴 Сворачивание — `<details>`/`<summary>`, а не состояние на клиенте: ноль
 * JavaScript, а содержимое всегда в HTML, как у FAQ. На узкой ширине подбор
 * закрыт и занимает одну строку — иначе первый экран каталога занят не
 * товаром (ADR-121). На широкой он раскрыт и стоит боковой колонкой слева от
 * сетки: это диалог с выдачей, а не разовая настройка, — раскрытие делает
 * CSS через `::details-content`, разметка от ширины не зависит.
 *
 * Значения берутся из самих моделей: списка классов мощности и площадей в
 * коде нет и быть не может (инвариант 8).
 *
 * Сброса подбора здесь нет: он стоит рядом с чипами выбранного, у счётчика
 * найденного (ADR-121). Вторая такая же ссылка внутри свёрнутой панели была
 * бы вторым пунктом с тем же именем в списке ссылок скринридера — и той,
 * которую человек как раз не видит.
 */
export function CatalogFilters({ facets, query, basePath }: CatalogFiltersProps) {
  const href = (next: CatalogQuery): { pathname: string; query: Record<string, string> } => ({
    pathname: basePath,
    query: catalogSearchParams(next),
  });

  const hasFilters = facets.classes.length > 0 || facets.areas.length > 0;
  if (!hasFilters) return null;

  /* Имя подбора живёт на секции, а не только на `<summary>`: на широкой
     ширине сворачивать нечего, и `<summary>` там убран из разметки стилем —
     без секции колонка осталась бы безымянной для скринридера. */
  return (
    <section className={styles.filters} aria-label={t.filtersTitle}>
      <details className={styles.box}>
        <summary className={styles.summary}>{t.filtersTitle}</summary>

        <div className={styles.panel}>
          {facets.classes.length > 0 ? (
            <div className={styles.group} role="group" aria-labelledby="filter-class">
              <p className={styles.label} id="filter-class">
                {t.filterClass}
                <span className={styles.hint}>{t.filterClassHint}</span>
              </p>
              <div className={styles.values}>
                <FilterLink
                  href={href(withCatalogQuery(query, { powerClass: null }))}
                  selected={query.filter.powerClass === null}
                >
                  {t.filterAny}
                </FilterLink>
                {facets.classes.map((value) => (
                  <FilterLink
                    key={value}
                    href={href(withCatalogQuery(query, { powerClass: value }))}
                    selected={query.filter.powerClass === value}
                  >
                    {value}
                  </FilterLink>
                ))}
              </div>
            </div>
          ) : null}

          {facets.areas.length > 0 ? (
            <div className={styles.group} role="group" aria-labelledby="filter-area">
              <p className={styles.label} id="filter-area">
                {t.filterArea}
                <span className={styles.hint}>{t.filterAreaHint}</span>
              </p>
              <div className={styles.values}>
                <FilterLink
                  href={href(withCatalogQuery(query, { area: null }))}
                  selected={query.filter.area === null}
                >
                  {t.filterAnyArea}
                </FilterLink>
                {facets.areas.map((value) => (
                  <FilterLink
                    key={value}
                    href={href(withCatalogQuery(query, { area: value }))}
                    selected={query.filter.area === value}
                  >
                    {areaChipLabel(value)}
                  </FilterLink>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.group} role="group" aria-labelledby="filter-sale">
            <p className={styles.label} id="filter-sale">
              {t.filterSale}
            </p>
            <div className={styles.values}>
              <FilterLink
                href={href(withCatalogQuery(query, { sale: false }))}
                selected={!query.filter.sale}
              >
                {t.filterAnyOffer}
              </FilterLink>
              <FilterLink
                href={href(withCatalogQuery(query, { sale: true }))}
                selected={query.filter.sale}
              >
                {t.filterSaleOn}
              </FilterLink>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
