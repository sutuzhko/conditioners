import { describe, expect, it } from 'vitest';

import { cssBlock, withoutComments } from './css-block';

describe('чтение блока CSS', () => {
  it('🔴 комментарий с фигурными скобками не закрывает блок', () => {
    /* Ровно тот случай, что стоил захода (issue #880): в блок токенов панели
       добавили комментарий, цитирующий правило макета, — и восемь токенов из
       второй половины «пропали». Токены были на месте, врал разбор. */
    const css = `
      [data-ui='panel'] {
        --h-sm: 32px;
        /* правило макета: .pg span{min-width:32px;height:32px;border-radius:8px} */
        --pad-card: 16px;
        --fs-body: 14px;
      }
    `;

    expect(cssBlock(css, "[data-ui='panel']")).toEqual({
      'h-sm': '32px',
      'pad-card': '16px',
      'fs-body': '14px',
    });
  });

  it('🔴 токен, пропавший во второй половине, так и остаётся пропавшим', () => {
    /* Обратная проверка, и она важнее прямой: разбор, теряющий половину блока,
       не заметил бы и настоящей пропажи — то есть выключился бы молча, оставаясь
       зелёным. */
    const css = `
      [data-ui='panel'] {
        --h-sm: 32px;
        /* комментарий со скобками: a{b} */
        --fs-body: 14px;
      }
    `;

    expect(cssBlock(css, "[data-ui='panel']")?.['pad-card']).toBeUndefined();
  });

  it('вложенный блок объявлений родителю не отдаёт', () => {
    const css = `
      @media (width < 900px) {
        [data-ui='panel'] {
          --h-sm: var(--tap);
        }
      }
    `;

    expect(cssBlock(css, '@media (width < 900px)')).toEqual({});
    expect(cssBlock(css, "[data-ui='panel']")).toEqual({ 'h-sm': 'var(--tap)' });
  });

  it('смещение поиска не сдвигается от погашенных комментариев', () => {
    const css = `
      [data-ui='panel'] { --h-sm: 32px; }
      /* Порог сенсорной раскладки */
      @media (width < 900px) {
        [data-ui='panel'] { --h-sm: var(--tap); }
      }
    `;

    const touch = cssBlock(css, "[data-ui='panel']", css.indexOf('@media (width < 900px)'));
    expect(touch).toEqual({ 'h-sm': 'var(--tap)' });
  });

  it('🔴 селектор, названный только в комментарии, блоком не считается', () => {
    /* Прежний разбор находил `[data-ui='panel']` в пояснении над блоком и
       начинал тело с середины комментария — и работал по совпадению: до
       ближайшей скобки как раз лежал нужный блок. */
    const css = `
      /* Пояснение про [data-ui='panel'] и о том, зачем он тут. */
      [data-ui='panel'] {
        --h-sm: 32px;
      }
    `;

    expect(cssBlock(css, "[data-ui='panel']")).toEqual({ 'h-sm': '32px' });
  });

  it('блока нет — это null, а не пустой набор: решает вызывающий', () => {
    expect(cssBlock(':root { --a: 1px; }', "[data-ui='panel']")).toBeNull();
  });

  it('комментарии гасятся пробелами, длина текста не меняется', () => {
    const css = ':root { /* тут } */ --a: 1px; }';
    const clean = withoutComments(css);
    expect(clean.length).toBe(css.length);
    expect(clean).not.toContain('тут');
    expect(clean.indexOf('--a')).toBe(css.indexOf('--a'));
  });
});
