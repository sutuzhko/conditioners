import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { METRIKA_GOALS } from './goals';
import { Metrika } from './Metrika';

/** Разметка счётчика как она попадает в HTML: скрипта в DOM ищем по тегу. */
function scriptOf(counterId: string): HTMLScriptElement | null {
  const { container } = render(<Metrika counterId={counterId} />);
  return container.querySelector('script');
}

describe('Счётчик Метрики (issue #678, ADR-024)', () => {
  /* 🔴 Пустой скрипт с пустым id выглядит работающим счётчиком: владелец
     видит тег в исходнике страницы и считает, что статистика собирается. */
  it('🔴 номер не заполнен — в HTML нет ничего, а не пустой скрипт', () => {
    expect(scriptOf('')).toBeNull();
  });

  it('🔴 нецифровой номер счётчиком не становится: строка уезжает внутрь script', () => {
    expect(scriptOf("1; alert('x')")).toBeNull();
    expect(scriptOf('</script><script>alert(1)</script>')).toBeNull();
  });

  it('номер заполнен — счётчик инициализируется этим номером', () => {
    const script = scriptOf('12345678');

    expect(script).not.toBeNull();
    expect(script?.innerHTML).toContain("ym(12345678, 'init'");
  });

  /* 🔴 Файл счётчика не имеет права стоять на критическом пути LCP: встроенный
     кусок в сеть не ходит, а `tag.js` запрашивается после события `load`. */
  it('🔴 tag.js запрашивается после load, а не на первом экране', () => {
    const html = scriptOf('12345678')?.innerHTML ?? '';

    expect(html).toContain('mc.yandex.ru/metrika/tag.js');
    expect(html).toContain("addEventListener('load'");
  });

  it('очередь `ym` объявлена сразу: цель, отмеченная до загрузки, не теряется', () => {
    expect(scriptOf('12345678')?.innerHTML).toContain('w.ym.a = w.ym.a || []');
  });

  /* Телефон нажимают и в шапке, и в футере, и в контактах — а это серверные
     компоненты, обработчика им не передать. Делегированный слушатель ловит
     все ссылки разом и не стоит ни байта клиентского бандла. */
  it('нажатие по телефону отмечается делегированным слушателем', () => {
    const html = scriptOf('12345678')?.innerHTML ?? '';

    expect(html).toContain('a[href^="tel:"]');
    expect(html).toContain(METRIKA_GOALS.phone);
  });
});
