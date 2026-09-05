import { render as renderDom, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StaffRow, type StaffRowProps } from './StaffRow';
import { staffManagerContent as texts } from './content';
import {
  acceptingApi,
  activeInstaller,
  contractInstaller,
  disabledInstaller,
  failingApi,
  namelessInstaller,
  selfEmployedNoInn,
  staffInstaller,
  staffLoadFixture,
  unsetEmploymentInstaller,
} from './fixtures';
import { employmentTitle, staffTitle } from './model';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

/**
 * Строка живёт внутри таблицы: `<tr>` вне `<tbody>` браузер выбрасывает из
 * разметки, и без обёртки тест проверял бы то, чего на экране не бывает.
 */
function render(props: StaffRowProps) {
  return renderDom(
    <table>
      <tbody>
        <StaffRow {...props} />
      </tbody>
    </table>,
  );
}

describe('Монтажник строкой таблицы команды', () => {
  it('имя ведёт в карточку, под ним — с какого числа человек в команде', () => {
    render({ staff: activeInstaller, api: acceptingApi });

    expect(screen.getByRole('link', { name: activeInstaller.name ?? '' })).toHaveAttribute(
      'href',
      '/admin/team/u2',
    );
    expect(screen.getByText(texts.inTeamSince(activeInstaller.createdAt))).toBeInTheDocument();
  });

  it('без имени показывает логин: пустая строка ничего не говорит', () => {
    render({ staff: namelessInstaller, api: acceptingApi });

    expect(screen.getByRole('link', { name: namelessInstaller.login })).toBeInTheDocument();
  });

  /* 🔴 Доступ закрывается прямо из списка: заходить в карточку ради этого —
     лишний шаг, а уволившегося отключают немедленно. */
  it('🔴 закрывает доступ переключателем прямо в строке', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }) as const);
    render({ staff: activeInstaller, api: { ...acceptingApi, update } });

    await user.click(screen.getByRole('switch', { name: texts.active }));

    expect(update).toHaveBeenCalledWith('u2', { active: false });
  });

  it('закрытый доступ виден в состоянии переключателя, а не только цветом', () => {
    render({ staff: disabledInstaller, api: acceptingApi });

    expect(screen.getByRole('switch', { name: texts.inactive })).not.toBeChecked();
  });

  it('отказ сервера показывается человеку, а не теряется', async () => {
    const user = userEvent.setup();
    render({ staff: activeInstaller, api: failingApi });

    await user.click(screen.getByRole('switch', { name: texts.active }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Такой логин уже занят');
  });

  it('показывает оформление плашкой: от него зависят деньги в наряде', () => {
    render({ staff: staffInstaller, api: acceptingApi });

    expect(screen.getByText(employmentTitle('staff'))).toBeInTheDocument();
  });

  /* 🔴 Ярлык, а не абзац (issue #602): проза в ячейке растила строку до
     двухсот пикселей, и таблица переставала читаться колонками. Последствие
     при этом никуда не делось — оно в подсказке на ярлыке. */
  it('🔴 незаведённое оформление помечено ярлыком, а объяснено подсказкой', async () => {
    const user = userEvent.setup();
    render({ staff: unsetEmploymentInstaller, api: acceptingApi });

    expect(screen.getByText(texts.employmentUnsetShort)).toBeInTheDocument();

    /* 🔴 Видимого абзаца в строке нет — он растил её до двухсот пикселей, — но
       текст остаётся в разметке для озвучки: плашка фокуса не получает, и
       подсказка на ней достижима одним указателем. */
    expect(screen.getByText(texts.employmentUnsetHint)).toHaveClass('srOnly');

    await user.hover(screen.getByText(texts.employmentUnsetShort));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(texts.employmentUnsetHint);
  });

  it('у заведённого оформления предупреждения нет', () => {
    render({ staff: activeInstaller, api: acceptingApi });

    expect(screen.queryByText(texts.employmentUnsetShort)).not.toBeInTheDocument();
  });

  it('🔴 самозанятый без ИНН помечен прямо в списке', async () => {
    const user = userEvent.setup();
    render({ staff: selfEmployedNoInn, api: acceptingApi });

    /* Статус самозанятого проверяется по ИНН и на дату выплаты. Узнать о
       пропущенном номере в день выплаты — это доначисления компании. */
    expect(screen.getByText(texts.innMissingShort)).toBeInTheDocument();
    // текст остаётся для озвучки, но строку таблицы не растит
    expect(screen.getByText(texts.innMissing)).toHaveClass('srOnly');

    await user.hover(screen.getByText(texts.innMissingShort));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(texts.innMissing);
  });

  it('с заведённым ИНН предупреждения нет', () => {
    render({ staff: activeInstaller, api: acceptingApi });

    expect(screen.queryByText(texts.innMissingShort)).not.toBeInTheDocument();
    expect(screen.queryByText(texts.innMissing)).not.toBeInTheDocument();
  });

  it('у подрядчика по ГПХ без ИНН предупреждения нет: его статус не проверяют', () => {
    render({ staff: { ...contractInstaller, inn: null }, api: acceptingApi });

    expect(screen.queryByText(texts.innMissingShort)).not.toBeInTheDocument();
  });

  /* 🔴 Загрузка считается из нарядов и не имеет своего поля в базе (ADR-310,
     issue #629): два числа неизбежно разошлись бы. */
  it('🔴 показывает часы недели числом у полосы', () => {
    const stats = staffLoadFixture.get(activeInstaller.id);
    render({ staff: activeInstaller, api: acceptingApi, stats });

    /* У полосы стоит величина, а норма — в её имени: повторять «из 50» в
       каждой из восьми строк незачем, норма одна на всех. */
    const value = screen.getByLabelText(texts.loadOf(stats?.loadMin ?? 0, stats?.normMin ?? 0));
    expect(value).toHaveTextContent(texts.hours(stats?.loadMin ?? 0));
  });

  /* 🔴 Переработка названа словами, а не только краской: цветом одним она не
     читается ни при нарушениях цветовосприятия, ни на чёрно-белой печати. */
  it('🔴 переработка помечена чипом, а не отмечена одним цветом', () => {
    const stats = staffLoadFixture.get(contractInstaller.id);
    render({ staff: contractInstaller, api: acceptingApi, stats });

    expect(screen.getByText(texts.overtimeChip(stats?.overtimeMin ?? 0))).toBeInTheDocument();
  });

  it('без переработки чипа нет', () => {
    render({
      staff: activeInstaller,
      api: acceptingApi,
      stats: staffLoadFixture.get(activeInstaller.id),
    });

    expect(screen.queryByText(/^\+\d+ ч$/)).not.toBeInTheDocument();
  });

  it('без показателей строка не врёт нулями в загрузке', () => {
    render({ staff: activeInstaller, api: acceptingApi });

    expect(screen.queryByLabelText(/из .* ч/)).not.toBeInTheDocument();
  });

  /* 🔴 Полный набор действий над строкой (ADR-307 §4): открыть и удалить.
     Удаление закрыто, пока за человеком закреплены наряды — иначе наряд
     остался бы без исполнителя. */
  it('🔴 действия строки: открыть карточку и удалить', () => {
    render({
      staff: activeInstaller,
      api: acceptingApi,
      stats: staffLoadFixture.get(activeInstaller.id),
    });

    const actions = within(
      screen.getByRole('group', { name: texts.rowActions(staffTitle(activeInstaller)) }),
    );

    expect(actions.getByRole('link', { name: texts.rowOpen })).toHaveAttribute(
      'href',
      '/admin/team/u2',
    );
    expect(actions.getByRole('button', { name: texts.remove })).toBeDisabled();
  });

  it('удаление открыто, только когда нарядов за человеком нет', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render({
      staff: disabledInstaller,
      api: { ...acceptingApi, remove },
      stats: staffLoadFixture.get(disabledInstaller.id),
      confirmRemove: async () => true,
    });

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).toHaveBeenCalledWith(disabledInstaller.id);
  });

  it('🔴 отказ от подтверждения учётную запись не удаляет', async () => {
    const user = userEvent.setup();
    const remove = vi.fn(async () => ({ ok: true }) as const);

    render({
      staff: disabledInstaller,
      api: { ...acceptingApi, remove },
      stats: staffLoadFixture.get(disabledInstaller.id),
      confirmRemove: async () => false,
    });

    await user.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).not.toHaveBeenCalled();
  });

  it('удержания видны прямо в строке, а их отсутствие названо словом', () => {
    render({ staff: activeInstaller, api: acceptingApi, stats: staffLoadFixture.get('u2') });

    expect(screen.getByText(texts.noDeductions)).toBeInTheDocument();
  });
});
