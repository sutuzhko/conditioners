import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { blockErrorContent as texts } from './content';
import { SectionError } from './SectionError';

let pathname = '/admin/leads';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => pathname,
}));

describe('SectionError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('называет раздел по адресу и держит один h1', () => {
    pathname = '/admin/leads';
    render(<SectionError error={new Error('Connection closed.')} reset={() => undefined} />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Заявки' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: texts.sectionTitle('Заявки') })).toBeInTheDocument();
    /* Заявкам — своё объяснение: владелец смотрит на экран ради вопроса,
       не потерялись ли они. */
    expect(screen.getByText(/Заявки при этом не потеряны/)).toBeInTheDocument();
  });

  it('вложенная страница относится к своему разделу', () => {
    pathname = '/admin/catalog/42';
    render(<SectionError error={new Error('boom')} reset={() => undefined} />);

    expect(screen.getByRole('heading', { level: 1, name: 'Каталог' })).toBeInTheDocument();
    expect(screen.getByText(texts.note)).toBeInTheDocument();
  });

  it('незнакомый адрес не роняет саму ошибку', () => {
    pathname = '/admin/nowhere';
    render(<SectionError error={new Error('boom')} reset={() => undefined} />);

    expect(screen.getByRole('heading', { name: texts.unknownTitle })).toBeInTheDocument();
  });
});
