import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { WeatherChip } from './WeatherChip';

/**
 * Чип погоды первого экрана. Цифры приходят с сервера, а сам чип освежает их,
 * пока вкладку держат открытой; в историях обновление отключено — иначе
 * снимок зависел бы от чужого сервиса.
 */
const meta = {
  title: 'Блоки/Чип погоды',
  component: WeatherChip,
  args: {
    city: 'Тула',
    api: { load: () => Promise.resolve(null) },
  },
} satisfies Meta<typeof WeatherChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Жара: пик выше 28° — заметка торопит с бронью. */
export const Peak: Story = {
  name: 'Пик сезона',
  args: { weather: { mean: 27, max: 34 } },
};

/** Сезон начался: пик от 22°. */
export const Season: Story = {
  name: 'Сезон стартовал',
  args: { weather: { mean: 19, max: 24 } },
};

/** Прохладно: заметка зовёт успеть до жары. */
export const Cool: Story = {
  name: 'До жары',
  args: { weather: { mean: 11, max: 16 } },
};

/** Мороз: минус набирается типографским знаком, а не дефисом. */
export const Frost: Story = {
  name: 'Минус на улице',
  args: { weather: { mean: -12, max: -3 } },
};

/** Длинное название города проверяет перенос внутри капсулы. */
export const LongCity: Story = {
  name: 'Длинное название города',
  args: { city: 'Петропавловск-Камчатский', weather: { mean: 8, max: 21 } },
};
