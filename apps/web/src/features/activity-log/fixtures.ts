/** Данные для историй журнала событий. */
import type { ActivityEventView, ActivityPage } from './model';

/* 🔴 Ни одного имени клиента и ни одного телефона: их нет и в самом событии
   (инвариант 12). Имена в фикстурах — сотрудники панели, они же авторы. */
export const activityEvents: readonly ActivityEventView[] = [
  {
    id: 'a1',
    actor: { id: 'u1', name: 'Богдан' },
    actorKind: 'user',
    action: 'review.unpublish',
    entity: 'review',
    entityId: 'r5',
    createdAt: '2026-09-08T06:12:00.000Z',
  },
  {
    id: 'a2',
    actor: { id: 'u2', name: 'Ирина' },
    actorKind: 'user',
    action: 'review.publish',
    entity: 'review',
    entityId: 'r4',
    createdAt: '2026-09-07T14:41:00.000Z',
  },
  {
    id: 'a3',
    actor: { id: 'u2', name: 'Ирина' },
    actorKind: 'user',
    action: 'review.reject',
    entity: 'review',
    entityId: 'r3',
    createdAt: '2026-09-07T14:38:00.000Z',
  },
  /* Автора нет по природе: отклонили кнопкой в Telegram — там нажимает
     телеграм-аккаунт, а не учётная запись панели. Колонка «Кто» — «Система». */
  {
    id: 'a4',
    actor: null,
    actorKind: 'system',
    action: 'review.archive',
    entity: 'review',
    entityId: 'r2',
    createdAt: '2026-09-06T20:03:00.000Z',
  },
  /* 🔴 Второе состояние пустого автора: человек действовал, а учётную запись
     потом удалили — `SetNull` обнулил ссылку, событие осталось. Колонка «Кто» —
     «Учётная запись удалена», и это не то же самое, что строка выше. */
  {
    id: 'a5',
    actor: null,
    actorKind: 'user',
    action: 'review.publish',
    entity: 'review',
    entityId: 'r1',
    createdAt: '2026-09-06T11:27:00.000Z',
  },
];

export const activityJournal: ActivityPage = {
  items: activityEvents,
  total: activityEvents.length,
  page: 1,
  pages: 1,
};

/** Журнал, который уже листают: разбивка появляется со второй страницы. */
export const activityJournalPaged: ActivityPage = {
  items: activityEvents,
  total: 37,
  page: 2,
  pages: 5,
};

export const activityJournalEmpty: ActivityPage = {
  items: [],
  total: 0,
  page: 1,
  pages: 1,
};
