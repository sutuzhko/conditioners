import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderChecklist } from './OrderChecklist';
import { OrderDocs } from './OrderDocs';
import { OrderPhotos } from './OrderPhotos';
import { OrderResultForm } from './OrderResultForm';
import { OrderWorkTabs } from './OrderWorkTabs';
import { acceptingWorkApi, checklist, docs, orderDetails, photos } from './fixtures';

const api = acceptingWorkApi;

const meta = {
  title: 'Админка/Заказы/Работа с нарядом',
  component: OrderWorkTabs,
  args: {
    active: 'job',
    job: (
      <OrderResultForm
        api={api}
        extraWork={orderDetails.extraWork}
        report={orderDetails.report}
        resultAt={orderDetails.resultAt}
      />
    ),
    checklist: <OrderChecklist api={api} items={checklist} />,
    documents: (
      <>
        <OrderDocs api={api} docs={docs} editable confirmRemove={async () => true} />
        <OrderPhotos api={api} photos={photos} confirmRemove={async () => true} />
      </>
    ),
  },
} satisfies Meta<typeof OrderWorkTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Три вкладки из разбора прототипа (CRM.md §3.3). Открыт наряд. */
export const Базовое: Story = {};

/**
 * Карточку открыли по ссылке на чеклист: `?tab=checklist` приходит с сервера
 * уже открытым, без мигания первой вкладкой (issue #340).
 */
export const ПоСсылкеНаЧеклист: Story = { args: { active: 'checklist' } };

/**
 * 🔴 Глазами монтажника: документы на чтение, место установки без загрузки.
 * Панель «Наряд» здесь — его отчёт о выезде.
 */
export const ГлазамиМонтажника: Story = {
  args: {
    job: <OrderResultForm api={api} extraWork={null} report={null} resultAt={null} />,
    documents: (
      <>
        <OrderDocs api={api} docs={docs} />
        <OrderPhotos api={api} photos={photos} forInstaller confirmRemove={async () => true} />
      </>
    ),
  },
};

/** Наряд только завели: чеклист пуст, бумаг и снимков нет. */
export const Пусто: Story = {
  args: {
    checklist: <OrderChecklist api={api} items={[]} />,
    documents: (
      <>
        <OrderDocs api={api} docs={[]} editable />
        <OrderPhotos api={api} photos={[]} />
      </>
    ),
  },
};
