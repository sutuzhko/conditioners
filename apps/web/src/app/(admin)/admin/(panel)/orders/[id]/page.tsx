import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  OrderConsumption,
  OrderHistory,
  OrderInstallerView,
  orderDraftOf,
  orderManagerContent as texts,
} from '@/features/order-manager';
import { requirePage } from '@/server/guards';
import { listInstallers } from '@/server/repo/admin-users';
import { listAll } from '@/server/repo/clients';
import { findById } from '@/server/repo/orders';
import { dayKeyOf } from '@/shared/lib/calendar';

import { loadBlocks, loadWork } from '../blocks';
import { OrderEditor } from '../OrderEditor';
import { OrderWork } from './OrderWork';
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
 * смотрящего и отдаёт монтажнику только его наряд — без заметки владельца,
 * удержания и истории (ADR-114). Чужой наряд приходит как `null` и становится
 * 404: отказ подтвердил бы, что наряд существует.
 *
 * Работа с нарядом разложена по трём вкладкам (CRM.md §3.3): сам наряд с
 * итогом работ, чеклист выезда, документы и фотографии.
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

        {/* 🔴 История монтажнику не приходит вовсе — её нет и в разметке. */}
        <OrderWork order={order} forInstaller>
          <OrderInstallerView order={order} />
        </OrderWork>

        {/* Расход монтажнику открыт: он и списывает материал с объекта. Что
            видно в форме, решает сервер — ему придёт только своя машина. */}
        <OrderConsumption orderId={order.id} checklist={order.checklist} />
      </div>
    );
  }

  /* Списки нужны только владельцу: монтажник наряд не переназначает. */
  const [clients, installers, blocks, work] = await Promise.all([
    listAll(),
    listInstallers(true),
    loadBlocks(session, dayKeyOf(new Date(order.at))),
    loadWork(session, dayKeyOf(new Date(order.at)), order.id),
  ]);

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

      <OrderWork order={order}>
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
          blocks={blocks}
          work={work}
          title={texts.cardTitle}
          hint={texts.cardHint}
          removable
        />
      </OrderWork>

      {/* 🔴 Блок читает склад сам, с клиента: наряд отдаётся страницей, а
          остаток меняется прямо здесь — после каждого списания он обязан быть
          новым, не перезагружая карточку целиком. Через границу уезжают только
          данные: функция сервер→клиент не переживает сериализацию. */}
      <OrderConsumption orderId={order.id} checklist={order.checklist} />

      <OrderHistory entries={order.history ?? []} />
    </div>
  );
}
