import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { formatPhone } from '@/shared/lib/format';

import { ActionBarView } from './ActionBarView';
import { actionBarContent as t } from './content';
import { contactsFixture, contactsWithoutPhone } from './fixtures';

describe('Панель действий: содержимое', () => {
  it('обе кнопки — ссылки: их открывают средним кликом и держат в истории', () => {
    render(<ActionBarView contacts={contactsFixture} leadHref="/#lead" />);

    /* Номер проговаривается ровно так, как напечатан: подпись собирается тем
       же форматом, а не переписывается в тесте руками — иначе тест разошёлся
       бы с кодом на первой же правке формата. */
    const name = t.callAria(formatPhone('+74872900000'));

    expect(screen.getByRole('link', { name })).toHaveAttribute('href', 'tel:+74872900000');
    expect(screen.getByRole('link', { name: t.lead })).toHaveAttribute('href', '/#lead');
  });

  it('🔴 телефон не заполнен — кнопки звонка нет, а не пустая ссылка', () => {
    render(<ActionBarView contacts={contactsWithoutPhone} leadHref="/#lead" />);

    expect(screen.queryByRole('link', { name: /Позвонить/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: t.lead })).toBeInTheDocument();
  });

  it('счётчик сравнения называет голосом, чего именно две', () => {
    render(
      <ActionBarView
        contacts={contactsFixture}
        leadHref="/#lead"
        compare={{ count: 2, href: '/compare' }}
      />,
    );

    expect(screen.getByRole('link', { name: 'Сравнить: 2 отмеченные модели' })).toBeInTheDocument();
  });
});
