import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderChecklist } from './OrderChecklist';
import { OrderConsumption } from './OrderConsumption';
import { OrderDocs } from './OrderDocs';
import { OrderHistory } from './OrderHistory';
import { OrderPhotos } from './OrderPhotos';
import { OrderResultForm } from './OrderResultForm';
import { OrderWorkTabs } from './OrderWorkTabs';
import {
  acceptingConsumptionApi,
  acceptingWorkApi,
  checklist,
  docs,
  emptyConsumptionApi,
  orderDetails,
  photos,
  stockChecklist,
} from './fixtures';

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
    materials: (
      <OrderConsumption
        orderId={orderDetails.id}
        api={acceptingConsumptionApi}
        checklist={stockChecklist}
        /* Подтверждение выведено пропом: история не открывает окно (ADR-113). */
        confirmReturn={async () => true}
      />
    ),
    checklist: <OrderChecklist api={api} items={checklist} />,
    documents: (
      <>
        <OrderDocs api={api} docs={docs} editable confirmRemove={async () => true} />
        <OrderPhotos api={api} photos={photos} confirmRemove={async () => true} />
      </>
    ),
    history: <OrderHistory entries={orderDetails.history ?? []} />,
  },
} satisfies Meta<typeof OrderWorkTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Пять вкладок словаря (CRM.md §3.3, issue #346). Открыт наряд. */
export const Базовое: Story = {};

/** Расход материалов: что списали с машины на этот выезд. */
export const Расход: Story = { args: { active: 'materials' } };

/** История наряда — вкладка владельца: кто и когда менял статус. */
export const История: Story = { args: { active: 'history' } };

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
    /* 🔴 Истории у монтажника нет вовсе: вкладок остаётся четыре (ADR-114). */
    history: undefined,
  },
};

/** Наряд только завели: чеклист пуст, бумаг и снимков нет. */
export const Пусто: Story = {
  args: {
    materials: (
      <OrderConsumption
        orderId={orderDetails.id}
        api={emptyConsumptionApi}
        checklist={[]}
        confirmReturn={async () => true}
      />
    ),
    checklist: <OrderChecklist api={api} items={[]} />,
    documents: (
      <>
        <OrderDocs api={api} docs={[]} editable />
        <OrderPhotos api={api} photos={[]} />
      </>
    ),
    history: <OrderHistory entries={[]} />,
  },
};
