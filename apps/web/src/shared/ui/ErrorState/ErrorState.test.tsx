import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('объявляет себя и называет, что не загрузилось и что с данными', () => {
    render(
      <ErrorState title="Не удалось загрузить заявки">
        Заявки при этом не потеряны — они записаны в базу.
      </ErrorState>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Не удалось загрузить заявки' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/не потеряны/)).toBeInTheDocument();
  });

  it('не озвучивает значок: он повторяет заголовок', () => {
    const { container } = render(<ErrorState title="Ошибка">причина</ErrorState>);

    const badge = container.querySelector('[aria-hidden="true"]');
    expect(badge?.querySelector('svg')).not.toBeNull();
  });

  it('показывает оба действия, когда они переданы', () => {
    render(
      <ErrorState
        title="Ошибка"
        actions={
          <>
            <button type="button">Повторить</button>
            <button type="button">Обновить страницу</button>
          </>
        }
      >
        причина
      </ErrorState>,
    );

    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Обновить страницу' })).toBeInTheDocument();
  });
});
