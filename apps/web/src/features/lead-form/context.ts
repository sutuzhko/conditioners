'use client';

import { useSyncExternalStore } from 'react';

import { mergeLeadContext, parseLeadContext } from '@/entities/lead/lib/context';
import type { LeadContext } from '@/entities/lead/model';

/**
 * Лёгкое клиентское хранилище контекста заявки.
 *
 * 🔴 Почему хранилище, а не адрес и не общий React-стейт страницы.
 * Публичные страницы обязаны собираться на сервере (инвариант 1), а
 * калькулятор, подбор и форма — три разных листа с `'use client'` в разных
 * секциях лендинга. Поднять их состояние в общий провайдер значило бы
 * сделать клиентской всю страницу; сложить контекст в параметры адреса —
 * заставить главную рендериться по запросу (`searchParams` отключает ISR) и
 * дёргать историю браузера на каждом движении ползунка.
 *
 * Модульный синглтон решает переход внутри страницы, `sessionStorage` —
 * переход между страницами в той же вкладке (каталог → форма на главной) и
 * перезагрузку. Вкладку закрыли — контекст умер вместе с ней, и это верно:
 * снимок описывает один визит, а не человека.
 *
 * Фичи не импортируют друг друга (ADR-096): писать сюда будут виджеты, а они
 * стоят слоем выше и вправе.
 */

/** Ключ хранилища — по образцу `tk-theme` из переключателя темы. */
const STORAGE_KEY = 'tk-lead-context';

let current: LeadContext | null = null;
/** Хранилище читается один раз за жизнь страницы, а не на каждый рендер. */
let restored = false;
const listeners = new Set<() => void>();

/**
 * Доступ к хранилищу отделён от логики: в приватном окне и при запрещённых
 * данных сайта обращение бросает исключение, и уронить из-за этого форму
 * заявки нельзя — контекст всего лишь приятное дополнение к ней.
 */
function storage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function restore(): void {
  restored = true;
  const store = storage();
  if (store === null) return;

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw === null) return;
    current = parseLeadContext(JSON.parse(raw));
  } catch {
    // чужая или испорченная запись — просто нет контекста
    current = null;
  }
}

function persist(): void {
  const store = storage();
  if (store === null) return;

  try {
    if (current === null) store.removeItem(STORAGE_KEY);
    else store.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // переполненное хранилище не повод ломать отправку заявки
  }
}

function announce(): void {
  for (const listener of listeners) listener();
}

/** Текущий снимок. Ссылка стабильна, пока контекст не менялся. */
export function readLeadContext(): LeadContext | null {
  if (!restored) restore();
  return current;
}

/**
 * Запомнить часть контекста: расчёт, подбор, модель у кнопки «Заказать» или
 * отмеченные модели. Части складываются — второе действие человека не
 * отменяет первого.
 */
export function rememberLeadContext(patch: Partial<LeadContext>): void {
  const next = mergeLeadContext(readLeadContext(), patch);

  /* Повторная запись того же снимка ничего не меняет. Это не оптимизация:
     подписчик получает новую ссылку только при настоящем изменении, иначе
     компонент, публикующий снимок при монтировании, перерисовывал бы форму
     на каждом своём рендере. */
  if (JSON.stringify(next) === JSON.stringify(current)) return;

  current = next;
  persist();
  announce();
}

/**
 * Забыть контекст. Вызывается после отправки заявки и по кнопке «не
 * прикреплять»: следующая заявка из той же вкладки не должна уезжать со
 * вчерашним расчётом.
 */
export function forgetLeadContext(): void {
  if (!restored) restored = true;
  current = null;
  persist();
  announce();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** На сервере контекста нет по определению: он рождается из действий в браузере. */
function serverSnapshot(): LeadContext | null {
  return null;
}

/**
 * Контекст для компонента. Через `useSyncExternalStore`, а не через
 * `useState` + эффект: разметка сервера и первый клиентский рендер обязаны
 * совпасть, а хранилище читается уже после гидратации.
 */
export function useLeadContext(): LeadContext | null {
  return useSyncExternalStore(subscribe, readLeadContext, serverSnapshot);
}
