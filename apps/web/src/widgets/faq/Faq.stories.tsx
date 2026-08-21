import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Faq } from './Faq';
import {
  installFromFixture,
  warrantyEmpty,
  warrantyFixture,
  warrantyPlaceholder,
} from './fixtures';

/**
 * Частые вопросы.
 *
 * 🔴 Ответы лежат в HTML всегда, даже свёрнутые: FAQ участвует в разметке
 * `FAQPage`. Первой идёт секция без данных из базы — так блок выглядит, пока
 * прайс и условия гарантии не заведены.
 */
const meta = {
  title: 'Блоки/FAQ',
  component: Faq,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Faq>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutData: Story = { name: 'Прайс и гарантия ещё не заведены' };

export const Filled: Story = {
  name: 'Цена и гарантия из настроек',
  args: { installFrom: installFromFixture, warranty: warrantyFixture },
};

export const Placeholders: Story = {
  name: 'Гарантия ещё заглушка',
  args: { installFrom: installFromFixture, warranty: warrantyPlaceholder },
};

export const EmptyWarranty: Story = {
  name: 'Гарантия не заполнена',
  args: { installFrom: installFromFixture, warranty: warrantyEmpty },
};

export const Tablet: Story = {
  name: 'Планшет 768',
  args: { installFrom: installFromFixture, warranty: warrantyFixture },
  globals: { viewport: { value: 'md' } },
};

export const Phone: Story = {
  name: 'Телефон 375',
  args: { installFrom: installFromFixture, warranty: warrantyFixture },
  globals: { viewport: { value: 'sm' } },
};

export const Narrow: Story = {
  name: 'Минимум 320',
  args: { installFrom: installFromFixture, warranty: warrantyFixture },
  globals: { viewport: { value: 'xs' } },
};
