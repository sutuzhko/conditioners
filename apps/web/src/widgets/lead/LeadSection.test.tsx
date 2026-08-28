import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import { forgetLeadSubject } from '@/features/lead-form';

import { LeadSection } from './LeadSection';
import { leadSectionContent as t } from './content';
import { modelsFixture, phoneFixture, policyHrefFixture, responseTimeFixture } from './fixtures';

/* Адрес секция читает не сама: этим занят клиентский лист `LeadSubjectSync`
   внутри её `<Suspense>`. Подменяем ему источник — так же, как это делает
   браузер на `/?model=...#lead`. */
let search = '';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
}));

afterEach(() => {
  search = '';
  forgetLeadSubject();
});

function renderSection(props: Partial<Parameters<typeof LeadSection>[0]> = {}) {
  return render(
    <LeadSection
      phone={phoneFixture}
      policyHref={policyHrefFixture}
      models={modelsFixture}
      {...props}
    />,
  );
}

describe('Блок «Заявка»', () => {
  it('рисует левую колонку из макета: надзаголовок, заголовок и описание', () => {
    renderSection();

    expect(screen.getByText(t.kicker)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: t.title })).toBeInTheDocument();
    expect(screen.getByText(t.description, { exact: false })).toBeInTheDocument();
  });

  it('пункты с галочками рендерятся из content.ts, а не из разметки', () => {
    renderSection();

    const list = screen.getByRole('list', { name: t.benefitsLabel });
    const items = screen.getAllByRole('listitem');

    expect(list).toBeInTheDocument();
    expect(items).toHaveLength(t.benefits.length);
    expect(items.map((item) => item.textContent)).toEqual([...t.benefits]);
  });

  it('форма заявки стоит в правой колонке', () => {
    renderSection();

    expect(screen.getByRole('form', { name: 'Форма заявки' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Отправить заявку' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Телефон/)).toBeInTheDocument();
  });

  it('заголовок секции связан с ней: секция подписана своим h2', () => {
    const { container } = renderSection();

    const section = container.querySelector('section');
    const heading = screen.getByRole('heading', { level: 2, name: t.title });

    expect(section).toHaveAttribute('id', 'lead');
    expect(section).toHaveAttribute('aria-labelledby', heading.id);
  });

  it('якорь и тема обращения приходят пропсами', () => {
    const { container } = renderSection({ id: 'lead-service', defaultTopic: 'Сервис и ремонт' });

    expect(container.querySelector('section')).toHaveAttribute('id', 'lead-service');
    expect(screen.getByLabelText(/Тема обращения/)).toHaveValue('Сервис и ремонт');
  });

  it('🔴 обещанный срок ответа приходит настройкой', () => {
    renderSection({ responseTime: responseTimeFixture });

    expect(screen.getByText(t.responseNote(responseTimeFixture), { exact: false })).toBeVisible();
  });

  it('🔴 предмет из адреса доезжает до формы: секция ставит рядом читающий лист', async () => {
    search = `model=${modelsFixture[0].slug}&topic=install`;
    renderSection();

    // лист читает адрес эффектом, и форма обновляется следом за ним
    await waitFor(() => expect(screen.getByLabelText('Модель')).toHaveValue(modelsFixture[0].name));
    expect(screen.getByLabelText(/Тема обращения/)).toHaveValue('Монтаж и установка');
  });

  it('🔴 без настройки секция срока не обещает: цифр в её собственном тексте нет', () => {
    renderSection();

    // левая колонка — единственный текст секции, который пишем мы сами:
    // всё остальное принадлежит форме. Цифра здесь означала бы факт о
    // компании, зашитый в вёрстку (инвариант 8)
    const own = [
      screen.getByText(t.kicker).textContent,
      screen.getByRole('heading', { level: 2, name: t.title }).textContent,
      screen.getByText(t.description, { exact: false }).textContent,
      screen.getByRole('list', { name: t.benefitsLabel }).textContent,
    ].join(' ');

    expect(own).not.toMatch(/\d/);
  });
});
