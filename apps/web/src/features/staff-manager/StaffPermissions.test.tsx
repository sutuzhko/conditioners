import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { StaffPermissions } from './StaffPermissions';
import { staffManagerContent as texts } from './content';
import { acceptingApi, administrator, administratorWithoutRights } from './fixtures';
import { ADMIN_PERMISSION_TITLES } from './model';

/**
 * Экран прав администратора (issue #786, #788).
 *
 * 🔴 Проверяется не разметка, а обещания экрана: набор уходит на сервер
 * целиком, отказ не выдаёт себя за успех, а уход с несохранёнными правками
 * спрашивает. Первое и второе — деньги и доступ; третье — восемнадцать
 * переключателей, которые иначе расставляют заново.
 */
function setAccessSeam() {
  return vi.fn(async () => ({ ok: true }) as const);
}

/**
 * Кнопка сохранения по имени.
 *
 * 🔴 По части имени, а не целиком: отключённая кнопка кита несёт причину
 * отказа скрытой строкой внутри себя (`disabledReason`), и её имя — «Сохранить
 * права Изменений нет». Это и есть смысл названной причины: читалка объявляет
 * не только подпись, но и почему нажать нельзя.
 */
function saveButton(): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(texts.accessSave) });
}

describe('права администратора', () => {
  it('показывает восемнадцать переключателей: тринадцать разделов и пять действий', () => {
    render(<StaffPermissions staff={administrator} api={acceptingApi} />);

    expect(screen.getAllByRole('switch')).toHaveLength(18);
  });

  it('выданные разрешения стоят включёнными, остальные — нет', () => {
    render(<StaffPermissions staff={administrator} api={acceptingApi} />);

    expect({
      выдан: screen.getByLabelText(ADMIN_PERMISSION_TITLES.leads),
      неВыдан: screen.getByLabelText(ADMIN_PERMISSION_TITLES.catalog),
    }).toEqual({
      выдан: expect.objectContaining({ checked: true }),
      неВыдан: expect.objectContaining({ checked: false }),
    });
  });

  it('🔴 сохранение отправляет набор целиком, а не одну правку', async () => {
    const user = userEvent.setup();
    const setAccess = setAccessSeam();

    render(<StaffPermissions staff={administrator} api={{ ...acceptingApi, setAccess }} />);

    await user.click(screen.getByLabelText(ADMIN_PERMISSION_TITLES.catalog));
    await user.click(saveButton());

    /* Порядок словаря, а не порядок нажатий: набор — это множество, и два
       одинаковых по составу сохранения обязаны давать одно тело запроса. */
    await waitFor(() =>
      expect(setAccess).toHaveBeenCalledWith(administrator.id, {
        permissions: ['leads', 'clients', 'catalog', 'data_delete'],
      }),
    );
  });

  it('пока правок нет, сохранять нечего — и кнопка это говорит', () => {
    render(<StaffPermissions staff={administrator} api={acceptingApi} />);

    /* Мягкий отказ, а не `disabled`: кнопка остаётся в обходе табом и называет
       причину — «Изменений нет» (кит, `disabledReason`). */
    expect(saveButton()).toHaveAttribute('aria-disabled', 'true');
  });

  it('«Отменить правки» возвращает набор к серверному', async () => {
    const user = userEvent.setup();
    render(<StaffPermissions staff={administrator} api={acceptingApi} />);

    await user.click(screen.getByLabelText(ADMIN_PERMISSION_TITLES.catalog));
    await user.click(screen.getByRole('button', { name: texts.accessDiscard }));

    expect(screen.getByLabelText(ADMIN_PERMISSION_TITLES.catalog)).not.toBeChecked();
  });

  /* 🔴 Отказ, показанный как успех, — худшее, что может сделать экран доступа:
     владелец уйдёт уверенным, что раздел закрыт, а он открыт. */
  it('🔴 отказ сервера не выдаёт себя за сохранение', async () => {
    const user = userEvent.setup();
    const setAccess = vi.fn(async () => ({ ok: false, message: 'Сервер не принял' }) as const);

    render(<StaffPermissions staff={administrator} api={{ ...acceptingApi, setAccess }} />);

    await user.click(screen.getByLabelText(ADMIN_PERMISSION_TITLES.catalog));
    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервер не принял');
    expect(screen.queryByText(texts.accessSaved)).toBeNull();
    /* Правка остаётся на экране: расставлять восемнадцать переключателей
       заново из-за временного отказа человек не должен. */
    expect(screen.getByLabelText(ADMIN_PERMISSION_TITLES.catalog)).toBeChecked();
    expect(saveButton()).toBeEnabled();
  });

  it('после успеха точка отсчёта сдвигается: сохранять снова нечего', async () => {
    const user = userEvent.setup();
    render(<StaffPermissions staff={administrator} api={acceptingApi} />);

    await user.click(screen.getByLabelText(ADMIN_PERMISSION_TITLES.catalog));
    await user.click(saveButton());

    expect(await screen.findByText(texts.accessSaved)).toBeVisible();
    await waitFor(() => expect(saveButton()).toHaveAttribute('aria-disabled', 'true'));
    expect(refresh).toHaveBeenCalled();
  });

  it('пустой набор называет себя словами, а не пустым местом', () => {
    render(<StaffPermissions staff={administratorWithoutRights} api={acceptingApi} />);

    expect(screen.getByText(texts.accessGranted(0, 18))).toBeVisible();
  });

  /* 🔴 Уход с несохранёнными правками спрашивает окном панели (issue #32).
     Проверяется через шов: настоящее окно открывается по клику по ссылке, а
     ссылок у этого экрана нет — они снаружи, в карточке человека. */
  it('🔴 уход с несохранёнными правками спрашивает', async () => {
    const user = userEvent.setup();
    const confirmLeave = vi.fn(async () => true);

    render(
      <StaffPermissions staff={administrator} api={acceptingApi} confirmLeave={confirmLeave} />,
    );

    const link = document.createElement('a');
    link.href = '/admin/team';
    link.textContent = 'Все сотрудники';
    document.body.append(link);

    /* Пока правок нет, вопрос не ставится: сторож молчит, и это правильно. */
    await user.click(link);
    expect(confirmLeave).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText(ADMIN_PERMISSION_TITLES.catalog));
    await user.click(link);

    await waitFor(() => expect(confirmLeave).toHaveBeenCalledWith(texts.accessLeave));

    link.remove();
  });
});
