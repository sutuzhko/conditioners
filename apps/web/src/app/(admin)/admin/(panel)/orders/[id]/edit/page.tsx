import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ORDERS_PATH, orderDraftOf, orderManagerContent as texts } from '@/features/order-manager';
import { requireOwnerPage } from '@/server/guards';
import { listInstallers } from '@/server/repo/admin-users';
import { listAll } from '@/server/repo/clients';
import { findById } from '@/server/repo/orders';
import { dayKeyOf } from '@/shared/lib/calendar';
import { DataBlock, FieldsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

import { loadBlocks, loadWork } from '../../blocks';
import { OrderEditor } from '../../OrderEditor';
import styles from '../../page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  /* 🔴 Для чужого база не читается вовсе: `forbidden()` в метаданных не
     спасает — Next успевает вычислить их до того, как отказ доходит до
     ответа, и номер наряда уезжает в тело 403 (тот же приём, что в карточке
     клиента, issue #524). */
  const session = await requireOwnerPage();
  const { id } = await params;
  const order = await findById(id, { role: session.role, userId: session.userId });

  return { title: order === null ? texts.editTitle : texts.number(order.number) };
}

/**
 * Правка наряда — свой адрес, а не форма поверх карточки (issue #598).
 *
 * 🔴 Карточка наряда перестала быть формой. Прежде весь наряд лежал полями
 * правки на всю её высоту: 5156px на 390 у наряда в работе — тринадцать
 * экранов, чтобы посмотреть адрес. Смотрят наряд многократно, правят редко, и
 * род экрана следует частому действию (ADR-307): чтение осталось в карточке,
 * правка уехала сюда и зовётся кнопкой из её шапки.
 *
 * 🔴 Окном правка не открывается, и это решение прежней смены, которое здесь
 * остаётся в силе: в карточке живут расход, чеклист, документы и фотографии,
 * и прокрутка внутри прокрутки ей не подходит (ADR-117, `orders/new/page`).
 * Свой адрес заодно и ссылается: правку наряда можно прислать ссылкой.
 *
 * 🔴 Раздел владельца, и роль проверяется здесь, до первого обращения к
 * репозиторию (ADR-095): страж выше страницы успевает сменить адрес, но не
 * остановить чтение, и телефоны клиентов с суммами уехали бы монтажнику в
 * теле ответа. Наряды он не правит вовсе.
 *
 * 🔴 Существование наряда решается до первого куска потока (issue #651):
 * иначе заготовка уходит в ответ первой и `notFound()` застаёт статус уже
 * отправленным. Списки клиентов, монтажников и занятость приезжают следом.
 */
export default async function AdminOrderEditPage({ params }: PageProps) {
  const session = await requireOwnerPage();
  const { id } = await params;

  const order = await findById(id, { role: session.role, userId: session.userId });
  if (order === null) notFound();

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: `/admin/orders/${id}` }}>
        {texts.editBack}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{texts.number(order.number)}</h1>
        <p className={styles.lead}>{texts.editHint}</p>
      </header>

      <DataBlock
        skeleton={<FieldsSkeleton fields={7} />}
        title={texts.cardLoadFailed}
        note={blockErrorNote(ORDERS_PATH)}
      >
        <EditForm orderId={order.id} order={order} session={session} />
      </DataBlock>
    </div>
  );
}

/** Списки под форму — то, что приезжает отдельным куском потока. */
async function EditForm({
  orderId,
  order,
  session,
}: {
  readonly orderId: string;
  readonly order: NonNullable<Awaited<ReturnType<typeof findById>>>;
  readonly session: Awaited<ReturnType<typeof requireOwnerPage>>;
}) {
  const day = dayKeyOf(new Date(order.at));

  const [clients, installers, blocks, work] = await Promise.all([
    listAll(),
    listInstallers(true),
    loadBlocks(session, day),
    loadWork(session, day, orderId),
  ]);

  return (
    <OrderEditor
      orderId={orderId}
      orderNumber={order.number}
      initial={orderDraftOf(order)}
      clients={clients.map((client) => ({
        id: client.id,
        name: client.name,
        phone: client.phone,
      }))}
      installers={installers.map((staff) => ({
        id: staff.id,
        name: staff.name,
        login: staff.login,
        employment: staff.employment,
      }))}
      blocks={blocks}
      work={work}
      title={texts.cardTitle}
      hint={texts.cardHint}
      removable
    />
  );
}
