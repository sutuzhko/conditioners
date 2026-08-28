'use client';

import { useSyncExternalStore } from 'react';

/**
 * Предмет обращения — то, ради чего нажали кнопку у модели или у калькулятора
 * (ADR-129). Живёт в адресе (`/?model=<слаг>&topic=install#lead`), а сюда его
 * кладёт клиентский лист `LeadSubjectSync`, читающий `useSearchParams()`.
 *
 * 🔴 Почему хранилище, а не пропс страницы. Главная статическая с
 * `revalidate = 3600`: прочитай её серверный компонент `searchParams` — Next
 * перевёл бы страницу в динамический рендер, и она ходила бы в базу на каждый
 * запрос, потеряв пререндер и бюджет LCP. Чтение параметров ограничено
 * клиентским листом, а форма получает предмет отсюда.
 *
 * 🔴 Почему без `sessionStorage`, в отличие от соседнего `./context`. Предмет
 * живёт в адресе, а не в визите: ссылку пересылают и перезагружают, и она
 * обязана открывать ту же заполненную форму. Пережить закрытие вкладки ему
 * незачем — адрес переживёт сам (ADR-129, ADR-133).
 */

/**
 * Предмет так, как он пришёл из адреса: значения сырые.
 *
 * 🔴 Тема хранится строкой, а не `LeadTopicKey`: адрес правят руками, и в
 * хранилище лежит ровно то, что в нём написано. Проверяет ключ форма — она же
 * знает, какой темой заменить неизвестный (`leadTopicByKey`).
 */
export interface LeadSubjectParams {
  /** Слаг модели: названия и цены в адрес не едут. */
  readonly model?: string | undefined;
  readonly topic?: string | undefined;
}

let current: LeadSubjectParams | null = null;
const listeners = new Set<() => void>();

function announce(): void {
  for (const listener of listeners) listener();
}

/** Текущий предмет. Ссылка стабильна, пока адрес не менялся. */
export function readLeadSubject(): LeadSubjectParams | null {
  return current;
}

/**
 * Запомнить предмет из адреса.
 *
 * Повторная запись того же предмета ничего не меняет: подписчик получает новую
 * ссылку только при настоящей смене адреса, иначе форма затирала бы правку
 * человека на каждом своём рендере. А новый предмет ссылку меняет — человек
 * вернулся и нажал другую кнопку, это новое намерение, и оно сильнее старой
 * подстановки.
 */
export function rememberLeadSubject(subject: LeadSubjectParams): void {
  if (JSON.stringify(subject) === JSON.stringify(current)) return;

  current = subject;
  announce();
}

/** Забыть предмет. Нужен историям и тестам: соседние обязаны начинать с чистого. */
export function forgetLeadSubject(): void {
  if (current === null) return;

  current = null;
  announce();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** На сервере предмета нет: параметры адреса читает только клиентский лист. */
function serverSnapshot(): LeadSubjectParams | null {
  return null;
}

/**
 * Предмет для компонента. Через `useSyncExternalStore`, а не через `useState` +
 * эффект: разметка сервера и первый клиентский рендер обязаны совпасть, а
 * параметры адреса приезжают уже после гидратации.
 */
export function useLeadSubject(): LeadSubjectParams | null {
  return useSyncExternalStore(subscribe, readLeadSubject, serverSnapshot);
}
