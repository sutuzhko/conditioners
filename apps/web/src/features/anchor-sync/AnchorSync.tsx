'use client';

import { useEffect } from 'react';

/**
 * Доля высоты окна сверху, ниже которой секция считается «читаемой сейчас».
 *
 * Полоса, а не точка: с ней активной становится секция, добравшаяся до
 * верхней трети экрана, — примерно там, куда смотрит человек при прокрутке.
 */
const TOP_RATIO = 0.3;

/** Симметричный отступ снизу: вместе с верхним он и задаёт ширину полосы. */
const BOTTOM_RATIO = 0.6;

/**
 * Синхронизация адреса с секцией, которую посетитель читает.
 *
 * Прокрутил до каталога — в адресной строке `#catalog`, и ссылку можно
 * скопировать прямо оттуда. Вернулся наверх — адрес снова чистый.
 *
 * 🔴 `replaceState`, а не `pushState`: иначе каждая секция добавляла бы запись
 * в историю, и кнопка «назад» вместо предыдущей страницы возвращала бы
 * посетителя по собственной прокрутке.
 *
 * Компонент ничего не рисует и стоит листом на странице: разметка секций
 * приходит от сервера (инвариант 1), скрипт только следит за видимостью.
 * Наблюдатель дешёвый — браузер сам считает пересечения, обработчика на
 * каждый кадр прокрутки здесь нет.
 */
export function AnchorSync() {
  useEffect(() => {
    const sections = [...document.querySelectorAll<HTMLElement>('main section[id]')];
    if (sections.length === 0 || typeof IntersectionObserver !== 'function') return;

    // порядок в DOM: из нескольких видимых секций активна верхняя
    const order = new Map(sections.map((section, index) => [section.id, index]));
    const visible = new Set<string>();
    let current = window.location.hash.slice(1);

    const apply = (id: string) => {
      if (id === current) return;
      current = id;

      const { pathname, search } = window.location;
      window.history.replaceState(null, '', id === '' ? `${pathname}${search}` : `#${id}`);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const { id } = entry.target;
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }

        /* Пусто — значит полоса пришлась на первый экран или на футер: адрес
           возвращается к чистому, чтобы ссылка со страницы вела на её верх. */
        const top = [...visible].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))[0];
        apply(top ?? '');
      },
      {
        rootMargin: `-${Math.round(TOP_RATIO * 100)}% 0px -${Math.round(BOTTOM_RATIO * 100)}% 0px`,
        threshold: 0,
      },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return null;
}
