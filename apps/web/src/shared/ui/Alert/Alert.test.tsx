import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Alert } from './Alert';
import { Avatar, AvatarGroup } from '../Avatar/Avatar';
import { CopyField } from '../CopyField/CopyField';

describe('Алерт', () => {
  it('показывает заголовок и текст', () => {
    render(<Alert title="Роль изменена">Монтажник больше не видит цены закупки.</Alert>);

    expect(screen.getByText('Роль изменена')).toBeInTheDocument();
    expect(screen.getByText(/цены закупки/)).toBeInTheDocument();
  });

  /* 🔴 Роль зависит от тона: `alert` у ошибки — читалка объявит её сама;
     `status` у остальных — они не перебивают. Роль `alert` на предупреждении,
     висящем с загрузки страницы, заставляет читалку начинать с него каждый раз. */
  it('ошибка объявляется ролью alert', () => {
    render(<Alert tone="danger" title="Данные не загрузились" />);

    expect(screen.getByRole('alert')).toHaveTextContent('Данные не загрузились');
  });

  it.each(['info', 'success', 'warning'] as const)('тон «%s» не перебивает озвучку', (tone) => {
    render(<Alert tone={tone} title="Сообщение" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('действие остаётся доступным, а не превращается в текст', () => {
    render(
      <Alert
        tone="danger"
        title="Данные не загрузились"
        action={<button type="button">Повторить</button>}
      />,
    );

    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument();
  });
});

describe('Аватар', () => {
  it('без фотографии рисует инициалы и остаётся названным', () => {
    render(<Avatar name="Иванов Иван" />);

    expect(screen.getByText('ИИ')).toBeInTheDocument();
    expect(screen.getByText('Иванов Иван')).toBeInTheDocument();
  });

  /* 🔴 Инициалы — первые буквы первых двух слов, а не первая и последняя: в
     порядке «Фамилия Имя» первая и последняя дали бы фамилию и хвост имени. */
  it('из одного слова берёт одну букву', () => {
    render(<Avatar name="Иванов" />);

    expect(screen.getByText('И')).toBeInTheDocument();
  });

  it('ряд аватаров получает имя для озвучки', () => {
    render(
      <AvatarGroup label="Монтажники на наряде">
        <Avatar name="Иванов Иван" />
        <Avatar name="Петров Олег" />
      </AvatarGroup>,
    );

    expect(screen.getByRole('group', { name: 'Монтажники на наряде' })).toBeInTheDocument();
  });

  it('остаток показывается числом, а не многоточием', () => {
    render(
      <AvatarGroup label="Монтажники" overflow={3}>
        <Avatar name="Иванов Иван" />
      </AvatarGroup>,
    );

    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('ещё 3')).toBeInTheDocument();
  });

  it('нулевой остаток плитку не рисует', () => {
    render(
      <AvatarGroup label="Монтажники" overflow={0}>
        <Avatar name="Иванов Иван" />
      </AvatarGroup>,
    );

    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });
});

describe('Копируемая строка', () => {
  /* 🔴 Значение показано целиком и выделяется мышью: буфер обмена доступен
     только по защищённому соединению, и на http-стенде `navigator.clipboard`
     отсутствует вовсе. */
  it('показывает значение, а не прячет его за кнопкой', () => {
    render(<CopyField label="Адрес статьи" value="/knowledge/kak-vybrat" />);

    expect(screen.getByText('/knowledge/kak-vybrat')).toBeInTheDocument();
  });

  it('кнопка названа вместе со значением — «Скопировать» само по себе не говорит что', () => {
    render(<CopyField value="montazhnik-01" />);

    expect(screen.getByRole('button', { name: /montazhnik-01/ })).toBeInTheDocument();
  });

  it('область объявления результата присутствует всегда, а не появляется по событию', () => {
    render(<CopyField value="montazhnik-01" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
