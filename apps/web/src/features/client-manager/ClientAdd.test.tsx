import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ClientAdd } from './ClientAdd';
import { clientManagerContent as texts } from './content';
import { acceptingApi } from './fixtures';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe('Заведение клиента', () => {
  it('форма свёрнута: список открывают, чтобы найти человека, а не завести', () => {
    render(<ClientAdd api={acceptingApi} />);

    expect(screen.queryByLabelText(texts.name)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.addOpen })).toBeInTheDocument();
  });

  it('разворачивается и сворачивается обратно', async () => {
    const user = userEvent.setup();
    render(<ClientAdd api={acceptingApi} />);

    await user.click(screen.getByRole('button', { name: texts.addOpen }));
    expect(screen.getByLabelText(texts.name)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: texts.addClose }));
    expect(screen.queryByLabelText(texts.name)).not.toBeInTheDocument();
  });
});
