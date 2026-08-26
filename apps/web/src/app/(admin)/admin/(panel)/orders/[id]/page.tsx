import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  OrderInstallerView,
  orderDraftOf,
  orderManagerContent as texts,
} from '@/features/order-manager';
import { requirePage } from '@/server/guards';
import { listInstallers } from '@/server/repo/admin-users';
import { listAll } from '@/server/repo/clients';
import { findById } from '@/server/repo/orders';

import { OrderEditor } from '../OrderEditor';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await requirePage();
  const order = await findById(id, { role: session.role, userId: session.userId });

  return { title: order === null ? texts.cardTitle : texts.number(order.number) };
}

/**
 * Карточка наряда.
 *
 * 🔴 Роль решает не только оформление, но и данные: `findById` получает
 * смотрящего и отдаёт монтажнику только его наряд — без заметки владельца и
 * удержания (ADR-114). Чужой наряд приходит как `null` и становится 404:
 * отказ подтвердил бы, что наряд существует.
 */
export default async function AdminOrderPage({ params }: PageProps) {
  const session = await requirePage();
  const { id } = await params;

  const order = await findById(id, { role: session.role, userId: session.userId });
  if (order === null) notFound();

  if (session.role !== 'owner') {
    return (
      <div className={styles.page}>
        <Link className={styles.back} href={{ pathname: '/admin/orders' }}>
          {texts.back}
        </Link>

        <OrderInstallerView order={order} />
      </div>
    );
  }

  /* Списки нужны только владельцу: монтажник наряд не переназначает. */
  const [clients, installers] = await Promise.all([listAll(), listInstallers(true)]);

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: '/admin/orders' }}>
        {texts.back}
      </Link>

      {/* Подпись у шапки не дублируется: ту же мысль форма говорит своей
          подсказкой, а два одинаковых предложения подряд читаются как сбой. */}
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.number(order.number)}</h1>
      </header>

      <OrderEditor
        orderId={order.id}
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
        title={texts.cardTitle}
        hint={texts.cardHint}
        removable
      />
    </div>
  );
}
