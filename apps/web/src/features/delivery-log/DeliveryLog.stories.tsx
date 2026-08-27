import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { DeliveryLog } from './DeliveryLog';
import {
  acceptingRetry,
  entries,
  failingRetry,
  noAddressFailure,
  ownerFailure,
  retryingFailure,
  summary,
} from './fixtures';

const meta = {
  title: 'Админка/Журнал доставки',
  component: DeliveryLog,
  args: { summary, failures: [ownerFailure], entries, api: acceptingRetry },
} satisfies Meta<typeof DeliveryLog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Обычный: Story = {};

/** Работающий сайт: сбоев нет, наряды разошлись. */
export const БезСбоев: Story = {
  args: { failures: [] },
};

/** Уведомлений не было вовсе — так выглядит только что запущенный сайт. */
export const Пустой: Story = {
  args: { summary: [], failures: [], entries: [] },
};

/** Отказ и то, что ещё повторяется: кнопка есть только у первого. */
export const ОтказИПовтор: Story = {
  args: { failures: [ownerFailure, retryingFailure] },
};

/** 🔴 Наряд назначен человеку без единого адреса доставки. */
export const АдресаНет: Story = {
  args: { failures: [noAddressFailure] },
};

/** Сервер не принял повтор: причина остаётся на экране. */
export const ОтказСервера: Story = {
  args: { api: failingRetry },
};

/** Ни одного адресного сообщения: наряды пока никому не назначали. */
export const БезАдресныхСообщений: Story = {
  args: { entries: [] },
};
