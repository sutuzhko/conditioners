import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EMPTY_ACTIVITY_FILTER } from '@/entities/activity/model';

import { ActivityFilters } from './ActivityFilters';
import { activityFilterApplied, activityPeople } from './fixtures';

/**
 * Отбор журнала: человек, роль, раздел, сущность и период (issue #815).
 *
 * 🔴 Форма `GET` без единой строки своего JavaScript: условия уезжают в адрес
 * сами (ADR-105). Две истории — пустой отбор и набранный: во втором случае
 * появляется «Сбросить», и ряд обязан не поехать от этого вбок.
 */
const meta = {
  title: 'Админка/Журнал · Отбор',
  component: ActivityFilters,
  args: { filter: EMPTY_ACTIVITY_FILTER, people: activityPeople },
} satisfies Meta<typeof ActivityFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Раздел открыт без условий: показан весь журнал. */
export const Пусто: Story = {};

/**
 * Набранный отбор: что делала Ирина в первую неделю сентября. Поля открыты
 * заполненными — они читаются из адреса, а не из состояния компонента.
 */
export const Заполнен: Story = {
  args: { filter: activityFilterApplied },
};
