'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { LEAD_PARAMS } from '@/shared/config/lead';

import { rememberLeadSubject } from './subject';

/**
 * Читает предмет обращения из адреса и кладёт его в хранилище формы (ADR-129).
 *
 * 🔴 Компонент ничего не рисует намеренно. `useSearchParams()` переводит в
 * динамический рендер всё, что не отгорожено `<Suspense>`, — поэтому чтение
 * адреса вынесено в отдельный лист, а он ставится внутри границы. Сама форма
 * остаётся в серверном HTML (инвариант 1), а страница — пререндеренной.
 */
export function LeadSubjectSync(): null {
  const params = useSearchParams();
  const model = params.get(LEAD_PARAMS.model);
  const topic = params.get(LEAD_PARAMS.topic);

  useEffect(() => {
    // адрес без предмета хранилище не трогает: пустая запись только заставила
    // бы форму перерисоваться, ничего в ней не изменив
    if (model === null && topic === null) return;

    rememberLeadSubject({
      ...(model === null ? {} : { model }),
      ...(topic === null ? {} : { topic }),
    });
  }, [model, topic]);

  return null;
}
