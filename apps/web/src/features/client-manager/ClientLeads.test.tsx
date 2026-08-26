import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClientLeads } from './ClientLeads';
import { clientManagerContent as texts } from './content';
import { leads } from './fixtures';

describe('Обращения в карточке клиента', () => {
  it('перечисляет темы и статусы', () => {
    render(<ClientLeads leads={leads} />);

    expect(screen.getByText('Установка кондиционера')).toBeInTheDocument();
    expect(screen.getByText('Завершена')).toBeInTheDocument();
    expect(screen.getByText('Новая')).toBeInTheDocument();
  });

  it('🔴 обращение здесь не правится: статус меняют в разделе заявок', () => {
    render(<ClientLeads leads={leads} />);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('ведёт в раздел заявок', () => {
    render(<ClientLeads leads={leads} />);

    expect(screen.getByRole('link', { name: `${texts.leadsOpen} →` })).toHaveAttribute(
      'href',
      '/admin/leads',
    );
  });

  it('клиент по звонку — пустое состояние с объяснением', () => {
    render(<ClientLeads leads={[]} />);

    expect(screen.getByText(texts.leadsEmpty)).toBeInTheDocument();
  });
});
