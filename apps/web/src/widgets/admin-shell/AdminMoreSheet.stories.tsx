import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { Drawer } from '@/shared/ui';

import { AdminMoreFooter, AdminMoreSheet } from './AdminMoreSheet';
import { adminShellContent as texts } from './content';

/**
 * Лист «Ещё» на телефоне: разделы сверх четырёх вкладок, настройки, профиль,
 * сайт, тема и выход (issue #659).
 *
 * 🔴 История заведена потому, что её не было. Лист живёт внутри шторки,
 * которую открывает состояние `AdminTabs`, — и без своей истории его не видели
 * ни снимки, ни инварианты, ни измерения. Дефект нашёл владелец на живом
 * стенде («сами настройки тоже странно выглядят»), а не проверка, и это ровно
 * та цена, которую берёт компонент без витрины.
 *
 * Показывается прямо в шторке, а не отдельным куском: поверхность, поле по
 * бокам и прижатый подвал с выходом — часть того, как лист выглядит, и лист
 * без них проверяет не то, что видит человек.
 */
const meta = {
  title: 'Админка/Лист «Ещё»',
  component: AdminMoreSheet,
  args: { role: 'owner', activeHref: undefined },
  /* Ширину задаёт сам обход: инварианты и измерения ходят по ширинам панели —
     390, 768, 1440, — и своя ширина у истории отняла бы у них телефон. */
  render: (args) => (
    <Drawer open onClose={() => {}} title={texts.moreTitle} footer={<AdminMoreFooter />}>
      <AdminMoreSheet {...args} />
    </Drawer>
  ),
} satisfies Meta<typeof AdminMoreSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Владелец: три группы — разделы, сайт, настройки и профиль. */
export const Владелец: Story = {};

/**
 * Открыт раздел из листа — «Склад». Подсвечен пункт, а не только вкладка
 * «Ещё»: иначе человек, вернувшийся в лист, не видит, где он находится.
 */
export const ОткрытыйРаздел: Story = {
  args: { activeHref: '/admin/stock' },
};

/**
 * 🔴 Монтажник: разделов сверх вкладок у него нет вовсе, и групп «Разделы» и
 * «Сайт» в листе не появляется. Заголовок над пустотой сообщал бы, что раздел
 * потерялся, — поэтому пустая группа не рисуется.
 */
export const Монтажник: Story = {
  args: { role: 'installer', activeHref: '/admin/profile' },
};
