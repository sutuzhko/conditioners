import type { ReactNode } from 'react';

import { Card } from '@/shared/ui';

import styles from './ProductForm.module.css';

/**
 * Во что одета секция формы.
 *
 * `section` — своя карточка: так форма стоит в содержимом страницы правки и
 * страницы создания. `bare` — только поля, разделённые чертой: рамку и
 * заголовок даёт окно, а карточка внутри окна была бы панелью в панели.
 *
 * 🔴 Форма при этом одна и та же: создание открывается окном, а прямой заход
 * по тому же адресу отдаёт страницу (ADR-117). Две формы для одного действия
 * разошлись бы на первой правке.
 */
export type ProductSurface = 'section' | 'bare';

export function ProductFormSection({
  surface,
  children,
}: {
  readonly surface: ProductSurface;
  readonly children: ReactNode;
}) {
  if (surface === 'bare') return <section className={styles.bare}>{children}</section>;

  return (
    <Card as="section" className={styles.section}>
      {children}
    </Card>
  );
}
