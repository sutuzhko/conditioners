import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SettingsGroups } from './SettingsGroups';
import { settingsFormContent as texts } from './content';
import { missingFieldLabels } from './lib';
import type { SaveGroup } from './model';
import {
  achievementsGroupFixture,
  companyEntriesFixture,
  contactsGroupFixture,
  filledContacts,
  integrationsGroupFixture,
  legalGroupFixture,
  filledEntrepreneur,
  readyEntriesFixture,
  rejectingSave,
} from './fixtures';

const accepting: SaveGroup = async () => ({ ok: true });

describe('Данные компании: одна кнопка на тринадцать групп', () => {
  it('🔴 до правок сохранять нечего, и кнопка объясняет почему', () => {
    render(<SettingsGroups entries={companyEntriesFixture} save={vi.fn()} />);

    const save = screen.getByRole('button', { name: new RegExp(texts.saveAll) });
    expect(save).toHaveAttribute('aria-disabled', 'true');
    expect(save).toHaveAccessibleName(expect.stringContaining(texts.nothingToSave));
  });

  it('🔴 одно нажатие сохраняет все тронутые группы', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SettingsGroups entries={companyEntriesFixture} save={save} />);

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.type(screen.getByLabelText(/Номер счётчика/), '12345');
    await user.click(screen.getByRole('button', { name: texts.saveAll }));

    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenCalledWith('contacts', {
      ...filledContacts,
      email: `${filledContacts.email}x`,
    });
    expect(save).toHaveBeenCalledWith('integrations', { metrikaId: '12345' });
  });

  it('нетронутая группа на сервер не уходит', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SettingsGroups entries={companyEntriesFixture} save={save} />);

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.click(screen.getByRole('button', { name: texts.saveAll }));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('contacts', expect.anything());
  });

  it('после сохранения названы именно сохранённые группы', async () => {
    const user = userEvent.setup();
    render(<SettingsGroups entries={companyEntriesFixture} save={accepting} />);

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.click(screen.getByRole('button', { name: texts.saveAll }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      texts.savedGroups([contactsGroupFixture.title]),
    );
  });

  it('🔴 страница перечитывается: готовность считает сервер, а не форма', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(<SettingsGroups entries={companyEntriesFixture} save={accepting} onSaved={onSaved} />);

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.click(screen.getByRole('button', { name: texts.saveAll }));

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('🔴 отказ одной группы не отменяет сохранённые соседние', async () => {
    const user = userEvent.setup();
    const save = vi.fn<SaveGroup>(async (key) =>
      key === 'contacts'
        ? {
            ok: false,
            message: 'Проверьте адрес почты',
            fieldErrors: { email: 'Проверьте адрес почты' },
          }
        : { ok: true },
    );
    render(<SettingsGroups entries={companyEntriesFixture} save={save} />);

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.type(screen.getByLabelText(/Номер счётчика/), '12345');
    await user.click(screen.getByRole('button', { name: texts.saveAll }));

    const summary = (await screen.findByText(texts.saveFailedTitle)).closest('[role="alert"]');
    expect(summary).not.toBeNull();
    /* Сохранённое названо тут же: иначе владелец решит, что пропало всё. */
    expect(summary?.textContent).toContain(texts.savedGroups([integrationsGroupFixture.title]));
  });

  it('сводка отказа ведёт к своей группе, а не заставляет листать страницу', async () => {
    const user = userEvent.setup();
    render(<SettingsGroups entries={companyEntriesFixture} save={rejectingSave} />);

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.click(screen.getByRole('button', { name: texts.saveAll }));

    const summary = (await screen.findByText(texts.saveFailedTitle)).closest('[role="alert"]');
    /* Ссылка ведёт к самой группе, а не к началу страницы. */
    expect(summary?.querySelector('a[href="#contacts"]')?.textContent).toBe(
      contactsGroupFixture.title,
    );
  });

  it('отказ сервера с названным полем встаёт у этого поля', async () => {
    const user = userEvent.setup();
    render(<SettingsGroups entries={companyEntriesFixture} save={rejectingSave} />);

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.click(screen.getByRole('button', { name: texts.saveAll }));

    expect(await screen.findByText('Проверьте адрес почты')).toBeInTheDocument();
    expect(screen.getByLabelText(/Почта/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('🔴 незаполненная группа названа плашкой и пустыми полями', () => {
    render(<SettingsGroups entries={companyEntriesFixture} save={vi.fn()} />);

    const card = screen.getByRole('region', { name: integrationsGroupFixture.title });
    expect(within(card).getByText(texts.groupUnfilled)).toBeInTheDocument();
    expect(within(card).getByText(texts.groupMissing(['Номер счётчика']))).toBeInTheDocument();
  });

  it('заполненная группа не пугает владельца предупреждением', () => {
    render(<SettingsGroups entries={companyEntriesFixture} save={vi.fn()} />);

    const card = screen.getByRole('region', { name: contactsGroupFixture.title });
    expect(within(card).getByText(texts.groupReady)).toBeInTheDocument();
  });

  it('полоса готовности показывает долю заполненных групп', () => {
    render(<SettingsGroups entries={companyEntriesFixture} save={vi.fn()} />);

    const bar = screen.getByRole('progressbar', { name: texts.readinessLabel });
    // две группы из трёх — 67 %
    expect(bar).toHaveAttribute('aria-valuenow', '67');
    expect(screen.getByText(texts.readinessValue(67))).toBeInTheDocument();
  });

  it('всё заполнено — сто процентов и ни одного предупреждения', () => {
    render(<SettingsGroups entries={readyEntriesFixture} save={vi.fn()} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.queryByText(texts.groupUnfilled)).not.toBeInTheDocument();
  });

  it('тронутая группа помечена: одна кнопка обязана показать, что она сохранит', async () => {
    const user = userEvent.setup();
    render(<SettingsGroups entries={companyEntriesFixture} save={vi.fn()} />);

    await user.type(screen.getByLabelText(/Почта/), 'x');

    const card = screen.getByRole('region', { name: contactsGroupFixture.title });
    expect(within(card).getByText(texts.groupDirty)).toBeInTheDocument();
    const other = screen.getByRole('region', { name: achievementsGroupFixture.title });
    expect(within(other).queryByText(texts.groupDirty)).not.toBeInTheDocument();
  });

  it('«Отменить правки» возвращает все группы к сохранённому', async () => {
    const user = userEvent.setup();
    render(<SettingsGroups entries={companyEntriesFixture} save={vi.fn()} />);

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.click(screen.getByRole('button', { name: texts.discardAll }));

    expect(screen.getByLabelText(/Почта/)).toHaveValue(filledContacts.email);
    expect(screen.getByRole('button', { name: new RegExp(texts.saveAll) })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('🔴 смена формы реквизитов спрашивает, что исчезнет (ADR-112)', async () => {
    const user = userEvent.setup();
    const save = vi.fn();
    render(
      <SettingsGroups
        entries={[
          { group: legalGroupFixture, value: filledEntrepreneur, ready: true, missing: [] },
        ]}
        save={save}
      />,
    );

    await user.selectOptions(screen.getByLabelText(/Форма/), 'ООО');

    expect(await screen.findByRole('dialog')).toHaveTextContent(
      texts.resetTitle(legalGroupFixture.title),
    );
  });

  it('оглавление ведёт к каждой группе', () => {
    render(<SettingsGroups entries={companyEntriesFixture} save={vi.fn()} />);

    const toc = screen.getByRole('navigation', { name: texts.tocLabel });
    expect(within(toc).getAllByRole('link')).toHaveLength(companyEntriesFixture.length);
    expect(within(toc).getByRole('link', { name: contactsGroupFixture.title })).toHaveAttribute(
      'href',
      '#contacts',
    );
  });
});

describe('Подписи незаполненных полей', () => {
  it('путь превращается в подпись формы', () => {
    expect(missingFieldLabels(contactsGroupFixture, [{ field: 'email' }])).toEqual(['Почта']);
  });

  it('🔴 индекс строки списка отбрасывается: «Телефоны» не троятся', () => {
    expect(
      missingFieldLabels(contactsGroupFixture, [{ field: 'phones[0]' }, { field: 'phones[1]' }]),
    ).toEqual(['Телефоны']);
  });

  it('группа целиком не заполнена — называть нечего', () => {
    expect(missingFieldLabels(contactsGroupFixture, [{ field: '' }])).toEqual([]);
  });

  it('🔴 поле без подписи показывается ключом, а не прячется', () => {
    expect(missingFieldLabels(contactsGroupFixture, [{ field: 'bankBik' }])).toEqual(['bankBik']);
  });
});
