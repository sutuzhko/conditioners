import type { Metadata } from 'next';
import Link from 'next/link';

import {
  StockMoveForm,
  STOCK_PATH,
  moveDraftOf,
  stockManagerContent as texts,
  type StockItemRef,
} from '@/features/stock-manager';
import { requireOwnerPage } from '@/server/guards';
import { Card } from '@/shared/ui';
import { DataBlock, FieldsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

import { moveItemRef, moveZones, type StockMoveParams } from '../data';
import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.moveTitle };

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ item?: string; from?: string; to?: string; kind?: string }>;
};

/**
 * Движение страницей: тот же адрес, открытый ссылкой или обновлением.
 *
 * 🔴 Остаток не правится напрямую ни одним полем: он сумма движений. Правка
 * руками существует, но как инвентаризация с обязательным основанием
 * (ADR-134).
 *
 * 🔴 Существование позиции решается **до** первого куска потока (issue #651):
 * адрес движения с удалённой позицией обязан отвечать 404, а не 200 с текстом
 * «не найдено». Зоны хранения приезжают следом, отдельным куском.
 */
export default async function AdminStockMovePage({ searchParams }: PageProps) {
  /* 🔴 Страж стоит и здесь, хотя загрузчик данных зовёт его тоже: проверка
     обязана быть видна в самой странице (ADR-095, issue #773). Загрузчик —
     соседний модуль, и его переиспользуют: страница, собранная из другого
     набора вызовов, молча остаётся без роли. Сессия читается один раз за
     запрос — `getAdminSession` обёрнута в `cache`, — так что второй вызов
     ничего не стоит. */
  await requireOwnerPage();

  const params = await searchParams;
  const item = await moveItemRef(params);

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: STOCK_PATH }}>
        {texts.back}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.moveTitle}</h1>
        <p className={styles.lead}>{texts.moveHint}</p>
      </header>

      <DataBlock
        skeleton={<FieldsSkeleton fields={5} />}
        title={texts.itemLoadFailed}
        note={blockErrorNote(STOCK_PATH)}
      >
        <MoveForm item={item} params={params} />
      </DataBlock>
    </div>
  );
}

/** Форма движения — то, что приезжает отдельным куском потока. */
async function MoveForm({
  item,
  params,
}: {
  readonly item: StockItemRef;
  readonly params: StockMoveParams;
}) {
  const zones = await moveZones();

  return (
    <Card>
      <StockMoveForm items={[item]} zones={zones} initial={moveDraftOf(params)} surface="bare" />
    </Card>
  );
}
