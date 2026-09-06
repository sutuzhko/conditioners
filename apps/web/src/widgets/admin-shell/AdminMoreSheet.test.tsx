import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminMoreSheet } from './AdminMoreSheet';
import {
  ADMIN_SHEET_GROUP_TITLES,
  ADMIN_TABS,
  adminShellContent as texts,
  bottomSectionsFor,
  columnSectionsFor,
} from './content';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/stock',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const here = dirname(fileURLToPath(import.meta.url));
const read = (file: string): string => readFileSync(join(here, file), 'utf8');

/**
 * Тело правила: от селектора до ближайшей закрывающей скобки. Вложенных
 * скобок внутри правила нет — вложенность глубже двух уровней в проекте
 * запрещена, — поэтому разбор такой простой.
 */
function rule(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  expect(at, `правило ${selector} не найдено`).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf('}', at));
}

/* Тема готовится до отрисовки и не убирается после: уборка снимала бы атрибут
   раньше, чем размонтируется наблюдатель внутри переключателя, и его
   обновление приземлялось бы вне `act` (issue #237). */
beforeEach(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  localStorage.clear();
});

describe('Лист «Ещё»', () => {
  it('разбит на названные группы, а не на два списка подряд', () => {
    render(<AdminMoreSheet role="owner" activeHref={undefined} />);

    /* Заголовок настоящий, а не декоративная строка: читалка ходит по листу
       заголовками, и без них он остаётся одной длинной лентой ссылок. */
    for (const title of [
      ADMIN_SHEET_GROUP_TITLES.work,
      ADMIN_SHEET_GROUP_TITLES.site,
      texts.accountLabel,
    ]) {
      const group = screen.getByRole('region', { name: title });
      expect(within(group).getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  /* 🔴 У монтажника разделов сверх четырёх вкладок нет вовсе: заголовок над
     пустотой сообщал бы, что раздел потерялся. */
  it('пустую группу не рисует', () => {
    render(<AdminMoreSheet role="installer" activeHref="/admin/profile" />);

    expect(
      screen.queryByRole('heading', { name: ADMIN_SHEET_GROUP_TITLES.work }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: texts.accountLabel })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Профиль' })).toHaveAttribute('aria-current', 'page');
  });

  /* 🔴 Тема переехала сюда из верхнего правого угла каждой страницы панели
     (issue #659): это настройка, а не действие раздела. */
  it('переключает тему прямо из листа', async () => {
    const user = userEvent.setup();
    render(<AdminMoreSheet role="owner" activeHref={undefined} />);

    const themes = screen.getByRole('radiogroup', { name: texts.themeLabel });
    await user.click(within(themes).getByRole('radio', { name: 'Тёмная' }));

    expect(document.documentElement.dataset.theme).toBe('dark');
    await waitFor(() =>
      expect(within(themes).getByRole('radio', { name: 'Тёмная' })).toBeChecked(),
    );
  });

  /**
   * 🔴 Выбор переживает переход между разделами. Источник правды о теме —
   * атрибут на `<html>`, а не состояние React: лист собирается заново при
   * каждом открытии шторки, и копия состояния разъехалась бы с атрибутом на
   * первом же переходе.
   */
  it('выбранная тема переживает переход в другой раздел', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AdminMoreSheet role="owner" activeHref="/admin/stock" />);

    await user.click(
      within(screen.getByRole('radiogroup', { name: texts.themeLabel })).getByRole('radio', {
        name: 'Тёмная',
      }),
    );
    unmount();

    render(<AdminMoreSheet role="owner" activeHref="/admin/reviews" />);

    expect(document.documentElement.dataset.theme).toBe('dark');
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Тёмная' })).toBeChecked());
    expect(screen.getByRole('radio', { name: 'Светлая' })).not.toBeChecked();
  });

  /* 🔴 Лист собирается по группам, и раздел без группы не попал бы ни в одну
     из них — исчез бы молча, без единой красной проверки. Пункты
     перечисляются от самого списка колонки, а не руками. */
  it('держит все разделы сверх вкладок и все служебные пункты', () => {
    render(<AdminMoreSheet role="owner" activeHref={undefined} />);

    for (const section of [
      ...columnSectionsFor('owner').slice(ADMIN_TABS),
      ...bottomSectionsFor('owner'),
    ]) {
      expect(screen.getByRole('link', { name: section.title })).toHaveAttribute(
        'href',
        section.href,
      );
    }
  });

  it('открытый раздел листа подсвечен и назван читалке', () => {
    render(<AdminMoreSheet role="owner" activeHref="/admin/stock" />);

    const active = screen.getByRole('link', { name: 'Склад' });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active.className).toMatch(/active/);
    expect(screen.getByRole('link', { name: 'Каталог' })).not.toHaveAttribute('aria-current');
  });
});

/**
 * Раскладку в jsdom не измерить — стилей у него нет. Проверяется источник:
 * числа и токены, от которых зависит тап-зона и исчезновение служебной строки.
 * Это не замена браузеру (инварианты и измерения ходят по историям), а защита
 * от молчаливой правки — потерянный `min-height` иначе виден только глазами.
 */
describe('Лист «Ещё» — тап-зоны и служебная строка', () => {
  const sheet = read('AdminMoreSheet.module.css');

  it('🔴 строка листа и выход держат полную тап-зону (ADR-183)', () => {
    expect(rule(sheet, '.link')).toContain('min-height: var(--h-nav, var(--tap))');
    expect(rule(sheet, '.themeRow')).toContain('min-height: var(--tap)');
    expect(rule(sheet, '.logout')).toContain('min-height: var(--tap)');

    /* Строка идёт во всю ширину шторки: цель — вся она, а не подпись. */
    expect(rule(sheet, '.link')).toContain('width: 100%');
    expect(rule(sheet, '.logout')).toContain('width: 100%');
  });

  /* Кольцо фокуса рисуется внутрь: наружное ложилось бы на соседний пункт —
     строка занимает шторку по всей ширине. */
  it('строка листа показывает фокус с клавиатуры', () => {
    expect(rule(sheet, '.link:focus-visible')).toContain('var(--ring-focus-inset)');
    expect(rule(sheet, '.logout:focus-visible')).toContain('var(--ring-focus-ring)');
  });

  /* 🔴 Ниже 600px верхняя служебная строка исчезает целиком: колонки на этой
     ширине нет, а переключатель темы переехал в лист (issue #659). */
  it('🔴 ниже 600px служебная строка оболочки даёт ноль высоты', () => {
    const shell = read('AdminShell.module.css');
    const phone = shell.slice(shell.indexOf('@media (width < 600px) {'));

    expect(phone).toContain('@media (width < 600px)');
    expect(rule(phone, '.tools')).toContain('display: none');

    /* Прячется весь ряд, а не кнопка колонки внутри него: прежнее правило
       оставляло на экране переключатель темы. */
    expect(phone).not.toContain('.tools .toggle');
  });
});
