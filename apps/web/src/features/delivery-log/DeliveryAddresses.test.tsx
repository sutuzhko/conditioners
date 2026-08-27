import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DeliveryAddresses } from './DeliveryAddresses';
import { deliveryLogContent as texts } from './content';
import { boundInstaller, firedInstaller, freshInstaller, people } from './fixtures';
import type { AddressApi } from './model';

function api(overrides: Partial<AddressApi> = {}): AddressApi {
  return {
    saveEmail: vi.fn(() => Promise.resolve({ ok: true })),
    unbind: vi.fn(() => Promise.resolve({ ok: true })),
    ...overrides,
  };
}

describe('Адреса доставки', () => {
  it('показывает всю команду с состоянием телеграма', () => {
    render(<DeliveryAddresses people={people} api={api()} />);

    expect(screen.getByText('Дмитрий Соколов')).toBeInTheDocument();
    expect(screen.getAllByText(texts.telegramBound)).toHaveLength(2);
    expect(screen.getByText(texts.telegramMissing)).toBeInTheDocument();
  });

  it('🔴 без привязки показывает код: chat ID человек узнать сам не может', () => {
    render(<DeliveryAddresses people={[freshInstaller]} api={api()} />);

    expect(screen.getByText(freshInstaller.code)).toBeInTheDocument();
    expect(screen.getByText(texts.codeHint)).toBeInTheDocument();
  });

  it('у привязанного кода нет, зато есть отвязка', () => {
    render(<DeliveryAddresses people={[boundInstaller]} api={api()} />);

    expect(screen.queryByText(boundInstaller.code)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.unbind })).toBeInTheDocument();
  });

  it('отвязка снимает чат и возвращает человеку код', async () => {
    const user = userEvent.setup();
    const calls = api();
    render(<DeliveryAddresses people={[boundInstaller]} api={calls} />);

    await user.click(screen.getByRole('button', { name: texts.unbind }));

    expect(calls.unbind).toHaveBeenCalledWith('u2');
    expect(await screen.findByText(texts.unbound)).toBeInTheDocument();
    expect(screen.getByText(boundInstaller.code)).toBeInTheDocument();
  });

  it('почта сохраняется тем, что ввели', async () => {
    const user = userEvent.setup();
    const calls = api();
    render(<DeliveryAddresses people={[freshInstaller]} api={calls} />);

    await user.type(screen.getByLabelText(texts.emailLabel), 'ilyin@example.test');
    await user.click(screen.getByRole('button', { name: texts.emailSave }));

    expect(calls.saveEmail).toHaveBeenCalledWith('u3', 'ilyin@example.test');
    expect(await screen.findByText(texts.emailSaved)).toBeInTheDocument();
  });

  it('🔴 отказ сервера объясняется, а не проглатывается', async () => {
    const user = userEvent.setup();
    const calls = api({
      saveEmail: () => Promise.resolve({ ok: false, message: 'Похоже, в адресе опечатка' }),
    });
    render(<DeliveryAddresses people={[freshInstaller]} api={calls} />);

    await user.click(screen.getByRole('button', { name: texts.emailSave }));

    expect(await screen.findByRole('alert')).toHaveTextContent('опечатка');
  });

  it('отключённый доступ подписан: история за человеком остаётся', () => {
    render(<DeliveryAddresses people={[firedInstaller]} api={api()} />);

    expect(screen.getByText(texts.inactive)).toBeInTheDocument();
  });

  it('пустая команда объясняет пустоту', () => {
    render(<DeliveryAddresses people={[]} api={api()} />);

    expect(screen.getByText(texts.addressesEmpty)).toBeInTheDocument();
  });
});
