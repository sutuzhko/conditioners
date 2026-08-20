import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { BrandMark } from './BrandMark';

/** Толщина штриха у первой струи — её и проверяем. */
function strokeOf(container: HTMLElement): string | null {
  return container.querySelector('path')?.getAttribute('stroke-width') ?? null;
}

describe('BrandMark', () => {
  it('знак декоративен: скринридер его не читает', () => {
    const { container } = render(<BrandMark />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
  });

  it('геометрия знака не зависит от размера — он строился под масштабирование', () => {
    const { container } = render(<BrandMark size={16} />);

    expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 48 48');
    expect(container.querySelector('rect')).toHaveAttribute('rx', '13');
  });

  // 🔴 Оптическая компенсация из DESIGN_BRIEF §11: при 3.4 в шестнадцати
  // пикселях струи сливаются с плиткой, и знак перестаёт читаться.
  it.each([
    [48, '3.4'],
    [40, '3.4'],
    [39, '3.8'],
    [24, '3.8'],
    [23, '4.4'],
    [16, '4.4'],
  ])('при %ipx штрих %s', (size, expected) => {
    const { container } = render(<BrandMark size={size} />);
    expect(strokeOf(container)).toBe(expected);
  });

  it('вариант для тёмной панели отличается классом, а не геометрией', () => {
    const auto = render(<BrandMark />).container.querySelector('svg')?.getAttribute('class');
    const onDark = render(<BrandMark tone="onDark" />)
      .container.querySelector('svg')
      ?.getAttribute('class');

    expect(auto).not.toBe(onDark);
  });
});
