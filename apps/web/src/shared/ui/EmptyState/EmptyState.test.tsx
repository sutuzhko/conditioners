import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('показывает заголовок и объяснение причины', () => {
    render(
      <EmptyState icon="leads" title="Заявок пока нет">
        Они появятся здесь, как только кто-то отправит форму.
      </EmptyState>,
    );

    expect(screen.getByText('Заявок пока нет')).toBeInTheDocument();
    expect(screen.getByText(/появятся здесь/)).toBeInTheDocument();
  });

  it('не озвучивает значок: он повторяет заголовок', () => {
    const { container } = render(
      <EmptyState icon="leads" title="Заявок пока нет">
        причина
      </EmptyState>,
    );

    const badge = container.querySelector('[aria-hidden="true"]');
    expect(badge).not.toBeNull();
    expect(badge?.querySelector('svg')).not.toBeNull();
  });

  it('показывает действие, когда оно передано', () => {
    render(
      <EmptyState
        icon="leads"
        title="Заявок пока нет"
        action={<button type="button">Проверить</button>}
      >
        причина
      </EmptyState>,
    );

    expect(screen.getByRole('button', { name: 'Проверить' })).toBeInTheDocument();
  });

  it('обходится без действия там, где следующего шага нет', () => {
    render(
      <EmptyState icon="stock" title="Расхода нет">
        Материалы спишет монтажник.
      </EmptyState>,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });
});
