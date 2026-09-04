import type { Metadata } from 'next';

import {
  STOCK_PATH,
  STOCK_TAB_TITLES,
  STOCK_TABS,
  StockFilters,
  StockJournal,
  StockTable,
  StockZones,
  lowFromParam,
  pageNumber,
  stockManagerContent as texts,
  stockTabFromParam,
  stockTabHref,
  type StockTab,
  type StockZonePerson,
} from '@/features/stock-manager';
import { isStockMoveKind } from '@/entities/stock/model';
import { staffTitle } from '@/entities/staff/model';
import { requireOwnerPage } from '@/server/guards';
import { list as listStaff } from '@/server/repo/admin-users';
import { movements, overview, zones as listZones } from '@/server/repo/stock';
import type { AdminSession } from '@/server/auth';

import { PanelTabLinks } from '../PanelTabLinks';
import { StockHeader } from './StockHeader';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

type StockParams = {
  tab?: string;
  q?: string;
  group?: string;
  low?: string;
  archived?: string;
  page?: string;
  kind?: string;
};

type PageProps = { searchParams: Promise<StockParams> };

/** Заголовок вкладки отвечает на вопрос «где я»: три вкладки — три ответа. */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { tab } = await searchParams;
  const selected = stockTabFromParam(tab);

  return {
    title:
      selected === STOCK_TABS[0] ? texts.title : `${STOCK_TAB_TITLES[selected]} · ${texts.title}`,
  };
}

/**
 * Склад — три вкладки одного адреса (issue #352, CRM.md §11).
 *
 * 🔴 Раздел владельца: остаток гаража — это ещё и закупочные привычки, и
 * открывать их всей команде владелец не обязан (ADR-134). Проверка стоит
 * здесь, до первого обращения к репозиторию (ADR-095), а не только во внешнем
 * layout: страж выше страницы успевает сменить адрес, но не остановить чтение.
 *
 * 🔴 Вкладка разбирается на сервере и решает, за чем идти в базу: остатки,
 * журнал и зоны — три разные выборки, и лишнюю из них раздел не делает
 * (issue #340). Мусор в параметре открывает остатки, а не роняет раздел (#341).
 *
 * 🔴 Шапка одна на все три вкладки и от вкладки не зависит — заголовок,
 * пояснение и единственное действие. Лента вкладок стоит на одной и той же
 * координате, и переключение не двигает её под курсором (ADR-241).
 *
 * Поиск, группа, вид списка и страница живут в адресе: отфильтрованные
 * остатки — ссылка, которую можно сохранить и прислать себе.
 *
 * Читаем `repo` напрямую, а не своим же запросом к `/api/admin/stock`: страница
 * и так серверная, лишний круг через сеть — лишний способ отказать.
 */
export default async function AdminStockPage({ searchParams }: PageProps) {
  const session = await requireOwnerPage();

  const params = await searchParams;
  const tab = stockTabFromParam(params.tab);

  return (
    <div className={styles.page}>
      <StockHeader />

      <PanelTabLinks
        active={tab}
        tabs={STOCK_TABS}
        titleOf={texts.tabTitle}
        label={texts.tabsLabel}
        hrefOf={(key) => stockTabHref(key)}
      />

      {tab === 'log' ? <JournalTab params={params} /> : null}
      {tab === 'zones' ? <ZonesTab session={session} /> : null}
      {tab === 'stock' ? <OverviewTab params={params} session={session} /> : null}
    </div>
  );
}

/** Остатки по зонам: таблица «позиции × зоны» и фильтры над ней. */
async function OverviewTab({
  params,
  session,
}: {
  readonly params: StockParams;
  readonly session: AdminSession;
}) {
  const filters = {
    query: params.q?.trim() ?? '',
    group: params.group?.trim() ?? '',
    low: lowFromParam(params.low),
    archived: lowFromParam(params.archived),
  };

  const found = await overview(
    { ...filters, page: pageNumber(params.page) },
    { role: session.role, userId: session.userId },
  );

  return (
    <>
      <StockFilters
        filters={filters}
        groups={found.groups}
        total={found.total}
        lowCount={found.lowCount}
      />

      <StockTable overview={found} filters={filters} />
    </>
  );
}

/**
 * Журнал движений всего склада.
 *
 * 🔴 Свой вид, а не замена истории позиции (ADR-137): «что вообще происходило
 * на складе на этой неделе» спрашивают чаще, чем «что происходило с этой
 * трубой», и отвечать на это перебором позиций нельзя. История позиции при
 * этом остаётся в её карточке — это другой вопрос.
 */
async function JournalTab({ params }: { readonly params: StockParams }) {
  /* Вид приходит адресом, а адрес правят руками: неизвестное значение — это
     «покажи всё», а не пустой журнал с необъяснимым фильтром. */
  const kind = params.kind !== undefined && isStockMoveKind(params.kind) ? params.kind : undefined;
  const journal = await movements({ page: pageNumber(params.page), kind });

  return (
    <>
      <p className={styles.lead}>{texts.journalAllLead}</p>
      <p className={styles.meta}>{texts.journalCount(journal.total)}</p>

      <StockJournal
        journal={journal}
        basePath={STOCK_PATH}
        baseQuery={{ tab: 'log' satisfies StockTab }}
        withItem
        withFilter
        emptyText={texts.journalAllEmpty}
        {...(kind === undefined ? {} : { kind })}
      />
    </>
  );
}

/**
 * Зоны хранения: гараж и машины монтажников.
 *
 * 🔴 Ни одного названия зоны страница не предлагает: свой гараж владелец
 * называет сам (инвариант 8).
 */
async function ZonesTab({ session }: { readonly session: AdminSession }) {
  const [zones, staff] = await Promise.all([
    /* Вместе с архивными: вкладка зон — единственное место, откуда зону
       возвращают из архива, и не показать её здесь значит потерять насовсем. */
    listZones({ role: session.role, userId: session.userId }, { archived: true }),
    listStaff(),
  ]);

  /* Машину закрепляют за человеком, а не за должностью: список — все, кто
     заходит в панель, включая самого владельца, если ездит он. */
  const people: readonly StockZonePerson[] = staff
    .filter((person) => person.active)
    .map((person) => ({ id: person.id, name: staffTitle(person) }));

  return <StockZones zones={zones} people={people} />;
}
