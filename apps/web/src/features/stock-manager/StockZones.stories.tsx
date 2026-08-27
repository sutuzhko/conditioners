import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StockZones } from './StockZones';
import { acceptingApi, archivedZone, failingApi, orphanZone, people, zones } from './fixtures';

const meta = {
  title: 'Админка/Склад · Зоны хранения',
  component: StockZones,
  args: { zones, people, api: acceptingApi, confirmArchive: async () => true },
} satisfies Meta<typeof StockZones>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Гараж и две машины — обычный состав небольшой компании. */
export const Базовое: Story = {};

/** 🔴 Зон нет: раздел объясняет, что заводят сначала. Названий в коде нет. */
export const Пусто: Story = {
  args: { zones: [] },
};

/** Машину продали: зона в архиве, движения по ней остались в журнале. */
export const САрхивной: Story = {
  args: { zones: [...zones, archivedZone] },
};

/** Хозяин уволен: связь потеряна, машину нужно переназначить. */
export const БезХозяина: Story = {
  args: { zones: [...zones, orphanZone] },
};

/** Сервер отказал: сообщение появляется под списком, состояние не теряется. */
export const ОтказСервера: Story = {
  args: { api: failingApi },
};
