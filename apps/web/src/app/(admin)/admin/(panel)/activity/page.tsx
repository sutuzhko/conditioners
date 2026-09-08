import type { Metadata } from 'next';

import {
  activityFilterOf,
  type ActivityFilter,
  type ActivitySearchParams,
} from '@/entities/activity/model';
import { staffTitle } from '@/entities/staff/model';
import {
  ACTIVITY_PATH,
  ActivityFilters,
  ActivityList,
  activityLogContent as texts,
  type ActivityPersonView,
} from '@/features/activity-log';
import { requireOwnerPage } from '@/server/guards';
import { list } from '@/server/repo/activity';
import { list as listStaff } from '@/server/repo/admin-users';
import { pageNumber } from '@/shared/lib/paging';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';

import { ActivitySkeleton } from './ActivitySkeleton';
import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

/* Журнал показывает то, что произошло секунду назад: кешировать нечего.
   `noindex` приходит от раскладки панели — он общий у всех её страниц. */
export const dynamic = 'force-dynamic';

/**
 * Журнал событий (ADR-345).
 *
 * 🔴 Страница отдаётся сервером уже со строками (инвариант 1): список читает
 * серверный компонент и передаёт вниз пропсами, листается и отбирается адресом
 * (ADR-105) — ни отбор, ни разбивка не стоят ни байта в бюджете.
 *
 * 🔴 Проверка доступа стоит до первого чтения данных (ADR-095). Пока ролей две,
 * журнал — раздел владельца; разрешения «Журнал» и «Чистка» для администратора
 * приходят с механизмом ADR-344 (issue #823).
 *
 * 🔴 В свой кусок потока уехал список, а ряд отбора — нет (issue #495, #581).
 * Упавший журнал не имеет права уносить с экрана набранные условия:
 * «Повторить» стоит на месте списка, а поля остаются заполненными.
 *
 * Список сотрудников для отбора «Кто» читается здесь же, до потока. Своей
 * заготовки ряд не получает, и это не упущение: на переходе его рисует
 * `loading.tsx` — тем же компонентом с пустым списком людей. Высота тогда
 * совпадает по построению, а не по числу, снятому на глаз: полей столько же,
 * и переносятся они одинаково. Сам запрос стоит одного чтения крошечной
 * таблицы и падает ровно тогда, когда падает и журнал.
 */
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<ActivitySearchParams>;
}) {
  await requireOwnerPage();

  const params = await searchParams;
  const filter = activityFilterOf(params);
  const people = await peopleOfPanel();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <ActivityFilters filter={filter} people={people} />

      <DataBlock
        skeleton={<ActivitySkeleton />}
        title={texts.loadFailed}
        note={blockErrorNote(ACTIVITY_PATH)}
      >
        <ActivityBlock page={pageNumber(params.page)} filter={filter} />
      </DataBlock>
    </div>
  );
}

/**
 * Кого предлагает отбор «Кто».
 *
 * 🔴 Наружу отдаются только `id` и имя (`ActivityPersonView`). У карточки
 * сотрудника в базе лежат телефон и ИНН, а `Select` — клиентский компонент:
 * что положили в пропы, то и уехало в браузер (PROJECT §5.5).
 *
 * Уволенные из списка не вычёркиваются: их события в журнале остались, и
 * отобрать «что делал уволившийся в июле» — обычный вопрос к журналу.
 */
async function peopleOfPanel(): Promise<readonly ActivityPersonView[]> {
  const staff = await listStaff();

  return staff.map((person) => ({ id: person.id, name: staffTitle(person) }));
}

/** Сам список — то, что приезжает отдельным куском потока. */
async function ActivityBlock({
  page,
  filter,
}: {
  readonly page: number;
  readonly filter: ActivityFilter;
}) {
  const journal = await list({ page, filter });

  return <ActivityList journal={journal} filter={filter} />;
}
