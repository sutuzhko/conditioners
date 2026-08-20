import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Table } from './Table';

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
