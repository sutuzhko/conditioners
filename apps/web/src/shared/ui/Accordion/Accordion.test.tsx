import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Accordion } from './Accordion';

const items = [
  { id: 'a', title: 'Сколько занимает установка?', content: 'Один день' },
  { id: 'b', title: 'Какая гарантия?', content: 'Указана в договоре' },
];

describe('Accordion', () => {
  it('текст свёрнутого ответа остаётся в разметке — его индексирует робот', () => {
    render(<Accordion items={items} />);
    expect(screen.getByText('Один день')).toBeInTheDocument();
    expect(screen.getByText('Указана в договоре')).toBeInTheDocument();
  });

  it('раскрывает раздел по клику и сообщает состояние через aria-expanded', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);

    const trigger = screen.getByRole('button', { name: /Сколько занимает/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('в режиме single открытие второго закрывает первый', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} defaultOpen={['a']} />);

    await user.click(screen.getByRole('button', { name: /Какая гарантия/ }));

    expect(screen.getByRole('button', { name: /Сколько занимает/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: /Какая гарантия/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('в режиме multiple разделы открываются независимо', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} mode="multiple" defaultOpen={['a']} />);

    await user.click(screen.getByRole('button', { name: /Какая гарантия/ }));

    expect(screen.getByRole('button', { name: /Сколько занимает/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('раскрывается с клавиатуры', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);

    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: /Сколько занимает/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('заголовки вопросов — настоящие заголовки нужного уровня', () => {
    render(<Accordion items={items} headingLevel={2} />);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(2);
  });

  it('пустой список не ломает компонент', () => {
    render(<Accordion items={[]} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
