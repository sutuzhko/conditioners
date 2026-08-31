import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Skeleton } from './Skeleton';

const meta = {
  title: 'UI Kit/Skeleton',
  component: Skeleton,
  argTypes: { variant: { control: 'inline-radio', options: ['text', 'block', 'circle'] } },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние', args: { width: '240px' } };

export const Paragraph: Story = {
  name: 'Абзац текста',
  args: { variant: 'text', lines: 4, width: '100%' },
};

export const Variants: Story = {
  name: 'Варианты',
  render: () => (
    <div style={{ display: 'grid', gap: 16, maxWidth: 420 }}>
      <Skeleton variant="text" width="70%" />
      <Skeleton variant="block" width="100%" height="140px" />
      <Skeleton variant="circle" width="48px" />
    </div>
  ),
};

export const CardPlaceholder: Story = {
  name: 'Каркас карточки модели',
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: 12,
        maxWidth: 280,
        padding: 20,
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-lg)',
        background: 'var(--card)',
      }}
    >
      <Skeleton variant="block" height="150px" />
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" lines={2} />
    </div>
  ),
};

/**
 * 🔴 Скелетон обязан иметь `display`: `span` по природе строчный, и строчный
 * элемент игнорирует заданные ширину и высоту целиком — заготовка
 * схлопывалась в ничто вместе с резервом места, ради которого она и стоит.
 * История показывает все три вида с явно заданными размерами: если `display`
 * пропадёт, они станут нулевыми и это будет видно сразу.
 */
export const Sizes: Story = {
  name: 'Заданные размеры',
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <Skeleton variant="circle" width="44px" />
      <Skeleton variant="block" width="160px" height="44px" />
      <Skeleton variant="text" width="200px" />
    </div>
  ),
};

/**
 * Блочное состояние загрузки: скелетон повторяет будущую раскладку строка
 * в строку, а не показывает три полосы наугад. Иначе содержимое, приехав,
 * сдвинет вёрстку — а это ровно то, ради чего скелетон и рисуют.
 */
export const RowsLoading: Story = {
  name: 'Загрузка списка',
  render: () => (
    <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[0, 1, 2, 3].map((row) => (
          <div key={row} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Skeleton variant="circle" width="32px" />
            <Skeleton variant="text" width="22%" />
            <Skeleton variant="text" width="34%" />
            <Skeleton variant="block" width="88px" height="24px" />
          </div>
        ))}
      </div>
    </div>
  ),
};
