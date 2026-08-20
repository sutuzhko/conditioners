import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { FileInput } from './FileInput';

/** Файл живёт в состоянии формы — компонент только показывает и проверяет. */
function ControlledFileInput(props: Partial<ComponentProps<typeof FileInput>>) {
  const [file, setFile] = useState<File | null>(null);

  return <FileInput label="Фото места установки" {...props} value={file} onChange={setFile} />;
}

const meta = {
  title: 'UI Kit/FileInput',
  component: FileInput,
  args: { onChange: () => {} },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof FileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние', render: () => <ControlledFileInput /> };

export const WithHint: Story = {
  name: 'С подсказкой',
  render: () => (
    <ControlledFileInput hint="Общий план стены — так смета будет точнее" maxSizeMb={5} />
  ),
};

export const WithError: Story = {
  name: 'Ошибка',
  render: () => <ControlledFileInput error="Не удалось загрузить файл, попробуйте ещё раз" />,
};

export const Disabled: Story = {
  name: 'Отключено',
  render: () => <ControlledFileInput disabled />,
};

export const Required: Story = {
  name: 'Обязательное',
  render: () => <ControlledFileInput required />,
};

export const NarrowLimit: Story = {
  name: 'Жёсткий лимит размера',
  render: () => (
    <ControlledFileInput maxSizeMb={1} hint="Проверьте валидацию: выберите файл больше 1 МБ" />
  ),
};

export const Empty: Story = {
  name: 'Без подписи',
  render: () => <ControlledFileInput label={undefined} />,
};
