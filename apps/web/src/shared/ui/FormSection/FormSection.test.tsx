import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FormSection } from './FormSection';

describe('FormSection', () => {
  it('на странице заголовок раздела — второго уровня', () => {
    render(
      <FormSection title="Основное">
        <p>поля</p>
      </FormSection>,
    );

    expect(screen.getByRole('heading', { name: 'Основное', level: 2 })).toBeInTheDocument();
  });

  it('внутри окна заголовок уходит на третий уровень: второй занят названием окна', () => {
    render(
      <FormSection title="Текст" surface="bare" headingLevel={3}>
        <p>поля</p>
      </FormSection>,
    );

    expect(screen.getByRole('heading', { name: 'Текст', level: 3 })).toBeInTheDocument();
  });

  it('без карточки раздел остаётся разделом, а не фрагментом', () => {
    const { container } = render(
      <FormSection title="Текст" surface="bare" headingLevel={3}>
        <p>поля</p>
      </FormSection>,
    );

    expect(container.querySelector('section')).not.toBeNull();
  });

  /* Скрытый заголовок — это заголовок снаружи (название окна или заголовок
     страницы), а не потеря ориентира: имя у раздела обязано остаться. */
  it('скрытый заголовок остаётся доступным именем раздела', () => {
    render(
      <FormSection title="Новый клиент" surface="bare" titleHidden>
        <p>поля</p>
      </FormSection>,
    );

    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.getByRole('region', { name: 'Новый клиент' })).toBeInTheDocument();
  });

  it('видимый заголовок не дублируется именем секции', () => {
    render(
      <FormSection title="Основное">
        <p>поля</p>
      </FormSection>,
    );

    /* Секция без имени — не область: ориентир даёт сам заголовок, и второе
       имя читалка объявила бы вторым разом. */
    expect(screen.queryByRole('region')).toBeNull();
  });

  it('подсказка показывается только вместе с заголовком', () => {
    const { rerender } = render(
      <FormSection title="Клиент" hint="Телефон обязателен">
        <p>поля</p>
      </FormSection>,
    );

    expect(screen.getByText('Телефон обязателен')).toBeInTheDocument();

    rerender(
      <FormSection title="Клиент" hint="Телефон обязателен" titleHidden>
        <p>поля</p>
      </FormSection>,
    );

    expect(screen.queryByText('Телефон обязателен')).toBeNull();
  });
});
