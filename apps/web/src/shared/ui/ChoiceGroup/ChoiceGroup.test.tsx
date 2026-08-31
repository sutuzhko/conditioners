import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CheckboxGroup } from './CheckboxGroup';
import { RadioGroup } from './RadioGroup';
import type { ChoiceOption } from './RadioGroup';

const PAYMENT: readonly ChoiceOption[] = [
  { value: 'cash', label: 'Наличными' },
  { value: 'card', label: 'Картой', description: 'Терминал у монтажника' },
  { value: 'invoice', label: 'По счёту' },
];

describe('Группа радио', () => {
  it('получает имя группы через legend — иначе озвучка читает кнопки поодиночке', () => {
    render(<RadioGroup label="Способ оплаты" name="payment" options={PAYMENT} />);

    expect(screen.getByRole('group', { name: 'Способ оплаты' })).toBeInTheDocument();
  });

  it('все варианты доступны как радиокнопки', () => {
    render(<RadioGroup label="Способ оплаты" name="payment" options={PAYMENT} />);

    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: /Наличными/ })).toBeInTheDocument();
  });

  /* 🔴 Клавиатура не пишется руками: у нативных радио одного имени стрелки и
     перенос по кругу работают сами. Проверка держит именно это — если группу
     однажды перепишут на `div`, тест упадёт. */
  it('стрелка вниз переводит выбор на следующий вариант', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <RadioGroup
        label="Способ оплаты"
        name="payment"
        options={PAYMENT}
        defaultValue="cash"
        onChange={onChange}
      />,
    );

    await user.tab();
    expect(screen.getByRole('radio', { name: /Наличными/ })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(onChange).toHaveBeenCalledWith('card');
  });

  it('вся группа — одна остановка табуляции, а не три', async () => {
    const user = userEvent.setup();
    render(
      <>
        <RadioGroup label="Способ оплаты" name="payment" options={PAYMENT} defaultValue="cash" />
        <button type="button">Дальше</button>
      </>,
    );

    await user.tab();
    expect(screen.getByRole('radio', { name: /Наличными/ })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'Дальше' })).toHaveFocus();
  });

  it('отключённая группа не принимает фокус', async () => {
    const user = userEvent.setup();
    render(
      <>
        <RadioGroup label="Способ оплаты" name="payment" options={PAYMENT} disabled />
        <button type="button">Дальше</button>
      </>,
    );

    await user.tab();
    expect(screen.getByRole('button', { name: 'Дальше' })).toHaveFocus();
  });

  it('ошибка объявляется текстом и связывается с группой', () => {
    render(
      <RadioGroup
        label="Способ оплаты"
        name="payment"
        options={PAYMENT}
        error="Выберите способ оплаты"
      />,
    );

    /* 🔴 Ошибка связывается с группой через `aria-describedby`, а не через
       `aria-invalid`: роль `group` этого атрибута не поддерживает вовсе, и
       озвучка его там просто не читает. Смысл несёт текст. */
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Выберите способ оплаты');
    expect(screen.getByRole('group', { name: 'Способ оплаты' })).toHaveAttribute(
      'aria-describedby',
      alert.id,
    );
  });
});

describe('Группа галочек', () => {
  it('получает имя группы через legend', () => {
    render(<CheckboxGroup label="Статусы" name="status" options={PAYMENT} />);

    expect(screen.getByRole('group', { name: 'Статусы' })).toBeInTheDocument();
  });

  /* 🔴 У галочек нет общего значения: каждая независима и каждая — своя
     остановка табуляции. Это не недоделка, а разница с радио. */
  it('каждая галочка — своя остановка табуляции', async () => {
    const user = userEvent.setup();
    render(<CheckboxGroup label="Статусы" name="status" options={PAYMENT} />);

    const boxes = screen.getAllByRole('checkbox');
    await user.tab();
    expect(boxes[0]).toHaveFocus();
    await user.tab();
    expect(boxes[1]).toHaveFocus();
  });

  it('пробел переключает галочку под фокусом', async () => {
    const user = userEvent.setup();
    render(<CheckboxGroup label="Статусы" name="status" options={PAYMENT} />);

    await user.tab();
    await user.keyboard(' ');

    expect(screen.getAllByRole('checkbox')[0]).toBeChecked();
  });

  it('управляемая группа отдаёт новый список выбранного', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <CheckboxGroup
        label="Статусы"
        name="status"
        options={PAYMENT}
        value={['cash']}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /Картой/ }));
    expect(onChange).toHaveBeenCalledWith(['cash', 'card']);
  });

  it('снятие галочки убирает значение из списка', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <CheckboxGroup
        label="Статусы"
        name="status"
        options={PAYMENT}
        value={['cash', 'card']}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /Наличными/ }));
    expect(onChange).toHaveBeenCalledWith(['card']);
  });
});
