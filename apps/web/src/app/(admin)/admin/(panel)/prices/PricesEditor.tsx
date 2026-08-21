'use client';

import { useRouter } from 'next/navigation';

import { PricesForm, type PricesFormValues } from '@/features/prices-form';

/** Обвязка формы цен: после сохранения страница перечитывается. */
export function PricesEditor({ values }: { values: PricesFormValues }) {
  const router = useRouter();

  return <PricesForm values={values} onSaved={() => router.refresh()} />;
}
