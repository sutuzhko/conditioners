import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Services } from './Services';

/**
 * Сетка услуг. Тексты описывают услугу и одинаковы при любом содержимом базы,
 * снаружи приходят только адреса ссылок.
 */
const meta = {
  title: 'Блоки/Услуги',
  component: Services,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Services>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Три услуги' };

/**
 * Адреса задаёт страница: на главной это якоря, в кластере — соседние
 * страницы. Здесь показаны другие якоря — маршруты кластера появятся
 * в волне 4, и типизированные роуты Next до тех пор их не примут.
 */
export const CustomHrefs: Story = {
  name: 'Свои адреса ссылок',
  args: {
    hrefs: { sale: '#modeli', install: '#montazh', service: '#servis' },
  },
};
