import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderDocs } from './OrderDocs';
import { ORDER_DOC_KIND_TITLE, orderManagerContent as texts } from './content';
import { acceptingWorkApi, docs, failingWorkApi } from './fixtures';

const yes = async (): Promise<boolean> => true;

describe('Документы наряда', () => {
  it('🔴 ссылка ведёт на закрытый маршрут панели, а не в общий том загрузок', () => {
    render(<OrderDocs api={acceptingWorkApi} docs={docs} editable />);

    const link = screen.getByRole('link', { name: texts.docOpen('Договор 1059.pdf') });
    expect(link).toHaveAttribute('href', '/api/admin/orders/o1/docs/d1/file');
    expect(link.getAttribute('href')).not.toContain('/api/media/');
  });

  it('вид документа и размер видны рядом с именем', () => {
    render(<OrderDocs api={acceptingWorkApi} docs={docs} editable />);

    /* Вид и размер стоят одной строкой: «Договор» отдельно нашлось бы и в
       имени файла, а проверять нужно подпись под ссылкой. */
    expect(
      screen.getByText(`${ORDER_DOC_KIND_TITLE.contract} · ${texts.docSize(184_320)}`),
    ).toBeInTheDocument();
  });

  it('🔴 монтажнику форма загрузки не показывается', () => {
    render(<OrderDocs api={acceptingWorkApi} docs={docs} />);

    expect(screen.queryByLabelText(texts.docFile)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.docAdd })).not.toBeInTheDocument();
  });

  it('🔴 монтажник не удаляет документы: кнопки нет ни у одного', () => {
    render(<OrderDocs api={acceptingWorkApi} docs={docs} />);

    for (const doc of docs) {
      expect(
        screen.queryByRole('button', { name: texts.docRemove(doc.name) }),
      ).not.toBeInTheDocument();
    }
  });

  it('монтажник документы всё же видит: на объекте нужен акт и гарантийный талон', () => {
    render(<OrderDocs api={acceptingWorkApi} docs={docs} />);

    expect(
      screen.getByRole('link', { name: texts.docOpen('Договор 1059.pdf') }),
    ).toBeInTheDocument();
  });

  it('пустой список у монтажника объясняется своими словами', () => {
    render(<OrderDocs api={acceptingWorkApi} docs={[]} />);

    expect(screen.getByText(texts.docsEmptyInstaller)).toBeInTheDocument();
  });

  it('владелец прикладывает документ выбранного вида', async () => {
    const api = { ...acceptingWorkApi, addDoc: vi.fn(async () => ({ ok: true as const })) };
    const onChanged = vi.fn();

    render(<OrderDocs api={api} docs={docs} editable onChanged={onChanged} />);

    const file = new File(['%PDF-1.7'], 'акт.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText(texts.docFile), file);
    await userEvent.selectOptions(screen.getByLabelText(texts.docKind), 'act');
    await userEvent.click(screen.getByRole('button', { name: texts.docAdd }));

    await waitFor(() => expect(api.addDoc).toHaveBeenCalledWith('act', file));
    expect(onChanged).toHaveBeenCalled();
  });

  it('без выбранного файла кнопка загрузки не работает', () => {
    render(<OrderDocs api={acceptingWorkApi} docs={docs} editable />);

    expect(screen.getByRole('button', { name: texts.docAdd })).toBeDisabled();
  });

  it('удаление спрашивает подтверждение и зовёт сервер', async () => {
    const api = { ...acceptingWorkApi, removeDoc: vi.fn(async () => ({ ok: true as const })) };

    render(<OrderDocs api={api} docs={docs} editable confirmRemove={yes} />);

    await userEvent.click(
      screen.getByRole('button', { name: texts.docRemove('Договор 1059.pdf') }),
    );

    await waitFor(() => expect(api.removeDoc).toHaveBeenCalledWith('d1'));
  });

  it('отказ от подтверждения ничего не удаляет', async () => {
    const api = { ...acceptingWorkApi, removeDoc: vi.fn(async () => ({ ok: true as const })) };

    render(<OrderDocs api={api} docs={docs} editable confirmRemove={async () => false} />);

    await userEvent.click(
      screen.getByRole('button', { name: texts.docRemove('Договор 1059.pdf') }),
    );

    expect(api.removeDoc).not.toHaveBeenCalled();
  });

  it('отказ сервера объясняется человеку', async () => {
    render(<OrderDocs api={failingWorkApi} docs={docs} editable confirmRemove={yes} />);

    const file = new File(['<?php'], 'скрипт.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByLabelText(texts.docFile), file);
    await userEvent.click(screen.getByRole('button', { name: texts.docAdd }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/PDF/);
  });
});
