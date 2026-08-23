import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SettingsForm } from './SettingsForm';
import { settingsFormContent as texts } from './content';
import {
  achievementsGroupFixture,
  contactsGroupFixture,
  filledAchievements,
  fullAchievements,
  filledContacts,
  integrationsGroupFixture,
  legalGroupFixture,
  pendingSave,
  rejectingSave,
} from './fixtures';

describe('Форма группы настроек', () => {
  it('до правок сохранять нечего — кнопка заблокирована', () => {
    render(<SettingsForm group={contactsGroupFixture} value={filledContacts} save={vi.fn()} />);

    expect(screen.getByRole('button', { name: texts.save })).toBeDisabled();
  });

  it('сохраняет только свою группу и только изменённое значение', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SettingsForm group={contactsGroupFixture} value={filledContacts} save={save} />);

    await user.clear(screen.getByLabelText(/Часы работы/));
    await user.type(screen.getByLabelText(/Часы работы/), 'Ежедневно');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith('contacts', { ...filledContacts, hours: 'Ежедневно' });
  });

  it('после сохранения сообщает, что изменения уже на сайте', async () => {
    const user = userEvent.setup();
    render(
      <SettingsForm
        group={contactsGroupFixture}
        value={filledContacts}
        save={async () => ({ ok: true })}
      />,
    );

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('status')).toHaveTextContent(texts.savedNote);
  });

  it('ошибка сервера показывается у своего поля и не дублируется', async () => {
    const user = userEvent.setup();
    render(
      <SettingsForm group={contactsGroupFixture} value={filledContacts} save={rejectingSave} />,
    );

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.click(screen.getByRole('button', { name: texts.save }));

    const email = await screen.findByLabelText(/Почта/);
    expect(email).toHaveAttribute('aria-invalid', 'true');
    // Ровно одно объявление: у поля. Дубль над кнопкой диктор прочитал бы второй раз.
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('отказ, не привязанный к полю, объясняется над кнопкой', async () => {
    const user = userEvent.setup();
    render(
      <SettingsForm
        group={contactsGroupFixture}
        value={filledContacts}
        save={async () => ({ ok: false, message: 'Сессия истекла. Войдите заново' })}
      />,
    );

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Сессия истекла');
  });

  it('правка отменяется целиком', async () => {
    const user = userEvent.setup();
    render(<SettingsForm group={contactsGroupFixture} value={filledContacts} save={vi.fn()} />);

    const email = screen.getByLabelText(/Почта/);
    await user.type(email, 'x');
    await user.click(screen.getByRole('button', { name: texts.discard }));

    expect(email).toHaveValue(filledContacts.email);
    expect(screen.queryByRole('button', { name: texts.discard })).not.toBeInTheDocument();
  });

  it('во время сохранения поля и кнопка заблокированы', async () => {
    const user = userEvent.setup();
    render(<SettingsForm group={contactsGroupFixture} value={filledContacts} save={pendingSave} />);

    await user.type(screen.getByLabelText(/Почта/), 'x');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('button', { name: texts.saving })).toBeDisabled();
    expect(screen.getByLabelText(/Почта/)).toBeDisabled();
  });

  it('список: строка добавляется в конец и удаляется по своей подписи', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(
      <SettingsForm
        group={contactsGroupFixture}
        value={{ ...filledContacts, phones: ['+74872000000'] }}
        save={save}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Добавить: телефон' }));
    await user.type(screen.getByLabelText('Телефон 2'), '+79001234567');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith('contacts', {
      ...filledContacts,
      phones: ['+74872000000', '+79001234567'],
    });
  });

  it('удаление строки не задевает соседние', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(
      <SettingsForm
        group={contactsGroupFixture}
        value={{ ...filledContacts, phones: ['первый', 'второй', 'третий'] }}
        save={save}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Удалить: телефон 2' }));
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith('contacts', {
      ...filledContacts,
      phones: ['первый', 'третий'],
    });
  });

  it('флажок пишется во вложенный путь', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SettingsForm group={integrationsGroupFixture} value={{}} save={save} />);

    await user.click(screen.getByLabelText('Кнопка Telegram'));
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith('integrations', { messengerButtons: { telegram: true } });
  });

  it('выбор из списка сохраняет выбранное значение', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SettingsForm group={legalGroupFixture} value={{ form: 'ИП', inn: '' }} save={save} />);

    await user.selectOptions(screen.getByLabelText(/Форма/), 'ООО');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith('legal', { form: 'ООО', inn: '' });
  });

  it('пустая группа открывается, а не падает', () => {
    render(<SettingsForm group={contactsGroupFixture} value={{}} save={vi.fn()} />);

    expect(screen.getByLabelText(/Почта/)).toHaveValue('');
    expect(within(screen.getByRole('group')).getByText(texts.listEmpty)).toBeInTheDocument();
  });
});

describe('Цифры первого экрана', () => {
  it('строка состоит из числа, хвоста и подписи', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(
      <SettingsForm group={achievementsGroupFixture} value={filledAchievements} save={save} />,
    );

    await user.clear(screen.getByLabelText('Число: цифра 1'));
    await user.type(screen.getByLabelText('Число: цифра 1'), '1500');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith('achievements', {
      items: [
        { value: '1500', suffix: '+', label: 'установок' },
        { value: '3', suffix: ' года', label: 'гарантии' },
      ],
    });
  });

  it('🔴 значение уходит строкой: в нём бывает диапазон «1–5», а не только число', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SettingsForm group={achievementsGroupFixture} value={{ items: [] }} save={save} />);

    await user.click(screen.getByRole('button', { name: 'Добавить: цифра' }));
    await user.type(screen.getByLabelText('Число: цифра 1'), '7');
    await user.type(screen.getByLabelText('Подпись: цифра 1'), 'лет на рынке');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith('achievements', {
      items: [{ value: '7', suffix: '', label: 'лет на рынке' }],
    });
  });

  it('🔴 на пределе из схемы кнопка добавления исчезает, а не роняет запрос', () => {
    render(
      <SettingsForm group={achievementsGroupFixture} value={fullAchievements} save={vi.fn()} />,
    );

    expect(screen.queryByRole('button', { name: 'Добавить: цифра' })).not.toBeInTheDocument();
    expect(screen.getByText(texts.listFull(4))).toBeInTheDocument();
  });

  it('удаление строки не задевает соседние', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(
      <SettingsForm group={achievementsGroupFixture} value={filledAchievements} save={save} />,
    );

    await user.click(screen.getByRole('button', { name: 'Удалить: цифра 1' }));
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith('achievements', {
      items: [{ value: '3', suffix: ' года', label: 'гарантии' }],
    });
  });

  it('пустая группа — рабочее состояние: полосы на сайте просто нет', () => {
    render(<SettingsForm group={achievementsGroupFixture} value={{}} save={vi.fn()} />);

    expect(screen.getByText(texts.listEmpty)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить: цифра' })).toBeInTheDocument();
  });
});
