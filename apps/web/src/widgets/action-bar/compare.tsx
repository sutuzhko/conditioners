'use client';

import { useEffect, useSyncExternalStore } from 'react';

import type { CompareOffer } from './model';

/**
 * Кто сейчас предлагает сравнение.
 *
 * 🔴 Почему хранилище, а не пропс от страницы. Панель живёт в каркасе
 * публичной части — она нужна на каждой странице, и монтировать её в каждой
 * значит однажды забыть. Но каркас в App Router не получает параметров
 * адреса, а отметки сравнения живут именно там (ADR-109): узнать про них
 * панели неоткуда.
 *
 * 🔴 Почему счётчик считает сервер, а не панель по строке адреса. В адресе
 * может стоять слаг снятой с продажи модели: страница такие отбрасывает, и
 * панель показала бы «3» там, где сравнение покажет две. Число обязано
 * совпадать с тем, что человек увидит, нажав кнопку.
 *
 * Образец — хранилище контекста заявки (`features/lead-form/context.ts`), но
 * без `sessionStorage`: предложение сравнить описывает не визит, а текущую
 * страницу, и пережить уход с неё не должно.
 */
let current: CompareOffer | null = null;
const listeners = new Set<() => void>();

/** Ключ сравнения снимка: адрес приходит объектом и на каждом рендере новым. */
function same(a: CompareOffer | null, b: CompareOffer | null): boolean {
  if (a === null || b === null) return a === b;
  return a.count === b.count && JSON.stringify(a.href) === JSON.stringify(b.href);
}

function offerCompare(next: CompareOffer | null): void {
  /* Повторная публикация того же предложения подписчиков не будит: компонент
     на странице публикует его при каждом своём рендере. */
  if (same(current, next)) return;

  current = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readOffer(): CompareOffer | null {
  return current;
}

/** На сервере предложения нет по определению: отметки — состояние браузера. */
function serverOffer(): CompareOffer | null {
  return null;
}

/** Текущее предложение сравнения — для панели действий. */
export function useCompareOffer(): CompareOffer | null {
  return useSyncExternalStore(subscribe, readOffer, serverOffer);
}

/**
 * Предложение сравнения с серверной страницы — панели действий.
 *
 * Ничего не рисует: разметка страницы не меняется ни на символ, инвариант 1
 * в силе. Снимается само — при уходе со страницы компонент размонтируется, и
 * панель возвращает кнопку заявки, не спрашивая, куда человек ушёл.
 */
export function CompareOfferSource({ count, href }: CompareOffer): null {
  useEffect(() => {
    offerCompare(count === 0 ? null : { count, href });
    return () => offerCompare(null);
  }, [count, href]);

  return null;
}
