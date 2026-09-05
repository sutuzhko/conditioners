import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const params = new URLSearchParams();
vi.mock('next/navigation', () => ({ useSearchParams: () => params }));

import { PanelTabs } from './PanelTabs';

const TABS = ['data', 'orders', 'units'] as const;
const TITLES = { data: 'Данные', orders: 'Заказы', units: 'Техника' } as const;

function renderTabs(active: (typeof TABS)[number] = 'data') {
  return render(
    <PanelTabs
      active={active}
      tabs={TABS}
      titles={TITLES}
      label="Карточка клиента"
      idPrefix="client"
      panels={{ data: <p>Данные клиента</p>, orders: <p>Наряды</p>, units: <p>Техника</p> }}
    />,
  );
}

beforeEach(() => {
  for (const key of [...params.keys()]) params.delete(key);
  window.history.replaceState(null, '', '/admin/clients/42');
});

describe('Вкладки панели', () => {
  it('открывает ту вкладку, что разобрал сервер', () => {
    renderTabs('orders');

    expect(screen.getByRole('tab', { name: TITLES.orders })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Наряды');
  });

  /* 🔴 Панели остаются в разметке под `hidden`, а не размонтируются:
     переключение не должно терять наполовину заполненную форму (ADR-256). */
  it('🔴 держит все панели в разметке, пряча лишние', () => {
    const { container } = renderTabs();

    const panels = container.querySelectorAll('[role="tabpanel"]');
    expect(panels).toHaveLength(3);
    expect(container.textContent).toContain('Техника');
  });

  /* 🔴 Адрес правится `pushState`, а не переходом роутера: данные всех
     вкладок карточка уже получила (ADR-256). */
  it('🔴 кладёт вкладку в адрес и оставляет запись в истории', async () => {
    const user = userEvent.setup();
    const push = vi.spyOn(window.history, 'pushState');

    renderTabs();
    await user.click(screen.getByRole('tab', { name: TITLES.units }));

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

    renderTabs();
    screen.getByRole('tab', { name: TITLES.data }).focus();
    await user.keyboard('{ArrowRight}');

    expect(push).not.toHaveBeenCalled();
    expect(window.location.search).toBe('?tab=orders');
    push.mockRestore();
  });

  it('из ленты выпадают все вкладки, кроме открытой', () => {
    renderTabs('units');

    expect(screen.getByRole('tab', { name: TITLES.units })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: TITLES.data })).toHaveAttribute('tabindex', '-1');
  });

  it('лента названа: без имени она безымянна для озвучки', () => {
    renderTabs();

    expect(screen.getByRole('tablist', { name: 'Карточка клиента' })).toBeInTheDocument();
  });
});

/**
 * Счётчики у подписей (issue #602, макет `CardTabs.png`): по ним видно, есть
 * ли за вкладкой что-нибудь, до того как на неё нажали.
 */
describe('Вкладки панели — счётчики', () => {
  it('число стоит рядом с подписью и попадает в имя вкладки', () => {
    render(
      <PanelTabs
        active="data"
        tabs={TABS}
        titles={TITLES}
        label="Карточка клиента"
        idPrefix="client"
        counts={{ orders: 3, units: 2 }}
        panels={{ data: <p>Данные</p>, orders: <p>Наряды</p>, units: <p>Техника</p> }}
      />,
    );

    expect(screen.getByRole('tab', { name: `${TITLES.orders} 3` })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: `${TITLES.units} 2` })).toBeInTheDocument();
  });

  /* Ноль показывается наравне с остальными: «Техника 0» отвечает на вопрос,
     а пустое место — нет. */
  it('ноль показывается, а не прячется', () => {
    render(
      <PanelTabs
        active="data"
        tabs={TABS}
        titles={TITLES}
        label="Карточка клиента"
        idPrefix="client"
        counts={{ units: 0 }}
        panels={{ data: <p>Данные</p>, orders: <p>Наряды</p>, units: <p>Техника</p> }}
      />,
    );

    expect(screen.getByRole('tab', { name: `${TITLES.units} 0` })).toBeInTheDocument();
    // у вкладки без счётчика число не появляется
    expect(screen.getByRole('tab', { name: TITLES.orders })).toBeInTheDocument();
  });
});
