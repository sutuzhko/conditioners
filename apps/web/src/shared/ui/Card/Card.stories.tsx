import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Card } from './Card';
import { CardBody, CardFooter, CardHeader } from './CardBelt';
import { Badge } from '../Badge/Badge';
import { Button } from '../Button/Button';

const meta = {
  title: 'UI Kit/Card',
  component: Card,
  args: {
    children: (
      <>
        <h3 style={{ margin: '0 0 8px', fontSize: 'var(--fs-h3)', color: 'var(--ink)' }}>
          Монтаж под ключ
        </h3>
        <p style={{ margin: 0 }}>Вакуумация магистрали, опрессовка, вывод конденсата.</p>
      </>
    ),
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'soft', 'accent', 'panel'] },
    padding: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg', 'xl'] },
    radius: { control: 'inline-radio', options: ['sm', 'md', 'ml', 'lg', 'xl', 'xxl'] },
    elevation: { control: 'inline-radio', options: ['none', 'card', 'raised', 'float'] },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Variants: Story = {
  name: 'Варианты',
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}
    >
      <Card {...args} variant="default" />
      <Card {...args} variant="soft" />
      <Card {...args} variant="accent" />
      <Card {...args} variant="panel" />
    </div>
  ),
};

export const Interactive: Story = {
  name: 'Интерактивная',
  args: { interactive: true },
};

export const Hover: Story = {
  name: 'Наведение',
  args: { interactive: true },
  render: (args) => <Card {...args} data-testid="card" />,
  play: async ({ canvasElement }) => {
    const card = within(canvasElement).getByTestId('card');
    await userEvent.hover(card);
    await expect(card).toBeVisible();
  },
};

export const Paddings: Story = {
  name: 'Внутренние отступы',
  render: (args) => (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card {...args} padding="sm" />
      <Card {...args} padding="md" />
      <Card {...args} padding="lg" />
      <Card {...args} padding="xl" />
    </div>
  ),
};

export const AsArticle: Story = {
  name: 'Семантика article',
  args: { as: 'article', interactive: true },
};

export const Empty: Story = {
  name: 'Пустая',
  args: {
    padding: 'lg',
    children: <p style={{ margin: 0, color: 'var(--muted)' }}>Пока нет ни одной модели</p>,
  },
};

export const Radii: Story = {
  name: 'Радиусы',
  render: (args) => (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      }}
    >
      <Card {...args} radius="sm" />
      <Card {...args} radius="md" />
      <Card {...args} radius="ml" />
      <Card {...args} radius="lg" />
      <Card {...args} radius="xl" />
      <Card {...args} radius="xxl" />
    </div>
  ),
};

export const Elevations: Story = {
  name: 'Глубина',
  render: (args) => (
    <div style={{ display: 'grid', gap: 44, padding: '12px 0 56px' }}>
      <Card {...args} elevation="none" />
      <Card {...args} elevation="card" />
      <Card {...args} elevation="raised" radius="xxl" padding="lg" />
    </div>
  ),
};

/** Карточка формы заявки: тёмная секция, рамки нет, тень чёрная и глубокая. */
export const OnDarkSection: Story = {
  name: 'На тёмной секции',
  args: { bordered: false, elevation: 'float', radius: 'xl', padding: 'xl' },
  render: (args) => (
    <div style={{ background: 'var(--lead-grad)', padding: '56px 24px' }}>
      <Card {...args} />
    </div>
  ),
};

/** Карточка услуги: рамка есть, тени в покое нет — она приходит с наведением. */
export const LiftOnHover: Story = {
  name: 'Тень только на наведении',
  args: { elevation: 'none', interactive: true, padding: 'xl' },
};

/* ——— Три пояса карточки (issue #329). Шапка, тело, подвал живут в ките, а не
   собираются по месту: до этого каждый экран панели рисовал их своими
   отступами, и «своими» они были ровно до тех пор, пока экраны не встали
   рядом. Карточка при этом идёт `padding="none"` — поля приносят пояса. ——— */

const beltCard = (
  <>
    <CardHeader
      title="Наряды за неделю"
      subtitle="12 из 14 закрыты"
      action={<Badge variant="warning">2 в работе</Badge>}
    />
    <CardBody>
      Пояса задают отступы сами: боковые 16px, вертикальные у шапки и подвала 12px.
    </CardBody>
    <CardFooter>
      <Button size="sm" variant="ghost">
        Отменить
      </Button>
      <Button size="sm">Сохранить</Button>
    </CardFooter>
  </>
);

export const Belts: Story = {
  name: 'Пояса — шапка, тело, подвал',
  args: { padding: 'none', children: beltCard },
};

/** Та же карточка внутри панели: радиус 14px и нейтральная тень вместо 20px
    и цветной тени витрины — развилка живёт в подстановке у `var()` (ADR-187). */
export const BeltsInPanel: Story = {
  name: 'Пояса в панели',
  args: { padding: 'none', children: beltCard },
  render: (args) => (
    <div data-ui="panel" style={{ padding: 16, background: 'var(--bg-soft)' }}>
      <Card {...args} />
    </div>
  ),
};

/** Шапка без действия и подвал без линии: пояса необязательны по одному. */
export const BeltsMinimal: Story = {
  name: 'Пояса — только шапка и тело',
  args: {
    padding: 'none',
    children: (
      <>
        <CardHeader title="Показатели" />
        <CardBody>Подвала у карточки может не быть вовсе.</CardBody>
      </>
    ),
  },
};

/** Длинный заголовок не выталкивает действие за край: сжимается заголовок. */
export const BeltsLongTitle: Story = {
  name: 'Пояса — длинный заголовок',
  args: {
    padding: 'none',
    children: (
      <>
        <CardHeader
          title="Наряды, назначенные монтажникам на текущую неделю по всем районам"
          action={<Button size="sm">Добавить</Button>}
        />
        <CardBody>Действие остаётся на месте, заголовок переносится.</CardBody>
      </>
    ),
  },
};

/** Тело без поля: его целиком занимает таблица, и второй отступ отбивал бы её
    от краёв карточки. */
export const BeltsFlushBody: Story = {
  name: 'Пояса — тело без поля',
  args: {
    padding: 'none',
    children: (
      <>
        <CardHeader title="Список" />
        <CardBody flush>
          <div style={{ padding: '24px 16px', background: 'var(--bg-soft)' }}>
            Здесь стоит таблица — поля приносят её ячейки.
          </div>
        </CardBody>
      </>
    ),
  },
};
