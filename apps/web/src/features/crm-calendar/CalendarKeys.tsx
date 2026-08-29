'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { crmHref, stepQuery, todayQuery, viewQuery, type CalendarPlace } from './navigation';
import type { CalendarView } from './model';

export interface CalendarKeysProps extends CalendarPlace {
  /** Открыть подсказку по клавишам. Не задано — клавиша «?» ничего не делает. */
  readonly onHelp?: (() => void) | undefined;
}

/**
 * Клавиши календаря — [CRM §3.5.1](../../../../docs/CRM.md), эталон Apple
 * Calendar: виды, «сегодня», листание периодов.
 *
 * 🔴 Клавиши читаются по **физической позиции** (`event.code`), а не по
 * набранному символу. Владелец работает с русской раскладкой, и на ней та же
 * клавиша даёт «в», «ц», «ь», «е». Сверяйся мы с `event.key`, календарь
 * слушался бы только человека, переключившегося на английский, — то есть
 * почти никогда.
 *
 * Компонент ничего не рисует: он только слушает. Вид и период живут в адресе
 * (ADR-128), поэтому нажатие — это переход, а не смена состояния.
 */
export function CalendarKeys({ onHelp, ...place }: CalendarKeysProps) {
  const router = useRouter();

  useEffect(() => {
    const go = (query: Record<string, string>): void => {
      router.push(crmHref(query));
    };

    const handle = (event: KeyboardEvent): void => {
      /* Сочетания оставлены браузеру и системе: Cmd+D — закладка, Ctrl+W —
         закрыть вкладку. Перехватывать их значит ломать то, чем человек
         пользуется вне календаря. */
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTyping(event.target)) return;
      if (isDialogOpen()) return;

      const view = VIEW_BY_CODE[event.code];
      if (view !== undefined) {
        event.preventDefault();
        go(viewQuery(place, view));
        return;
      }

      if (event.code === TODAY_CODE) {
        event.preventDefault();
        go(todayQuery(place));
        return;
      }

      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault();
        go(stepQuery(place, event.code === 'ArrowLeft' ? -1 : 1));
        return;
      }

      /* Знак вопроса — единственная клавиша, которую спрашиваем по символу:
         это и есть символ, а не позиция. На русской раскладке он набирается
         другой клавишей, и позиция здесь только помешала бы. */
      if (event.key === '?' && onHelp !== undefined) {
        event.preventDefault();
        onHelp();
      }
    };

    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [router, onHelp, place]);

  return null;
}

/** Позиции клавиш D, W, M — как в Apple Calendar. */
const VIEW_BY_CODE: Readonly<Record<string, CalendarView>> = {
  KeyD: 'day',
  KeyW: 'week',
  KeyM: 'month',
};

const TODAY_CODE = 'KeyT';

/**
 * 🔴 В поле ввода буква обязана оставаться буквой. Без этой проверки «т» в
 * поиске уводило бы календарь на сегодня, а «д» — в вид дня, и заполнить
 * форму стало бы нельзя (issue #123).
 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** Пока открыто окно, клавиши принадлежат ему: за ним календаря не видно. */
function isDialogOpen(): boolean {
  return document.querySelector('[role="dialog"]') !== null;
}
