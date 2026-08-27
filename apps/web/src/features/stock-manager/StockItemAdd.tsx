'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/shared/ui';

import { stockManagerContent as texts } from './content';
import { StockItemForm } from './StockItemForm';
import type { StockApi, StockItemProduct } from './model';
import styles from './StockItemAdd.module.css';

export interface StockItemAddProps {
  readonly api?: StockApi | undefined;
  readonly products?: readonly StockItemProduct[] | undefined;
}

/**
 * Заведение позиции справочника.
 *
 * Форма свёрнута по умолчанию: раздел открывают, чтобы посмотреть остатки и
 * понять, что заказывать, а справочник пополняют изредка.
 */
export function StockItemAdd({ api, products }: StockItemAddProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.add}>
      <div className={styles.top}>
        <Button
          type="button"
          variant={open ? 'secondary' : 'primary'}
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((shown) => !shown)}
        >
          {open ? texts.itemAddClose : texts.itemAddOpen}
        </Button>
      </div>

      {open ? (
        <StockItemForm api={api} products={products} onSaved={() => router.refresh()} />
      ) : null}
    </div>
  );
}
