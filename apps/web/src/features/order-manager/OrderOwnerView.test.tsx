import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { cancelReasonTitle } from '@/shared/lib/cancel-reason';

import { orderManagerContent as texts } from './content';
import { cancelledOrder, freshOrder, order } from './fixtures';
import { OrderOwnerView } from './OrderOwnerView';

const result = <p>Итог работ</p>;

describe('Наряд у владельца', () => {
  it('показывает объект: адрес, домофон, этаж', () => {
    render(<OrderOwnerView order={order} result={result} />);

    expect(screen.getByText(order.address)).toBeInTheDocument();
    expect(screen.getByText('24К')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('🔴 деньги владельца на месте: сумма, выплата, удержание', () => {
    render(<OrderOwnerView order={order} result={result} />);

    expect(screen.getByText(texts.price)).toBeInTheDocument();
    expect(screen.getByText(texts.installerFee)).toBeInTheDocument();
    expect(screen.getByText(texts.deduction)).toBeInTheDocument();
  });

  it('🔴 заметка владельца показывается ему: сервер кладёт ключ только ему', () => {
    render(<OrderOwnerView order={order} result={result} />);

    expect(screen.getByText(texts.ownerNoteTitle)).toBeInTheDocument();
    expect(screen.getByText(/Клиент постоянный/)).toBeInTheDocument();
  });

  it('🔴 без ключа заметки блока нет вовсе: так наряд приходит монтажнику', () => {
    const { ownerNote, ...withoutNote } = order;
    /* У наряда владельца ключ есть — иначе проверка ниже доказывала бы, что
       блок пропал вместе с ключом, которого и не было. */
    expect(ownerNote).toBeDefined();

    render(<OrderOwnerView order={withoutNote} result={result} />);

    expect(screen.queryByText(texts.ownerNoteTitle)).not.toBeInTheDocument();
  });

  it('пустая заметка названа словами, а не оставлена пробелом', () => {
    render(<OrderOwnerView order={{ ...order, ownerNote: null }} result={result} />);

    expect(screen.getByText(texts.ownerNoteEmpty)).toBeInTheDocument();
  });

  it('не назначенный монтажник назван, а не пропущен', () => {
    render(<OrderOwnerView order={freshOrder} result={result} />);

    expect(screen.getByText(texts.installerNone)).toBeInTheDocument();
  });

  it('наряд без позиций объясняет, почему их нет', () => {
    render(<OrderOwnerView order={freshOrder} result={result} />);

    expect(screen.getByText(texts.unitsEmpty)).toBeInTheDocument();
  });

  it('🔴 отказ показывается только у отменённого наряда', () => {
    render(<OrderOwnerView order={cancelledOrder} result={result} />);

    expect(screen.getByText(texts.cancelTitle)).toBeInTheDocument();
    expect(screen.getByText(cancelReasonTitle('too_expensive'))).toBeInTheDocument();
    expect(screen.getByText(/Нашёл дешевле/)).toBeInTheDocument();
  });

  it('🔴 у наряда в работе блока отказа нет: причина без отказа читается как действующая', () => {
    render(<OrderOwnerView order={order} result={result} />);

    expect(screen.queryByText(texts.cancelTitle)).not.toBeInTheDocument();
  });

  it('высотные работы предупреждают о страховке', () => {
    render(<OrderOwnerView order={order} result={result} />);

    expect(screen.getByText(texts.heightWorksOn)).toBeInTheDocument();
  });

  it('переработка показывается фактом, когда она есть', () => {
    render(<OrderOwnerView order={{ ...order, overtimeMin: 95 }} result={result} />);

    expect(screen.getByText(texts.overtime(95))).toBeInTheDocument();
  });

  it('без переработки строки о ней нет', () => {
    render(<OrderOwnerView order={order} result={result} />);

    expect(screen.queryByText(/Переработка/)).not.toBeInTheDocument();
  });

  it('итог работ стоит в карточке: его передаёт страница', () => {
    render(<OrderOwnerView order={order} result={result} />);

    expect(screen.getByText('Итог работ')).toBeInTheDocument();
  });

  it('телефон клиента — ссылка для звонка', () => {
    render(<OrderOwnerView order={order} result={result} />);

    expect(screen.getByRole('link', { name: /910/ })).toHaveAttribute('href', 'tel:+79101552468');
  });
});
