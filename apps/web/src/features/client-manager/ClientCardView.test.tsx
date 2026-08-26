import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ClientCardView } from './ClientCardView';
import { clientManagerContent as texts } from './content';
import { bareClient, client } from './fixtures';

describe('Клиент в списке', () => {
  it('показывает имя, телефон и адрес', () => {
    render(<ClientCardView client={client} />);

    expect(screen.getByRole('heading', { name: client.name })).toBeInTheDocument();
    expect(screen.getByText(client.address ?? '')).toBeInTheDocument();
  });

  it('телефон — ссылка для звонка', () => {
    render(<ClientCardView client={client} />);

    expect(screen.getByRole('link', { name: /155/ })).toHaveAttribute('href', 'tel:+79101552468');
  });

  it('имя ведёт в карточку клиента', () => {
    render(<ClientCardView client={client} />);

    expect(screen.getByRole('link', { name: client.name })).toHaveAttribute(
      'href',
      '/admin/clients/c1',
    );
  });

  it('считает обращения с сайта', () => {
    render(<ClientCardView client={client} />);

    expect(screen.getByText('2 обращения')).toBeInTheDocument();
  });

  it('клиент по звонку показывается без пустых строк', () => {
    render(<ClientCardView client={bareClient} />);

    expect(screen.queryByText(texts.address)).not.toBeInTheDocument();
    expect(screen.getByText('без обращений')).toBeInTheDocument();
  });

  it('дата появления подписана датой, а не заголовком карточки', () => {
    render(<ClientCardView client={client} />);

    expect(screen.getByText(texts.sinceLabel)).toBeInTheDocument();
    expect(screen.getByText('14.06.2026')).toBeInTheDocument();
  });
});
