import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderHandover } from './OrderHandover';
import {
  acceptingApi,
  acceptingWorkApi,
  failingApi,
  failingWorkApi,
  installerCompanyOrder,
  installerDetails,
  pendingWorkApi,
} from './fixtures';
import type { OrderDetails } from './model';

/** Наряд в работе: только такой и сдают. */
const working = { ...installerDetails, status: 'in_progress' as const };

/**
 * 🔴 Тот же наряд, но платит компания: `price` не приходит вовсе, а не
 * приходит пустым. Поэтому наряд собирается из карточки без суммы, а не
 * затирается ключом `undefined` (docs/API.md §13).
 */
const company: OrderDetails = {
  ...installerCompanyOrder,
  status: 'in_progress',
  checklist: working.checklist,
  docs: working.docs,
  photos: working.photos,
};

/** Снимков «после» ещё нет — сдать нельзя, и экран называет остаток. */
const withoutPhotos = {
  ...working,
  photos: working.photos.filter((photo) => photo.stage === 'before'),
};

const meta = {
  title: 'Админка/Заказы/Сдача работы',
  component: OrderHandover,
  args: { order: working, api: acceptingWorkApi, statusApi: acceptingApi },
  /* 🔴 Снимки отдаются по сессии (ADR-171): в витрине их некому отдать, и
     миниатюры остаются пустыми рамками. Правило про загруженные картинки для
     этих историй снимается — проверять здесь нечего. */
  parameters: {
    invariants: {
      allow: [
        {
          rule: 'images',
          reason:
            'фото из тома загрузок сервера (/api/admin/orders/…/file): в статической витрине его нет (ADR-207)',
        },
      ],
    },
  },
} satisfies Meta<typeof OrderHandover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Всё на месте: два снимка, отчёт можно писать и сдавать. */
export const Базовое: Story = {};

/** 🔴 Не хватает снимков: кнопка отключена, и причина названа числом. */
export const НетФото: Story = {
  args: { order: withoutPhotos },
};

/** Итог уже написан: разбор показывает трассу и короб из того же текста. */
export const СИтогом: Story = {
  args: {
    order: {
      ...working,
      extraWork: 'Доп. трасса 1,5 м, короб 60×60 — 2 м',
      report: 'Блок повешен, вакуумирование 20 минут, проверен на охлаждение.',
    },
  },
};

/** Платит компания: суммы монтажнику не приходит вовсе. */
export const ПлатитКомпания: Story = {
  args: { order: company },
};

/** Наряд ещё не взят в работу: сдавать нечего, и это сказано словами. */
export const НеВРаботе: Story = {
  args: { order: { ...working, status: 'assigned' } },
};

/** Наряд уже сдан: повторно его не закрывают, но итог правится черновиком. */
export const Сдан: Story = {
  args: { order: { ...working, status: 'done' } },
};

/** Запрос ушёл и не вернулся. */
export const Отправка: Story = {
  args: { api: pendingWorkApi },
};

/** Сервер отказал: отчёт остаётся на экране, повтор его не теряет. */
export const ОшибкаСервера: Story = {
  args: { api: failingWorkApi, statusApi: failingApi },
};
