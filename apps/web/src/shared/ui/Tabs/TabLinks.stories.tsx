import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TabLinks } from './TabLinks';

/**
 * Лента вкладок-ссылок: стопки списка и разделы карточки, за каждым из которых
 * стоит свой запрос к базе (issue #584, #585, #587).
 */
const meta = {
  title: 'UI Kit/TabLinks',
  component: TabLinks,
  args: {
    label: 'Стопки заказов',
    active: 'active',
    items: [
      { key: 'active', title: 'Активные', href: { pathname: '/', query: { tab: 'active' } } },
      { key: 'new', title: 'Новые', href: { pathname: '/', query: { tab: 'new' } } },
      { key: 'history', title: 'История', href: { pathname: '/', query: { tab: 'history' } } },
      { key: 'declined', title: 'Отказы', href: { pathname: '/', query: { tab: 'declined' } } },
      { key: 'all', title: 'Все', href: { pathname: '/', query: { tab: 'all' } } },
    ],
  },
} satisfies Meta<typeof TabLinks>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Подчёркивание — обличье заказов, отзывов, статей и карточек. */
export const Базовое: Story = {};

/** Открыта не первая вкладка: ровно то, что приходит по присланной ссылке. */
export const ДругаяВкладка: Story = { args: { active: 'history' } };

/**
 * Счётчики у подписей — «Активные 7», «Новые 2» (макет `OrdersTabs`). Стоят не
 * у всех: на закрытых стопках число росло бы само и ни к чему не звало.
 */
export const СоСчётчиками: Story = {
  args: {
    items: [
      {
        key: 'active',
        title: 'Активные',
        href: { pathname: '/', query: { tab: 'active' } },
        count: 7,
        countLabel: '7 нарядов',
      },
      {
        key: 'new',
        title: 'Новые',
        href: { pathname: '/', query: { tab: 'new' } },
        count: 2,
        countLabel: '2 наряда',
      },
      { key: 'history', title: 'История', href: { pathname: '/', query: { tab: 'history' } } },
      { key: 'declined', title: 'Отказы', href: { pathname: '/', query: { tab: 'declined' } } },
      {
        key: 'all',
        title: 'Все',
        href: { pathname: '/', query: { tab: 'all' } },
        count: 24,
        countLabel: '24 наряда',
      },
    ],
  },
};

/**
 * 🔴 Двузначное и трёхзначное число рядом с однозначным: табличные цифры не
 * дают ленте дёргаться, когда счётчик меняется с 9 на 10 и со 100 на 999.
 */
export const ДлинныеСчётчики: Story = {
  args: {
    items: [
      {
        key: 'active',
        title: 'Активные',
        href: { pathname: '/', query: { tab: 'active' } },
        count: 9,
        countLabel: '9 нарядов',
      },
      {
        key: 'new',
        title: 'Новые',
        href: { pathname: '/', query: { tab: 'new' } },
        count: 87,
        countLabel: '87 нарядов',
      },
      {
        key: 'all',
        title: 'Все',
        href: { pathname: '/', query: { tab: 'all' } },
        count: 999,
        countLabel: '999 нарядов',
      },
    ],
  },
};

/**
 * Заготовка раздела: адресов нет — вкладки неподвижны и ни одна не подсвечена.
 * Подсветить `loading.tsx` может только не ту: параметров адреса он не
 * получает, а высота ленты обязана совпасть с готовой страницей (ADR-239).
 */
export const Заготовка: Story = {
  args: {
    active: undefined,
    busy: true,
    items: [
      { key: 'data', title: 'Данные' },
      { key: 'orders', title: 'Заказы' },
      { key: 'units', title: 'Техника' },
    ],
  },
};

/**
 * Капсулы — обличье сводки панели (макет `MainTabs`): один и тот же экран в
 * трёх видах, а не три части одного.
 */
export const Капсулы: Story = {
  args: {
    appearance: 'capsule',
    label: 'Вид сводки',
    active: 'overview',
    items: [
      { key: 'overview', title: 'Обзор', href: { pathname: '/', query: { tab: 'overview' } } },
      { key: 'work', title: 'Работа', href: { pathname: '/', query: { tab: 'work' } } },
      { key: 'money', title: 'Деньги', href: { pathname: '/', query: { tab: 'money' } } },
    ],
  },
};

/** Капсулы со счётчиком: трек растёт вместе с числом, положения не прыгают. */
export const КапсулыСоСчётчиками: Story = {
  args: {
    appearance: 'capsule',
    label: 'Вид сводки',
    active: 'work',
    items: [
      { key: 'overview', title: 'Обзор', href: { pathname: '/', query: { tab: 'overview' } } },
      {
        key: 'work',
        title: 'Работа',
        href: { pathname: '/', query: { tab: 'work' } },
        count: 12,
        countLabel: '12 нарядов',
      },
      { key: 'money', title: 'Деньги', href: { pathname: '/', query: { tab: 'money' } } },
    ],
  },
};

/**
 * Лента склада: едет вбок, а не складывается столбиком (issue #609). Три
 * длинные подписи на 320 в строку не встают, а перенос давал вертикальный
 * список из трёх ссылок — он читается как случайные ссылки, а не как
 * переключатель вида.
 */
export const Прокрутка: Story = {
  args: {
    scroll: true,
    label: 'Разделы склада',
    active: 'stock',
    items: [
      { key: 'stock', title: 'Остатки по зонам', href: { pathname: '/', query: { tab: 'stock' } } },
      { key: 'log', title: 'Журнал движений', href: { pathname: '/', query: { tab: 'log' } } },
      { key: 'zones', title: 'Зоны хранения', href: { pathname: '/', query: { tab: 'zones' } } },
    ],
  },
};

/**
 * Пустой набор: лента не рисует ни рамки, ни линии на весь раздел. Случай
 * законный — раздел, у которого вкладок пока нет, не должен показывать пустую
 * полосу под заголовком.
 */
export const Пустое: Story = { args: { items: [], active: undefined } };
