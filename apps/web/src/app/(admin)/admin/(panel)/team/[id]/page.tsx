import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { ReactNode } from 'react';

import {
  InstallerNotes,
  STAFF_CARD_TABS,
  TEAM_PATH,
  STAFF_TAB_TITLES,
  StaffAccountForm,
  StaffDangerZone,
  StaffOrders,
  StaffPayouts,
  StaffPermissions,
  staffCardTabFromParam,
  staffManagerContent as texts,
  staffTitle,
  type StaffCardTab,
  type StaffOrder,
} from '@/features/staff-manager';
import { getAdminSession, isOwner } from '@/server/auth';
import { requireOwnerPage } from '@/server/guards';
import { findById, findDetails, listNotes } from '@/server/repo/admin-users';
import { installerTotals, listByInstaller, type Viewer } from '@/server/repo/orders';
import { TabLinks, TabPanels } from '@/shared/ui';
import { DataBlock, FieldsSkeleton, RowsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  /** Вкладка карточки живёт в адресе (issue #339, #351). */
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: Pick<PageProps, 'params'>): Promise<Metadata> {
  /* 🔴 Для чужого база не читается вовсе — и рубеж здесь не бросает отказ, а
     возвращает общий заголовок. `forbidden()` в метаданных не спасает: Next
     успевает вычислить их до того, как отказ доходит до ответа, и имя
     человека уезжает в тело 403 (issue #524). Не прочитанное не утечёт ни при
     каком порядке потока. */
  const session = await getAdminSession();
  if (session === null || !isOwner(session)) return { title: texts.title };

  const { id } = await params;
  const staff = await findById(id);

  return { title: staff === null ? texts.title : staffTitle(staff) };
}

/**
 * Карточка монтажника — четыре вкладки (issue #351, CRM.md §3.6): аккаунт,
 * заказы, выплаты с удержаниями и заметки владельца.
 *
 * 🔴 Две последние монтажник не видит, и закрыты они ролью на сервере, а не
 * скрытой вкладкой: скрытая кнопка — подсказка интерфейса, а не защита
 * (CRM.md §6). Раздел владельческий целиком — `requireOwnerPage` отвечает
 * монтажнику отказом 403 ещё до чтения данных (ADR-095, issue #353).
 *
 * 🔴 «Удержание», а не «штраф»: штрафов как вида взыскания в ТК РФ нет
 * (ADR-114). Ни одна подпись раздела этого слова не произносит.
 *
 * Вкладка разбирается здесь, на сервере: карточка приходит открытой на той,
 * что стоит в адресе (issue #340), мусор открывает первую (#341).
 *
 * 🔴 Существование человека решается **до** первого куска потока (issue
 * #651). Пока заготовка стояла на границе раздела, она уходила в ответ
 * первой, и `notFound()` заставал статус уже отправленным: карточка
 * удалённого монтажника отвечала 200. Здесь до первого байта успевает пройти
 * только чтение самой карточки — по ней же собирается шапка, — а наряды,
 * выплаты и заметки приезжают следом.
 */
export default async function AdminTeamMemberPage({ params, searchParams }: PageProps) {
  const session = await requireOwnerPage();

  const { id } = await params;
  const { tab } = await searchParams;
  const active = staffCardTabFromParam(tab);

  const viewer = { role: session.role, userId: session.userId };
  /* 🔴 Экран прав видит только владелец (issue #787). Карточку сотрудника
     правит и администратор, которому владелец выдал «Управление людьми», —
     а раздачу прав ему не открывает ни один переключатель (ADR-344). Здесь
     это удобство: сервер отказывает и без скрытого экрана. */
  const grantsAccess = isOwner(session);

  /* Карточка с ИНН: реквизит правит владелец, и раздел закрыт `requireOwnerPage`
     выше по коду. Заголовку вкладки достаточно `findById` — там ИНН незачем. */
  const staff = await findDetails(id);
  if (staff === null) notFound();

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: '/admin/team' }}>
        {texts.back}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{staffTitle(staff)}</h1>
        <p className={styles.meta}>
          <span className={styles.login}>@{staff.login}</span>
          <span>{texts.since(staff.createdAt)}</span>
          <span>{texts.lastLogin(staff.lastLoginAt)}</span>
        </p>
      </header>

      {/* 🔴 Лента вкладок приезжает вместе с содержимым: у подписей стоят
          счётчики, и лента без чисел, дорисованная потом, дёргала бы ширину
          вкладок под курсором. Заготовка держит и ленту, и форму аккаунта —
          шесть полей: имя, логин, телефон, пароль, ИНН, оформление
          (ADR-239). */}
      <DataBlock
        surface="bare"
        skeleton={
          <>
            <TabLinks
              items={STAFF_CARD_TABS.map((tab) => ({ key: tab, title: STAFF_TAB_TITLES[tab] }))}
              label={texts.tabsLabel}
              busy
            />
            <FieldsSkeleton fields={6} />
            <RowsSkeleton rows={2} height="72px" />
          </>
        }
        title={texts.cardLoadFailed}
        note={blockErrorNote(TEAM_PATH)}
      >
        <StaffCard staff={staff} active={active} viewer={viewer} grantsAccess={grantsAccess} />
      </DataBlock>
    </div>
  );
}

/**
 * Вкладки карточки — то, что приезжает отдельным куском потока.
 *
 * Данные всех четырёх вкладок читаются одним заходом и переключаются без
 * похода в сеть: вкладка — это состояние экрана, а не новая страница.
 */
async function StaffCard({
  staff,
  active,
  viewer,
  grantsAccess,
}: {
  readonly staff: NonNullable<Awaited<ReturnType<typeof findDetails>>>;
  readonly active: ReturnType<typeof staffCardTabFromParam>;
  readonly viewer: Viewer;
  /** Владелец ли смотрит: экран прав есть только у него (issue #787). */
  readonly grantsAccess: boolean;
}) {
  const [notes, orders, totals] = await Promise.all([
    listNotes(staff.id),
    listByInstaller(staff.id, viewer),
    installerTotals(staff.id),
  ]);

  /* 🔴 Через границу сервер→клиент уезжает проекция, а не карточка наряда
     целиком: заметка владельца по наряду в карточке человека не показывается,
     значит и в браузер ей незачем. */
  const works: readonly StaffOrder[] = orders.items.map((order) => ({
    id: order.id,
    number: order.number,
    workType: order.workType.title,
    status: order.status,
    at: order.at,
    address: order.address,
    clientName: order.client.name,
    fee: order.installerFee,
    deduction: order.deductionSum ?? 0,
    deductionReason: order.deductionReason ?? null,
  }));

  const allHref = {
    pathname: '/admin/orders',
    query: { q: staff.name ?? staff.login, tab: 'all' },
  };

  const counts: Partial<Readonly<Record<StaffCardTab, number>>> = {
    orders: orders.total,
    notes: notes.length,
  };

  const panels: Readonly<Record<StaffCardTab, ReactNode>> = {
    account: (
      <>
        <StaffAccountForm staff={staff} />

        {/* Права — только у администратора и только владельцу: у остальных
            ролей доступ задан ролью целиком, и переключатели у них означали бы
            настройку, которая ни на что не влияет (ADR-344). */}
        {grantsAccess && staff.role === 'admin' ? <StaffPermissions staff={staff} /> : null}

        {/* 🔴 Опасная зона всегда последняя: до неё доскроллят осознанно.
            Удаление закрыто, пока за человеком закреплены наряды — иначе
            наряд остался бы без исполнителя. */}
        <StaffDangerZone staff={staff} orders={orders.total} />
      </>
    ),
    orders: <StaffOrders orders={{ items: works, total: orders.total }} allHref={allHref} />,
    payouts: <StaffPayouts totals={totals} orders={works} />,
    notes: <InstallerNotes staffId={staff.id} notes={notes} />,
  };

  /* Счётчики у подписей (issue #602, #585, макет `CardTabs.png`): по ним
     видно, есть ли за вкладкой что-нибудь, до того как на неё нажали. Порядок
     вкладок задаёт словарь `PANEL_TABS`, а не этот список (ADR-302). */
  return (
    <TabPanels
      items={STAFF_CARD_TABS.map((tab) => {
        const title = STAFF_TAB_TITLES[tab];
        const count = counts[tab];
        const panel = panels[tab];

        if (count === undefined) return { key: tab, title, panel };

        return { key: tab, title, panel, count, countLabel: texts.tabCount(tab, count) };
      })}
      active={active}
      label={texts.tabsLabel}
      idPrefix="staff"
    />
  );
}
