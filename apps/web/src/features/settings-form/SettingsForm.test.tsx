import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SettingsForm } from './SettingsForm';
import type { SaveGroup } from './model';
import { settingsFormContent as texts } from './content';
import { SCHEDULE_GROUP } from './fields';
import {
  achievementsGroupFixture,
  contactsGroupFixture,
  emptyEntrepreneur,
  filledAchievements,
  fullAchievements,
  filledCompany,
  filledContacts,
  filledEntrepreneur,
  filledSchedule,
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
    render(<SettingsForm group={legalGroupFixture} value={emptyEntrepreneur} save={save} />);

    await user.selectOptions(screen.getByLabelText(/Форма/), 'ООО');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith('legal', { form: 'ООО' });
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

describe('Рабочее окно', () => {
  it('минуты показываются владельцу временем', () => {
    render(<SettingsForm group={SCHEDULE_GROUP} value={filledSchedule} save={vi.fn()} />);

    expect(screen.getByLabelText(/Начало рабочего дня/)).toHaveValue('09:00');
    expect(screen.getByLabelText(/Конец рабочего дня/)).toHaveValue('19:00');
  });

  it('🔴 сохраняется число минут, а не строка времени', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SettingsForm group={SCHEDULE_GROUP} value={filledSchedule} save={save} />);

    await user.clear(screen.getByLabelText(/Начало рабочего дня/));
    await user.type(screen.getByLabelText(/Начало рабочего дня/), '08:30');
    await user.click(screen.getByRole('button', { name: texts.save }));

    // сетке календаря нужно число: разбирать строку она не должна (ADR-138)
    expect(save).toHaveBeenCalledWith('schedule', { fromMin: 510, toMin: 19 * 60 });
  });

  it('🔴 подсказки объясняют разницу с часами работы и цену выхода за окно', () => {
    render(<SettingsForm group={SCHEDULE_GROUP} value={filledSchedule} save={vi.fn()} />);

    // два поля про часы в соседних группах владелец однажды перепутает
    expect(screen.getByText(/Часы работы/)).toBeInTheDocument();
    expect(screen.getByText(/переработкой/)).toBeInTheDocument();
  });

  it('🔴 после сохранения не обещает изменений на сайте: окно видит только панель', async () => {
    const user = userEvent.setup();
    render(
      <SettingsForm
        group={SCHEDULE_GROUP}
        value={filledSchedule}
        save={async () => ({ ok: true })}
      />,
    );

    await user.clear(screen.getByLabelText(/Конец рабочего дня/));
    await user.type(screen.getByLabelText(/Конец рабочего дня/), '21:00');
    await user.click(screen.getByRole('button', { name: texts.save }));

    const done = await screen.findByRole('status');
    expect(done).toHaveTextContent(SCHEDULE_GROUP.savedNote ?? '');
    expect(done).not.toHaveTextContent(texts.savedNote);
  });

  it('незаданное окно открывается пустыми полями, а не полуночью', () => {
    render(<SettingsForm group={SCHEDULE_GROUP} value={{}} save={vi.fn()} />);

    expect(screen.getByLabelText(/Начало рабочего дня/)).toHaveValue('');
  });
});

describe('Реквизиты: состав зависит от формы регистрации', () => {
  it('🔴 поля чужой формы не отрисованы, а не спрятаны', () => {
    render(<SettingsForm group={legalGroupFixture} value={filledEntrepreneur} save={vi.fn()} />);

    expect(screen.getByLabelText(/ФИО полностью/)).toBeInTheDocument();
    expect(screen.getByLabelText(/ОГРНИП/)).toBeInTheDocument();
    // у предпринимателя их не бывает — значит их нет и в форме
    expect(screen.queryByLabelText(/КПП/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Руководитель/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Сокращённое наименование/)).not.toBeInTheDocument();
  });

  it('у общества свои поля и нет органа регистрации', () => {
    render(<SettingsForm group={legalGroupFixture} value={filledCompany} save={vi.fn()} />);

    expect(screen.getByLabelText(/Сокращённое наименование/)).toBeInTheDocument();
    expect(screen.getByLabelText(/КПП/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Орган регистрации/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Дата регистрации/)).not.toBeInTheDocument();
  });

  it('🔴 непубликуемые поля названы непубликуемыми', () => {
    render(<SettingsForm group={legalGroupFixture} value={filledEntrepreneur} save={vi.fn()} />);

    // иначе владелец решит, что публикует домашний адрес
    expect(screen.getByLabelText(/Адрес регистрации/)).toHaveAccessibleDescription(
      /На сайт не выводится/,
    );
    expect(screen.getByLabelText(/^БИК/)).toHaveAccessibleDescription(/На сайт не выводится/);
  });

  it('🔴 смена формы спрашивает и называет исчезающее словами', async () => {
    const user = userEvent.setup();
    render(<SettingsForm group={legalGroupFixture} value={filledEntrepreneur} save={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText(/Форма/), 'ООО');

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(texts.resetTitle(legalGroupFixture.title));
    // «данные будут удалены» владельцу не говорит ничего — перечисляем поля
    expect(dialog).toHaveAccessibleDescription(/ФИО полностью/);
    expect(dialog).toHaveAccessibleDescription(/ОГРНИП/);
  });

  it('🔴 отказ не меняет ничего: ни переключателя, ни полей', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SettingsForm group={legalGroupFixture} value={filledEntrepreneur} save={save} />);

    await user.selectOptions(screen.getByLabelText(/Форма/), 'ООО');
    await user.click(await screen.findByRole('button', { name: texts.resetCancel }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText(/Форма/)).toHaveValue('ИП');
    expect(screen.getByLabelText(/ФИО полностью/)).toHaveValue(filledEntrepreneur.name);
    // сохранять нечего: черновик не тронут
    expect(screen.getByRole('button', { name: texts.save })).toBeDisabled();
  });

  it('🔴 согласие очищает группу целиком, а не только поля чужой формы', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SettingsForm group={legalGroupFixture} value={filledEntrepreneur} save={save} />);

    await user.selectOptions(screen.getByLabelText(/Форма/), 'ООО');
    await user.click(await screen.findByRole('button', { name: texts.resetConfirm }));

    /* Одноимённые поля означают разное: ФИО предпринимателя на месте
       фирменного наименования — это молча опубликованные персональные данные. */
    expect(await screen.findByLabelText(/Полное наименование/)).toHaveValue('');
    expect(screen.getByLabelText(/Место нахождения/)).toHaveValue('');
    expect(screen.getByLabelText(/^Банк/)).toHaveValue('');

    await user.click(screen.getByRole('button', { name: texts.save }));

    // что показано на экране, то и уходит на сервер
    expect(save).toHaveBeenCalledWith('legal', { form: 'ООО' });
  });

  it('пустую группу менять не страшно — вопрос лишний', async () => {
    const user = userEvent.setup();
    render(<SettingsForm group={legalGroupFixture} value={emptyEntrepreneur} save={vi.fn()} />);

    await user.selectOptions(screen.getByLabelText(/Форма/), 'ООО');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/КПП/)).toBeInTheDocument();
  });

  it('дата регистрации уходит машинной строкой', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SettingsForm group={legalGroupFixture} value={emptyEntrepreneur} save={save} />);

    await user.type(screen.getByLabelText(/Дата регистрации/), '2015-03-12');
    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith('legal', { form: 'ИП', regDate: '2015-03-12' });
  });

  it('🔴 очищенная дата уходит из тела запроса, а не становится умолчанием', async () => {
    const user = userEvent.setup();
    let sent: unknown = null;
    const save: SaveGroup = async (...args) => {
      sent = args[1];
      return { ok: true };
    };
    render(<SettingsForm group={legalGroupFixture} value={filledEntrepreneur} save={save} />);

    await user.clear(screen.getByLabelText(/Дата регистрации/));
    await user.click(screen.getByRole('button', { name: texts.save }));

    // ключ уходит из тела запроса: пустое поле — это «не задавал» (ADR-139)
    await waitFor(() => expect(JSON.stringify(sent)).not.toContain('regDate'));
  });

  it('сообщение сервера о битом ИНН встаёт под полем ИНН', async () => {
    const user = userEvent.setup();
    const message = 'ИНН предпринимателя — 12 цифр, проверьте номер';
    render(
      <SettingsForm
        group={legalGroupFixture}
        value={filledEntrepreneur}
        save={async () => ({ ok: false, message, fieldErrors: { inn: message } })}
      />,
    );

    await user.type(screen.getByLabelText(/^ИНН/), '0');
    await user.click(screen.getByRole('button', { name: texts.save }));

    const inn = await screen.findByLabelText(/^ИНН/);
    expect(inn).toHaveAttribute('aria-invalid', 'true');
    expect(inn).toHaveAccessibleDescription(new RegExp(message));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
