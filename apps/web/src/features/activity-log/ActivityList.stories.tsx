import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { EMPTY_ACTIVITY_FILTER } from '@/entities/activity/model';
import { Button, Card, ErrorState } from '@/shared/ui';

import { ActivityList } from './ActivityList';
import { activityLogContent as texts } from './content';
import {
  activityFilterApplied,
  activityJournal,
  activityJournalEmpty,
  activityJournalPaged,
} from './fixtures';

/**
 * Журнал событий: кто, когда, что сделал и над чем (ADR-345).
 *
 * 🔴 Действий над строкой у раздела нет намеренно: событие создаёт система и
 * не правится (см. комментарий в `ActivityList`). История это и показывает —
 * чтобы «список без кнопок» не читался как незаконченный экран.
 *
 * Четыре состояния блока стоят рядом не для красоты (issue #818, макет
 * `States`): пустой журнал и пустой результат отбора выглядят одинаково
 * пустыми, а шаги у них противоположные — в первом случае ждать, во втором
 * снять условия.
 */
const meta = {
  title: 'Админка/Журнал событий',
  component: ActivityList,
  args: { journal: activityJournal, filter: EMPTY_ACTIVITY_FILTER },
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
 *
 * У нижней строки стоит пометка человека — единственное правимое поле записи
 * (issue #820). Она под действием, а не своей колонкой: бывает у одной строки
 * из сотни, и пустая колонка ради неё съела бы ширину у нужных всегда.
 */
export const Список: Story = {};

/**
 * Журнал, который уже листают. Разбивка появляется со второй страницы —
 * список без неё не открывается вовсе: событий тысячи в месяц (PRD, #816).
 */
export const СРазбивкой: Story = {
  args: { journal: activityJournalPaged },
};

/**
 * Сразу после установки журнал пуст, и это не сбой: он заполняется сам первым
 * же изменением. Выхода из пустоты здесь нет — ждать нечего, кроме первого
 * изменения в панели.
 */
export const Пусто: Story = {
  args: { journal: activityJournalEmpty },
};

/**
 * 🔴 Тот же пустой список, но по другой причине — и потому другой текст
 * (issue #335, #818). Записи есть, их скрыл отбор, и следующий шаг здесь
 * противоположный: снять условия, а не ждать.
 */
export const ОтборБезРезультата: Story = {
  args: { journal: activityJournalEmpty, filter: activityFilterApplied },
};

/**
 * Журнал не загрузился.
 *
 * 🔴 Собран композицией кита, а не настоящим `DataBlock`: слой `features` не
 * имеет права импортировать из `widgets` (правило зависимостей), а показать
 * четвёртое состояние блока рядом с тремя остальными нужно — иначе его никто
 * не увидит, кроме как уронив базу. Разметка та же, что рисует граница
 * ошибки: значок, заголовок, объяснение и две кнопки.
 */
export const Ошибка: Story = {
  render: () => (
    <Card as="section">
      <ErrorState
        title={texts.loadFailed}
        actions={
          <>
            <Button type="button" size="sm">
              Повторить
            </Button>
            <Button type="button" size="sm" variant="light">
              Обновить страницу
            </Button>
          </>
        }
      >
        События записаны в базу и никуда не делись — не пришёл ответ на запрос.
      </ErrorState>
    </Card>
  ),
};
