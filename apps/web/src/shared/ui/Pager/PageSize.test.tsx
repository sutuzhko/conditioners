import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PageSize } from './PageSize';

/* 🔴 Подмене объявлен тип аргумента. Голый `vi.fn()` типизирует его как `any`,
   и запрет проекта на `as` обходится молча — компилятор находит это потом. */
const push = vi.fn<(href: string) => void>();

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const options = [
  { label: '8', href: '/admin/stock?size=8' },
  { label: '20', href: '/admin/stock' },
  { label: '50', href: '/admin/stock?size=50' },
];

/** Адрес действующего шага — он же значение поля: значение пункта и есть ссылка. */
const CURRENT = '/admin/stock';

describe('PageSize', () => {
  it('🔴 шаг листания — одна цель, а не ряд ступеней', () => {
    render(<PageSize title="Строк на странице" value={CURRENT} options={options} />);

    expect(screen.getAllByRole('combobox')).toHaveLength(1);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('имя поля — та же подпись, что видна рядом, и звучит она один раз', () => {
    render(<PageSize title="Строк на странице" value={CURRENT} options={options} />);

    const field = screen.getByRole('combobox', { name: 'Строк на странице' });
    expect(field).toHaveValue(CURRENT);
    /* Видимая надпись скрыта от чтения: иначе читалка объявит её дважды. */
    expect(screen.getByText('Строк на странице')).toHaveAttribute('aria-hidden', 'true');
  });

  /* 🔴 Адрес каждой ступени остаётся в разметке: ступени были ссылками, и
     потерять вместе с ними проверяемое «куда ведёт шаг» значило бы разменять
     один дефект на другой. */
  it('показывает все ступени, и значение пункта — его адрес', () => {
    render(<PageSize title="Строк на странице" value={CURRENT} options={options} />);

    const steps = screen.getAllByRole('option');
    expect(steps.map((node) => node.textContent)).toEqual(['8', '20', '50']);
    expect(steps.map((node) => node.getAttribute('value'))).toEqual([
      '/admin/stock?size=8',
      '/admin/stock',
      '/admin/stock?size=50',
    ]);
  });

  it('🔴 выбор ступени уводит по её адресу — шаг живёт в адресе, а не в состоянии', async () => {
    const user = userEvent.setup();
    push.mockClear();
    render(<PageSize title="Строк на странице" value={CURRENT} options={options} />);

    await user.selectOptions(screen.getByRole('combobox'), '/admin/stock?size=8');

    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0]?.[0]).toBe('/admin/stock?size=8');
  });

  it('умолчание раздела уводит на чистый адрес: `size` в ссылке лишний', async () => {
    const user = userEvent.setup();
    push.mockClear();
    render(<PageSize title="Строк на странице" value="/admin/stock?size=8" options={options} />);

    await user.selectOptions(screen.getByRole('combobox'), '/admin/stock');

    expect(push.mock.calls[0]?.[0]).toBe('/admin/stock');
  });
});
