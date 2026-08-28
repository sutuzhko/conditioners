import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductCreateModal } from './ProductCreateModal';
import { productFormContent as texts } from './content';
import { acceptingSave } from './fixtures';

const back = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back, replace, refresh, push: vi.fn() }),
}));

/** Есть ли куда возвращаться: единица означает вкладку, открытую на адресе окна. */
function historyLength(length: number): void {
  vi.spyOn(globalThis.history, 'length', 'get').mockReturnValue(length);
}

/** Поле названия: подпись обязательного поля несёт ещё и звёздочку. */
function nameField(): HTMLElement {
  return screen.getByLabelText(new RegExp(texts.name));
}

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  refresh.mockClear();
  historyLength(3);
});

describe('Окно создания модели каталога', () => {
  it('🔴 модель заводится окном, а не отдельной страницей (ADR-117)', () => {
    render(<ProductCreateModal save={acceptingSave} />);

    expect(screen.getByRole('dialog', { name: texts.createTitle })).toBeInTheDocument();
    expect(nameField()).toBeVisible();
    /* Заголовок один — его даёт окно: форма со своим вторым таким же была бы
       панелью в панели, а читалка объявляла бы название дважды. */
    expect(screen.getAllByRole('heading', { name: texts.createTitle })).toHaveLength(1);
  });

  /**
   * 🔴 Заведение модели — первый шаг из двух: фотографии, скидка и
   * характеристики задаются в карточке, и без них модель на витрину не
   * выпустишь. Вернув владельца в список, окно заставило бы его искать там
   * только что созданную строку — страницей эта форма так не делала.
   */
  it('после сохранения окно уводит в карточку заведённой модели', async () => {
    const user = userEvent.setup();
    render(<ProductCreateModal save={acceptingSave} />);

    await user.type(nameField(), 'Сплит-система 09');
    await user.click(screen.getByRole('button', { name: texts.create }));

    // `replace`, а не `push`: «назад» из карточки ведёт в список, а не
    // открывает пустую форму создания заново
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/catalog/demo'));
    expect(back).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  /* Сервер принял модель, но идентификатора не назвал — вести некуда, и окно
     закрывается обычным образом, а не ломается на пустом адресе. */
  it('без идентификатора в ответе окно просто закрывается', async () => {
    const user = userEvent.setup();
    const saveWithoutId: typeof acceptingSave = async () => ({ ok: true, id: '' });

    render(<ProductCreateModal save={saveWithoutId} />);

    await user.type(nameField(), 'Сплит-система 12');
    await user.click(screen.getByRole('button', { name: texts.create }));

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    expect(replace).not.toHaveBeenCalled();
  });

  it('🔴 вкладку открыли прямо на адресе окна — закрытие уходит на запасной адрес', async () => {
    const user = userEvent.setup();
    historyLength(1);

    render(<ProductCreateModal save={acceptingSave} />);

    // ввод есть, поэтому Escape сначала спросит — соглашаемся потерять
    await user.type(nameField(), 'Сплит-система 12');
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: /Закрыть без сохранения/ }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/catalog'));
    expect(back).not.toHaveBeenCalled();
  });

  it('🔴 заполненная форма по Escape спрашивает, а не закрывается молча (ADR-141)', async () => {
    const user = userEvent.setup();
    render(<ProductCreateModal save={acceptingSave} />);

    await user.type(nameField(), 'Сплит-система 07');
    await user.keyboard('{Escape}');

    /* Вопрос задаётся внутри того же окна: второй диалог поверх первого дал бы
       две ловушки фокуса стопкой. */
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(back).not.toHaveBeenCalled();
  });

  it('пустая форма по Escape закрывается без вопроса: терять нечего', async () => {
    const user = userEvent.setup();
    render(<ProductCreateModal save={acceptingSave} />);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('🔴 всё под окном помечено inert: читалка не уходит гулять по списку', () => {
    const { baseElement } = render(<ProductCreateModal save={acceptingSave} />);

    const covered = [...baseElement.children].filter(
      (node) => node.querySelector('[role="dialog"]') === null,
    );

    expect(covered.length).toBeGreaterThan(0);
    for (const node of covered) expect(node).toHaveAttribute('inert');
  });
});
