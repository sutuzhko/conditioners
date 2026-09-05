import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

/* Экран перечитывает наряд после записи: снимки и итог приходят с сервера. */
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { OrderHandover } from './OrderHandover';
import {
  acceptingApi,
  acceptingWorkApi,
  installerCompanyOrder,
  installerDetails,
} from './fixtures';
import type { OrderDetails } from './model';
import { installerContent as own } from './installer-content';

/** Наряд в работе с двумя снимками «после» — сдавать можно. */
const ready = { ...installerDetails, status: 'in_progress' as const };

/** Тот же наряд без снимков: сдать нельзя, и экран обязан сказать почему. */
const noPhotos = { ...ready, photos: ready.photos.filter((photo) => photo.stage === 'before') };

describe('Сдача работы', () => {
  it('🔴 без снимков сдать нельзя, и экран называет остаток числом', () => {
    render(<OrderHandover order={noPhotos} api={acceptingWorkApi} statusApi={acceptingApi} />);

    expect(screen.getByText(own.photosLeft(2))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Сдать работу/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('снимков хватает — препятствий нет', () => {
    render(<OrderHandover order={ready} api={acceptingWorkApi} statusApi={acceptingApi} />);

    expect(screen.getByText(own.photosReady)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: own.submit })).not.toHaveAttribute('aria-disabled');
  });

  it('🔴 сдача пишет сначала итог, потом статус', async () => {
    const user = userEvent.setup();
    const saveResult = vi.fn(async () => ({ ok: true }) as const);
    const setStatus = vi.fn(async () => ({ ok: true }) as const);

    render(
      <OrderHandover
        order={ready}
        api={{ ...acceptingWorkApi, saveResult }}
        statusApi={{ ...acceptingApi, setStatus }}
      />,
    );

    await user.type(screen.getByLabelText(own.report), 'Блок повешен');
    await user.click(screen.getByRole('button', { name: own.submit }));

    expect(saveResult).toHaveBeenCalledWith({ extraWork: '', report: 'Блок повешен' });
    expect(setStatus).toHaveBeenCalledWith(ready.id, 'done');
    expect(saveResult.mock.invocationCallOrder[0]).toBeLessThan(
      setStatus.mock.invocationCallOrder[0] ?? 0,
    );
    expect(await screen.findByText(own.submitted)).toBeInTheDocument();
  });

  it('🔴 отказ на статусе не теряет отчёт: итог уже записан', async () => {
    const user = userEvent.setup();
    const saveResult = vi.fn(async () => ({ ok: true }) as const);
    const setStatus = vi.fn(async () => ({ ok: false, message: 'Наряд закрыт' }) as const);

    render(
      <OrderHandover
        order={ready}
        api={{ ...acceptingWorkApi, saveResult }}
        statusApi={{ ...acceptingApi, setStatus }}
      />,
    );

    await user.click(screen.getByRole('button', { name: own.submit }));

    expect(saveResult).toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Наряд закрыт');
  });

  it('черновик пишет итог и не трогает статус', async () => {
    const user = userEvent.setup();
    const saveResult = vi.fn(async () => ({ ok: true }) as const);
    const setStatus = vi.fn(async () => ({ ok: true }) as const);

    render(
      <OrderHandover
        order={ready}
        api={{ ...acceptingWorkApi, saveResult }}
        statusApi={{ ...acceptingApi, setStatus }}
      />,
    );

    await user.click(screen.getByRole('button', { name: own.draft }));

    expect(saveResult).toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
    expect(await screen.findByText(own.draftSaved)).toBeInTheDocument();
  });

  it('🔴 наряд не в работе сдать нельзя, и причина названа', () => {
    render(
      <OrderHandover
        order={{ ...ready, status: 'assigned' }}
        api={acceptingWorkApi}
        statusApi={acceptingApi}
      />,
    );

    expect(screen.getByRole('button', { name: /Сдать работу/ })).toHaveAccessibleName(
      new RegExp(own.blockedByStatus),
    );
  });

  it('разбирает итог на трассу и короб прямо по ходу ввода', async () => {
    const user = userEvent.setup();

    render(<OrderHandover order={ready} api={acceptingWorkApi} statusApi={acceptingApi} />);

    await user.type(screen.getByLabelText(own.extraWork), 'трасса 1,5 м, короб 2 м');

    expect(screen.getByText(own.meters(1.5))).toBeInTheDocument();
    expect(screen.getByText(own.meters(2))).toBeInTheDocument();
  });

  it('🔴 карточка оплаты говорит о наряде, а не об устройстве панели', () => {
    render(<OrderHandover order={ready} api={acceptingWorkApi} statusApi={acceptingApi} />);

    expect(screen.getByText(own.paymentCash)).toBeInTheDocument();
    expect(screen.getByText(own.paymentCashMark)).toBeInTheDocument();
  });

  it('платит компания — сумма не показывается вовсе', () => {
    /* 🔴 Ключа `price` в ответе нет вовсе, а не приходит пустым: наряд
       собирается из карточки без суммы (docs/API.md §13). */
    const company: OrderDetails = {
      ...installerCompanyOrder,
      status: 'in_progress',
      checklist: ready.checklist,
      docs: ready.docs,
      photos: ready.photos,
    };

    render(<OrderHandover order={company} api={acceptingWorkApi} statusApi={acceptingApi} />);

    expect(screen.getByText(own.paymentCompany)).toBeInTheDocument();
    expect(screen.getByText(own.paymentCompanyNote)).toBeInTheDocument();
    expect(screen.queryByText(/38/)).not.toBeInTheDocument();
  });
});
