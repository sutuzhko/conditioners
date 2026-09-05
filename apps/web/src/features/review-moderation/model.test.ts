import { describe, expect, it } from 'vitest';

import {
  REVIEW_TABS,
  reviewActionsFor,
  reviewFilterOf,
  reviewFilterOn,
  reviewFilterQuery,
  reviewStatusOfTab,
  reviewTabFromParam,
  reviewTabShowsTable,
  reviewsQuery,
} from './model';
import type { ReviewStatus, ReviewTab } from './model';

describe('вкладки раздела отзывов', () => {
  it('у каждой вкладки, кроме «Все», есть свой статус', () => {
    expect(reviewStatusOfTab('pending')).toBe('pending');
    expect(reviewStatusOfTab('published')).toBe('approved');
    expect(reviewStatusOfTab('rejected')).toBe('rejected');
    expect(reviewStatusOfTab('archived')).toBe('archived');
    expect(reviewStatusOfTab('all')).toBeUndefined();
  });

  /* 🔴 То, ради чего вкладка заведена (ADR-300, issue #514): без своего
     фильтра архивные показывались только вперемешку на «Все», по восемь
     записей на страницу, и с каждым месяцем уезжали дальше. */
  it('«В архиве» идёт в базу за архивными, а не снимает фильтр', () => {
    expect(reviewStatusOfTab('archived')).toBe('archived');
    expect(reviewsQuery('archived')).toEqual({ tab: 'archived' });
  });

  it('«В архиве» стоит перед «Все»: «Все» — снятие фильтра и всегда последняя', () => {
    expect(REVIEW_TABS.at(-1)).toBe('all');
    expect(REVIEW_TABS.at(-2)).toBe('archived');
  });

  it('ключ вкладки разбирается из адреса, мусор открывает первую', () => {
    expect(reviewTabFromParam('archived')).toBe('archived');
    expect(reviewTabFromParam('арxив')).toBe('pending');
    expect(reviewTabFromParam(undefined)).toBe('pending');
  });
});

describe('действия по вкладкам', () => {
  it('на модерации решение из двух: опубликовать или отклонить', () => {
    expect(reviewActionsFor('pending', 'pending')).toEqual(['approve', 'reject']);
  });

  it('опубликованный снимается с сайта, но не стирается', () => {
    expect(reviewActionsFor('published', 'approved')).toEqual(['archive']);
  });

  /**
   * 🔴 Архив заведён затем, чтобы убрать с сайта, ничего не потеряв
   * (ADR-300). Кнопка «Удалить» в нём отменяла бы смысл состояния — и
   * правило одно на обе вкладки, где архивный отзыв виден.
   */
  it.each<ReviewTab>(['archived', 'all'])('в архиве нет удаления — вкладка %s', (tab) => {
    expect(reviewActionsFor(tab, 'archived')).toEqual(['approve', 'restore']);
  });

  it('удаление остаётся только у отклонённых: там реклама и спам', () => {
    expect(reviewActionsFor('rejected', 'rejected')).toContain('remove');
    expect(reviewActionsFor('all', 'rejected')).toContain('remove');
  });

  /* «Все» — сквозной список: найденный там отзыв не должен требовать перехода
     на свою вкладку, чтобы с ним что-то сделать. */
  it.each<ReviewStatus>(['pending', 'approved', 'rejected', 'archived'])(
    'на «Все» у отзыва в статусе %s те же действия, что на своей вкладке',
    (status) => {
      const own: Record<ReviewStatus, ReviewTab> = {
        pending: 'pending',
        approved: 'published',
        rejected: 'rejected',
        archived: 'archived',
      };

      expect(reviewActionsFor('all', status)).toEqual(reviewActionsFor(own[status], status));
    },
  );
});

describe('вид вкладки: карточки или таблица (issue #613)', () => {
  /* 🔴 На очереди модерации решают по тексту целиком, и карточка —
     единственный способ показать его без «показать ещё». */
  it('карточки остались только на «На модерации»', () => {
    expect(reviewTabShowsTable('pending')).toBe(false);
    expect(reviewTabShowsTable('published')).toBe(true);
    expect(reviewTabShowsTable('rejected')).toBe(true);
    expect(reviewTabShowsTable('archived')).toBe(true);
    expect(reviewTabShowsTable('all')).toBe(true);
  });
});

describe('сквозной отбор вкладки «Все»', () => {
  it('читает поиск, статус и оценку из адреса', () => {
    expect(reviewFilterOf({ q: '  штроба ', status: 'approved', rating: '4' })).toEqual({
      query: 'штроба',
      status: 'approved',
      rating: 4,
    });
  });

  /* 🔴 Адрес правят руками и присылают друг другу: мусор снимает условие, а не
     роняет раздел (issue #341). */
  it('мусор в параметрах снимает условие, а не роняет раздел', () => {
    expect(reviewFilterOf({ status: 'опубликован', rating: '9' })).toEqual({
      query: '',
      status: undefined,
      rating: undefined,
    });
    expect(reviewFilterOf({ rating: 'пять' }).rating).toBeUndefined();
  });

  it('пустой отбор в адрес не уезжает', () => {
    expect(reviewFilterQuery({ query: '', status: undefined, rating: undefined })).toEqual({});
    expect(reviewFilterOn({ query: '', status: undefined, rating: undefined })).toBe(false);
  });

  /* 🔴 Разбивка обязана нести отбор за собой: без него вторая страница
     найденного показывала бы весь раздел. */
  it('разбивка вкладки «Все» несёт отбор в адрес', () => {
    expect(reviewsQuery('all', { query: 'штроба', status: 'rejected', rating: 3 })).toEqual({
      tab: 'all',
      q: 'штроба',
      status: 'rejected',
      rating: '3',
    });
  });

  it('без отбора адрес вкладки остаётся прежним', () => {
    expect(reviewsQuery('published')).toEqual({ tab: 'published' });
    expect(reviewsQuery('pending')).toEqual({});
  });
});
