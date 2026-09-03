import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/* Адрес карточки подменяется целиком: вкладка живёт в нём, а не в состоянии
   компонента, и проверять надо именно то, что уходит в историю браузера. */
const CARD_PATH = '/admin/orders/o1';
let search = '';

vi.mock('next/navigation', () => ({
  usePathname: () => CARD_PATH,
  useSearchParams: () => new URLSearchParams(search),
}));

import { ORDER_CARD_TAB_TITLE, orderManagerContent as texts } from './content';
import type { OrderCardTab } from './model';
import { OrderWorkTabs } from './OrderWorkTabs';

/* Лента вкладок подвозит открытую к глазам, а jsdom прокрутки не умеет вовсе:
   без заглушки падал бы не сценарий, а отсутствующий в jsdom метод. */
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderTabs(active: OrderCardTab = 'job', { forInstaller = false } = {}) {
  return render(
    <OrderWorkTabs
      active={active}
      job={<p>Данные наряда</p>}
      materials={<p>Списано со склада</p>}
      checklist={<p>Список сборов</p>}
      documents={<p>Договор и снимки</p>}
      /* Монтажнику история не приходит вовсе — ключа нет, и вкладки нет. */
      history={forInstaller ? undefined : <p>Кто и когда менял</p>}
    />,
  );
}

/** Куда браузер увели последним переключением. */
function url(): string {
  return `${window.location.pathname}${window.location.search}`;
}

beforeEach(() => {
  search = '';
  window.history.replaceState(null, '', CARD_PATH);
});

describe('Вкладки наряда', () => {
  it('🔴 стрелки открывают вкладку, но истории не копят', async () => {
    /* Проход по трём вкладкам стрелками не должен оставлять три записи: иначе
       «назад» выводит из карточки по одному нажатию клавиши. */
    const push = vi.spyOn(window.history, 'pushState');
    const replace = vi.spyOn(window.history, 'replaceState');
    renderTabs();

    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');

    expect(push).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledTimes(2);
    expect(url()).toBe(`${CARD_PATH}?tab=checklist`);

    push.mockRestore();
    replace.mockRestore();
  });

  it('🔴 нажатие по вкладке кладёт запись в историю', async () => {
    const push = vi.spyOn(window.history, 'pushState');
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.documents }));

    expect(push).toHaveBeenCalledTimes(1);
    expect(url()).toBe(`${CARD_PATH}?tab=documents`);

    push.mockRestore();
  });

  it('пять вкладок словаря, открыт наряд', () => {
    renderTabs();

    expect(screen.getAllByRole('tab')).toHaveLength(5);
    expect(screen.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.job })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('🔴 у монтажника вкладок четыре: истории он не видит вовсе', () => {
    renderTabs('job', { forInstaller: true });

    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(
      screen.queryByRole('tab', { name: ORDER_CARD_TAB_TITLE.history }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Кто и когда менял')).not.toBeInTheDocument();
  });

  it('🔴 присланная монтажнику ссылка на историю открывает наряд, а не пустоту', () => {
    search = 'tab=history';
    renderTabs('job', { forInstaller: true });

    expect(screen.getByText('Данные наряда')).toBeVisible();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
  });

  it('расход открывается своей вкладкой, а не блоком под лентой', () => {
    renderTabs('materials');

    expect(screen.getByText('Списано со склада')).toBeVisible();
    expect(screen.getByText('Данные наряда')).not.toBeVisible();
  });

  it('🔴 открытая вкладка приходит с сервера: содержимое видно без единого клика', () => {
    renderTabs('checklist');

    expect(screen.getByText('Список сборов')).toBeVisible();
    expect(screen.getByText('Данные наряда')).not.toBeVisible();
  });

  it('🔴 вкладка из адреса перевешивает разобранную сервером', () => {
    /* Так выглядит состояние после переключения: сервер отдал первую
       вкладку, браузер сменил адрес. */
    search = 'tab=documents';
    renderTabs('job');

    expect(screen.getByText('Договор и снимки')).toBeVisible();
  });

  it('чужой ключ в адресе открывает первую вкладку, а не пустоту', () => {
    search = 'tab=payments';
    renderTabs('job');

    expect(screen.getByText('Данные наряда')).toBeVisible();
  });

  it('🔴 переключение кладёт вкладку в адрес — «назад» возвращает на предыдущую', async () => {
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.checklist }));

    expect(url()).toBe(`${CARD_PATH}?tab=checklist`);
  });

  it('🔴 скрытая панель остаётся в разметке: наполовину заполненный отчёт не теряется', async () => {
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.documents }));

    expect(screen.getByText('Данные наряда')).toBeInTheDocument();
  });

  it('стрелки переводят между вкладками — это лента, а не набор кнопок', async () => {
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.job }));
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.materials })).toHaveFocus();
    expect(url()).toBe(`${CARD_PATH}?tab=materials`);
  });

  it('End уводит на последнюю вкладку, Home возвращает на первую', async () => {
    renderTabs();

    await userEvent.click(screen.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.job }));
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.history })).toHaveFocus();

    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.job })).toHaveFocus();
    expect(url()).toBe(`${CARD_PATH}?tab=job`);
  });

  it('из ленты вкладок Tab выводит на панель, а не на соседнюю вкладку', () => {
    renderTabs();

    expect(screen.getByRole('tab', { name: ORDER_CARD_TAB_TITLE.checklist })).toHaveAttribute(
      'tabindex',
      '-1',
    );
  });

  it('панель подписана своей вкладкой', () => {
    renderTabs();

    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'order-tab-job');
  });

  it('лента вкладок подписана для скринридера', () => {
    renderTabs();

    expect(screen.getByRole('tablist')).toHaveAccessibleName(texts.workTabsLabel);
  });
});
