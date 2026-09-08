import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useCopy } from './useCopy';

const VALUE = '+79101552468';
const WHAT = 'Телефон';

/** Пробник: хук отдаёт действие и область сообщения — оба и проверяем. */
function Probe() {
  const { copy, status } = useCopy();

  return (
    <>
      <button type="button" onClick={() => copy(VALUE, WHAT)}>
        Скопировать
      </button>
      {status}
    </>
  );
}

/**
 * Подмена буфера обмена.
 *
 * 🔴 Тип аргумента объявлен у самой подмены, а не выведен из `vi.fn()`: голый
 * `vi.fn()` типизирует аргументы как `any`, и запрет проекта на `as`
 * обходится молча — проверка «в буфер уехал нормализованный номер» тогда
 * ничего не сторожит.
 */
function stubClipboard(writeText: ((value: string) => Promise<void>) | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    value: writeText === undefined ? undefined : { writeText },
    configurable: true,
  });
}

afterEach(() => {
  stubClipboard(undefined);
  vi.useRealTimers();
});

describe('Копирование поля строки', () => {
  it('кладёт значение в буфер и подтверждает словом', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn((value: string): Promise<void> => {
      expect(value).toBe(VALUE);
      return Promise.resolve();
    });
    stubClipboard(writeText);

    render(<Probe />);
    await user.click(screen.getByRole('button', { name: 'Скопировать' }));

    expect(writeText).toHaveBeenCalledWith(VALUE);
    expect(await screen.findByRole('status')).toHaveTextContent(`${WHAT} скопирован`);
  });

  /* 🔴 `navigator.clipboard` существует только в защищённом контексте: на
     http-стенде его нет вовсе. Молчание тогда неотличимо от поломки — человек
     жмёт пункт второй раз, а номер так и не скопирован (issue #744). */
  it('🔴 без буфера показывает значение строкой, а не молчит', async () => {
    const user = userEvent.setup();
    stubClipboard(undefined);

    render(<Probe />);
    await user.click(screen.getByRole('button', { name: 'Скопировать' }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(VALUE);
    expect(status).toHaveTextContent('Буфер недоступен');
  });

  /* 🔴 Буфер бывает и есть, и отказывает: Safari отклоняет запись, если между
     жестом человека и ней успел вклиниться `await`. Отказ обязан вести себя
     так же, как отсутствие буфера. */
  it('🔴 отказ буфера показывает значение строкой', async () => {
    const user = userEvent.setup();
    stubClipboard(() => Promise.reject(new Error('запись отклонена')));

    render(<Probe />);
    await user.click(screen.getByRole('button', { name: 'Скопировать' }));

    expect(await screen.findByRole('status')).toHaveTextContent(VALUE);
  });

  /* Область сообщения живёт всегда: пустой `aria-live`, вставленный в
     разметку в момент события, читалки не объявляют. */
  it('область сообщения есть в разметке до первого копирования', () => {
    stubClipboard(() => Promise.resolve());
    render(<Probe />);

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });
});
