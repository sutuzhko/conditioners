'use client';

import { useRouter } from 'next/navigation';

import { OrderResultForm, orderWorkApi } from '@/features/order-manager';

export interface OrderResultEditorProps {
  readonly orderId: string;
  readonly extraWork: string | null;
  readonly report: string | null;
  readonly resultAt: string | null;
}

/**
 * Клиентский лист вокруг итога работ.
 *
 * 🔴 Существует по той же причине, что и `OrderEditor`: ни набор запросов, ни
 * `onSaved` не переживают границу сервер→клиент — функция через неё не
 * проходит. Карточка наряда при этом обязана остаться серверной: в неё
 * уезжает весь наряд целиком, и утащить её в браузер ради двух полей отчёта
 * значило бы оплатить чтение бандлом.
 */
export function OrderResultEditor({
  orderId,
  extraWork,
  report,
  resultAt,
}: OrderResultEditorProps) {
  const router = useRouter();

  return (
    <OrderResultForm
      api={orderWorkApi(orderId)}
      extraWork={extraWork}
      report={report}
      resultAt={resultAt}
      onSaved={() => router.refresh()}
    />
  );
}
