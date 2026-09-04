import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LeadQueue } from './LeadQueue';
import { leadQueueFixture } from './fixtures';

/**
 * Очередь обращений — левая колонка раздела заявок (issue #349).
 *
 * Ширина у неё своя: 260px на планшете, 320px на рабочем столе. В историях
 * колонка не сужается — состояния смотрят целиком, а раскладку двух колонок
 * показывает страница раздела.
 */
const meta = {
  title: 'Админка/Очередь обращений',
  component: LeadQueue,
  args: { leads: leadQueueFixture },
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
        name: 'Константинопольская-Твердолобова Аполлинария Аристарховна',
        phone: '+79001234567',
        topic: 'Установка мультисплит-системы на два внутренних блока с прокладкой трассы',
        status: 'new',
        createdAt: '2026-09-03T10:19:00.000Z',
      },
    ],
  },
};
