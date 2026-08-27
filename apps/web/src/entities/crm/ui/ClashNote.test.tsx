import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { crmClashContent } from '../content';
import { ClashNote } from './ClashNote';

describe('Предупреждение о пересечении', () => {
  it('молчит, когда спорить не с чем', () => {
    const { container } = render(<ClashNote items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('перечисляет всё, с чем налезает запись', () => {
    render(<ClashNote items={['10:00–13:00 · Наряд № 1059', '12:00–14:00 · Замер']} />);

    expect(screen.getByText('10:00–13:00 · Наряд № 1059')).toBeInTheDocument();
    expect(screen.getByText('12:00–14:00 · Замер')).toBeInTheDocument();
  });

  it('🔴 говорит, что запись всё равно сохранится: предупреждение, а не запрет', () => {
    render(<ClashNote items={['10:00–13:00 · Наряд № 1059']} />);

    expect(screen.getByText(crmClashContent.hint)).toBeInTheDocument();
  });

  it('сообщается как статус, а не перебивает заполнение формы тревогой', () => {
    render(<ClashNote items={['10:00–13:00 · Наряд № 1059']} />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
