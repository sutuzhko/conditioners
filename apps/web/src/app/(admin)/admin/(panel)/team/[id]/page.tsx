import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  InstallerNotes,
  STAFF_CARD_TABS,
  STAFF_TAB_TITLES,
  StaffAccountForm,
  StaffDangerZone,
  StaffOrders,
  StaffPayouts,
  staffCardTabFromParam,
  staffManagerContent as texts,
  staffTitle,
  type StaffOrder,
} from '@/features/staff-manager';
import { getAdminSession, isOwner } from '@/server/auth';
import { requireOwnerPage } from '@/server/guards';
import { findById, findDetails, listNotes } from '@/server/repo/admin-users';
import { installerTotals, listByInstaller } from '@/server/repo/orders';

import { PanelTabs } from '../../PanelTabs';
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
 */
export default async function AdminTeamMemberPage({ params, searchParams }: PageProps) {
  const session = await requireOwnerPage();

  const { id } = await params;
  const { tab } = await searchParams;
  const active = staffCardTabFromParam(tab);

  const viewer = { role: session.role, userId: session.userId };

  /* Карточка с ИНН: реквизит правит владелец, и раздел закрыт `requireOwnerPage`
     выше по коду. Заголовку вкладки достаточно `findById` — там ИНН незачем. */
  const [staff, notes, orders, totals] = await Promise.all([
    findDetails(id),
    listNotes(id),
    listByInstaller(id, viewer),
    installerTotals(id),
  ]);
  if (staff === null) notFound();

  /* 🔴 Через границу сервер→клиент уезжает проекция, а не карточка наряда
     целиком: заметка владельца по наряду в карточке человека не показывается,
     значит и в браузер ей незачем. */
  const works: readonly StaffOrder[] = orders.items.map((order) => ({
    id: order.id,
    number: order.number,
    type: order.type,
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

      <PanelTabs
        active={active}
        tabs={STAFF_CARD_TABS}
        titles={STAFF_TAB_TITLES}
        label={texts.tabsLabel}
        idPrefix="staff"
        panels={{
          account: (
            <>
              <StaffAccountForm staff={staff} />

              {/* 🔴 Опасная зона всегда последняя: до неё доскроллят осознанно.
                  Удаление закрыто, пока за человеком закреплены наряды —
                  иначе наряд остался бы без исполнителя. */}
              <StaffDangerZone staff={staff} orders={orders.total} />
            </>
          ),
          orders: <StaffOrders orders={{ items: works, total: orders.total }} allHref={allHref} />,
          payouts: <StaffPayouts totals={totals} orders={works} />,
          notes: <InstallerNotes staffId={staff.id} notes={notes} />,
        }}
      />
    </div>
  );
}
