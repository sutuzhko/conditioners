import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { crmBusyContent as texts } from '../content';
import { BusyNote } from './BusyNote';

describe('Предупреждение о занятости', () => {
  it('в свободный день не показывается вовсе', () => {
    const { container } = render(<BusyNote busy={{ state: 'free' }} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('называет причину закрытого дня', () => {
    render(<BusyNote busy={{ state: 'full', reasons: ['Семейные дела'] }} />);

    expect(screen.getByRole('status')).toHaveTextContent('День закрыт: семейные дела');
  });

  it('день без причины всё равно закрыт', () => {
    render(<BusyNote busy={{ state: 'full', reasons: [] }} />);

    expect(screen.getByRole('status')).toHaveTextContent(texts.full);
  });

  it('показывает часы занятости, а не «весь день»', () => {
    render(
      <BusyNote
        busy={{ state: 'partial', windows: [{ fromMin: 840, toMin: 960, reasons: ['Врач'] }] }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('14:00–16:00 — врач');
  });

  it('🔴 предупреждает, а не запрещает: говорит, что сохранить всё равно можно', () => {
    render(<BusyNote busy={{ state: 'full', reasons: [] }} />);

    expect(screen.getByText(texts.noteHint)).toBeInTheDocument();
  });

  it('называет человека, когда занятость чужая', () => {
    render(<BusyNote busy={{ state: 'full', reasons: ['Отпуск'] }} who="Дмитрий" />);

    expect(screen.getByRole('status')).toHaveTextContent('Дмитрий — день закрыт: отпуск');
  });
});
