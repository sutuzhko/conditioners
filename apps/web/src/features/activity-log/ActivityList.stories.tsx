import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ActivityList } from './ActivityList';
import { activityJournal, activityJournalEmpty, activityJournalPaged } from './fixtures';

/**
 * Журнал событий: кто, когда, что сделал и над чем (ADR-345).
 *
 * 🔴 Действий над строкой у раздела нет намеренно: событие создаёт система и
 * не правится (см. комментарий в `ActivityList`). История это и показывает —
 * чтобы «список без кнопок» не читался как незаконченный экран.
 */
const meta = {
  title: 'Админка/Журнал событий',
  component: ActivityList,
  args: { journal: activityJournal },
} satisfies Meta<typeof ActivityList>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Обычный день, и в нём все три подписи автора.
 *
 * 🔴 Две нижние строки — разные состояния пустого автора, и словами они
 * различаются намеренно (ADR-345, решение о роде автора): «Система» — автора
 * не было по природе (кнопка в Telegram), «Учётная запись удалена» — человек
 * действовал, а учётки больше нет. Одно слово на оба случая соврало бы в
 * одном из них.
 */
export const Список: Story = {};

/**
 * Журнал, который уже листают. Разбивка появляется со второй страницы —
 * список без неё не открывается вовсе: событий тысячи в месяц (PRD).
 */
export const СРазбивкой: Story = {
  args: { journal: activityJournalPaged },
};

/**
 * Сразу после установки журнал пуст, и это не сбой: он заполняется сам первым
 * же изменением. Выхода из пустоты нет — отбор, который можно было бы
 * сбросить, приходит фазой 4.
 */
export const Пусто: Story = {
  args: { journal: activityJournalEmpty },
};
