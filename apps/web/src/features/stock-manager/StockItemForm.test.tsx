import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StockItemForm } from './StockItemForm';
import { stockManagerContent as texts } from './content';
import { acceptingApi, archivedItem, failingApi, pipe, products } from './fixtures';
import { itemDraftOf } from './model';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

describe('Позиция справочника', () => {
  it('заводит позицию и очищает форму: следующую вводят сразу', async () => {
    const user = userEvent.setup();
    const createItem = vi.fn(async () => ({ ok: true }) as const);

    render(<StockItemForm api={{ ...acceptingApi, createItem }} products={products} />);

    await user.type(screen.getByLabelText(texts.itemName), 'Труба медная 1/4″');
    await user.type(screen.getByLabelText(texts.itemGroup), 'Медная труба');
    await user.selectOptions(screen.getByLabelText(texts.itemUnit), 'meter');
    await user.type(screen.getByLabelText(texts.itemMinQty), '30');
    await user.click(screen.getByRole('button', { name: texts.itemAdd }));

    expect(createItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Труба медная 1/4″', unit: 'meter', minQty: '30' }),
    );
    expect(await screen.findByText(texts.itemAdded)).toBeVisible();
    expect(screen.getByLabelText(texts.itemName)).toHaveValue('');
  });

  it('🔴 остатка в форме нет ни одним полем: он сумма движений', () => {
    render(<StockItemForm itemId={pipe.id} initial={itemDraftOf(pipe)} />);

    expect(screen.queryByLabelText(texts.colTotal)).not.toBeInTheDocument();
    expect(screen.getByLabelText(texts.itemMinQty)).toHaveValue('30');
  });

  it('пустое название не уезжает на сервер: подсказка приходит сразу', async () => {
    const user = userEvent.setup();
    const createItem = vi.fn(async () => ({ ok: true }) as const);

    render(<StockItemForm api={{ ...acceptingApi, createItem }} />);
    await user.click(screen.getByRole('button', { name: texts.itemAdd }));

    expect(createItem).not.toHaveBeenCalled();
    expect(await screen.findByText('Укажите название позиции')).toBeVisible();
  });

  it('дробный порог по-русски принимается: «полбаллона» — рабочее состояние', async () => {
    const user = userEvent.setup();
    const createItem = vi.fn(async () => ({ ok: true }) as const);

    render(<StockItemForm api={{ ...acceptingApi, createItem }} />);

    await user.type(screen.getByLabelText(texts.itemName), 'Фреон R32');
    await user.type(screen.getByLabelText(texts.itemMinQty), '4,5');
    await user.click(screen.getByRole('button', { name: texts.itemAdd }));

    expect(createItem).toHaveBeenCalledWith(expect.objectContaining({ minQty: '4,5' }));
  });

  it('правка оставляет введённое на месте: карточку продолжают смотреть', async () => {
    const user = userEvent.setup();
    const updateItem = vi.fn(async () => ({ ok: true }) as const);
    const draft = itemDraftOf(pipe);

    render(
      <StockItemForm api={{ ...acceptingApi, updateItem }} itemId={pipe.id} initial={draft} />,
    );

    await user.click(screen.getByRole('button', { name: texts.itemSave }));

    expect(updateItem).toHaveBeenCalledWith(pipe.id, draft);
    expect(screen.getByLabelText(texts.itemName)).toHaveValue(pipe.name);
  });

  it('🔴 занятое название подсвечивает поле, а не прячется в общей ошибке', async () => {
    const user = userEvent.setup();

    render(<StockItemForm api={failingApi} />);

    await user.type(screen.getByLabelText(texts.itemName), 'Труба медная 1/4″');
    await user.click(screen.getByRole('button', { name: texts.itemAdd }));

    expect(await screen.findByText('Позиция с таким названием уже заведена')).toBeVisible();
    expect(screen.getByLabelText(texts.itemName)).toHaveAttribute('aria-invalid', 'true');
  });

  it('у новой позиции архива нет: архивировать ещё нечего', () => {
    render(<StockItemForm archivable />);

    expect(screen.queryByRole('button', { name: texts.itemArchive })).not.toBeInTheDocument();
  });

  it('🔴 архив спрашивает окном панели, а не системным confirm', async () => {
    const user = userEvent.setup();
    const archiveItem = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StockItemForm
        api={{ ...acceptingApi, archiveItem }}
        itemId={pipe.id}
        initial={itemDraftOf(pipe)}
        archivable
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.itemArchive }));

    const request = texts.itemArchiveConfirm(pipe.name);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(request.title);
    expect(archiveItem).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: request.confirmLabel }));
    await waitFor(() => expect(archiveItem).toHaveBeenCalledWith(pipe.id));
  });

  it('отказ от подтверждения ничего не архивирует', async () => {
    const user = userEvent.setup();
    const archiveItem = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StockItemForm
        api={{ ...acceptingApi, archiveItem }}
        itemId={pipe.id}
        initial={itemDraftOf(pipe)}
        archivable
        confirmArchive={async () => false}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.itemArchive }));

    expect(archiveItem).not.toHaveBeenCalled();
  });

  it('позиция из архива возвращается правкой, а не заведением заново', async () => {
    const user = userEvent.setup();
    const updateItem = vi.fn(async () => ({ ok: true }) as const);

    render(
      <StockItemForm
        api={{ ...acceptingApi, updateItem }}
        itemId={archivedItem.id}
        initial={itemDraftOf(archivedItem)}
        archivable
      />,
    );

    expect(screen.getByText(texts.itemArchived)).toBeVisible();
    await user.click(screen.getByRole('button', { name: texts.itemRestore }));

    expect(updateItem).toHaveBeenCalledWith(
      archivedItem.id,
      expect.objectContaining({ archived: false }),
    );
  });
});
