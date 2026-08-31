import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Alert } from './Alert/Alert';
import { Badge } from './Badge/Badge';
import { Button } from './Button/Button';
import { Card } from './Card/Card';
import { CardBody, CardFooter, CardHeader } from './Card/CardBelt';
import { Icon } from './Icon';
import { IconButton } from './IconButton/IconButton';
import { Skeleton } from './Skeleton/Skeleton';
import { Table } from './Table/Table';
import { TableActions } from './Table/TableActions';

/**
 * Блочные состояния данных (issue #333) — состояния целого блока, а не кнопки
 * внутри него.
 *
 * 🔴 Их четыре, и они разные:
 *
 * 1. **Загрузка** — скелетон, повторяющий будущую раскладку строка в строку.
 *    Три полосы наугад не годятся: когда данные приедут, вёрстка сдвинется, а
 *    скелетон рисуют ровно ради того, чтобы она не сдвигалась.
 * 2. **Пусто** — объяснение причины и следующий шаг. «Ничего нет» без причины
 *    читается поломкой, и человек начинает жать «Обновить».
 * 3. **Ничего не найдено после фильтра** — другой текст и другое действие.
 *    Здесь данные есть, просто их скрыл фильтр, и правильный следующий шаг —
 *    сбросить его, а не заводить первую запись.
 * 4. **Ошибка** — что случилось с данными и действие «Повторить».
 *
 * Историй здесь нет своего компонента: это композиции кита, и смысл их именно
 * в том, чтобы четыре состояния одного блока стояли рядом и было видно, что
 * они не взаимозаменяемы.
 */
const meta = {
  title: 'UI Kit/Состояния блока',
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div data-ui="panel" style={{ background: 'var(--bg-soft)', padding: 16 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ORDERS = [
  { id: '1057', object: 'Заказ на Красноармейском', due: '2 сентября' },
  { id: '1058', object: 'Заказ на Ложевой', due: '2 сентября' },
  { id: '1059', object: 'Заказ на Пролетарской', due: '3 сентября' },
];

/** Готовый блок — чтобы остальные три состояния было с чем сравнить. */
export const Ready: Story = {
  name: 'Данные пришли',
  render: () => (
    <Card padding="none">
      <CardHeader
        title="Наряды на неделю"
        subtitle="3 наряда"
        action={<Button size="sm">Добавить</Button>}
      />
      <CardBody flush>
        {/* 🔴 `variant="cards"`, а не `plain`. Замер на 390 показал, что
            таблица из пяти колонок в режиме `plain` уводит документ вбок на
            196px: у него нет своего контейнера прокрутки, и ширину задаёт
            содержимое. Страница по горизонтали не прокручивается никогда
            (DESIGN_BRIEF §6) — ниже 600 строка разворачивается карточкой,
            между 600 и 900 таблица прокручивается внутри себя (ADR-201). */}
        <Table label="Наряды" zebra variant="cards">
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
            {ORDERS.map((order) => (
              <tr key={order.id} role="row">
                <th scope="row">№ {order.id}</th>
                <td role="cell" data-label="Объект">
                  {order.object}
                </td>
                <td role="cell" data-label="Срок" style={{ color: 'var(--muted)' }}>
                  {order.due}
                </td>
                <td role="cell" data-label="Статус">
                  <Badge variant="accent" dot>
                    В работе
                  </Badge>
                </td>
                <td role="cell">
                  <TableActions label={`Действия над нарядом № ${order.id}`}>
                    <IconButton label="Открыть" icon={<Icon name="search" />} />
                  </TableActions>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardBody>
    </Card>
  ),
};

/**
 * 🔴 Скелетон повторяет будущую раскладку строка в строку: те же пять колонок,
 * та же высота строки (61px — замеренный шаг строк готовой таблицы),
 * та же ширина плашки статуса. Иначе содержимое, приехав, сдвинет вёрстку — а
 * это ровно то, ради чего скелетон и рисуют.
 */
function LoadingBlock() {
  return (
    <Card padding="none">
      <CardHeader
        title="Наряды на неделю"
        subtitle="Загружаем"
        action={
          <Button size="sm" disabled>
            Добавить
          </Button>
        }
      />
      <CardBody flush>
        {/* `aria-busy` на области, а не на каждой заготовке: скелетон —
            декорация и от озвучки скрыт, а «идёт загрузка» сообщает блок. */}
        <div aria-busy="true" aria-live="polite" style={{ padding: '0 18px' }}>
          {[0, 1, 2].map((row) => (
            <div
              key={row}
              style={{
                display: 'flex',
                gap: 18,
                alignItems: 'center',
                /* 🔴 61px — замеренный шаг строк готовой таблицы, а не круглое
                   число на глаз. Первая версия стояла на 51px, и заготовка была
                   на 10px ниже настоящей строки: приехавшие данные сдвинули бы
                   блок на 30px за три строки — то самое, от чего скелетон и
                   должен спасать. Мерить надо именно шаг между соседними
                   строками: высота одной строки от него отличается на границу. */
                height: 61,
                borderBottom: '1px solid var(--line-soft)',
              }}
            >
              {/* Ширины заданы долями, а не пикселями: на 390 ряд из пяти
                  фиксированных заготовок уводил документ вбок на 32px, и
                  заготовка загрузки ломала ровно то правило, ради которого
                  таблица рядом уходит в карточки. */}
              <Skeleton variant="text" width="16%" />
              <Skeleton variant="text" width="30%" />
              <Skeleton variant="text" width="20%" />
              <Skeleton variant="block" width="22%" height="28px" />
              <Skeleton variant="circle" width="32px" />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

export const Loading: Story = { name: 'Загрузка', render: () => <LoadingBlock /> };

/**
 * Пусто. Причина названа, следующий шаг предложен: без них «нарядов нет»
 * читается поломкой, и человек начинает жать «Обновить».
 */
function EmptyBlock() {
  return (
    <Card padding="none">
      <CardHeader title="Наряды на неделю" />
      <CardBody>
        <div style={{ padding: '28px 0', textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', color: 'var(--ink)', fontWeight: 700 }}>
            На этой неделе нарядов нет
          </p>
          <p style={{ margin: '0 0 16px', color: 'var(--muted)' }}>
            Наряд появляется, когда заявку берут в работу и назначают монтажника.
          </p>
          <Button size="sm">Создать наряд</Button>
        </div>
      </CardBody>
    </Card>
  );
}

export const Empty: Story = { name: 'Пусто', render: () => <EmptyBlock /> };

/**
 * 🔴 «Ничего не найдено» — не то же самое, что «пусто». Данные есть, их скрыл
 * фильтр, и правильный следующий шаг — сбросить фильтр, а не заводить первую
 * запись. Другой текст и другое действие.
 */
function NotFoundBlock() {
  return (
    <Card padding="none">
      <CardHeader
        title="Наряды на неделю"
        subtitle="Фильтр: просроченные"
        action={
          <Badge variant="warning" onRemove={() => {}} removeLabel="Снять фильтр">
            Просроченные
          </Badge>
        }
      />
      <CardBody>
        <div style={{ padding: '28px 0', textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', color: 'var(--ink)', fontWeight: 700 }}>
            Под фильтр ничего не подошло
          </p>
          <p style={{ margin: '0 0 16px', color: 'var(--muted)' }}>
            Всего нарядов на неделе — 14, просроченных среди них нет.
          </p>
          <Button size="sm" variant="bordered">
            Сбросить фильтр
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export const NotFound: Story = { name: 'Ничего не найдено', render: () => <NotFoundBlock /> };

/**
 * Ошибка. Сказано, что случилось с данными, и дано действие «Повторить».
 * Остальная панель при этом работает — об этом тоже сказано.
 */
function FailedBlock() {
  return (
    <Card padding="none">
      <CardHeader title="Наряды на неделю" />
      <CardBody>
        <Alert
          tone="danger"
          title="Наряды не загрузились"
          action={<Button size="sm">Повторить</Button>}
        >
          База не ответила за десять секунд. Остальные разделы панели работают.
        </Alert>
      </CardBody>
      <CardFooter align="start">
        <span style={{ color: 'var(--muted)', fontSize: 'var(--fs-tiny)' }}>
          Последнее удачное обновление — 12 минут назад
        </span>
      </CardFooter>
    </Card>
  );
}

export const Failed: Story = { name: 'Ошибка', render: () => <FailedBlock /> };

/** Четыре состояния рядом: видно, что они не взаимозаменяемы. */
export const AllStates: Story = {
  name: 'Все четыре рядом',
  render: () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <LoadingBlock />
      <EmptyBlock />
      <NotFoundBlock />
      <FailedBlock />
    </div>
  ),
};
