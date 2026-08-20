import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from '@/shared/config/uploads';
import { FileInput } from './FileInput';

const photo = () => new File(['x'.repeat(64)], 'stena.jpg', { type: 'image/jpeg' });
const pdf = () => new File(['x'], 'smeta.pdf', { type: 'application/pdf' });

const bigPhoto = () => {
  const file = photo();
  // размер подменяем, а не создаём три мегабайта строки в памяти теста
  Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 });
  return file;
};

beforeEach(() => {
  // jsdom не реализует объектные ссылки — подставляем заглушку
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('FileInput', () => {
  it('отдаёт выбранный файл наверх', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FileInput label="Фото" onChange={onChange} />);

    await user.upload(screen.getByLabelText('Фото'), photo());
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'stena.jpg' }));
  });

  it('отклоняет файл неподходящего типа и объясняет, что нужно', async () => {
    const onChange = vi.fn();
    // applyAccept выключаем: проверяем свою валидацию, а не фильтр системного диалога
    const user = userEvent.setup({ applyAccept: false });
    render(<FileInput label="Фото" onChange={onChange} accept={['image/jpeg']} />);

    await user.upload(screen.getByLabelText('Фото'), pdf());

    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole('alert')).toHaveTextContent(/изображения/i);
  });

  it('отклоняет файл больше лимита и называет лимит', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FileInput label="Фото" onChange={onChange} maxSizeMb={1} />);

    await user.upload(screen.getByLabelText('Фото'), bigPhoto());

    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole('alert')).toHaveTextContent('1 МБ');
  });

  /**
   * 🔴 Предел клиента и сервера — одно число (docs/API.md §7). Пока поле
   * пускало 8 МБ, а сервер принимал 5, человек узнавал об отказе уже после
   * отправки: на мобильном интернете это ещё и впустую потраченный трафик.
   */
  it('по умолчанию держит тот же предел, что и сервер', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FileInput label="Фото" onChange={onChange} />);

    expect(screen.getByText(`до ${UPLOAD_MAX_MB} МБ`)).toBeInTheDocument();

    const overLimit = photo();
    Object.defineProperty(overLimit, 'size', { value: UPLOAD_MAX_BYTES + 1 });
    await user.upload(screen.getByLabelText('Фото'), overLimit);

    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole('alert')).toHaveTextContent(`${UPLOAD_MAX_MB} МБ`);
  });

  it('файл ровно по пределу проходит: граница включительна, как на сервере', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FileInput label="Фото" onChange={onChange} />);

    const exact = photo();
    Object.defineProperty(exact, 'size', { value: UPLOAD_MAX_BYTES });
    await user.upload(screen.getByLabelText('Фото'), exact);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'stena.jpg' }));
  });

  it('показывает превью и имя выбранного файла', () => {
    render(<FileInput label="Фото" value={photo()} onChange={() => {}} />);

    expect(screen.getByRole('img', { name: 'Загруженное фото' })).toHaveAttribute(
      'src',
      'blob:preview',
    );
    expect(screen.getByText('stena.jpg')).toBeInTheDocument();
  });

  it('кнопка удаления сбрасывает файл', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<FileInput label="Фото" value={photo()} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Удалить фото' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('внешняя ошибка перекрывает внутреннюю проверку', () => {
    render(<FileInput label="Фото" onChange={() => {}} error="Сервер отклонил файл" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Сервер отклонил файл');
    expect(screen.getByLabelText('Фото')).toHaveAttribute('aria-invalid', 'true');
  });

  it('поле доступно с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<FileInput label="Фото" onChange={() => {}} />);

    await user.tab();
    expect(screen.getByLabelText('Фото')).toHaveFocus();
  });
});
