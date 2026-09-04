import Image from 'next/image';
import Link from 'next/link';

import { VisibilitySwitch } from '@/features/product-form';
import { formatMoney } from '@/shared/lib/format';
import { Badge, Card, EmptyState, Icon, Table } from '@/shared/ui';

import { adminCatalogContent as texts } from './content';
import styles from './AdminCatalogList.module.css';

/**
 * Строка списка: ровно то, что видно в таблице.
 *
 * Не `Product` и не `ProductDto`: доменная модель и ответ репозитория
 * расходятся в типе дат, а списку не нужна половина их полей. Узкий тип
 * принимает оба и не ломается, когда любой из них меняется.
 *
 * 🔴 Цены приезжают уже посчитанными — действующая, прежняя и процент
 * (`getActivePrice`, ADR-011). Список их не считает и считать не должен:
 * второй расчёт скидки разошёлся бы с сайтом на первой же правке периода.
 */
export type CatalogRow = {
  readonly id: string;
  readonly name: string;
  /** Категория модели: «09», «12», «мульти». */
  readonly badge: string;
  readonly areaMax: number;
  /** Цена, которую видит посетитель сегодня. */
  readonly currentPrice: number;
  /** Перечёркнутая цена — только пока скидка идёт. Иначе `null`. */
  readonly oldPrice: number | null;
  /** Процент считает домен; 0 означает «плашки нет» (см. `getActivePrice`). */
  readonly discountPercent: number;
  /** Последний день скидки, `2026-09-10`. Пусто — без ограничения. */
  readonly saleTo: string | null;
  readonly visible: boolean;
  readonly featured: boolean;
  readonly sort: number;
  /** Главная фотография; нет — в ячейке стоит значок-заглушка. */
  readonly photo: string | null;
};

export interface AdminCatalogListProps {
  /** Все модели, включая скрытые: в админке скрытая модель — не отсутствующая. */
  readonly products: readonly CatalogRow[];
}

/**
 * Список моделей каталога.
 *
 * Показывает и скрытые: владельцу важно видеть, что модель существует, но не
 * показывается, — иначе он заведёт её второй раз.
 *
 * 🔴 Между брейкпоинтами (issue #354): до 1200px категория и порядок уходят в
 * подпись модели и своих колонок не занимают; ниже 600px кит раскладывает
 * строки карточками.
 */
export function AdminCatalogList({ products }: AdminCatalogListProps) {
  if (products.length === 0) {
    return (
      <Card as="section">
        <EmptyState icon="conditioner" title={texts.emptyTitle}>
          {texts.emptyText}
        </EmptyState>
      </Card>
    );
  }

  return (
    <Card as="section" padding="none">
      <Table label={texts.title} variant="cards">
        <thead>
          <tr role="row">
            <th className={styles.colName} scope="col">
              {texts.colName}
            </th>
            <th className={styles.colNarrow} scope="col">
              {texts.colArea}
            </th>
            <th className={styles.colPrice} scope="col">
              {texts.colPrice}
            </th>
            <th className={styles.colNarrow} scope="col">
              {texts.colFeatured}
            </th>
            <th className={styles.colNarrow} scope="col">
              {texts.colVisible}
            </th>
            <th className={`${styles.wideOnly} ${styles.colTiny}`} scope="col">
              {texts.colSort}
            </th>
            <th scope="col">
              <span className="srOnly">{texts.edit}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} role="row">
              <td className={styles.modelCell} role="cell" data-label={texts.colName}>
                <span className={styles.model}>
                  {/* Снимок 52×38 — размер из макета. Размеры заданы явно:
                      без них строка прыгает по мере загрузки (инвариант 13). */}
                  {product.photo === null ? (
                    <span className={styles.thumbEmpty} aria-hidden="true">
                      <Icon name="camera" size={16} />
                    </span>
                  ) : (
                    <Image
                      className={styles.thumb}
                      src={product.photo}
                      alt={texts.photoAlt(product.name)}
                      width={52}
                      height={38}
                    />
                  )}

                  <span className={styles.names}>
                    <span className={styles.name}>{product.name}</span>
                    {/* 🔴 Подпись модели несёт то, чему не хватило колонки:
                        категорию — всегда, порядок — до 1200px, где своя
                        колонка у него закрыта (issue #354). Показанное и в
                        колонке, и в подписи читалось бы как разные сведения. */}
                    <span className={styles.sub}>
                      {product.badge}
                      <span className={styles.narrowOnly}> · {texts.sort(product.sort)}</span>
                    </span>
                  </span>
                </span>
              </td>

              <td className={styles.area} role="cell" data-label={texts.colArea}>
                {texts.area(product.areaMax)}
              </td>

              <td role="cell" data-label={texts.colPrice}>
                {/* 🔴 Блок цены занимает одну и ту же высоту со скидкой и без:
                    вторая строка есть всегда, и главная цифра не пляшет по
                    ряду (issue #354). Проверяется координатой, а не снимком. */}
                <span className={styles.priceBlock}>
                  <span className={styles.price}>{formatMoney(product.currentPrice)}</span>

                  <span className={styles.saleLine}>
                    {product.oldPrice === null ? (
                      <span className={styles.noSale}>{texts.noSale}</span>
                    ) : (
                      <>
                        <s className={styles.oldPrice}>
                          <span className="srOnly">{texts.oldPrice(product.oldPrice)}</span>
                          <span aria-hidden="true">{formatMoney(product.oldPrice)}</span>
                        </s>
                        {product.discountPercent === 0 ? null : (
                          <span className={styles.percent}>
                            {texts.discount(product.discountPercent)}
                          </span>
                        )}
                        {product.saleTo === null ? null : (
                          <span className={styles.saleUntil}>
                            {texts.saleUntil(product.saleTo)}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                </span>
              </td>

              <td role="cell" data-label={texts.colFeatured}>
                {product.featured ? (
                  <Badge variant="accent">{texts.featured}</Badge>
                ) : (
                  /* Прочерк вместо слов: колонка узкая, а «нет» здесь —
                     обычное состояние большинства строк. Диктору при этом
                     читается полная формулировка. */
                  <span className={styles.muted}>
                    <span className="srOnly">{texts.notFeatured}</span>
                    <span aria-hidden="true">—</span>
                  </span>
                )}
              </td>

              <td role="cell" data-label={texts.colVisible}>
                <VisibilitySwitch id={product.id} name={product.name} visible={product.visible} />
              </td>

              <td
                className={`${styles.wideOnly} ${styles.sortCell}`}
                role="cell"
                data-label={texts.colSort}
              >
                {product.sort}
              </td>

              <td role="cell">
                <Link
                  className={`${styles.edit} tapAction`}
                  href={{ pathname: `/admin/catalog/${product.id}` }}
                  aria-label={texts.editLabel(product.name)}
                >
                  {texts.edit}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
