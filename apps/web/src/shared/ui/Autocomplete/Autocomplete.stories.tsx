import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';

import type { FieldVariant } from '../internal/Field';
import { Autocomplete, type AutocompleteOption } from './Autocomplete';

/**
 * Клиенты выдуманы для витрины кита: настоящие приходят из БД (инвариант 8).
 * Фильтрует историю сама — в приложении это делает сервер.
 */
const CLIENTS: readonly AutocompleteOption[] = [
  { value: 'c1', label: 'Иванов Иван', note: '+7 900 000-00-01 · Красноармейский, 12' },
  { value: 'c2', label: 'Иванченко Пётр', note: '+7 900 000-00-02 · Ложевая, 4' },
  { value: 'c3', label: 'Ивашов Сергей', note: '+7 900 000-00-03 · Пролетарская, 18' },
  { value: 'c4', label: 'Петров Олег', note: '+7 900 000-00-04 · Оборонная, 7' },
  { value: 'c5', label: 'Сидорова Анна', note: '+7 900 000-00-05 · Кутузова, 21' },
];

function Controlled({
  initial = '',
  options = CLIENTS,
  ...props
}: { initial?: string; options?: readonly AutocompleteOption[] } & Omit<
  React.ComponentProps<typeof Autocomplete>,
  'query' | 'onQueryChange' | 'onSelect' | 'options'
>) {
  const [query, setQuery] = useState(initial);
  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Autocomplete
      {...props}
      options={filtered}
      query={query}
      onQueryChange={setQuery}
      onSelect={(option) => setQuery(option.label)}
    />
  );
}

const meta = {
  title: 'UI Kit/Autocomplete',
  component: Autocomplete,
  /* Обязательные пропсы объявлены здесь ради типов: сами истории рисуют
     управляемую обёртку, и до компонента эти значения не доходят. */
  args: {
    label: 'Клиент',
    placeholder: 'Начните вводить фамилию',
    options: CLIENTS,
    query: '',
    onQueryChange: () => {},
    onSelect: () => {},
  },
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div
        data-ui="panel"
        style={{ background: 'var(--bg-soft)', padding: 16, maxWidth: 420, minHeight: 320 }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Autocomplete>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  name: 'Базовое состояние',
  render: (args) => <Controlled {...args} />,
};

export const WithQuery: Story = {
  name: 'С набранным текстом',
  render: (args) => <Controlled {...args} initial="Ива" />,
};

export const NothingFound: Story = {
  name: 'Ничего не найдено',
  render: (args) => <Controlled {...args} initial="Щ" />,
};

export const EmptySource: Story = {
  name: 'Справочник пуст',
  render: (args) => (
    <Controlled
      {...args}
      options={[]}
      initial="Ива"
      emptyText="Клиентов пока нет — заведите первого в разделе «Клиенты»"
    />
  ),
};

export const WithHint: Story = {
  name: 'С подсказкой',
  render: (args) => <Controlled {...args} hint="Стрелки ведут по списку, Enter выбирает" />,
};

export const WithError: Story = {
  name: 'Ошибка',
  render: (args) => <Controlled {...args} error="Выберите клиента из списка" />,
};

export const Disabled: Story = {
  name: 'Отключено',
  render: (args) => <Controlled {...args} initial="Иванов Иван" disabled />,
};

const VARIANTS: readonly FieldVariant[] = ['flat', 'bordered', 'faded', 'underlined'];

/** Четыре вида оформления — те же, что у обычного поля: шкура общая. */
export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {VARIANTS.map((variant) => (
        <Controlled {...args} key={variant} variant={variant} label={variant} />
      ))}
    </div>
  ),
};

/**
 * Открытый список — состояние, ради которого компонент и существует. Снимок
 * без него показывал бы обычное поле.
 */
export const OpenList: Story = {
  name: 'Список открыт',
  render: (args) => <Controlled {...args} initial="Ива" />,
  play: async ({ canvasElement }) => {
    const field = canvasElement.querySelector('input');
    field?.focus();
  },
};
