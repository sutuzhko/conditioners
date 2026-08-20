import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('скрыт от скринридера — это декорация, а не контент', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('рисует запрошенное число строк', () => {
    const { container } = render(<Skeleton variant="text" lines={4} />);
    expect(container.firstElementChild?.children).toHaveLength(4);
  });

  it('принимает размеры через props, а не через класс потребителя', () => {
    const { container } = render(<Skeleton variant="block" width="120px" height="40px" />);
    expect(container.firstElementChild).toHaveStyle({ width: '120px', height: '40px' });
  });
});
