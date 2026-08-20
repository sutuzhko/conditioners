import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RangeSlider } from './RangeSlider';

describe('RangeSlider', () => {
  it('связывает подпись и показывает отформатированное значение', () => {
    render(
      <RangeSlider
        label="Площадь"
        min={10}
        max={60}
        value={25}
        onChange={() => {}}
        formatValue={(v) => `${v} м²`}
      />,
    );

    expect(screen.getByRole('slider', { name: 'Площадь' })).toBeInTheDocument();
    expect(screen.getByText('25 м²')).toBeInTheDocument();
  });

  it('сообщает значение словами через aria-valuetext', () => {
    render(
      <RangeSlider
        label="Площадь"
        min={10}
        max={60}
        value={30}
        onChange={() => {}}
        formatValue={(v) => `${v} м²`}
      />,
    );

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '30 м²');
  });

  it('отдаёт число, а не строку события', () => {
    const onChange = vi.fn();
    render(<RangeSlider label="Трасса" min={3} max={15} value={5} onChange={onChange} />);

    fireEvent.change(screen.getByRole('slider'), { target: { value: '9' } });
    expect(onChange).toHaveBeenCalledWith(9);
  });

  it('доходит фокусом до ползунка — стрелки даёт нативный input[type=range]', async () => {
    const user = userEvent.setup();
    render(<RangeSlider label="Трасса" min={3} max={15} value={5} onChange={() => {}} />);

    await user.tab();

    const slider = screen.getByRole('slider');
    expect(slider).toHaveFocus();
    expect(slider).toHaveAttribute('type', 'range');
  });

  it('отключённый ползунок недоступен и не принимает фокус', async () => {
    const user = userEvent.setup();
    render(<RangeSlider label="Трасса" min={3} max={15} value={5} onChange={() => {}} disabled />);

    await user.tab();

    const slider = screen.getByRole('slider');
    expect(slider).toBeDisabled();
    expect(slider).not.toHaveFocus();
  });
});
