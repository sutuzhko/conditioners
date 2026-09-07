import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const params = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => params }));

import { TabLinks, type TabLinkItem } from './TabLinks';
import { TabPanels, type TabPanelItem } from './TabPanels';

const LINKS: readonly TabLinkItem<string>[] = [
  { key: 'active', title: 'Активные', href: { pathname: '/admin/orders' } },
  { key: 'new', title: 'Новые', href: { pathname: '/admin/orders', query: { tab: 'new' } } },
  { key: 'all', title: 'Все', href: { pathname: '/admin/orders', query: { tab: 'all' } } },
];

const PANELS: readonly TabPanelItem<string>[] = [
  { key: 'data', title: 'Данные', panel: <p>Данные клиента</p> },
  { key: 'orders', title: 'Заказы', panel: <p>Наряды</p> },
  { key: 'units', title: 'Техника', panel: <p>Техника</p> },
];

beforeEach(() => {
  for (const key of [...params.keys()]) params.delete(key);
  window.history.replaceState(null, '', '/admin/clients/42');
  Element.prototype.scrollIntoView = vi.fn();
});

describe('Лента вкладок-ссылок', () => {
  it('рисует ссылку на каждую вкладку и помечает открытую', () => {
    render(<TabLinks items={LINKS} active="new" label="Стопки заказов" />);

    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: 'Новые' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Активные' })).not.toHaveAttribute('aria-current');
  });

  it('лента названа: без имени она безымянна для озвучки', () => {
    render(<TabLinks items={LINKS} active="new" label="Стопки заказов" />);

    expect(screen.getByRole('navigation', { name: 'Стопки заказов' })).toBeInTheDocument();
  });

  /* У заготовки раздела открытой вкладки нет: параметров адреса `loading.tsx`
     не получает, и подсветить он может только не ту. */
  it('без открытой вкладки не подсвечивает ни одну', () => {
    render(<TabLinks items={LINKS} label="Стопки заказов" />);

    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveAttribute('aria-current');
    }
  });

  /* 🔴 Число на экране, словами — для озвучки: «Активные 7» читалка объявляет
     как «Активные семь», и это не значит ничего. */
  it('🔴 счётчик виден цифрой, а озвучивается словами', () => {
    render(
      <TabLinks
        items={[
          {
            key: 'active',
            title: 'Активные',
            href: { pathname: '/' },
            count: 7,
            countLabel: '7 нарядов',
          },
          { key: 'all', title: 'Все', href: { pathname: '/' } },
        ]}
        active="active"
        label="Стопки заказов"
      />,
    );

    const tab = screen.getByRole('link', { name: 'Активные 7 нарядов' });
    expect(tab).toHaveTextContent('7');
    // у вкладки без счётчика числа не появляется
    expect(screen.getByRole('link', { name: 'Все' })).toBeInTheDocument();
  });

  /* Заготовка раздела: адреса нет — по вкладке нельзя нажать. */
  it('вкладка без адреса не ссылка', () => {
    render(
      <TabLinks
        items={[
          { key: 'data', title: 'Данные' },
          { key: 'orders', title: 'Заказы' },
        ]}
        label="Карточка клиента"
        busy
      />,
    );

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Данные')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'true');
  });

  /* Линия ленты во всю ширину раздела без единой вкладки читается как
     оборванная вёрстка, а не как «вкладок нет». */
  it('пустой набор не рисует ничего', () => {
    const { container } = render(<TabLinks items={[]} label="Стопки заказов" />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('Вкладки с панелями', () => {
  it('открывает ту вкладку, что разобрал сервер', () => {
    render(<TabPanels items={PANELS} active="orders" label="Карточка клиента" idPrefix="client" />);

    expect(screen.getByRole('tab', { name: 'Заказы' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Наряды');
  });

  /* 🔴 Панели остаются в разметке под `hidden`, а не размонтируются:
     переключение не должно терять наполовину заполненную форму (ADR-256). */
  it('🔴 держит все панели в разметке, пряча лишние', () => {
    const { container } = render(
      <TabPanels items={PANELS} active="data" label="Карточка клиента" idPrefix="client" />,
    );

    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(3);
    expect(container.textContent).toContain('Техника');
  });

  /* 🔴 Адрес правится `pushState`, а не переходом роутера: данные всех вкладок
     карточка уже получила (ADR-256). */
  it('🔴 кладёт вкладку в адрес и оставляет запись в истории', async () => {
    const user = userEvent.setup();
    const push = vi.spyOn(window.history, 'pushState');

    render(<TabPanels items={PANELS} active="data" label="Карточка клиента" idPrefix="client" />);
    await user.click(screen.getByRole('tab', { name: 'Техника' }));

    expect(push).toHaveBeenCalled();
    expect(window.location.search).toBe('?tab=units');
    push.mockRestore();
  });

  /* 🔴 Стрелки водят фокус и открывают вкладку, но записи в историю не
     оставляют: иначе обход ленты кладёт туда столько записей, сколько в ней
     вкладок, и «назад» перестаёт выводить из карточки (issue #342). */
  it('🔴 стрелки не копят историю', async () => {
    const user = userEvent.setup();
    const push = vi.spyOn(window.history, 'pushState');

    render(<TabPanels items={PANELS} active="data" label="Карточка клиента" idPrefix="client" />);
    screen.getByRole('tab', { name: 'Данные' }).focus();
    await user.keyboard('{ArrowRight}');

    expect(push).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?tab=orders');
    push.mockRestore();
  });

  it('Home и End уводят к краям ленты', async () => {
    const user = userEvent.setup();

    render(<TabPanels items={PANELS} active="orders" label="Карточка клиента" idPrefix="client" />);
    screen.getByRole('tab', { name: 'Заказы' }).focus();

    await user.keyboard('{End}');
    expect(window.location.search).toBe('?tab=units');

    await user.keyboard('{Home}');
    expect(window.location.search).toBe('?tab=data');
  });

  it('из ленты выпадают все вкладки, кроме открытой', () => {
    render(<TabPanels items={PANELS} active="units" label="Карточка клиента" idPrefix="client" />);

    expect(screen.getByRole('tab', { name: 'Техника' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Данные' })).toHaveAttribute('tabindex', '-1');
  });

  it('лента названа: без имени она безымянна для озвучки', () => {
    render(<TabPanels items={PANELS} active="data" label="Карточка клиента" idPrefix="client" />);

    expect(screen.getByRole('tablist', { name: 'Карточка клиента' })).toBeInTheDocument();
  });

  /* 🔴 Раздел обязан открыться и по кривому адресу (issue #341): мусор в
     параметре оставляет открытой ту вкладку, что выбрал сервер. */
  it('🔴 мусор в адресе не открывает несуществующую вкладку', () => {
    params.set('tab', 'materials');

    render(<TabPanels items={PANELS} active="orders" label="Карточка клиента" idPrefix="client" />);

    expect(screen.getByRole('tab', { name: 'Заказы' })).toHaveAttribute('aria-selected', 'true');
  });

  /* Вкладка из адреса сильнее той, что разобрал сервер: так «назад» возвращает
     на предыдущую вкладку, а не выбрасывает из карточки (issue #342, #587). */
  it('🔴 вкладку из адреса открывает, а не ту, с которой карточку открыли', () => {
    params.set('tab', 'units');

    render(<TabPanels items={PANELS} active="data" label="Карточка клиента" idPrefix="client" />);

    expect(screen.getByRole('tab', { name: 'Техника' })).toHaveAttribute('aria-selected', 'true');
  });

  it('число стоит рядом с подписью и попадает в имя вкладки', () => {
    render(
      <TabPanels
        items={[
          PANELS[0] ?? { key: 'data', title: 'Данные', panel: null },
          {
            key: 'orders',
            title: 'Заказы',
            panel: <p>Наряды</p>,
            count: 3,
            countLabel: '3 наряда',
          },
          {
            key: 'units',
            title: 'Техника',
            panel: <p>Техника</p>,
            count: 0,
            countLabel: 'техники нет',
          },
        ]}
        active="data"
        label="Карточка клиента"
        idPrefix="client"
      />,
    );

    expect(screen.getByRole('tab', { name: 'Заказы 3 наряда' })).toHaveTextContent('3');
    // ноль показывается наравне с остальными числами
    expect(screen.getByRole('tab', { name: 'Техника техники нет' })).toHaveTextContent('0');
  });
});
