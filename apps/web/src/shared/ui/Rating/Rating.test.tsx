import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Rating } from './Rating';

describe('Rating — вывод', () => {
  it('оценка читается одной текстовой альтернативой', () => {
    render(<Rating value={4} />);
    expect(screen.getByRole('img', { name: 'Оценка 4 из 5' })).toBeInTheDocument();
  });

  it('поддерживает произвольную шкалу', () => {
    render(<Rating value={7} max={10} />);
    expect(screen.getByRole('img', { name: 'Оценка 7 из 10' })).toBeInTheDocument();
  });

  it('нулевая оценка не ломает вывод', () => {
    render(<Rating value={0} />);
    expect(screen.getByRole('img', { name: 'Оценка 0 из 5' })).toBeInTheDocument();
  });
});

describe('Rating — ввод', () => {
  it('каждая звезда — радиокнопка со своим именем', () => {
    render(<Rating mode="input" name="rating" value={0} onChange={() => {}} />);
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('выбор мышью отдаёт число наверх', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Rating mode="input" name="rating" value={0} onChange={onChange} />);

    await user.click(screen.getByRole('radio', { name: 'Оценка 4 из 5' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('переключается стрелками — это даёт нативная группа радиокнопок', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Rating mode="input" name="rating" value={3} onChange={onChange} />);

    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('ошибка озвучивается и помечает группу', () => {
    render(
      <Rating mode="input" name="rating" value={0} onChange={() => {}} error="Поставьте оценку" />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Поставьте оценку');
    expect(screen.getAllByRole('radio')[0]).toHaveAccessibleDescription('Поставьте оценку');
  });

  it('отключённый ввод не меняется', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Rating mode="input" name="rating" value={0} onChange={onChange} disabled />);

    await user.click(screen.getByRole('radio', { name: 'Оценка 3 из 5' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
