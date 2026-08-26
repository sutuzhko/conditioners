import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ClientForm } from './ClientForm';
import { clientManagerContent as texts } from './content';
import { acceptingApi, client, failingApi } from './fixtures';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const filled = {
  name: client.name,
  phone: client.phone,
  address: client.address ?? '',
  note: '',
};

describe('Форма клиента', () => {
  it('заводит нового и очищает поля: следующего вводят сразу', async () => {
    const user = userEvent.setup();
    const create = vi.fn(async () => ({ ok: true }) as const);

    render(<ClientForm api={{ ...acceptingApi, create }} />);

    await user.type(screen.getByLabelText(texts.name), 'Пётр');
    await user.type(screen.getByLabelText(texts.phone), '9101552468');
    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Пётр', phone: '+7 (910) 155-24-68' }),
    );
    expect(await screen.findByText(texts.added)).toBeInTheDocument();
    expect(screen.getByLabelText(texts.name)).toHaveValue('');
  });

  it('правка оставляет введённое на месте: карточку продолжают смотреть', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);

    render(<ClientForm api={{ ...acceptingApi, update }} clientId={client.id} initial={filled} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(update).toHaveBeenCalledWith(client.id, filled);
    expect(screen.getByLabelText(texts.name)).toHaveValue(client.name);
  });

  it('🔴 занятый телефон подсвечивает поле, а не прячется в общей ошибке', async () => {
    const user = userEvent.setup();

    render(<ClientForm api={failingApi} />);

    await user.type(screen.getByLabelText(texts.name), 'Пётр');
    await user.type(screen.getByLabelText(texts.phone), '9101552468');
    await user.click(screen.getByRole('button', { name: texts.add }));

    expect(await screen.findByText(/уже записан за клиентом/)).toBeInTheDocument();
    expect(screen.getByLabelText(texts.phone)).toHaveAttribute('aria-invalid', 'true');
  });

  it('удаления у новой карточки нет: удалять ещё нечего', () => {
    render(<ClientForm api={acceptingApi} />);

    expect(screen.queryByRole('button', { name: texts.remove })).not.toBeInTheDocument();
  });

  it('удаление спрашивает подтверждение и уводит в список', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render(
      <ClientForm
        api={{ ...acceptingApi, remove }}
        clientId={client.id}
        initial={filled}
        removable
        confirmRemove={() => true}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).toHaveBeenCalledWith(client.id);
    expect(push).toHaveBeenCalledWith('/admin/clients');
  });

  it('🔴 отказ от подтверждения ничего не удаляет', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render(
      <ClientForm
        api={{ ...acceptingApi, remove }}
        clientId={client.id}
        initial={filled}
        removable
        confirmRemove={() => false}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).not.toHaveBeenCalled();
  });
});
