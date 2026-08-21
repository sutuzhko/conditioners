import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AdminSummary } from './AdminSummary';
import {
  busyCounts,
  emptyCounts,
  quietCounts,
  readyReadiness,
  unfinishedReadiness,
} from './fixtures';
import { adminSummaryContent as texts } from './summary-content';

describe('Сводка панели управления', () => {
  it('незаполненные группы названы по-человечески, а не ключами базы', () => {
    render(<AdminSummary counts={emptyCounts} readiness={unfinishedReadiness} />);

    expect(screen.getByText('Телефон и почта')).toBeInTheDocument();
    expect(screen.getByText('Реквизиты')).toBeInTheDocument();
    expect(screen.queryByText('contacts')).not.toBeInTheDocument();
  });

  it('пока данные не заполнены, ведёт в раздел компании', () => {
    render(<AdminSummary counts={emptyCounts} readiness={unfinishedReadiness} />);

    expect(screen.getByRole('link', { name: texts.readinessCta })).toHaveAttribute(
      'href',
      '/admin/company',
    );
  });

  it('когда всё заполнено, список групп и призыв исчезают', () => {
    render(<AdminSummary counts={quietCounts} readiness={readyReadiness} />);

    expect(screen.getByText(texts.readinessDone)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: texts.readinessCta })).not.toBeInTheDocument();
  });

  it('каждая плитка ведёт в свой раздел', () => {
    render(<AdminSummary counts={busyCounts} readiness={readyReadiness} />);

    expect(screen.getByRole('link', { name: /Новые заявки/ })).toHaveAttribute(
      'href',
      '/admin/leads',
    );
    expect(screen.getByRole('link', { name: /Отзывы на модерации/ })).toHaveAttribute(
      'href',
      '/admin/reviews',
    );
  });

  it('ноль заявок не выделяется — выделение значит «нужно действие»', () => {
    const { container } = render(<AdminSummary counts={emptyCounts} readiness={readyReadiness} />);

    expect(container.querySelectorAll('[class*="urgent"]')).toHaveLength(0);
  });

  it('ожидающие заявки и отзывы выделены', () => {
    const { container } = render(<AdminSummary counts={busyCounts} readiness={readyReadiness} />);

    expect(container.querySelectorAll('[class*="urgent"]')).toHaveLength(2);
  });
});
