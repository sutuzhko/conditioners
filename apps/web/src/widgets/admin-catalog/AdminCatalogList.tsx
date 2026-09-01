import Link from 'next/link';

import { formatMoney } from '@/shared/lib/format';
import { Badge, Card, EmptyState, Table } from '@/shared/ui';

import { adminCatalogContent as texts } from './content';
import styles from './AdminCatalogList.module.css';

/**
 * Строка списка: ровно то, что видно в таблице.
 *
 * Не `Product` и не `ProductDto`: доменная модель и ответ репозитория
 * расходятся в типе дат, а списку даты не нужны вовсе. Узкий тип принимает
 * оба и не ломается, когда любой из них меняется.
 */
export type CatalogRow = {
  readonly id: string;
  readonly name: string;
  readonly badge: string;
  readonly areaMax: number;
  readonly priceNum: number;
  readonly salePrice: number | null;
  readonly visible: boolean;
  readonly sort: number;
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
            <th scope="col">{texts.colName}</th>
            <th scope="col">{texts.colArea}</th>
            <th scope="col">{texts.colPrice}</th>
            <th scope="col">{texts.colVisible}</th>
            <th scope="col">{texts.colSort}</th>
            <th scope="col">
              <span className="srOnly">{texts.edit}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} role="row">
              <td role="cell" data-label={texts.colName}>
                <span className={styles.name}>{product.name}</span>
                <span className={styles.badge}>{product.badge}</span>
              </td>
              <td role="cell" data-label={texts.colArea}>
                {texts.area(product.areaMax)}
              </td>
              <td role="cell" data-label={texts.colPrice}>
                {/* Действующая цена, а не базовая: именно её видит посетитель.
                    Перечёркнутая старая показывается рядом, когда скидка идёт. */}
                <span className={styles.price}>{formatMoney(product.priceNum)}</span>
                {product.salePrice === null ? null : (
                  <Badge variant="sale" className={styles.sale}>
                    {texts.saleActive}: {formatMoney(product.salePrice)}
                  </Badge>
                )}
              </td>
              <td role="cell" data-label={texts.colVisible}>
                <Badge variant={product.visible ? 'success' : 'neutral'}>
                  {product.visible ? texts.visible : texts.hidden}
                </Badge>
              </td>
              <td className={styles.sort} role="cell" data-label={texts.colSort}>
                {product.sort}
              </td>
              <td role="cell">
                <Link
                  className={styles.edit}
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
