import type { Metadata } from 'next';

import {
  activityFilterOf,
  activityParam,
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
 * 🔴 Блока два, и падают они порознь (issue #495, #581). Отбору нужен список
 * сотрудников, списку — сам журнал: это разные запросы к разным таблицам, и
 * ни один не имеет права унести с экрана всё остальное. До правки список
 * сотрудников читался прямо здесь, и его отказ забирал страницу целиком —
 * вместе с шапкой и с рядом отбора, то есть ровно то, ради чего поток и
 * делили.
 *
 * 🔴 Заготовка ряда отбора — сам ряд отбора с пустым списком людей, а не
 * полоса заданной высоты. Высота тогда совпадает по построению: полей
 * столько же, и переносятся они одинаково на каждой ширине. Число под полосу
 * пришлось бы выдумать — ряд из шести условий переносится по-разному, и
 * разошедшаяся заготовка это прыжок вёрстки в момент, когда данные приехали.
 * Набранные условия при этом видны уже в заготовке: они из адреса, а не из
 * базы. Тем же приёмом рисует ряд `loading.tsx`.
 */
export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<ActivitySearchParams>;
}) {
  await requireOwnerPage();

  const params = await searchParams;
  const filter = activityFilterOf(params);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <DataBlock
        skeleton={<ActivityFilters filter={filter} people={[]} />}
        title={texts.filtersLoadFailed}
        note={blockErrorNote(ACTIVITY_PATH)}
        surface="bare"
      >
        <FiltersBlock filter={filter} />
      </DataBlock>

      <DataBlock
        skeleton={<ActivitySkeleton />}
        title={texts.loadFailed}
        note={blockErrorNote(ACTIVITY_PATH)}
      >
        <ActivityBlock page={pageNumber(activityParam(params.page))} filter={filter} />
      </DataBlock>
    </div>
  );
}

/**
 * Ряд отбора — то, что приезжает своим куском потока.
 *
 * 🔴 Наружу отдаются только `id` и имя (`ActivityPersonView`). У карточки
 * сотрудника в базе лежат телефон и ИНН, а `Select` — клиентский компонент:
 * что положили в пропы, то и уехало в браузер (PROJECT §5.5).
 *
 * Уволенные из списка не вычёркиваются: их события в журнале остались, и
 * отобрать «что делал уволившийся в июле» — обычный вопрос к журналу.
 */
async function FiltersBlock({ filter }: { readonly filter: ActivityFilter }) {
  const staff = await listStaff();
  const people: readonly ActivityPersonView[] = staff.map((person) => ({
    id: person.id,
    name: staffTitle(person),
  }));

  return <ActivityFilters filter={filter} people={people} />;
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
