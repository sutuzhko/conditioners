import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderPager } from './OrderPager';
import { emptyPage, listFilters, longPage, page } from './fixtures';

const meta = {
  title: 'Админка/Заказы/Разбивка списка',
  component: OrderPager,
  args: { page: longPage, filters: listFilters({ tab: 'all' }) },
} satisfies Meta<typeof OrderPager>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Середина списка: обе стрелки живые, текущая страница залита. */
export const Базовое: Story = {};

/** Первая страница: шаг назад остаётся на месте, чтобы номера не прыгали. */
export const ПерваяСтраница: Story = {
  args: { page: { ...longPage, page: 1 } },
};

/** Последняя страница: то же с шагом вперёд. */
export const ПоследняяСтраница: Story = {
  args: { page: { ...longPage, page: longPage.pages } },
};

/** Много страниц: номера идут окном вокруг текущей, а не лентой. */
export const МногоСтраниц: Story = {
  args: { page: { ...longPage, page: 7, pages: 14, total: 109 } },
};

/** Одна страница: номеров нет, но счёт и выбор числа строк остаются. */
export const ОднаСтраница: Story = {
  args: { page },
};

/** Увеличенный шаг: выбранное число строк отмечено, а не только подсвечено. */
export const ПоШестнадцать: Story = {
  args: { filters: listFilters({ tab: 'all', size: 16 }) },
};

/** Список пуст: подвал честно говорит «0 из 0», а не прячется. */
export const Пусто: Story = {
  args: { page: emptyPage },
};
