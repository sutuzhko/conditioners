import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { OrderPhotos } from './OrderPhotos';
import { PHOTO_STAGE_TITLE, orderManagerContent as texts } from './content';
import { acceptingWorkApi, failingWorkApi, photos } from './fixtures';

const yes = async (): Promise<boolean> => true;

const before = PHOTO_STAGE_TITLE.before;
const after = PHOTO_STAGE_TITLE.after;

describe('Фотографии наряда', () => {
  /**
   * 🔴 Та же проверка, что у документов рядом (`OrderDocs.test.tsx`): снимок
   * «до/после» — интерьер квартиры клиента, и отдаётся он только по сессии
   * (ADR-171). Без этого утверждения возврат к публичному `/api/media/{name}`
   * прошёл бы молча — именно так асимметрия и держалась до 29 августа.
   */
  it('🔴 снимок берётся с закрытого маршрута панели, а не из общего тома загрузок', () => {
    render(<OrderPhotos api={acceptingWorkApi} photos={photos} />);

    const shot = screen.getByRole('img', { name: texts.photoAlt(before, 1) });
    expect(shot).toHaveAttribute('src', '/api/admin/orders/o1/photos/p1/file');
    expect(shot.getAttribute('src')).not.toContain('/api/media/');
  });

  it('этапы разведены по колонкам и названы работой, а не временем', () => {
    render(<OrderPhotos api={acceptingWorkApi} photos={photos} />);

    expect(screen.getByRole('heading', { name: before })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: after })).toBeInTheDocument();
  });

  it('у снимка осмысленный alt, а не пустая строка', () => {
    render(<OrderPhotos api={acceptingWorkApi} photos={photos} />);

    expect(screen.getByAltText(texts.photoAlt(before, 1))).toBeInTheDocument();
    expect(screen.getByAltText(texts.photoAlt(after, 2))).toBeInTheDocument();
  });

  it('пустой этап говорит об этом, а не молчит', () => {
    render(<OrderPhotos api={acceptingWorkApi} photos={[]} />);

    expect(screen.getAllByText(texts.photoEmpty)).toHaveLength(2);
  });

  it('🔴 монтажник не грузит фото места установки: поля на этот этап у него нет', () => {
    render(<OrderPhotos api={acceptingWorkApi} photos={photos} forInstaller />);

    expect(screen.queryByLabelText(texts.photoAdd(before))).not.toBeInTheDocument();
    expect(screen.getByLabelText(texts.photoAdd(after))).toBeInTheDocument();
  });

  it('🔴 монтажник не удаляет чужие фото «до», но убирает свои «после»', () => {
    render(<OrderPhotos api={acceptingWorkApi} photos={photos} forInstaller />);

    expect(
      screen.queryByRole('button', { name: texts.photoRemove(before, 1) }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.photoRemove(after, 1) })).toBeInTheDocument();
  });

  it('владелец распоряжается обоими этапами', () => {
    render(<OrderPhotos api={acceptingWorkApi} photos={photos} />);

    expect(screen.getByLabelText(texts.photoAdd(before))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.photoRemove(before, 1) })).toBeInTheDocument();
  });

  it('загрузка уходит с указанием этапа', async () => {
    const api = { ...acceptingWorkApi, addPhoto: vi.fn(async () => ({ ok: true as const })) };
    const onChanged = vi.fn();

    render(<OrderPhotos api={api} photos={photos} forInstaller onChanged={onChanged} />);

    const file = new File(['снимок'], 'после.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText(texts.photoAdd(after)), file);

    await waitFor(() => expect(api.addPhoto).toHaveBeenCalledWith('after', file));
    expect(onChanged).toHaveBeenCalled();
  });

  it('удаление спрашивает подтверждение', async () => {
    const api = { ...acceptingWorkApi, removePhoto: vi.fn(async () => ({ ok: true as const })) };

    render(<OrderPhotos api={api} photos={photos} confirmRemove={async () => false} />);

    await userEvent.click(screen.getByRole('button', { name: texts.photoRemove(before, 1) }));

    expect(api.removePhoto).not.toHaveBeenCalled();
  });

  it('подтверждённое удаление зовёт сервер', async () => {
    const api = { ...acceptingWorkApi, removePhoto: vi.fn(async () => ({ ok: true as const })) };

    render(<OrderPhotos api={api} photos={photos} confirmRemove={yes} />);

    await userEvent.click(screen.getByRole('button', { name: texts.photoRemove(after, 1) }));

    await waitFor(() => expect(api.removePhoto).toHaveBeenCalledWith('p2'));
  });

  it('отказ сервера объясняется человеку', async () => {
    render(<OrderPhotos api={failingWorkApi} photos={photos} confirmRemove={yes} />);

    const file = new File(['снимок'], 'до.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText(texts.photoAdd(before)), file);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
