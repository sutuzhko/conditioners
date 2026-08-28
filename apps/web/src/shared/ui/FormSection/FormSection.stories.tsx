import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';

import { Badge } from '../Badge/Badge';
import { Input } from '../Input/Input';
import { FormSection } from './FormSection';

/* Поля-заглушки: история показывает рамку и заголовок раздела, а не форму. */
function Fields() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      }}
    >
      <Input label="Название" defaultValue="" />
      <Input label="Артикул" defaultValue="" />
    </div>
  );
}

const meta = {
  title: 'UI Kit/FormSection',
  component: FormSection,
  args: {
    title: 'Основное',
    hint: 'Поля, без которых позиция не сохранится.',
    children: <Fields />,
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FormSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnPage: Story = {
  name: 'Карточкой на странице (h2)',
};

export const SoftInsideCard: Story = {
  name: 'Карточкой внутри карточки (h3)',
  args: { headingLevel: 3, tone: 'soft', gap: 'sm' },
};

export const Bare: Story = {
  name: 'Без карточки внутри окна (h3)',
  args: { surface: 'bare', headingLevel: 3 },
};

export const BareLevel2: Story = {
  name: 'Без карточки на странице (h2)',
  args: { surface: 'bare' },
};

export const Stacked: Story = {
  name: 'Несколько разделов подряд без карточек',
  args: { surface: 'bare', headingLevel: 3 },
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <FormSection {...args} />
      <FormSection {...args} title="Дополнительно" hint={undefined}>
        <Fields />
      </FormSection>
    </div>
  ),
};

export const TitleAside: Story = {
  name: 'С меткой у заголовка',
  args: {
    titleAside: (
      <Badge variant="neutral" size="sm">
        В архиве
      </Badge>
    ),
  },
};

export const TitleHidden: Story = {
  name: 'Заголовок даёт окно: скрыт, но остаётся именем',
  args: { surface: 'bare', headingLevel: 3, titleHidden: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('heading')).toBeNull();
    await expect(canvas.getByRole('region', { name: 'Основное' })).toBeInTheDocument();
  },
};
