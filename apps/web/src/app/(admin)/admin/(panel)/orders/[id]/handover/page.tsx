import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { OrderHandover, installerContent as own } from '@/features/order-manager';
import { requirePage } from '@/server/guards';
import { findById } from '@/server/repo/orders';

import styles from '../../page.module.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: own.handoverTitle };

type PageProps = { params: Promise<{ id: string }> };

/**
 * Сдача работы — четвёртый кадр `design/admin/Installer.body.html`, issue #632.
 *
 * 🔴 Свой адрес, а не вкладка карточки. Сдача — это конец выезда: фото, отчёт
 * и оплата собираются на одном экране, и по нему видно, чего ещё не хватает.
 * Раньше монтажник закрывал наряд выпадающим списком статуса, а то, что макет
 * держит вместе, лежало по трём вкладкам.
 *
 * 🔴 Проверка доступа стоит в самой странице (ADR-095), а не только в layout:
 * `redirect()` из layout отдаёт честный 307, но React к этому моменту уже
 * отрисовал страницу, и её данные уехали бы в теле ответа.
 *
 * 🔴 Чужой наряд — `404`, а не `403`: `findById` сужает выборку по
 * исполнителю в самом запросе и не находит его вовсе (ADR-114). Отказ
 * подтвердил бы, что наряд с таким адресом существует.
 *
 * Экран открыт и владельцу: закрытых от него данных здесь нет — снимки, итог
 * и способ оплаты он и так видит в карточке наряда.
 */
export default async function AdminOrderHandoverPage({ params }: PageProps) {
  const session = await requirePage();
  const { id } = await params;

  const order = await findById(id, { role: session.role, userId: session.userId });
  if (order === null) notFound();

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: `/admin/orders/${id}` }}>
        {own.handoverBack}
      </Link>

      <OrderHandover order={order} />
    </div>
  );
}
