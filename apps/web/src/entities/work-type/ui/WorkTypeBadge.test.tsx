import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { WorkTypeMark } from '@/shared/lib/work-type';

import { WorkTypeBadge } from './WorkTypeBadge';

const install: WorkTypeMark = {
  id: 'wt_install',
  code: 'install',
  title: 'Монтаж',
  icon: 'wrench',
  tone: 'ok',
  dayLong: false,
};

describe('ярлык вида работ', () => {
  /**
   * 🔴 Главная проверка компонента (issue #840, WCAG 1.4.1).
   *
   * Ярлык, различающий виды работ одним цветом, для восьми процентов мужчин
   * не различает ничего, а на распечатанном наряде — ни для кого.
   */
  it('🔴 рядом с цветом стоит слово', () => {
    render(<WorkTypeBadge workType={install} />);

    expect(screen.getByText('Монтаж')).toBeInTheDocument();
  });

  /** Название приходит из справочника: переименование видно сразу. */
  it('подпись берётся из записи справочника', () => {
    render(<WorkTypeBadge workType={{ ...install, title: 'Чистка дренажа' }} />);

    expect(screen.getByText('Чистка дренажа')).toBeInTheDocument();
  });

  /**
   * 🔴 Ради этого справочник и заводился: краску метки задаёт запись базы, а
   * не код. Тот же вид работ с другой краской приезжает другим классом — между
   * записью и ярлыком нет ни одного словаря, который мог бы её подменить.
   */
  it('🔴 краска ярлыка приходит из записи справочника', () => {
    const { container, rerender } = render(<WorkTypeBadge workType={install} />);
    const ok = container.firstElementChild?.className;

    rerender(<WorkTypeBadge workType={{ ...install, tone: 'error' }} />);
    const error = container.firstElementChild?.className;

    expect(ok).toBeDefined();
    expect(error).toBeDefined();
    expect(error).not.toBe(ok);
  });

  /* Значок стоит рядом с подписью и потому от озвучки скрыт: иначе человек
     выслушивает «монтаж монтаж». */
  it('значок не озвучивается вторым названием', () => {
    render(<WorkTypeBadge workType={install} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
