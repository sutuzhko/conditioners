import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { formatMoney } from '@/shared/lib/format';

import { LeadCardView } from './LeadCardView';
import { leadManagerContent as texts } from './content';
import {
  acceptingRemove,
  acceptingToClient,
  acceptingToOrder,
  acceptingUpdate,
  bareLead,
  cancelledLead,
  clientLead,
  contextLead,
  failingRemove,
  failingToOrder,
  failingUpdate,
  linkingToClient,
  modelLead,
  newLead,
  workedLead,
} from './fixtures';

describe('Карточка заявки', () => {
  it('🔴 данные клиента не редактируются — их полей ввода нет', () => {
    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    expect(screen.queryByLabelText(new RegExp(texts.phone))).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(newLead.name)).not.toBeInTheDocument();
    expect(screen.getByText(newLead.name)).toBeInTheDocument();
  });

  it('телефон — ссылка для звонка', () => {
    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    expect(screen.getByRole('link', { name: /900/ })).toHaveAttribute('href', 'tel:+79001234567');
  });

  it('🔴 факт согласия показывается всегда: его нужно уметь предъявить', () => {
    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    expect(screen.getByText(texts.consent)).toBeInTheDocument();
  });

  it('незаполненные поля не показываются пустыми строками', () => {
    render(
      <LeadCardView
        lead={bareLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    expect(screen.queryByText(texts.place)).not.toBeInTheDocument();
    expect(screen.queryByText(texts.callTime)).not.toBeInTheDocument();
    // 🔴 у незаполненной модели строки нет вовсе, а не прочерк ради симметрии
    expect(screen.queryByText(texts.model)).not.toBeInTheDocument();
    expect(screen.getByText(texts.topic)).toBeInTheDocument();
  });

  it('🔴 модель показывается отдельной строкой рядом с темой (ADR-129)', () => {
    render(
      <LeadCardView
        lead={modelLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    expect(screen.getByText(texts.model)).toBeInTheDocument();
    expect(screen.getByText('Сплит-система 09')).toBeInTheDocument();
  });

  it('🔴 подтверждённое поле и снимок контекста подписаны по-разному', () => {
    render(
      <LeadCardView
        lead={modelLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    /* Название одно и то же — это норма (ADR-129). Различать их обязаны
       подписи: иначе владелец решит, что панель показывает дубль. */
    expect(texts.model).not.toBe(texts.contextModel);
    expect(screen.getByText(texts.model)).toBeInTheDocument();
    expect(screen.getByText(texts.contextModel)).toBeInTheDocument();
  });

  it('смена статуса уходит на сервер сразу', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }));
    render(
      <LeadCardView
        lead={newLead}
        update={update}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await user.selectOptions(screen.getByLabelText(texts.status), texts.statusTitle('in_progress'));

    expect(update).toHaveBeenCalledWith('l1', { status: 'in_progress' });
  });

  /**
   * 🔴 Главная проверка задачи. Без отката на экране оставалось «В работе», а в
   * базе — «Новая»: владелец закрывал сообщение об отказе, селектор показывал
   * новое значение, и заявка оставалась необработанной. Заявка — это деньги.
   */
  it('🔴 сервер не принял статус — селектор возвращается к прежнему', async () => {
    const user = userEvent.setup();
    render(
      <LeadCardView
        lead={newLead}
        update={failingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    const select = screen.getByLabelText(texts.status);
    await user.selectOptions(select, texts.statusTitle('in_progress'));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    await waitFor(() => {
      expect(select).toHaveValue('new');
    });
  });

  it('сервер принял статус — новое значение остаётся', async () => {
    const user = userEvent.setup();
    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    const select = screen.getByLabelText(texts.status);
    await user.selectOptions(select, texts.statusTitle('in_progress'));

    await waitFor(() => {
      expect(select).toHaveValue('in_progress');
    });
  });

  it('заметка сохраняется отдельной кнопкой, а не на каждую букву', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }));
    render(
      <LeadCardView
        lead={newLead}
        update={update}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await user.type(screen.getByLabelText(new RegExp(texts.managerComment)), 'Позвонить утром');
    expect(update).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: texts.saveNote }));

    expect(update).toHaveBeenCalledWith('l1', { managerComment: 'Позвонить утром' });
  });

  it('очищенная заметка уходит как null, а не пустой строкой', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }));
    render(
      <LeadCardView
        lead={workedLead}
        update={update}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await user.clear(screen.getByLabelText(new RegExp(texts.managerComment)));
    await user.click(screen.getByRole('button', { name: texts.saveNote }));

    expect(update).toHaveBeenCalledWith('l3', { managerComment: null });
  });

  it('пока заметка не изменена, сохранять нечего', () => {
    render(
      <LeadCardView
        lead={workedLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    expect(screen.queryByRole('button', { name: texts.saveNote })).not.toBeInTheDocument();
  });

  it('отказ сервера объясняется и страница не перечитывается', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(
      <LeadCardView
        lead={newLead}
        update={failingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
        onChanged={onChanged}
      />,
    );

    await user.selectOptions(screen.getByLabelText(texts.status), texts.statusTitle('done'));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
    expect(onChanged).not.toHaveBeenCalled();
  });
  it('«В клиенты» заводит карточку человека и сообщает об этом', async () => {
    const user = userEvent.setup();
    const toClient = vi.fn(async () => ({ ok: true, clientId: 'c1', created: true }) as const);

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={toClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.toClient }));

    expect(toClient).toHaveBeenCalledWith(newLead.id);
    expect(await screen.findByText(texts.toClientCreated)).toBeInTheDocument();
  });

  it('🔴 знакомый номер не заводит второго человека — об этом говорят прямо', async () => {
    const user = userEvent.setup();

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={linkingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.toClient }));

    expect(await screen.findByText(texts.toClientLinked)).toBeInTheDocument();
  });

  it('после заведения ведёт в карточку клиента, а не предлагает завести снова', async () => {
    const user = userEvent.setup();

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.toClient }));

    expect(await screen.findByRole('link', { name: texts.inBase })).toHaveAttribute(
      'href',
      '/admin/clients/c1',
    );
    expect(screen.queryByRole('button', { name: texts.toClient })).not.toBeInTheDocument();
  });

  it('уже заведённое обращение сразу показывает переход в карточку', () => {
    render(
      <LeadCardView
        lead={clientLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    expect(screen.getByRole('link', { name: texts.inBase })).toHaveAttribute(
      'href',
      '/admin/clients/c1',
    );
  });

  it('отказ сервера показывается человеку, а не теряется', async () => {
    const user = userEvent.setup();
    const toClient = vi.fn(
      async () => ({ ok: false, message: 'В обращении нет телефона' }) as const,
    );

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={toClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.toClient }));

    expect(await screen.findByRole('alert')).toHaveTextContent('В обращении нет телефона');
  });
  it('«Создать заказ» заводит клиента, переводит обращение в работу и уводит к наряду', async () => {
    const user = userEvent.setup();
    const toOrder = vi.fn(
      async () => ({ ok: true, clientId: 'c1', status: 'in_progress' }) as const,
    );
    const onOrder = vi.fn();
    const onChanged = vi.fn();

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={toOrder}
        remove={acceptingRemove}
        onOrder={onOrder}
        onChanged={onChanged}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.toOrder }));

    expect(toOrder).toHaveBeenCalledWith(newLead.id);
    /* Куда идти за черновиком, решает страница: карточка не знает ни полей
       наряда, ни того, из какого раздела её открыли. */
    expect(onOrder).toHaveBeenCalledWith(newLead.id);
    expect(onChanged).toHaveBeenCalled();
  });

  it('после «Создать заказ» статус в карточке уже «В работе»', async () => {
    const user = userEvent.setup();

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.toOrder }));

    expect(await screen.findByLabelText(texts.status)).toHaveValue('in_progress');
  });

  it('пока наряд готовится, кнопка объясняет это и второго нажатия не принимает', async () => {
    const user = userEvent.setup();
    /* Обещание, которое не разрешается: так выглядит секунда между ответом
       сервера и переходом на страницу черновика. */
    const toOrder = vi.fn(() => new Promise<never>(() => {}));

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={toOrder}
        remove={acceptingRemove}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.toOrder }));

    const button = await screen.findByRole('button', { name: texts.toOrderBusy });
    expect(button).toBeDisabled();
    expect(toOrder).toHaveBeenCalledTimes(1);
  });

  it('отказ на «Создать заказ» объясняется и никуда не уводит', async () => {
    const user = userEvent.setup();
    const onOrder = vi.fn();

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={failingToOrder}
        remove={acceptingRemove}
        onOrder={onOrder}
      />,
    );

    await user.click(screen.getByRole('button', { name: texts.toOrder }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onOrder).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: texts.toOrder })).toBeEnabled();
  });
});

/** Карточка с контекстом: остальные пропсы к делу не относятся. */
function renderContextCard(lead = contextLead) {
  return render(
    <LeadCardView
      lead={lead}
      update={acceptingUpdate}
      toClient={acceptingToClient}
      toOrder={acceptingToOrder}
      remove={acceptingRemove}
    />,
  );
}

/**
 * Раздел контекста целиком. Запросы идут внутри него: «Квартира» встречается и
 * в полях заявки, и в подборе, и глобальный поиск нашёл бы обе.
 */
function contextRegion() {
  return within(screen.getByRole('region', { name: texts.contextTitle }));
}

/**
 * Сумма так, как её видит поиск по тексту: Testing Library схлопывает
 * неразрывные пробелы разметки в обычные, а строку-образец оставляет как есть.
 */
function money(value: number): string {
  return formatMoney(value).replace(/\s/g, ' ');
}

describe('Карточка заявки — что человек делал на сайте', () => {
  it('показывает расчёт разбивкой, а не одной суммой', () => {
    renderContextCard();
    const context = contextRegion();

    expect(context.getByText(texts.contextEstimate)).toBeInTheDocument();
    expect(context.getByText('Базовый монтаж, класс 09')).toBeInTheDocument();
    expect(context.getByText(texts.contextTotal)).toBeInTheDocument();
    expect(context.getByText(money(30_200))).toBeInTheDocument();
  });

  it('показывает цену за блок, когда блоков больше одного', () => {
    renderContextCard();

    expect(contextRegion().getByText(texts.contextPerUnit(2))).toBeInTheDocument();
  });

  it('условия расчёта показаны теми же словами, что были на экране', () => {
    renderContextCard();

    expect(contextRegion().getByText(/Класс мощности: 09/)).toBeInTheDocument();
  });

  it('подбор читается площадью, помещением и моделью', () => {
    renderContextCard();

    const pick = contextRegion().getByText(/Сплит-система 09/);
    expect(pick.textContent).toContain('25');
    expect(pick.textContent).toContain('Квартира');
    // 🔴 перечёркнутая цена — та, что стояла на экране (ADR-011)
    expect(pick.textContent).toContain('вместо');
  });

  it('отмеченные модели показываются названием и ценой, а не слагом', () => {
    renderContextCard();
    const context = contextRegion();

    expect(context.getByText(texts.contextLiked)).toBeInTheDocument();
    expect(context.getByText(/Сплит-система 07/)).toBeInTheDocument();
    expect(context.queryByText(/split-07/)).not.toBeInTheDocument();
  });

  it('🔴 предупреждает, что цены в снимке — вчерашние', () => {
    renderContextCard();

    expect(contextRegion().getByText(texts.contextHint)).toBeInTheDocument();
  });

  it('заявка без контекста раздела не показывает', () => {
    renderContextCard(bareLead);

    expect(screen.queryByText(texts.contextTitle)).not.toBeInTheDocument();
  });

  it('показывает только те части, что действительно были', () => {
    const liked = contextLead.context?.liked[0] ?? null;
    renderContextCard({
      ...contextLead,
      context: { estimate: null, pick: null, model: liked, liked: [] },
    });
    const context = contextRegion();

    expect(context.getByText(texts.contextModel)).toBeInTheDocument();
    expect(context.queryByText(texts.contextEstimate)).not.toBeInTheDocument();
    expect(context.queryByText(texts.contextPick)).not.toBeInTheDocument();
  });
});

/**
 * 🔴 Отмена и удаление — разные вещи (ADR-310, issue #600, #630). Отменённое
 * обращение остаётся в истории и в счётчиках конверсии, удалённого не
 * остаётся нигде: это исполнение требования 152-ФЗ об уничтожении
 * персональных данных.
 */
describe('Отмена и удаление обращения', () => {
  it('🔴 отказ спрашивает причину, а не ставится молча выбором в списке', async () => {
    const update = vi.fn(acceptingUpdate);

    render(
      <LeadCardView
        lead={newLead}
        update={update}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await userEvent.selectOptions(
      screen.getByLabelText(texts.status),
      texts.statusTitle('rejected'),
    );

    /* Ни одного запроса до разбора причины: схема отклоняет отмену без неё, и
       молчаливая попытка закончилась бы отказом сервера. */
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: texts.cancelTitle })).toBeInTheDocument();
  });

  it('причина и уточнение уезжают вместе со статусом', async () => {
    const update = vi.fn(acceptingUpdate);

    render(
      <LeadCardView
        lead={newLead}
        update={update}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await userEvent.selectOptions(
      screen.getByLabelText(texts.status),
      texts.statusTitle('rejected'),
    );

    const dialog = within(screen.getByRole('dialog', { name: texts.cancelTitle }));
    await userEvent.selectOptions(
      dialog.getByLabelText(texts.cancelReason),
      texts.cancelReasonTitle('too_expensive'),
    );
    await userEvent.type(dialog.getByLabelText(texts.cancelNote), 'Нашёл дешевле у частника');
    await userEvent.click(dialog.getByRole('button', { name: texts.cancelSubmit }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(newLead.id, {
        status: 'rejected',
        cancelReason: 'too_expensive',
        cancelNote: 'Нашёл дешевле у частника',
      }),
    );
  });

  it('отказ от разбора возвращает прежний статус и ничего не сохраняет', async () => {
    const update = vi.fn(acceptingUpdate);

    render(
      <LeadCardView
        lead={workedLead}
        update={update}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    await userEvent.selectOptions(
      screen.getByLabelText(texts.status),
      texts.statusTitle('rejected'),
    );
    await userEvent.click(screen.getByRole('button', { name: texts.cancelBack }));

    expect(update).not.toHaveBeenCalled();
    expect(screen.getByLabelText(texts.status)).toHaveValue(workedLead.status);
  });

  it('разобранный отказ виден в карточке — вместе с уточнением', () => {
    render(
      <LeadCardView
        lead={cancelledLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
      />,
    );

    expect(screen.getByText(texts.cancelledBy('too_expensive'))).toBeInTheDocument();
    expect(screen.getByText(cancelledLead.cancelNote ?? '')).toBeInTheDocument();
  });

  /* 🔴 152-ФЗ: владелец обязан уметь уничтожить персональные данные по
     требованию человека (issue #600). */
  it('🔴 удаление спрашивает подтверждение и называет номер обращения', async () => {
    const remove = vi.fn(acceptingRemove);
    const confirmRemove = vi.fn(async () => true);

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={remove}
        confirmRemove={confirmRemove}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.remove }));

    expect(confirmRemove).toHaveBeenCalledWith(
      expect.objectContaining({ title: texts.removeConfirmTitle(newLead.number) }),
    );
    await waitFor(() => expect(remove).toHaveBeenCalledWith(newLead.id));
  });

  /* 🔴 Отказ от подтверждения не делает ничего — ни запроса, ни пометки. */
  it('🔴 отказ от подтверждения обращение не удаляет', async () => {
    const remove = vi.fn(acceptingRemove);

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={remove}
        confirmRemove={async () => false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.remove }));

    expect(remove).not.toHaveBeenCalled();
  });

  it('удалённое обращение уводит со страницы карточки', async () => {
    const onRemoved = vi.fn();

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={acceptingRemove}
        confirmRemove={async () => true}
        onRemoved={onRemoved}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.remove }));

    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
  });

  it('сервер отказал в удалении — обращение остаётся, отказ объяснён', async () => {
    const onRemoved = vi.fn();

    render(
      <LeadCardView
        lead={newLead}
        update={acceptingUpdate}
        toClient={acceptingToClient}
        toOrder={acceptingToOrder}
        remove={failingRemove}
        confirmRemove={async () => true}
        onRemoved={onRemoved}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: texts.remove }));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
    expect(onRemoved).not.toHaveBeenCalled();
  });
});
