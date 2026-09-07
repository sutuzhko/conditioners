import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StockJournal } from './StockJournal';
import {
  authorlessMove,
  countMove,
  emptyJournal,
  journal,
  longJournal,
  longNamesJournal,
} from './fixtures';
import { STOCK_PATH, stockItemPath } from './model';

const basePath = stockItemPath('s1');

const meta = {
  title: 'Админка/Склад · Журнал движений',
  component: StockJournal,
  args: { journal, basePath },
} satisfies Meta<typeof StockJournal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Приход, перемещение, списание в наряд и инвентаризация — весь путь позиции. */
export const Базовое: Story = {};

/** Журнал длиннее страницы: появляется разбивка. */
export const СоСтраницами: Story = {
  args: { journal: longJournal },
};

/** Движений не было: остаток появится после первого прихода. */
export const Пусто: Story = {
  args: { journal: emptyJournal },
};

/** 🔴 Инвентаризация: поправка в минус и её основание. */
export const Инвентаризация: Story = {
  args: { journal: { ...journal, items: [countMove], total: 1 } },
};

/** Автор удалён: журнал переживает увольнение. */
export const БезАвтора: Story = {
  args: { journal: { ...journal, items: [authorlessMove], total: 1 } },
};

/**
 * 🔴 Журнал всего склада (ADR-137): к колонкам добавляется позиция — «что
 * двигали» первый вопрос к нему. История позиции при этом никуда не девается.
 */
export const ЖурналСклада: Story = {
  args: { basePath: STOCK_PATH, baseQuery: { tab: 'log' }, withItem: true },
};

/**
 * 🔴 Журнал склада с отбором (issue #610): вид движения, период и поиск.
 * Всё живёт в адресе — отфильтрованный журнал можно сохранить и прислать.
 */
export const СОтбором: Story = {
  args: {
    basePath: STOCK_PATH,
    baseQuery: { tab: 'log' },
    withItem: true,
    withFilter: true,
    filters: { kind: 'consume', period: 'month', query: 'труба' },
  },
};

/** Отбор не нашёл ничего: это другой ответ, чем «движений не было вовсе». */
export const ОтборНичегоНеНашёл: Story = {
  args: {
    journal: emptyJournal,
    basePath: STOCK_PATH,
    baseQuery: { tab: 'log' },
    withItem: true,
    withFilter: true,
    filters: { kind: 'income', period: 'prev', query: '' },
  },
};

/**
 * 🔴 Длинные владельческие имена (issue #725). Ниже 600px строка движения
 * раскладывается карточкой, и «Откуда», «Куда» и «Кто» делят строку с соседом.
 * Названия зон и позиций владелец задаёт сам: без предела ширины «Куда»
 * выливалось за правый край карточки — замерено на 320.
 */
export const ДлинныеИмена: Story = {
  args: {
    journal: longNamesJournal,
    basePath: STOCK_PATH,
    baseQuery: { tab: 'log' },
    withItem: true,
  },
};

/**
 * 🔴 Мелкий шаг листания (issue #725). Журнал стоял на зашитых двадцати
 * строках, пока у остатков шаг уже переключался: подвал у обоих списков раздела
 * теперь один, и «Строк на странице» работает на обеих вкладках.
 */
export const МелкийШаг: Story = {
  args: {
    journal: { ...longJournal, total: 19, page: 2, pages: 3 },
    basePath: STOCK_PATH,
    baseQuery: { tab: 'log' },
    withItem: true,
    size: 8,
  },
};
