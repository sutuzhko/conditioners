import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ClientUnits } from './ClientUnits';
import { clientManagerContent as texts } from './content';
import { acceptingUnitApi, expiredUnits, ownUnits, singleUnit, today, units } from './fixtures';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

describe('Техника клиента', () => {
  it('перечисляет, что у человека стоит, с датой монтажа', () => {
    render(<ClientUnits clientId="c1" units={units} today={today} api={acceptingUnitApi} />);

    expect(screen.getByText('Сплит-система 09')).toBeInTheDocument();
    expect(screen.getByText('Тепловая завеса 1500')).toBeInTheDocument();
    expect(screen.getByText(texts.unitInstalled('2026-07-14T06:30:00.000Z'))).toBeInTheDocument();
  });

  it('ведёт в наряд, из которого техника выросла', () => {
    render(<ClientUnits clientId="c1" units={singleUnit} today={today} api={acceptingUnitApi} />);

    expect(screen.getByRole('link', { name: texts.unitOrder(1059) })).toHaveAttribute(
      'href',
      '/admin/orders/o1',
    );
  });

  it('🔴 дата ТО считается от монтажа, а не подписывается от руки', () => {
    render(<ClientUnits clientId="c1" units={singleUnit} today={today} api={acceptingUnitApi} />);

    // монтаж 14 июля 2026 → повод позвонить 14 июля 2027
    expect(screen.getByText(texts.unitService('2027-07-14'))).toBeInTheDocument();
  });

  it('🔴 напоминания не обещаются: генератора дел о ТО ещё нет', () => {
    render(<ClientUnits clientId="c1" units={singleUnit} today={today} api={acceptingUnitApi} />);

    expect(screen.getByText(texts.unitServiceNote)).toBeInTheDocument();
  });

  it('🔴 истёкшая гарантия названа истёкшей: это платный ремонт, а не гарантийный', () => {
    render(<ClientUnits clientId="c1" units={expiredUnits} today={today} api={acceptingUnitApi} />);

    expect(screen.getByText(/Гарантия истекла/)).toBeInTheDocument();
  });

  it('действующая гарантия показывает дату', () => {
    render(<ClientUnits clientId="c1" units={singleUnit} today={today} api={acceptingUnitApi} />);

    expect(screen.getByText(texts.unitWarranty('2029-07-14T00:00:00.000Z'))).toBeInTheDocument();
  });

  it('техника без нашей продажи: ни наряда, ни записанной гарантии', () => {
    render(<ClientUnits clientId="c1" units={ownUnits} today={today} api={acceptingUnitApi} />);

    expect(screen.getByText(texts.unitWarrantyNone)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Наряд/ })).not.toBeInTheDocument();
  });

  it('пустое состояние объясняет, откуда техника берётся', () => {
    render(<ClientUnits clientId="c1" units={[]} today={today} api={acceptingUnitApi} />);

    expect(screen.getByText(texts.unitsEmpty)).toBeInTheDocument();
  });

  it('запись добавляется руками: форма открывается по кнопке', async () => {
    const user = userEvent.setup();

    render(<ClientUnits clientId="c1" units={[]} today={today} api={acceptingUnitApi} />);
    await user.click(screen.getByRole('button', { name: texts.unitAdd }));

    expect(screen.getByLabelText(texts.unitModel)).toBeInTheDocument();
  });

  it('правка открывается на месте записи', async () => {
    const user = userEvent.setup();

    render(<ClientUnits clientId="c1" units={singleUnit} today={today} api={acceptingUnitApi} />);
    await user.click(screen.getByRole('button', { name: texts.unitEdit }));

    expect(screen.getByLabelText(texts.unitModel)).toHaveValue('Сплит-система 09');
  });

  it('удаление спрашивает подтверждение', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render(
      <ClientUnits
        clientId="c1"
        units={singleUnit}
        today={today}
        api={{ ...acceptingUnitApi, remove }}
        confirmRemove={async () => false}
      />,
    );
    await user.click(screen.getByRole('button', { name: texts.unitRemove }));

    expect(remove).not.toHaveBeenCalled();
  });

  it('подтверждённое удаление уходит на сервер вместе с номером клиента', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render(
      <ClientUnits
        clientId="c1"
        units={singleUnit}
        today={today}
        api={{ ...acceptingUnitApi, remove }}
        confirmRemove={async () => true}
      />,
    );
    await user.click(screen.getByRole('button', { name: texts.unitRemove }));

    expect(remove).toHaveBeenCalledWith('c1', 'u1');
  });
});
