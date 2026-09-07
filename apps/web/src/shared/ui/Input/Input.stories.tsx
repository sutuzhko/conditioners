import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Input } from './Input';
import { Select } from '../Select/Select';
import { buttonClassName } from '../Button/Button';
import { fieldRowActionsClassName, fieldRowClassName, type FieldVariant } from '../internal/Field';

const meta = {
  title: 'UI Kit/Input',
  component: Input,
  args: { label: 'Как к вам обращаться', placeholder: 'Имя' },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Required: Story = { name: 'Обязательное', args: { required: true } };

export const WithHint: Story = {
  name: 'С подсказкой',
  args: { hint: 'Позвоним в течение 15 минут в рабочее время' },
};

export const WithError: Story = {
  name: 'Ошибка',
  args: {
    label: 'Телефон',
    type: 'tel',
    defaultValue: '+7 999',
    error: 'Введите номер полностью — 10 цифр после +7',
  },
};

export const Filled: Story = { name: 'Заполнено', args: { defaultValue: 'Пётр' } };

export const Disabled: Story = {
  name: 'Отключено',
  args: { disabled: true, defaultValue: 'Пётр' },
};

export const ReadOnly: Story = {
  name: 'Только чтение',
  args: { readOnly: true, defaultValue: '+7 (900) 000-00-00' },
};

export const Focus: Story = {
  name: 'Фокус с клавиатуры',
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByLabelText(/Как к вам обращаться/);
    await userEvent.click(input);
    await expect(input).toHaveFocus();
  },
};

export const Empty: Story = { name: 'Без подписи', args: { label: undefined } };

const VARIANTS: readonly FieldVariant[] = ['flat', 'bordered', 'faded', 'underlined'];

const grid = {
  display: 'grid',
  gap: 16,
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
} as const;

/** Четыре вида поля с эталона: заливка, обводка, приглушённое, подчёркнутое. */
export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div style={grid}>
      {VARIANTS.map((variant) => (
        <Input {...args} key={variant} variant={variant} label={variant} />
      ))}
    </div>
  ),
};

/**
 * Все состояния каждого вида в одном экране: покой, заполнено, ошибка,
 * отключено, только чтение. Наведение и фокус живут только в браузере —
 * им отдана история «Фокус с клавиатуры».
 */
export const VariantStates: Story = {
  name: 'Варианты и состояния',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={grid}>
          <Input {...args} variant={variant} label={`${variant} · пусто`} />
          <Input {...args} variant={variant} label={`${variant} · значение`} defaultValue="Пётр" />
          <Input
            {...args}
            variant={variant}
            label={`${variant} · ошибка`}
            defaultValue="+7 999"
            error="Введите номер полностью"
          />
          <Input {...args} variant={variant} label={`${variant} · отключено`} disabled />
        </div>
      ))}
    </div>
  ),
};

/**
 * Те же поля внутри панели: `data-ui="panel"` включает её геометрию
 * (ADR-187) — пилюля, высота 48 и подпись внутри поля вместо строки над ним.
 * Разметка при этом та же самая.
 */
export const InPanel: Story = {
  name: 'В панели',
  render: (args) => (
    <div data-ui="panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {VARIANTS.map((variant) => (
        <div key={variant} style={grid}>
          <Input {...args} variant={variant} label={`${variant} · пусто`} />
          <Input {...args} variant={variant} label={`${variant} · значение`} defaultValue="Пётр" />
          <Input
            {...args}
            variant={variant}
            label={`${variant} · ошибка`}
            defaultValue="+7 999"
            error="Введите номер полностью"
          />
          <Input {...args} variant={variant} label={`${variant} · отключено`} disabled />
        </div>
      ))}
    </div>
  ),
};

/* Раскладку ряда задаёт раздел — здесь она инлайном, чтобы история не заводила
   своего модуля стилей ради трёх свойств. Выравнивание ряда инлайн не трогает:
   его ставит класс кита, и в этом вся суть проверки. */
const ROW: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 12 };
const ROW_ACTIONS: CSSProperties = { display: 'flex', gap: 12, alignItems: 'center' };

function SearchRowDemo({ panel }: { readonly panel: boolean }) {
  return (
    <div
      data-ui={panel ? 'panel' : undefined}
      style={{ padding: 16, background: panel ? 'var(--bg-soft)' : undefined }}
    >
      <form className={fieldRowClassName()} style={ROW}>
        <Input
          label="Поиск по каталогу"
          hint="Название, марка, артикул или категория"
          placeholder="Название или мощность"
          type="search"
        />

        <Select
          label="Видимость"
          options={[
            { value: '', label: 'Любая' },
            { value: 'visible', label: 'Показывается' },
          ]}
        />

        <div className={fieldRowActionsClassName()} style={ROW_ACTIONS}>
          <button className={buttonClassName({ size: 'sm' })} type="button">
            Найти
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Ряд отбора: поле с подсказкой, список и действия на одной строке ввода
 * (issue #742).
 *
 * 🔴 Смотреть на верх кнопки «Найти» и верх поля: они на одной линии, и
 * подсказка под полем эту линию не двигает. До правки ряд равнялся по нижнему
 * краю самого высокого элемента — то есть по низу подсказки, — и кнопка
 * уезжала на строку под полем.
 */
export const SearchRow: Story = {
  name: 'Ряд отбора',
  render: () => <SearchRowDemo panel={false} />,
};

/**
 * Тот же ряд в панели: подпись лежит внутри контрола (ADR-307), компенсировать
 * её строку не нужно — отступ действий кит обнуляет сам. Верх кнопки и верх
 * поля совпадают и здесь.
 */
export const SearchRowInPanel: Story = {
  name: 'Ряд отбора в панели',
  render: () => <SearchRowDemo panel />,
};
