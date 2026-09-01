import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

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

/**
 * Список открывает фокус в поле, а без него истории «с текстом», «ничего не
 * найдено» и «справочник пуст» показывали одно и то же поле с надписью «Ива»
 * — их кадры совпадали побайтно (#464). Каждая из них про содержимое
 * списка, поэтому сценарий открывает его и дожидается (issue #435: ожидание
 * результата, не действия).
 */
const openList: Story['play'] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole('combobox'));
  await waitFor(() => expect(within(canvasElement).getByRole('listbox')).toBeVisible());
};

export const WithQuery: Story = {
  name: 'С набранным текстом',
  render: (args) => <Controlled {...args} initial="Ива" />,
  play: openList,
};

export const NothingFound: Story = {
  name: 'Ничего не найдено',
  render: (args) => <Controlled {...args} initial="Щ" />,
  play: openList,
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
  play: openList,
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
    /* Список открывает фокус в поле. 🔴 Дальше — ожидание самого списка, а не
       возврат из `focus()` (issue #435): история называется «Список открыт», и
       снимок обязан застать его открытым, а не в момент открытия. */
    await userEvent.click(within(canvasElement).getByRole('combobox'));
    await waitFor(() => expect(within(canvasElement).getByRole('listbox')).toBeVisible());
  },
};
