import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { Rating } from './Rating';

/** Ввод оценки в форме отзыва: значение хранит форма. */
function RatingField(props: { error?: string; disabled?: boolean }) {
  const [value, setValue] = useState(0);

  return (
    <Rating
      mode="input"
      name="rating"
      label="Оценка"
      required
      value={value}
      onChange={setValue}
      {...props}
    />
  );
}

const meta = {
  title: 'UI Kit/Rating',
  component: Rating,
  args: { value: 4 },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const WithCaption: Story = {
  name: 'С подписью',
  args: { value: 5, caption: '5,0 · 12 отзывов' },
};

export const Sizes: Story = {
  name: 'Размеры',
  // Допущение инвариантов — причина в reason (ADR-230)
  parameters: {
    invariants: {
      allow: [
        {
          rule: 'overflow-x',
          reason: 'витрина размеров в один ряд шире телефона по замыслу; это не раскладка',
        },
      ],
    },
  },
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Rating value={4} size="sm" />
      <Rating value={4} size="md" />
      <Rating value={4} size="lg" />
    </div>
  ),
};

export const EmptyValue: Story = {
  name: 'Оценки нет',
  args: { value: 0 },
};

export const InputMode: Story = {
  name: 'Ввод оценки',
  render: () => <RatingField />,
};

export const InputError: Story = {
  name: 'Ввод: ошибка',
  render: () => <RatingField error="Поставьте оценку — без неё отзыв не принимаем" />,
};

export const InputDisabled: Story = {
  name: 'Ввод: отключён',
  render: () => <RatingField disabled />,
};

export const Choosing: Story = {
  name: 'Выбор с клавиатуры',
  render: () => <RatingField />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: 'Оценка 4 из 5' }));
    await expect(canvas.getByRole('radio', { name: 'Оценка 4 из 5' })).toBeChecked();
  },
};
