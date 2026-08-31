import type { ReactElement } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Table } from './Table';
import { TableActions } from './TableActions';
import { Badge } from '../Badge/Badge';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton/IconButton';

const models = [
  { name: 'Класс 07', power: '2,1 кВт', area: 'до 20 м²', price: 'от 24 900 ₽' },
  { name: 'Класс 09', power: '2,6 кВт', area: 'до 25 м²', price: 'от 27 400 ₽' },
  { name: 'Класс 12', power: '3,5 кВт', area: 'до 35 м²', price: 'от 32 800 ₽' },
  { name: 'Класс 18', power: '5,3 кВт', area: 'до 50 м²', price: 'от 46 100 ₽' },
];

const specs = ['Компрессор', 'Уровень шума', 'Класс энергоэффективности', 'Обогрев до', 'Гарантия'];

const body = (
  <>
    <thead>
      <tr>
        <th scope="col">Модель</th>
        <th scope="col">Мощность</th>
        <th scope="col">Площадь</th>
        <th scope="col">Цена</th>
      </tr>
    </thead>
    <tbody>
      {models.map((model) => (
        <tr key={model.name}>
          <th scope="row">{model.name}</th>
          <td>{model.power}</td>
          <td>{model.area}</td>
          <td>{model.price}</td>
        </tr>
      ))}
    </tbody>
  </>
);

const meta = {
  title: 'UI Kit/Table',
  component: Table,
  args: { children: body },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = { name: 'Базовое состояние' };

export const Zebra: Story = { name: 'Зебра', args: { zebra: true } };

export const WithCaption: Story = {
  name: 'С подписью',
  args: { caption: 'Цены указаны с монтажом под ключ' },
};

export const StickyColumn: Story = {
  name: 'Скролл с залипающей колонкой',
  args: {
    variant: 'sticky',
    zebra: true,
    minWidth: '760px',
    label: 'Сравнение моделей',
    children: (
      <>
        <thead>
          <tr>
            <th scope="col">Характеристика</th>
            {models.map((model) => (
              <th key={model.name} scope="col">
                {model.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => (
            <tr key={spec}>
              <th scope="row">{spec}</th>
              {models.map((model) => (
                <td key={model.name}>—</td>
              ))}
            </tr>
          ))}
        </tbody>
      </>
    ),
  },
};

export const Scrollable: Story = {
  name: 'Просто скролл',
  args: { variant: 'scroll', minWidth: '760px', label: 'Прайс-лист' },
};

export const Empty: Story = {
  name: 'Пустая',
  args: {
    caption: 'Модели ещё не заведены',
    children: (
      <tbody>
        <tr>
          <td>Пока пусто</td>
        </tr>
      </tbody>
    ),
  },
};

/* ——— Список панели: липкая шапка, правая колонка круглых действий и
   подсвеченная строка срыва (issue #329). Наряды выдуманы для витрины кита —
   настоящие приходят из БД (инвариант 8). ——— */

const orders = [
  { id: '1057', client: 'Заказ на Красноармейском', due: '2 сентября', status: 'ok' },
  { id: '1058', client: 'Заказ на Ложевой', due: '2 сентября', status: 'work' },
  { id: '1059', client: 'Заказ на Пролетарской', due: '28 августа', status: 'late' },
  { id: '1060', client: 'Заказ на Оборонной', due: '3 сентября', status: 'new' },
  { id: '1061', client: 'Заказ на Кутузова', due: '3 сентября', status: 'ok' },
  { id: '1062', client: 'Заказ на Металлургов', due: '4 сентября', status: 'work' },
  { id: '1063', client: 'Заказ на Демонстрации', due: '4 сентября', status: 'new' },
  { id: '1064', client: 'Заказ на Первомайской', due: '5 сентября', status: 'ok' },
] as const;

const STATUS = {
  ok: { variant: 'success', text: 'Выполнен' },
  work: { variant: 'accent', text: 'В работе' },
  late: { variant: 'danger', text: 'Просрочен' },
  new: { variant: 'warning', text: 'Назначен' },
} as const;

const orderRows = (
  <>
    <thead>
      <tr>
        <th scope="col">Наряд</th>
        <th scope="col">Объект</th>
        <th scope="col">Срок</th>
        <th scope="col">Статус</th>
        <th scope="col">
          <span className="srOnly">Действия</span>
        </th>
      </tr>
    </thead>
    <tbody>
      {orders.map((order) => (
        <tr
          key={order.id}
          role="row"
          {...(order.status === 'late' ? { 'data-danger': 'true' } : {})}
        >
          <th scope="row">№ {order.id}</th>
          <td role="cell" data-label="Объект">
            {order.client}
          </td>
          <td role="cell" data-label="Срок" style={{ color: 'var(--muted)' }}>
            {order.due}
          </td>
          <td role="cell" data-label="Статус">
            <Badge variant={STATUS[order.status].variant} dot>
              {STATUS[order.status].text}
            </Badge>
          </td>
          <td role="cell">
            <TableActions label={`Действия над нарядом № ${order.id}`}>
              <IconButton label="Открыть" icon={<Icon name="search" />} />
              <IconButton label="Позвонить" icon={<Icon name="phone" />} />
              <IconButton label="Отменить" icon={<Icon name="close" />} />
            </TableActions>
          </td>
        </tr>
      ))}
    </tbody>
  </>
);

const panel = (Story: () => ReactElement) => (
  <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
    <Story />
  </div>
);

/**
 * 🔴 Липкая шапка требует ограниченной высоты. `position: sticky` считается
 * от ближайшего предка-скроллера, а им становится контейнер горизонтальной
 * прокрутки; пока его высота равна высоте таблицы, прокручивать по вертикали
 * в нём нечего — и шапка не липнет ни к чему.
 */
export const StickyHead: Story = {
  name: 'Липкая шапка',
  args: { children: orderRows, stickyHead: true, zebra: true, maxHeight: '260px', label: 'Наряды' },
  decorators: [panel],
};

/** Липкая шапка вместе с горизонтальной прокруткой: шапка держится сверху,
    а вбок уезжает вместе с колонками — иначе заголовки разошлись бы с ними. */
export const StickyHeadScrolled: Story = {
  name: 'Липкая шапка и скролл вбок',
  args: {
    children: orderRows,
    stickyHead: true,
    zebra: true,
    maxHeight: '260px',
    minWidth: '860px',
    label: 'Наряды',
  },
  decorators: [panel],
};

/**
 * 🔴 Подсвеченная строка срыва. Тинт складывается с подложкой строки, поэтому
 * приглушённый текст поднимается на ступень, а мягкая плашка становится
 * обведённой: собственная заливка ей там не нужна. Проверяется машиной —
 * `shared/styles/contrast.test.ts`.
 */
export const DangerRow: Story = {
  name: 'Строка срыва',
  args: { children: orderRows, zebra: true, label: 'Наряды' },
  decorators: [panel],
};

/** Правая колонка трёх круглых действий. Видны всегда, а не по наведению:
    наведения нет ни на телефоне, ни у клавиатуры. */
export const RowActions: Story = {
  name: 'Действия строки',
  args: { children: orderRows, label: 'Наряды' },
  decorators: [panel],
};

/** Ниже 600px строка разворачивается карточкой: колонок там не остаётся. */
export const CardsBelow600: Story = {
  name: 'Карточками ниже 600',
  args: { children: orderRows, variant: 'cards', label: 'Наряды' },
  decorators: [panel],
};
