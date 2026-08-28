import type { Metadata } from 'next';
import Link from 'next/link';

import { leadManagerContent as leadTexts } from '@/features/lead-manager';
import { ORDERS_PATH, orderManagerContent as texts } from '@/features/order-manager';
import { Card } from '@/shared/ui';

import { orderFormData } from '../data';
import { OrderEditor } from '../OrderEditor';
import styles from '../page.module.css';

export const metadata: Metadata = { title: texts.addTitle };

export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<{ lead?: string }> };

/**
 * Та же форма страницей.
 *
 * 🔴 Прямой заход по адресу окна обязан отдавать полноценную страницу: иначе
 * ссылка на форму заведения ведёт в пустоту, а обновление теряет ввод
 * (ADR-117). Перехват работает только на переходе внутри раздела, и это ровно
 * то, чего от него ждут.
 *
 * Правка наряда окном не открывается и здесь ни при чём: карточка — это работа,
 * расход, фото и история, и прокрутка внутри прокрутки ей не подходит.
 *
 * Заголовок, подпись и путь назад даёт страница — форма приносит только поля,
 * как и в окне.
 */
export default async function AdminOrderNewPage({ searchParams }: PageProps) {
  const { clients, installers, blocks, work, lead } = await orderFormData(await searchParams);

  return (
    <div className={styles.page}>
      <Link
        className={styles.back}
        href={{ pathname: lead === null ? ORDERS_PATH : '/admin/leads' }}
      >
        {lead === null ? texts.back : leadTexts.orderBack}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{lead === null ? texts.addTitle : leadTexts.orderTitle}</h1>
        {lead !== null && <p className={styles.from}>{lead.from}</p>}
        <p className={styles.lead}>{lead === null ? texts.addHint : leadTexts.orderLead}</p>
      </header>

      {/* Наряд с нуля: заголовок даёт страница, форма приносит только поля —
          иначе «Новый наряд» и подсказка стояли бы на экране дважды подряд.
          Наряд по обращению — случай другой: заголовок страницы говорит,
          откуда он взялся, а заголовок формы — что перед человеком ещё
          черновик, который никуда не записан. */}
      {lead === null ? (
        <Card as="section">
          <OrderEditor
            clients={clients}
            installers={installers}
            blocks={blocks}
            work={work}
            surface="bare"
          />
        </Card>
      ) : (
        <OrderEditor
          clients={clients}
          installers={installers}
          blocks={blocks}
          work={work}
          initial={lead.draft}
          title={leadTexts.orderFormTitle}
          hint={leadTexts.orderFormHint}
        />
      )}
    </div>
  );
}
