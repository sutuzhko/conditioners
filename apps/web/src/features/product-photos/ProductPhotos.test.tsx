import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProductPhotos } from './ProductPhotos';
import { productPhotosContent as texts } from './content';
import { acceptingApi, failingApi, photosFixture } from './fixtures';

describe('Фотографии модели', () => {
  it('пустое состояние объясняет, что увидит посетитель', () => {
    render(<ProductPhotos photos={[]} api={acceptingApi} />);

    expect(screen.getByText(texts.empty)).toBeInTheDocument();
  });

  it('главная фотография помечена, и сделать её главной уже нельзя', () => {
    render(<ProductPhotos photos={photosFixture} api={acceptingApi} />);

    expect(screen.getByText(texts.main)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: texts.makeMainLabel(1) })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.makeMainLabel(2) })).toBeInTheDocument();
  });

  it('фотография без подписи получает осмысленный alt, а не пустой', () => {
    render(<ProductPhotos photos={photosFixture} api={acceptingApi} />);

    expect(screen.getByAltText(texts.altEmpty)).toBeInTheDocument();
  });

  it('выбор главной перечитывает страницу: список живёт на сервере', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<ProductPhotos photos={photosFixture} api={acceptingApi} onChanged={onChanged} />);

    await user.click(screen.getByRole('button', { name: texts.makeMainLabel(2) }));

    expect(onChanged).toHaveBeenCalled();
  });

  it('удаление спрашивает подтверждение и без него ничего не делает', async () => {
    const user = userEvent.setup();
    const remove = vi.fn();
    render(
      <ProductPhotos
        photos={photosFixture}
        api={{ ...acceptingApi, remove }}
        confirmRemove={() => false}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.removeLabel(1) }));

    expect(remove).not.toHaveBeenCalled();
  });

  it('отказ сервера объясняется и страница не перечитывается', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(
      <ProductPhotos
        photos={photosFixture}
        api={failingApi}
        onChanged={onChanged}
        confirmRemove={() => true}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.removeLabel(1) }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it('подпись сохраняется по уходу фокуса, а не на каждую букву', async () => {
    const user = userEvent.setup();
    const patch = vi.fn(async () => ({ ok: true }));
    render(<ProductPhotos photos={photosFixture} api={{ ...acceptingApi, patch }} />);

    const alt = screen.getByLabelText(texts.altLabel(2));
    await user.type(alt, 'Наружный блок');
    expect(patch).not.toHaveBeenCalled();

    await user.tab();

    expect(patch).toHaveBeenCalledWith('b', { alt: 'Наружный блок' });
  });

  it('очищенная подпись уходит как null, а не пустой строкой', async () => {
    const user = userEvent.setup();
    const patch = vi.fn(async () => ({ ok: true }));
    render(<ProductPhotos photos={photosFixture} api={{ ...acceptingApi, patch }} />);

    await user.clear(screen.getByLabelText(texts.altLabel(1)));
    await user.tab();

    expect(patch).toHaveBeenCalledWith('a', { alt: null });
  });

  it('неизменённая подпись не отправляется', async () => {
    const user = userEvent.setup();
    const patch = vi.fn();
    render(<ProductPhotos photos={photosFixture} api={{ ...acceptingApi, patch }} />);

    await user.click(screen.getByLabelText(texts.altLabel(1)));
    await user.tab();

    expect(patch).not.toHaveBeenCalled();
  });
});
