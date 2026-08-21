import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LeadCardView } from './LeadCardView';
import { leadManagerContent as texts } from './content';
import { acceptingUpdate, bareLead, failingUpdate, newLead, workedLead } from './fixtures';

describe('Карточка заявки', () => {
  it('🔴 данные клиента не редактируются — их полей ввода нет', () => {
    render(<LeadCardView lead={newLead} update={acceptingUpdate} />);

    expect(screen.queryByLabelText(new RegExp(texts.phone))).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue(newLead.name)).not.toBeInTheDocument();
    expect(screen.getByText(newLead.name)).toBeInTheDocument();
  });

  it('телефон — ссылка для звонка', () => {
    render(<LeadCardView lead={newLead} update={acceptingUpdate} />);

    expect(screen.getByRole('link', { name: /900/ })).toHaveAttribute('href', 'tel:+79001234567');
  });

  it('🔴 факт согласия показывается всегда: его нужно уметь предъявить', () => {
    render(<LeadCardView lead={newLead} update={acceptingUpdate} />);

    expect(screen.getByText(texts.consent)).toBeInTheDocument();
  });

  it('незаполненные поля не показываются пустыми строками', () => {
    render(<LeadCardView lead={bareLead} update={acceptingUpdate} />);

    expect(screen.queryByText(texts.place)).not.toBeInTheDocument();
    expect(screen.queryByText(texts.callTime)).not.toBeInTheDocument();
    expect(screen.getByText(texts.topic)).toBeInTheDocument();
  });

  it('смена статуса уходит на сервер сразу', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }));
    render(<LeadCardView lead={newLead} update={update} />);

    await user.selectOptions(screen.getByLabelText(texts.status), texts.statusTitle('in_progress'));

    expect(update).toHaveBeenCalledWith('l1', { status: 'in_progress' });
  });

  it('заметка сохраняется отдельной кнопкой, а не на каждую букву', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }));
    render(<LeadCardView lead={newLead} update={update} />);

    await user.type(screen.getByLabelText(new RegExp(texts.managerComment)), 'Позвонить утром');
    expect(update).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: texts.saveNote }));

    expect(update).toHaveBeenCalledWith('l1', { managerComment: 'Позвонить утром' });
  });

  it('очищенная заметка уходит как null, а не пустой строкой', async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => ({ ok: true }));
    render(<LeadCardView lead={workedLead} update={update} />);

    await user.clear(screen.getByLabelText(new RegExp(texts.managerComment)));
    await user.click(screen.getByRole('button', { name: texts.saveNote }));

    expect(update).toHaveBeenCalledWith('l3', { managerComment: null });
  });

  it('пока заметка не изменена, сохранять нечего', () => {
    render(<LeadCardView lead={workedLead} update={acceptingUpdate} />);

    expect(screen.queryByRole('button', { name: texts.saveNote })).not.toBeInTheDocument();
  });

  it('отказ сервера объясняется и страница не перечитывается', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<LeadCardView lead={newLead} update={failingUpdate} onChanged={onChanged} />);

    await user.selectOptions(screen.getByLabelText(texts.status), texts.statusTitle('done'));

    expect(await screen.findByRole('alert')).toHaveTextContent(texts.serverError);
    expect(onChanged).not.toHaveBeenCalled();
  });
});
