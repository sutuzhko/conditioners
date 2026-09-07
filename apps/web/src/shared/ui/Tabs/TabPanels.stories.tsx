import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { TabPanels, type TabPanelItem } from './TabPanels';

const DATA: TabPanelItem<string> = {
  key: 'data',
  title: 'Данные',
  panel: <p>Имя, телефон, адрес и заметка о клиенте.</p>,
};

const CARD: readonly TabPanelItem<string>[] = [
  DATA,
  { key: 'orders', title: 'Заказы', panel: <p>Наряды этого клиента.</p> },
  { key: 'units', title: 'Техника', panel: <p>Что у клиента стоит и до какого числа гарантия.</p> },
];

/**
 * Вкладки одной карточки: данные всех уже пришли одним запросом страницы, и
 * переключение правит адрес, а не переоткрывает раздел (issue #584, #587).
 */
const meta = {
  title: 'UI Kit/TabPanels',
  component: TabPanels,
  args: { active: 'data', label: 'Карточка клиента', idPrefix: 'demo', items: CARD },
} satisfies Meta<typeof TabPanels>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Подчёркивание — обличье карточек клиента, монтажника и наряда. */
export const Базовое: Story = {};

/** Открыта не первая вкладка: карточка приходит открытой на нужной. */
export const ВтораяВкладка: Story = { args: { active: 'orders' } };

/**
 * Счётчики у подписей (макет `CardTabs`): по ним видно, есть ли за вкладкой
 * что-нибудь, до того как на неё нажали.
 */
export const СоСчётчиками: Story = {
  args: {
    items: [
      DATA,
      { key: 'orders', title: 'Заказы', panel: <p>Наряды.</p>, count: 3, countLabel: '3 наряда' },
      {
        key: 'units',
        title: 'Техника',
        panel: <p>Техника.</p>,
        count: 2,
        countLabel: '2 единицы техники',
      },
    ],
  },
};

/**
 * Ноль показывается наравне с остальными числами: «Техника 0» отвечает на
 * вопрос «есть ли там что-нибудь», а пустое место — нет.
 */
export const СНулём: Story = {
  args: {
    items: [
      DATA,
      {
        key: 'orders',
        title: 'Заказы',
        panel: <p>Наряды.</p>,
        count: 12,
        countLabel: '12 нарядов',
      },
      {
        key: 'units',
        title: 'Техника',
        panel: <p>Техники пока нет.</p>,
        count: 0,
        countLabel: 'техники нет',
      },
    ],
  },
};

/**
 * 🔴 Пять вкладок наряда: в строку на 390 они не помещаются, и лента едет
 * вбок, а не переносится. Перенос ставил пятую вкладку на вторую строку и
 * уводил содержимое вниз на 44px ровно тогда, когда его открыли.
 */
export const ПятьВкладок: Story = {
  args: {
    active: 'checklist',
    label: 'Работа с нарядом',
    idPrefix: 'order',
    items: [
      { key: 'job', title: 'Наряд', panel: <p>Что и кому делаем.</p> },
      { key: 'materials', title: 'Расход', panel: <p>Списанные материалы.</p> },
      { key: 'checklist', title: 'Чеклист', panel: <p>Сборы перед выездом.</p> },
      { key: 'documents', title: 'Документы', panel: <p>Акты и снимки.</p> },
      { key: 'history', title: 'История', panel: <p>Кто и когда правил наряд.</p> },
    ],
  },
};

/**
 * Глазами монтажника: истории нет вовсе — ключа нет, значит и вкладки нет.
 * Пустая вкладка обещала бы пустую историю вместо закрытой (ADR-114).
 */
export const ГлазамиМонтажника: Story = {
  args: {
    active: 'job',
    label: 'Работа с нарядом',
    idPrefix: 'order',
    items: [
      { key: 'job', title: 'Наряд', panel: <p>Что и кому делаем.</p> },
      { key: 'materials', title: 'Расход', panel: <p>Списанные материалы.</p> },
      { key: 'checklist', title: 'Чеклист', panel: <p>Сборы перед выездом.</p> },
      { key: 'documents', title: 'Документы', panel: <p>Акты и снимки.</p> },
    ],
  },
};

/** Капсулы с панелями: то же переключение, другое обличье. */
export const Капсулы: Story = {
  args: {
    appearance: 'capsule',
    active: 'work',
    label: 'Вид сводки',
    idPrefix: 'summary',
    items: [
      { key: 'overview', title: 'Обзор', panel: <p>Что происходит сегодня.</p> },
      { key: 'work', title: 'Работа', panel: <p>Наряды и загрузка бригад.</p> },
      { key: 'money', title: 'Деньги', panel: <p>Выручка и выплаты.</p> },
    ],
  },
};

/** Пустая вкладка: панель без содержимого объясняет это словами, а не пробелом. */
export const Пустое: Story = {
  args: {
    items: [
      { key: 'data', title: 'Данные', panel: <p>Имя, телефон, адрес.</p> },
      {
        key: 'orders',
        title: 'Заказы',
        panel: <p>Нарядов пока нет.</p>,
        count: 0,
        countLabel: 'нарядов нет',
      },
    ],
  },
};
