import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Icon } from './Icon';
import { iconRegistry } from './registry';

describe('Icon', () => {
  it('рисует глиф из реестра в сетке 24', () => {
    const { container } = render(<Icon name="phone" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    expect(svg).toHaveAttribute('width', '20');
  });

  it('🔴 заливка помечается у элемента, а не у иконки целиком', () => {
    // у треугольника предупреждения контур обводкой, а знак внутри — заливкой;
    // общий флаг заливал его целиком и давал красное пятно
    const { container } = render(<Icon name="danger" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('fill', 'none');
    expect(container.querySelectorAll('[fill="currentColor"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('path:not([fill])').length).toBeGreaterThan(0);
  });

  it('🔴 обводочный глиф набран одной толщиной — 1.5, как весь набор', () => {
    const { container } = render(<Icon name="clock" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('stroke', 'currentColor');
    expect(svg).toHaveAttribute('stroke-width', '1.5');
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('без подписи иконка считается украшением и скрыта от чтения', () => {
    const { container } = render(<Icon name="check" />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('с подписью — озвучивается', () => {
    render(<Icon name="burger" title="Меню" />);

    expect(screen.getByRole('img', { name: 'Меню' })).toBeInTheDocument();
  });

  it('🔴 ни одна запись реестра не заводит свою сетку координат', () => {
    /* Сторож на issue #553: один глиф жил в сетке 32 и рядом с соседями по
       ряду услуг читался замыленным — узлы попадали в другие доли пикселя.
       Поле `viewBox` из `IconDef` убрано, и этот проход по реестру ловит
       попытку вернуть его следующей чужой иконкой. */
    for (const [name, def] of Object.entries(iconRegistry)) {
      expect(Object.keys(def), name).not.toContain('viewBox');
    }
  });

  it('🔴 все иконки набраны одной толщиной: разнобой виден на первом же экране', () => {
    for (const [name, def] of Object.entries(iconRegistry)) {
      const { container, unmount } = render(<Icon name={name as never} />);
      const svg = container.querySelector('svg');

      /* Иконка из чужой сетки несёт свою толщину: в пересчёте на 24 это те же
         полтора пикселя. Сравниваем с объявленной, а не с общей. */
      const expected = 'strokeWidth' in def ? String(def.strokeWidth) : '1.5';
      expect(svg?.getAttribute('stroke-width'), name).toBe(expected);
      unmount();
    }
  });
});
