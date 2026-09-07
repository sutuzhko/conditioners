import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Pager, pageWindowNumbers } from './Pager';

describe('Pager', () => {
  it('ведёт на соседние страницы и показывает положение', () => {
    render(<Pager page={2} pages={7} basePath="/admin/clients" />);

    expect(screen.getByRole('link', { name: '← Назад' })).toHaveAttribute('href', '/admin/clients');
    expect(screen.getByRole('link', { name: 'Дальше →' })).toHaveAttribute(
      'href',
      '/admin/clients?page=3',
    );
    expect(screen.getByText('2 из 7')).toBeInTheDocument();
  });

  it('на краях списка шаг перестаёт быть ссылкой', () => {
    const { rerender } = render(<Pager page={1} pages={3} basePath="/admin/clients" />);
    expect(screen.queryByRole('link', { name: '← Назад' })).not.toBeInTheDocument();

    rerender(<Pager page={3} pages={3} basePath="/admin/clients" />);
    expect(screen.queryByRole('link', { name: 'Дальше →' })).not.toBeInTheDocument();
  });

  it('🔴 поиск переезжает вместе со страницей: иначе «Дальше» сбрасывает запрос', () => {
    render(<Pager page={1} pages={4} basePath="/admin/clients" query={{ q: 'Соколов' }} />);

    expect(screen.getByRole('link', { name: 'Дальше →' })).toHaveAttribute(
      'href',
      '/admin/clients?q=%D0%A1%D0%BE%D0%BA%D0%BE%D0%BB%D0%BE%D0%B2&page=2',
    );
  });

  it('на одной странице не показывается вовсе', () => {
    const { container } = render(<Pager page={1} pages={1} basePath="/admin/clients" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('подписи переопределяются пропсами', () => {
    render(
      <Pager
        page={2}
        pages={5}
        basePath="/admin/orders"
        prevLabel="Предыдущие"
        nextLabel="Следующие"
        position={(current, total) => `Страница ${current} из ${total}`}
      />,
    );

    expect(screen.getByRole('link', { name: '← Предыдущие' })).toBeInTheDocument();
    expect(screen.getByText('Страница 2 из 5')).toBeInTheDocument();
  });

  /**
   * 🔴 Смену страницы обязано быть слышно (issue #735). Переход перестал
   * двигать прокрутку и перестал уводить фокус — то есть видимого события
   * больше нет вовсе, и молчание означало бы, что читалка о переходе не
   * узнала. Область живёт в разметке всегда: вставленную вместе с текстом
   * читалки не объявляют.
   */
  it('🔴 объявляет смену страницы отдельной живой областью', () => {
    const { rerender } = render(<Pager page={2} pages={7} basePath="/admin/clients" />);

    const live = screen.getByRole('status');
    expect(live).toHaveTextContent('Показана страница 2 из 7');
    expect(live).toHaveAttribute('aria-live', 'polite');

    /* Объявление меняется вместе со страницей — иначе живая область молчит:
       читалки читают её только на изменение содержимого. */
    rerender(<Pager page={3} pages={7} basePath="/admin/clients" />);
    expect(screen.getByRole('status')).toHaveTextContent('Показана страница 3 из 7');
  });

  it('объявление переопределяется пропсом вместе с остальными подписями', () => {
    render(<Pager page={2} pages={4} basePath="/knowledge" announce={(p, t) => `${p} из ${t}`} />);

    expect(screen.getByRole('status')).toHaveTextContent('2 из 4');
  });

  /* 🔴 Граница контрола обязана держать 3:1 (WCAG 1.4.11, ADR-181): без неё
     кнопка разбивки не очерчена ничем: заливки у неё нет. `--line-strong` даёт 1,48:1 — вдвое ниже нормы. */
  it('🔴 граница не возвращается на --line-strong', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'Pager.module.css'),
      'utf8',
    );

    expect(css).not.toContain('var(--line-strong)');
  });
});

/**
 * Полоса номеров (issue #602, макет). Края, соседи текущей страницы и
 * многоточия на разрывах: полная лента на двадцати шести страницах — ряд, по
 * которому никто не целится.
 */
describe('Pager — номера страниц', () => {
  it('🔴 показывает края, соседей и многоточия вместо всей ленты', () => {
    expect(pageWindowNumbers(13, 26)).toEqual([1, 'gap', 12, 13, 14, 'gap', 26]);
  });

  it('короткий список показывается целиком — сворачивать нечего', () => {
    expect(pageWindowNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });

  /* Разрыв в одну страницу не сворачивается: «1 … 3» занимает столько же
     места, сколько «1 2 3», и прячет доступную страницу. */
  it('разрыв в одну страницу не сворачивается', () => {
    expect(pageWindowNumbers(4, 6)).toEqual([1, 'gap', 3, 4, 5, 6]);
  });

  it('текущая страница отмечена в разметке, а не только заливкой', () => {
    render(<Pager page={3} pages={9} basePath="/admin/clients" numbers />);

    expect(screen.getByText('3')).toHaveAttribute('aria-current', 'page');
  });

  it('номер — ссылка со своим именем: «3» в озвучке ничего не значит', () => {
    render(<Pager page={1} pages={9} basePath="/admin/clients" numbers />);

    expect(screen.getByRole('link', { name: 'Страница 2' })).toHaveAttribute(
      'href',
      '/admin/clients?page=2',
    );
  });

  it('поиск переезжает на соседнюю страницу вместе с номером', () => {
    render(<Pager page={1} pages={9} basePath="/admin/clients" query={{ q: 'Тула' }} numbers />);

    expect(screen.getByRole('link', { name: 'Страница 2' })).toHaveAttribute(
      'href',
      '/admin/clients?q=%D0%A2%D1%83%D0%BB%D0%B0&page=2',
    );
  });

  /* 🔴 Шаг в полосе номеров — шеврон, и имя ему даёт `aria-label`: «‹» само по
     себе не имя, а слова в ряду одинаковых ячеек не помещаются (issue #748,
     макет `.pg`). Имя называет, куда ведёт, а не как называется кнопка. */
  it('🔴 шаг-шеврон назван для озвучки и ведёт на соседнюю страницу', () => {
    render(<Pager page={3} pages={9} basePath="/admin/clients" numbers />);

    expect(screen.getByRole('link', { name: 'Предыдущая страница' })).toHaveAttribute(
      'href',
      '/admin/clients?page=2',
    );
    expect(screen.getByRole('link', { name: 'Следующая страница' })).toHaveAttribute(
      'href',
      '/admin/clients?page=4',
    );
  });

  /* 🔴 Родного `title` на шаге нет. Подсказка браузера появляется через
     секунду, не приходит по фокусу и не гасится по Escape — для половины
     способов ввода её нет вовсе (та же причина, что у действий строки
     таблицы; чинилось трижды: #737, #763, #764). */
  it('🔴 у шага нет родного title — только имя для озвучки', () => {
    const { container } = render(<Pager page={3} pages={9} basePath="/admin/clients" numbers />);

    expect(container.querySelectorAll('[title]')).toHaveLength(0);
  });

  /* 🔴 Погасший край — не цель и озвучке не нужен: шеврон без ссылки ей нечего
     сказать. Место в ряду он при этом занимает, чтобы номера не прыгали. */
  it('край списка остаётся в ряду, но выпадает из озвучки', () => {
    render(<Pager page={1} pages={9} basePath="/admin/clients" numbers />);

    expect(screen.queryByRole('link', { name: 'Предыдущая страница' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Следующая страница' })).toBeInTheDocument();
  });

  /**
   * 🔴 Одна форма у всех ячеек ряда (issue #748, замечание владельца от
   * 8 сентября). Шаг, номер, текущая страница и погасший край берут одно
   * правило коробки; текущая отличается заливкой и весом, а не формой и не
   * внутренним полем. Проверяется по файлу стилей: jsdom модули не применяет,
   * а это и есть правило CSS.
   */
  it('🔴 шаг, номер и текущая страница делят одно правило коробки', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'Pager.module.css'),
      'utf8',
    );

    const box = css.slice(css.indexOf('.compact .step,'));
    const rule = box.slice(0, box.indexOf('}'));

    expect(rule).toContain('.compact .stepOff');
    expect(rule).toContain('.number');
    expect(rule).toContain('.current');
    expect(rule).toContain('border-radius: var(--r-pager, var(--r-pill))');
    expect(rule).toContain('min-width: var(--h-sm, var(--tap))');
  });

  /* 🔴 Радиус ячейки приходит токеном, а не числом по месту (ADR-169): значение
     снято с макета (`.pg span{border-radius:8px}`) и живёт в панельном блоке
     токенов, чтобы витрина осталась на пилюле. */
  it('🔴 радиус ячейки — токен, а не число по месту', () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'Pager.module.css'),
      'utf8',
    );
    const tokens = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'styles', 'tokens.css'),
      'utf8',
    );

    /* Комментарии цитируют макет (`.pg span{border-radius:8px}`) — сторож
       смотрит на правила, а не на прозу вокруг них. */
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');

    expect(rules).not.toMatch(/border-radius:\s*\d+px/);
    expect(tokens).toContain('--r-pager: 8px');
  });
});
