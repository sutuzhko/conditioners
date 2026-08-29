import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderChecklist } from './OrderChecklist';
import { orderManagerContent as texts } from './content';
import { acceptingWorkApi, checklist, failingWorkApi } from './fixtures';

describe('Чеклист выезда', () => {
  it('пустой список объясняет, откуда берутся пункты', () => {
    render(<OrderChecklist api={acceptingWorkApi} items={[]} />);

    expect(screen.getByText(texts.checklistEmpty)).toBeInTheDocument();
  });

  it('считает собранное: «7 из 12» не заставляют пересчитывать глазами', () => {
    render(<OrderChecklist api={acceptingWorkApi} items={checklist} />);

    expect(screen.getByText(texts.checklistProgress(2, 5))).toBeInTheDocument();
  });

  it('отметка уходит на сервер и остаётся на экране', async () => {
    const api = {
      ...acceptingWorkApi,
      setItemDone: vi.fn(async () => ({ ok: true as const })),
    };

    render(<OrderChecklist api={api} items={checklist} />);

    const box = screen.getByLabelText('Перфоратор с бурами и удлинителем');
    await userEvent.click(box);

    await waitFor(() => expect(api.setItemDone).toHaveBeenCalledWith('ch3', true));
    expect(box).toBeChecked();
  });

  it('🔴 отказ сервера возвращает галочку: собранным нельзя считать несобранное', async () => {
    render(<OrderChecklist api={failingWorkApi} items={checklist} />);

    const box = screen.getByLabelText('Перфоратор с бурами и удлинителем');
    await userEvent.click(box);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => expect(box).not.toBeChecked());
  });

  it('🔴 удалить можно только дописанный пункт — у собранного кнопки нет', () => {
    render(<OrderChecklist api={acceptingWorkApi} items={checklist} />);

    expect(
      screen.getByRole('button', { name: texts.checklistRemove('Чехлы на мебель и пылесос') }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: texts.checklistRemove('Перфоратор с бурами и удлинителем'),
      }),
    ).not.toBeInTheDocument();
  });

  it('дописанный пункт помечен: его сохранит пересборка', () => {
    render(<OrderChecklist api={acceptingWorkApi} items={checklist} />);

    expect(screen.getByText(texts.checklistOwn)).toBeInTheDocument();
  });

  it('свой пункт добавляется и список перечитывается', async () => {
    const api = { ...acceptingWorkApi, addItem: vi.fn(async () => ({ ok: true as const })) };
    const onChanged = vi.fn();

    render(<OrderChecklist api={api} items={checklist} onChanged={onChanged} />);

    await userEvent.type(screen.getByLabelText(texts.checklistAddLabel), 'Стяжки');
    await userEvent.click(screen.getByRole('button', { name: texts.checklistAdd }));

    await waitFor(() => expect(api.addItem).toHaveBeenCalledWith('Стяжки'));
    expect(onChanged).toHaveBeenCalled();
  });

  it('пустой пункт не отправляется, а подсказка встаёт у поля', async () => {
    const api = { ...acceptingWorkApi, addItem: vi.fn(async () => ({ ok: true as const })) };

    render(<OrderChecklist api={api} items={checklist} />);

    await userEvent.click(screen.getByRole('button', { name: texts.checklistAdd }));

    expect(api.addItem).not.toHaveBeenCalled();
    expect(screen.getByLabelText(texts.checklistAddLabel)).toBeInvalid();
  });

  it('пересборка зовёт сервер и перечитывает список', async () => {
    const api = {
      ...acceptingWorkApi,
      rebuildChecklist: vi.fn(async () => ({ ok: true as const })),
    };
    const onChanged = vi.fn();

    render(<OrderChecklist api={api} items={checklist} onChanged={onChanged} />);

    await userEvent.click(screen.getByRole('button', { name: texts.checklistRebuild }));

    await waitFor(() => expect(api.rebuildChecklist).toHaveBeenCalled());
    expect(onChanged).toHaveBeenCalled();
  });

  it('🔴 пересборка обещает сохранить отметки — иначе её побоятся нажать', () => {
    render(<OrderChecklist api={acceptingWorkApi} items={checklist} />);

    expect(screen.getByText(texts.checklistRebuildHint)).toBeInTheDocument();
  });

  /**
   * 🔴 Два быстрых нажатия по одной галочке давали два `PATCH`. Если первый
   * отвечал отказом позже второго, откат записывал значение от устаревшего
   * ответа: на экране одно, в базе другое. Монтажник тычет в список у машины,
   * где сеть как раз и подводит.
   */
  it('🔴 второе нажатие по тому же пункту не уходит, пока первое в пути', async () => {
    // заглушка вместо null: иначе сужение типа не даёт вызвать её ниже
    let release: () => void = () => undefined;
    const setItemDone = vi.fn(
      async () =>
        new Promise<{ ok: true }>((resolve) => {
          release = () => {
            resolve({ ok: true });
          };
        }),
    );

    render(<OrderChecklist api={{ ...acceptingWorkApi, setItemDone }} items={checklist} />);

    const box = screen.getByLabelText('Перфоратор с бурами и удлинителем');
    await userEvent.click(box);
    await userEvent.click(box);

    expect(setItemDone).toHaveBeenCalledTimes(1);

    release();
    await waitFor(() => expect(box).toBeChecked());
  });

  it('соседний пункт отмечается, пока первый в пути: список идут подряд', async () => {
    const pending = new Set<() => void>();
    const setItemDone = vi.fn(
      async () =>
        new Promise<{ ok: true }>((resolve) => {
          pending.add(() => {
            resolve({ ok: true });
          });
        }),
    );

    render(<OrderChecklist api={{ ...acceptingWorkApi, setItemDone }} items={checklist} />);

    await userEvent.click(screen.getByLabelText('Перфоратор с бурами и удлинителем'));
    await userEvent.click(screen.getByLabelText(checklist[0]?.text ?? ''));

    expect(setItemDone).toHaveBeenCalledTimes(2);
    for (const done of pending) done();
  });

  it('отключённый чеклист не отправляет отметок', async () => {
    const api = { ...acceptingWorkApi, setItemDone: vi.fn(async () => ({ ok: true as const })) };

    render(<OrderChecklist api={api} items={checklist} disabled />);

    expect(screen.getByLabelText('Перфоратор с бурами и удлинителем')).toBeDisabled();
    expect(api.setItemDone).not.toHaveBeenCalled();
  });
});
