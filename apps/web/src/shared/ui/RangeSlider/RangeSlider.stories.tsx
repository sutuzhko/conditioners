import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { expect, waitFor, within } from 'storybook/test';
import { RangeSlider } from './RangeSlider';

/** Ползунок управляемый: значение живёт в форме, а не внутри компонента. */
function AreaSlider({
  initial = 25,
  ...rest
}: Partial<ComponentProps<typeof RangeSlider>> & { initial?: number }) {
  const [value, setValue] = useState(initial);

  return (
    <RangeSlider
      label="Площадь помещения"
      min={10}
      max={60}
      formatValue={(next) => `${next} м²`}
      {...rest}
      value={value}
      onChange={setValue}
    />
  );
}

const meta = {
  title: 'UI Kit/RangeSlider',
  component: RangeSlider,
  args: { value: 25, onChange: () => {}, min: 10, max: 60 },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof RangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние', render: () => <AreaSlider /> };

export const WithHint: Story = {
  name: 'С подсказкой',
  render: () => <AreaSlider hint="Считаем по комнате, где будет висеть блок" />,
};

export const WithError: Story = {
  name: 'Ошибка',
  render: () => <AreaSlider error="Для такой площади нужен подбор по телефону" />,
};

export const Disabled: Story = { name: 'Отключён', render: () => <AreaSlider disabled /> };

export const FractionalStep: Story = {
  name: 'Дробный шаг',
  render: () => (
    <AreaSlider
      initial={6.5}
      label="Тариф"
      min={4}
      max={9}
      step={0.1}
      formatValue={(next) => `${next.toFixed(1)} ₽/кВт·ч`}
    />
  ),
};

export const NoScale: Story = {
  name: 'Без подписей шкалы',
  render: () => <AreaSlider showScale={false} />,
};

export const Compact: Story = {
  name: 'Компактный — для узкой колонки',
  render: () => (
    <AreaSlider
      initial={6.5}
      size="sm"
      label="Тариф день"
      min={4}
      max={9}
      step={0.1}
      showScale={false}
      formatValue={(next) => `${next.toFixed(1)} ₽/кВт·ч`}
    />
  ),
};

export const Dragging: Story = {
  name: 'Изменение с клавиатуры',
  render: () => <AreaSlider />,
  play: async ({ canvasElement }) => {
    const slider = within(canvasElement).getByRole('slider');

    /* 🔴 История показывает ползунок под фокусом, а не сдвинутый стрелками
       (issue #436). Проверка `toHaveValue('27')` не проходила ни разу и не
       могла: значение нативного `input[type=range]` двигает браузер, а
       `userEvent.keyboard` шлёт только события — это же записано в тесте
       компонента («стрелки даёт нативный input[type=range]»).

       Нажатие тоже было неверным: клик по дорожке сам выставляет значение по
       месту курсора. Отказ при этом не красил ни один прогон, и история
       полгода обещала то, чего не делала. */
    slider.focus();
    await waitFor(() => expect(slider).toHaveFocus());
  },
};
