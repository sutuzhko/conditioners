import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Contacts } from './Contacts';
import {
  addressEmpty,
  addressFixture,
  addressPlaceholder,
  areaEmpty,
  areaFixture,
  contactsEmpty,
  contactsFixture,
  contactsPlaceholder,
  contactsTwoPhones,
  geoEmpty,
  geoFixture,
} from './fixtures';

/**
 * Контакты и место карты.
 *
 * 🔴 Встроенной карты нет: iframe Яндекс.Карт — сторонний скрипт и чужие
 * cookie, а единственный внешний скрипт на сайте — Метрика (ADR-024). Вместо
 * него карточка с адресом и ссылкой в новую вкладку.
 */
const meta = {
  title: 'Блоки/Контакты',
  component: Contacts,
  parameters: { layout: 'fullscreen' },
  args: {
    contacts: contactsFixture,
    address: addressFixture,
    area: areaFixture,
    geo: geoFixture,
  },
} satisfies Meta<typeof Contacts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filled: Story = { name: 'Настройки заполнены' };

export const TwoPhones: Story = { name: 'Два телефона', args: { contacts: contactsTwoPhones } };

export const WithoutGeo: Story = {
  name: 'Без координат — карта ищет по адресу',
  args: { geo: geoEmpty },
};

export const Placeholders: Story = {
  name: 'Данные компании ещё заглушки',
  args: { contacts: contactsPlaceholder, address: addressPlaceholder },
};

export const Empty: Story = {
  name: 'Настройки пустые',
  args: {
    contacts: contactsEmpty,
    address: addressEmpty,
    area: areaEmpty,
    geo: geoEmpty,
  },
};

export const Tablet: Story = { name: 'Планшет 768', globals: { viewport: { value: 'md' } } };

export const Phone: Story = { name: 'Телефон 375', globals: { viewport: { value: 'sm' } } };

export const Narrow: Story = { name: 'Минимум 320', globals: { viewport: { value: 'xs' } } };
