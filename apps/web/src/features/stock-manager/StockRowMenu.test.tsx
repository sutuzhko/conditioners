import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { stockManagerContent as texts } from './content';
import { acceptingApi, archivedItem, failingApi, pipe } from './fixtures';
import { StockRowMenu } from './StockRowMenu';

const refresh = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => refresh(), push: (href: string) => push(href) }),
}));

/** Открыть меню строки: пункты появляются только после нажатия. */
async function openMenu(name: string): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: texts.rowActions(name) }));
}

describe('Действия над позицией склада из строки', () => {
  it('меню названо своей позицией, а не общим «Действия»', () => {
    render(<StockRowMenu item={pipe} api={acceptingApi} />);

    expect(screen.getByRole('button', { name: texts.rowActions(pipe.name) })).toBeInTheDocument();
  });

  /* 🔴 Счёт владельца: «нельзя удалять и переименовывать». Обе возможности
     существовали, но только внутри карточки (issue #573). */
  it('даёт править и сдать в архив, не открывая карточку', async () => {
    render(<StockRowMenu item={pipe} api={acceptingApi} />);
    await openMenu(pipe.name);

    expect(screen.getByRole('menuitem', { name: texts.rowEdit })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: texts.itemArchive })).toBeInTheDocument();
  });

  /* 🔴 Удаления на складе нет и не будет: оно унесло бы журнал движений
     (ADR-134, PIXEL_SPEC §«Панель»). Это решение, а не пробел. */
  it('удаления не предлагает — только архив', async () => {
    render(<StockRowMenu item={pipe} api={acceptingApi} />);
    await openMenu(pipe.name);

    expect(screen.queryByRole('menuitem', { name: /Удалить/ })).toBeNull();
  });

  it('архивной позиции предлагает вернуть, а не сдать ещё раз', async () => {
    render(<StockRowMenu item={archivedItem} api={acceptingApi} />);
    await openMenu(archivedItem.name);

    expect(screen.getByRole('menuitem', { name: texts.itemRestore })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: texts.itemArchive })).toBeNull();
  });

  /* 🔴 Отказ от подтверждения не меняет ничего (issue #577). */
  it('отказ от подтверждения не сдаёт позицию в архив', async () => {
    const archiveItem = vi.fn(async () => ({ ok: true }) as const);
    render(
      <StockRowMenu
        item={pipe}
        api={{ ...acceptingApi, archiveItem }}
        confirmArchive={async () => false}
      />,
    );

    await openMenu(pipe.name);
    await userEvent.click(screen.getByRole('menuitem', { name: texts.itemArchive }));

    expect(archiveItem).not.toHaveBeenCalled();
  });

  it('согласие сдаёт в архив и перечитывает серверный список', async () => {
    refresh.mockClear();
    const archiveItem = vi.fn(async () => ({ ok: true }) as const);
    render(
      <StockRowMenu
        item={pipe}
        api={{ ...acceptingApi, archiveItem }}
        confirmArchive={async () => true}
      />,
    );

    await openMenu(pipe.name);
    await userEvent.click(screen.getByRole('menuitem', { name: texts.itemArchive }));

    expect(archiveItem).toHaveBeenCalledWith(pipe.id);
    expect(refresh).toHaveBeenCalled();
  });

  /* Сдать в архив позицию с ненулевым остатком сервер не даёт — человек
     обязан узнать причину, а не смотреть на строку, которая никуда не делась. */
  it('отказ сервера показывается словами', async () => {
    render(<StockRowMenu item={pipe} api={failingApi} confirmArchive={async () => true} />);

    await openMenu(pipe.name);
    await userEvent.click(screen.getByRole('menuitem', { name: texts.itemArchive }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Сервер не принял изменения. Попробуйте ещё раз',
    );
  });

  it('перемещать некуда — пункт отключён, а не спрятан', async () => {
    render(<StockRowMenu item={pipe} api={acceptingApi} movable={false} />);
    await openMenu(pipe.name);

    expect(screen.getByRole('menuitem', { name: texts.moveRow })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
