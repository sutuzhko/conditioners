import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { defaultSymptoms } from './content';
import { Diagnostics } from './Diagnostics';
import { customSymptoms, symptomsWithPrices } from './fixtures';

/**
 * Диагностика по симптомам. Все шесть разборов лежат в разметке всегда —
 * скрытые проверяются через DevTools, а не переключением чипа.
 *
 * Симптомы — сетка 2×3 на телефоне с короткими подписями, 3×2 на крупном,
 * один ряд с 900px (issue #272). Историй на симптом — по представителю
 * каждого класса длины подписи: самая короткая («Запах») и самая длинная
 * («Не включается»); остальные четыре покрыты RTL-тестами, снимать их
 * значило бы шесть раз снять одно и то же — высота разбора резервируется по
 * самому длинному, и от выбора меняется только текст.
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

/** Самая короткая подпись чипа: на телефоне «Запах» вместо «Неприятный запах». */
export const Smell: Story = {
  name: 'Симптом: неприятный запах',
  args: { defaultSymptom: 'zapah' },
};

/** Самая длинная подпись чипа на телефоне — «Не включается» в колонке 118px. */
export const NoStart: Story = {
  name: 'Симптом: не включается',
  args: { defaultSymptom: 'ne-vklyuchaetsya' },
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
