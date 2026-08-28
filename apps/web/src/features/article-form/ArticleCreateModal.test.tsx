import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ArticleCreateModal } from './ArticleCreateModal';
import { articleFormContent as texts } from './content';
import { acceptingSave } from './fixtures';

const back = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();

/* Ссылка на роутер стабильна и в самом Next: обновление списка висит на
   уборке эффекта, и новый объект на каждый рендер дёргал бы её впустую. */
const router = { back, replace, refresh, push: vi.fn() };

vi.mock('next/navigation', () => ({ useRouter: () => router }));

/** Есть ли куда возвращаться: единица означает вкладку, открытую на адресе окна. */
function historyLength(length: number): void {
  vi.spyOn(globalThis.history, 'length', 'get').mockReturnValue(length);
}

beforeEach(() => {
  back.mockClear();
  replace.mockClear();
  refresh.mockClear();
  historyLength(3);
});

describe('Окно создания статьи', () => {
  it('🔴 статья заводится окном, а форма в нём — та же самая', () => {
    render(<ArticleCreateModal save={acceptingSave} />);

    expect(screen.getByRole('dialog', { name: texts.createTitle })).toBeInTheDocument();
    expect(screen.getByLabelText(new RegExp(texts.excerpt))).toBeVisible();
    expect(screen.getByLabelText(new RegExp(texts.body))).toBeVisible();
    expect(screen.getByLabelText(new RegExp(texts.slug))).toBeVisible();
    expect(screen.getByRole('button', { name: texts.create })).toBeInTheDocument();
  });

  it('заголовок один — его даёт окно, а части формы стоят уровнем ниже', () => {
    render(<ArticleCreateModal save={acceptingSave} />);

    expect(screen.getAllByRole('heading', { name: texts.createTitle })).toHaveLength(1);
    expect(screen.getByRole('heading', { name: texts.sectionBody, level: 3 })).toBeInTheDocument();
  });

  it('после сохранения окно уходит шагом назад, а список обновляется на выходе', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ArticleCreateModal save={acceptingSave} />);

    await user.type(screen.getByLabelText(new RegExp(texts.category)), 'Выбор техники');
    await user.click(screen.getByRole('button', { name: texts.create }));

    await waitFor(() => expect(back).toHaveBeenCalledTimes(1));

    /* 🔴 Пока окно на своём адресе, обновлять нечего: запрос, начатый до
       перехода, роутер отбрасывает вместе со старым адресом. */
    expect(refresh).not.toHaveBeenCalled();

    unmount();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('закрытое без сохранения окно список не дёргает', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ArticleCreateModal save={acceptingSave} />);

    await user.keyboard('{Escape}');
    unmount();

    expect(refresh).not.toHaveBeenCalled();
    await user.tab();
  });

  it('🔴 вкладку открыли прямо на адресе окна — уходим на запасной адрес', async () => {
    const user = userEvent.setup();
    historyLength(1);

    render(<ArticleCreateModal save={acceptingSave} />);

    await user.click(screen.getByRole('button', { name: texts.create }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/admin/knowledge'));
    expect(back).not.toHaveBeenCalled();
  });

  it('🔴 начатая статья по Escape не пропадает молча: окно спрашивает', async () => {
    const user = userEvent.setup();
    render(<ArticleCreateModal save={acceptingSave} />);

    await user.type(screen.getByLabelText(new RegExp(texts.body)), '## Коротко');
    await user.keyboard('{Escape}');

    /* Вечер работы над текстом не должен теряться от промаха по клавише. */
    expect(back).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(texts.createConfirm);

    await user.click(screen.getByRole('button', { name: 'Остаться' }));
    expect(screen.getByLabelText(new RegExp(texts.body))).toHaveValue('## Коротко');
  });

  it('пустое окно закрывается сразу — терять нечего', async () => {
    const user = userEvent.setup();
    render(<ArticleCreateModal save={acceptingSave} />);

    await user.keyboard('{Escape}');

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('предпросмотр рисуется переданным слотом', async () => {
    const user = userEvent.setup();
    render(
      <ArticleCreateModal
        save={acceptingSave}
        renderPreview={(body) => <p data-testid="preview">{body}</p>}
      />,
    );

    await user.type(screen.getByLabelText(new RegExp(texts.body)), 'Текст');

    expect(screen.getByTestId('preview')).toHaveTextContent('Текст');
  });
});
