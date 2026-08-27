import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderHistory } from './OrderHistory';
import { orderManagerContent as texts } from './content';
import { history } from './fixtures';

describe('История наряда', () => {
  it('показывает событие, автора и время', () => {
    render(<OrderHistory entries={history} />);

    expect(screen.getByText('Взят в работу')).toBeInTheDocument();
    expect(screen.getAllByText('Дмитрий Соколов')).toHaveLength(2);
  });

  it('свежие записи идут первыми: последнее событие читают первым', () => {
    render(<OrderHistory entries={history} />);

    const items = screen.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Выполнен');
    expect(items[items.length - 1]).toHaveTextContent('Наряд заведён');
  });

  it('удалённый автор не оставляет запись без подписи', () => {
    render(<OrderHistory entries={history} />);

    expect(screen.getByText(texts.historyAuthorless)).toBeInTheDocument();
  });

  it('время подписано машинно-читаемо: это дата, а не просто текст', () => {
    const { container } = render(<OrderHistory entries={history} />);

    expect(container.querySelector('time')).toHaveAttribute('dateTime', '2026-08-28T12:40:00.000Z');
  });

  it('пустая история объясняется, а не показывается пустым списком', () => {
    render(<OrderHistory entries={[]} />);

    expect(screen.getByText(texts.historyEmpty)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
