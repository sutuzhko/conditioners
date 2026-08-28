import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { LeadCardView } from './LeadCardView';
import {
  acceptingToClient,
  acceptingToOrder,
  acceptingUpdate,
  bareLead,
  clientLead,
  contextLead,
  failingToOrder,
  failingUpdate,
  linkingToClient,
  modelLead,
  newLead,
  workedLead,
} from './fixtures';

const meta = {
  title: 'Админка/Заявка',
  component: LeadCardView,
  args: {
    lead: newLead,
    update: acceptingUpdate,
    toClient: acceptingToClient,
    toOrder: acceptingToOrder,
  },
} satisfies Meta<typeof LeadCardView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Новая: Story = {};

/**
 * Заявка со следом: расчёт калькулятора, подбор по площади и отмеченные
 * модели — то, ради чего заводился `Lead.context`.
 */
export const СКонтекстом: Story = {
  args: { lead: contextLead },
};

/**
 * Заявка от кнопки у модели: строка «Модель в заявке» — то, что человек видел в
 * поле и подтвердил, а «Заказ с карточки модели» ниже — снимок того, откуда он
 * пришёл. Названия совпадают, подписи — нет (ADR-129).
 */
export const СМоделью: Story = {
  args: { lead: modelLead },
};

/** Только обязательные поля: пустые не показываются вовсе. */
export const БезПодробностей: Story = {
  args: { lead: bareLead },
};

export const ВРаботе: Story = {
  args: { lead: workedLead },
};

export const ОтказСервера: Story = {
  args: { update: failingUpdate },
};

/** Обращение уже в базе клиентов: вместо кнопки — переход в его карточку. */
export const УжеВБазе: Story = {
  args: { lead: clientLead },
};

/** Номер узнан: второй карточки на человека не заводится. */
export const ПовторноеОбращение: Story = {
  args: { toClient: linkingToClient },
};

/** Заказ по обращению завести не удалось: телефона в заявке нет. */
export const ЗаказНеЗавёлся: Story = {
  args: { toOrder: failingToOrder },
};
