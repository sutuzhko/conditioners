import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { defaultSymptoms } from './content';
import { Diagnostics } from './Diagnostics';
import { customSymptoms, symptomsWithPrices } from './fixtures';

/**
 * Диагностика по симптомам. Все шесть разборов лежат в разметке всегда —
 * скрытые проверяются через DevTools, а не переключением чипа.
 */
const meta = {
  title: 'Блоки/Сервис',
  component: Diagnostics,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Diagnostics>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Основное состояние: цен в коде нет, стоимость считается после диагностики. */
export const Basic: Story = { name: 'По умолчанию' };

export const NoCooling: Story = {
  name: 'Симптом: не холодит',
  args: { defaultSymptom: 'ne-holodit' },
};

export const Water: Story = {
  name: 'Симптом: капает вода',
  args: { defaultSymptom: 'kapaet-voda' },
};

export const Smell: Story = {
  name: 'Симптом: неприятный запах',
  args: { defaultSymptom: 'zapah' },
};

export const Noise: Story = {
  name: 'Симптом: шумит или вибрирует',
  args: { defaultSymptom: 'shum' },
};

export const NoStart: Story = {
  name: 'Симптом: не включается',
  args: { defaultSymptom: 'ne-vklyuchaetsya' },
};

export const Ice: Story = {
  name: 'Симптом: обмерзает наледью',
  args: { defaultSymptom: 'obmerzaet' },
};

/**
 * Прайс сервиса приходит снаружи: страница берёт суммы из настроек и
 * передаёт их вместе с разборами.
 */
export const WithPrices: Story = {
  name: 'Стоимость передана пропсом',
  args: { symptoms: symptomsWithPrices },
};

/** Список целиком из данных: свои симптомы, часть без цены. */
export const CustomList: Story = {
  name: 'Свой список симптомов',
  args: { symptoms: customSymptoms },
};

/** Первый симптом со стоимостью, остальные пять — без неё. */
export const PartialPrices: Story = {
  name: 'Цена задана не у всех симптомов',
  args: {
    symptoms: defaultSymptoms.map((symptom, index) =>
      index === 0 ? { ...symptom, priceFrom: 1500 } : symptom,
    ),
  },
};

export const Empty: Story = {
  name: 'Список симптомов пуст',
  args: { symptoms: [] },
};
