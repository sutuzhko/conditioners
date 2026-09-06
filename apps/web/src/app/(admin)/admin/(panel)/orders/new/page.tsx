import type { Metadata } from 'next';
import Link from 'next/link';

import { leadManagerContent as leadTexts } from '@/features/lead-manager';
import { ORDERS_PATH, orderManagerContent as texts } from '@/features/order-manager';
import { Card } from '@/shared/ui';
import { DataBlock, FieldsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

import { orderFormLists, orderLeadSource, type OrderLeadSource } from '../data';
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
 *
 * 🔴 Обращение читается **до** первого куска потока (issue #651): `?lead=` на
 * удалённое обращение обязан отвечать 404, а не 200 с текстом «не найдено».
 * Им же собирается заголовок — он говорит, откуда взялся наряд. Списки
 * клиентов, монтажников и занятость приезжают следом, отдельным куском.
 */
export default async function AdminOrderNewPage({ searchParams }: PageProps) {
  const lead = await orderLeadSource(await searchParams);

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
      <DataBlock
        skeleton={<FieldsSkeleton fields={7} />}
        title={texts.loadFailed}
        note={blockErrorNote(ORDERS_PATH)}
      >
        <NewOrderForm lead={lead} />
      </DataBlock>
    </div>
  );
}

/** Форма заведения — то, что приезжает отдельным куском потока. */
async function NewOrderForm({ lead }: { readonly lead: OrderLeadSource | null }) {
  const { clients, installers, blocks, work } = await orderFormLists();

  if (lead === null) {
    return (
      <Card>
        <OrderEditor
          clients={clients}
          installers={installers}
          blocks={blocks}
          work={work}
          surface="bare"
        />
      </Card>
    );
  }

  return (
    <OrderEditor
      clients={clients}
      installers={installers}
      blocks={blocks}
      work={work}
      initial={lead.draft}
      title={leadTexts.orderFormTitle}
      hint={leadTexts.orderFormHint}
    />
  );
}
