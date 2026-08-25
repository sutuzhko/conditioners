import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SpecsDictionaryForm } from './SpecsDictionaryForm';
import { specsDictionaryContent as texts } from './content';
import { acceptingSave, emptyDictionary, failingSave, filledDictionary } from './fixtures';

describe('Справочник характеристик', () => {
  it('показывает группы и их поля', () => {
    render(<SpecsDictionaryForm value={filledDictionary} save={acceptingSave} />);

    expect(screen.getByDisplayValue('Основное')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Мощность охлаждения')).toBeInTheDocument();
    expect(screen.getByDisplayValue('кВт')).toBeInTheDocument();
  });

  it('пустой справочник объясняет, что будет без него', () => {
    render(<SpecsDictionaryForm value={emptyDictionary} save={acceptingSave} />);

    expect(screen.getByText(texts.empty)).toBeInTheDocument();
  });

  it('добавляет группу', async () => {
    const user = userEvent.setup();
    render(<SpecsDictionaryForm value={emptyDictionary} save={acceptingSave} />);

    await user.click(screen.getByRole('button', { name: texts.groupAdd }));

    expect(screen.getByLabelText(texts.groupTitle)).toBeInTheDocument();
    expect(screen.queryByText(texts.empty)).not.toBeInTheDocument();
  });

  it('удаляет характеристику из группы', async () => {
    const user = userEvent.setup();
    render(<SpecsDictionaryForm value={filledDictionary} save={acceptingSave} />);

    /* Подпись «Удалить характеристику 1» есть в каждой группе — берём первую:
       нумерация идёт внутри группы, и это правильно, но в тесте нужна именно
       первая строка первой группы. */
    const [first] = screen.getAllByRole('button', { name: texts.fieldRemove(1) });
    if (first === undefined) throw new Error('Кнопка удаления не найдена');
    await user.click(first);

    expect(screen.queryByDisplayValue('Мощность охлаждения')).not.toBeInTheDocument();
  });

  it('отправляет справочник целиком', async () => {
    const user = userEvent.setup();
    const save = vi.fn(async () => ({ ok: true }) as const);
    render(<SpecsDictionaryForm value={filledDictionary} save={save} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(save).toHaveBeenCalledWith(filledDictionary);
    expect(await screen.findByText(texts.saved)).toBeInTheDocument();
  });

  it('отказ сервера показывается человеку', async () => {
    const user = userEvent.setup();
    render(<SpecsDictionaryForm value={filledDictionary} save={failingSave} />);

    await user.click(screen.getByRole('button', { name: texts.save }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Сервер не принял изменения');
  });
});
