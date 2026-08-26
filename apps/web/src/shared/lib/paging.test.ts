import { describe, expect, it } from 'vitest';

import { ADMIN_PAGE_SIZE, pageNumber, pageWindow } from './paging';

describe('pageNumber', () => {
  it('читает номер из адреса', () => {
    expect(pageNumber('3')).toBe(3);
    expect(pageNumber('12')).toBe(12);
  });

  it('мусор, ноль и отрицательное — первая страница, а не отказ', () => {
    // адрес правят руками и присылают друг другу
    expect(pageNumber('нет')).toBe(1);
    expect(pageNumber('0')).toBe(1);
    expect(pageNumber('-2')).toBe(1);
    expect(pageNumber('')).toBe(1);
    expect(pageNumber(undefined)).toBe(1);
  });
});

describe('pageWindow', () => {
  it('считает границы выборки по размеру страницы', () => {
    expect(pageWindow(20, 1, 8)).toEqual({ page: 1, pages: 3, skip: 0, take: 8 });
    expect(pageWindow(20, 2, 8)).toEqual({ page: 2, pages: 3, skip: 8, take: 8 });
    expect(pageWindow(20, 3, 8)).toEqual({ page: 3, pages: 3, skip: 16, take: 8 });
  });

  it('номер за пределами списка прижимается к последней странице', () => {
    // так бывает после удаления последней записи со страницы
    expect(pageWindow(20, 99, 8)).toMatchObject({ page: 3, pages: 3, skip: 16 });
  });

  it('пустой список — одна страница, а не ноль', () => {
    expect(pageWindow(0, 1, 8)).toEqual({ page: 1, pages: 1, skip: 0, take: 8 });
  });

  it('размер страницы по умолчанию — общий для разделов панели', () => {
    expect(pageWindow(ADMIN_PAGE_SIZE + 1, 2)).toMatchObject({
      pages: 2,
      skip: ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    });
  });
});
