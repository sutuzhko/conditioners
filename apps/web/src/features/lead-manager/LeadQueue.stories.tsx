import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LeadQueue } from './LeadQueue';
import { leadQueueFixture, leadQueueNow } from './fixtures';

/**
 * Очередь обращений — левая колонка раздела заявок (issue #349).
 *
 * 🔴 Таблица, а не карточки (issue #601, макет `Leads.png`): очередь читают
 * колонками сверху вниз. Ниже 600px строки разворачиваются карточками — пять
 * колонок на телефоне превращаются в боковую прокрутку.
 *
 * «Сейчас» задано фикстурой: относительное время в снимке витрины обязано
 * быть одинаковым от прогона к прогону.
 */
const meta = {
  title: 'Админка/Очередь обращений',
  component: LeadQueue,
  args: { leads: leadQueueFixture, now: leadQueueNow },
} satisfies Meta<typeof LeadQueue>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Открытое обращение: полоса слева и `aria-current` на строке. */
export const Выбранное: Story = {
  args: { selected: leadQueueFixture[0]?.id ?? '' },
};

/** Раздел стартует пустым: обращений нет вовсе, и виноват в этом не фильтр. */
export const Пусто: Story = {
  args: { leads: [] },
};

/** Обращения есть — их скрыл выбранный статус. Выход отсюда сбрасывает фильтр. */
export const НичегоНеНайдено: Story = {
  args: { leads: [], filtered: true },
};

/** Длинное имя и длинная тема: строка переносится, а не обрезается. */
export const ДлинныеПодписи: Story = {
  args: {
    leads: [
      {
        id: 'long',
        number: 1041,
        name: 'Константинопольская-Твердолобова Аполлинария Аристарховна',
        phone: '+79001234567',
        topic: 'Установка мультисплит-системы на два внутренних блока с прокладкой трассы',
        address: 'Новомосковск, микрорайон Урванский, Комсомольская 108, корпус 2, квартира 341',
        status: 'new',
        createdAt: '2026-08-30T10:19:00.000Z',
      },
    ],
  },
};
