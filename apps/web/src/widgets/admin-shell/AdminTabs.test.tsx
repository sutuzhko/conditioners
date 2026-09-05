import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminTabs } from './AdminTabs';
import { ADMIN_TABS, adminShellContent as texts, columnSectionsFor } from './content';

const pathname = vi.fn(() => '/admin/stock');

vi.mock('next/navigation', () => ({
  usePathname: () => pathname(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

beforeEach(() => {
  pathname.mockReturnValue('/admin/stock');
});

describe('Нижняя панель вкладок', () => {
  /* 🔴 Пять целей — предел: шестая делает подписи нечитаемыми, а ширина цели
     на экране 320 уходит ниже 44px. */
  it('показывает четыре раздела и «Ещё» — ровно пять целей', () => {
    render(<AdminTabs role="owner" />);

    const bar = screen.getByRole('navigation', { name: texts.tabsLabel });
    const targets = [...within(bar).getAllByRole('link'), ...within(bar).getAllByRole('button')];

    expect(within(bar).getAllByRole('link')).toHaveLength(ADMIN_TABS);
    expect(within(bar).getByRole('button', { name: texts.more })).toBeInTheDocument();
    expect(targets).toHaveLength(5);
  });

  it('во вкладках стоят первые разделы, остальные уходят за «Ещё»', async () => {
    const user = userEvent.setup();
    render(<AdminTabs role="owner" />);

    const bar = screen.getByRole('navigation', { name: texts.tabsLabel });
    const column = columnSectionsFor('owner');

    /* Подпись во вкладке короткая, где она задана: «Календарь работ» не
       помещается в пятую часть экрана. */
    for (const section of column.slice(0, ADMIN_TABS)) {
      expect(
        within(bar).getByRole('link', { name: section.short ?? section.title }),
      ).toBeInTheDocument();
    }
    expect(within(bar).queryByRole('link', { name: 'Склад' })).not.toBeInTheDocument();

    await user.click(within(bar).getByRole('button', { name: texts.more }));

    const sheet = screen.getByRole('dialog');
    for (const section of column.slice(ADMIN_TABS)) {
      expect(within(sheet).getByRole('link', { name: section.title })).toBeInTheDocument();
    }
  });

  /* Раздел из листа открыт — подсвеченной цели на панели иначе нет вовсе, и
     она выглядит потерявшей место. */
  it('«Ещё» подсвечено, когда открыт раздел из листа', () => {
    render(<AdminTabs role="owner" />);

    const bar = screen.getByRole('navigation', { name: texts.tabsLabel });
    expect(within(bar).getByRole('button', { name: texts.more }).className).toMatch(/tabActive/);
  });

  it('открытая вкладка несёт aria-current', () => {
    pathname.mockReturnValue('/admin/leads');
    render(<AdminTabs role="owner" />);

    const bar = screen.getByRole('navigation', { name: texts.tabsLabel });
    expect(within(bar).getByRole('link', { name: 'Заявки' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  /* «Открыть сайт» приехало в лист из убранной верхней полосы (ADR-309): на
     телефоне это единственное место, где ссылка на сайт вообще есть. */
  it('лист держит настройки, профиль, сайт и выход', async () => {
    const user = userEvent.setup();
    render(<AdminTabs role="owner" />);

    await user.click(screen.getByRole('button', { name: texts.more }));

    const sheet = screen.getByRole('dialog');
    expect(within(sheet).getByRole('link', { name: 'Настройки' })).toBeInTheDocument();
    expect(within(sheet).getByRole('link', { name: 'Профиль' })).toBeInTheDocument();

    const site = within(sheet).getByRole('link', { name: texts.site });
    expect(site).toHaveAttribute('href', '/');
    expect(site).toHaveAttribute('target', '_blank');

    expect(within(sheet).getByRole('button', { name: texts.logout })).toBeInTheDocument();
  });

  /* 🔴 Лист уходит порталом в конец документа, за пределы контейнера панели:
     без грунта её плотность и геометрия внутри него не определены (ADR-187). */
  it('лист несёт грунт панели: порталом он уходит за её пределы', async () => {
    const user = userEvent.setup();
    render(<AdminTabs role="owner" />);

    await user.click(screen.getByRole('button', { name: texts.more }));

    expect(screen.getByRole('dialog').querySelector('[data-ui="panel"]')).not.toBeNull();
  });

  it('монтажнику показывает только его разделы', () => {
    pathname.mockReturnValue('/admin/crm');
    render(<AdminTabs role="installer" />);

    const bar = screen.getByRole('navigation', { name: texts.tabsLabel });
    expect(within(bar).getByRole('link', { name: 'Календарь' })).toBeInTheDocument();
    expect(within(bar).queryByRole('link', { name: 'Заявки' })).not.toBeInTheDocument();
  });
});
