import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PHONE_PLACEHOLDER } from '@/shared/lib/phone';

import { PhoneInput } from './PhoneInput';

/**
 * Поле управляемое: без держателя состояния оно не набирается, и проверять в
 * нём нечего. Обёртка повторяет то, как поле живёт в форме заявки.
 */
function Controlled({ initial = '', ...rest }: { initial?: string; label?: string }) {
  const [value, setValue] = useState(initial);
  return <PhoneInput label="Телефон" value={value} onChange={setValue} {...rest} />;
}

function field(): HTMLInputElement {
  const input = screen.getByLabelText('Телефон');
  if (!(input instanceof HTMLInputElement)) throw new Error('Поле телефона не найдено');
  return input;
}

describe('PhoneInput', () => {
  it('размечает номер по ходу набора', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(field(), '9123456789');
    expect(field()).toHaveValue('+7 (912) 345-67-89');
  });

  it('принимает номер так, как его набирают: с восьмёркой и с семёркой', async () => {
    const user = userEvent.setup();

    const { unmount } = render(<Controlled />);
    await user.type(field(), '89123456789');
    expect(field()).toHaveValue('+7 (912) 345-67-89');
    unmount();

    render(<Controlled />);
    await user.type(field(), '+7 912 345 67 89');
    expect(field()).toHaveValue('+7 (912) 345-67-89');
  });

  it('буквы и цифры сверх одиннадцати до значения не доходят', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(field(), 'звоните 9123456789 срочно 000');
    expect(field()).toHaveValue('+7 (912) 345-67-89');
  });

  it('недобранный номер поле принимает молча — ругаться в момент набора нельзя', async () => {
    const user = userEvent.setup();
    render(<Controlled />);

    await user.type(field(), '912345');
    expect(field()).toHaveValue('+7 (912) 345');
    expect(field()).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('пустое поле остаётся пустым: подчёркивания маски в значение не попадают', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="+7 (912) 345-67-89" />);

    await user.clear(field());
    expect(field()).toHaveValue('');
    expect(field()).toHaveAttribute('placeholder', PHONE_PLACEHOLDER);
  });

  it('курсор после правки в середине считается по цифрам, а не по символам', async () => {
    const user = userEvent.setup();
    render(<Controlled initial="+7 (912) 345-67-89" />);

    const input = field();
    input.focus();
    // между «912» и «345» — то есть после трёх введённых цифр
    input.setSelectionRange(8, 8);
    await user.keyboard('0');

    expect(input).toHaveValue('+7 (912) 034-56-78');
    /* Курсор стоит после только что набранного нуля. Оставленный на месте, он
       уехал бы внутрь разделителя, и правка превратилась бы в борьбу с полем. */
    await waitFor(() => expect(input.selectionStart).toBe(10));
  });

  it('поле объявляет себя телефонным — клавиатура телефона и автозаполнение', () => {
    render(<Controlled />);

    expect(field()).toHaveAttribute('type', 'tel');
    expect(field()).toHaveAttribute('inputmode', 'tel');
    expect(field()).toHaveAttribute('autocomplete', 'tel');
  });

  it('свой placeholder перебивает разметку маски', () => {
    render(
      <PhoneInput label="Телефон" value="" onChange={() => undefined} placeholder="Ваш номер" />,
    );
    expect(screen.getByLabelText('Телефон')).toHaveAttribute('placeholder', 'Ваш номер');
  });
});
