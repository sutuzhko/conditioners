import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  CLIENT_CARD_TABS,
  CLIENT_TAB_TITLES,
  ClientForm,
  ClientLeads,
  ClientOrders,
  ClientUnits,
  clientCardTabFromParam,
  clientManagerContent as texts,
  type ClientLead,
  type ClientOrder,
} from '@/features/client-manager';
import { getAdminSession, isOwner } from '@/server/auth';
import { requireOwnerPage } from '@/server/guards';
import { listByClient as listUnits } from '@/server/repo/client-units';
import { findById } from '@/server/repo/clients';
import { listByClient as listLeads } from '@/server/repo/leads';
import { listByClient as listOrders } from '@/server/repo/orders';
import { todayKey } from '@/shared/lib/calendar';
import { formatPhone, phoneHref } from '@/shared/lib/format';

import { PanelTabs } from '../../PanelTabs';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  /** Вкладка карточки живёт в адресе (issue #339, #350). */
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
  const client = await findById(id);

  return { title: client === null ? texts.title : client.name };
}

/**
 * Карточка клиента — три вкладки: данные, заказы, техника (issue #350).
 *
 * 🔴 «Техника» — половина смысла карточки (CRM.md §3.2): что у человека
 * стоит, с какого числа и до какого на это гарантия. В прежнем макете такой
 * вкладки не было, и раздел терял её при любой пересборке по нему.
 *
 * 🔴 Вкладка разбирается здесь, на сервере: карточка приходит открытой на
 * той, что стоит в адресе (issue #340), а мусор в параметре открывает первую,
 * а не роняет страницу (#341). Данные всех трёх вкладок читаются одним
 * запросом страницы и переключаются без похода в сеть (ADR-256).
 *
 * Раздел владельца: проверка до чтения данных (ADR-095).
 */
export default async function AdminClientPage({ params, searchParams }: PageProps) {
  const session = await requireOwnerPage();

  const { id } = await params;
  const { tab } = await searchParams;
  const active = clientCardTabFromParam(tab);

  const viewer = { role: session.role, userId: session.userId };

  const [client, leads, units, orders] = await Promise.all([
    findById(id),
    listLeads(id),
    listUnits(id),
    listOrders(id, viewer),
  ]);
  if (client === null) notFound();

  /* Заявке в карточке клиента нужно ровно то, чем вспоминают разговор: всё
     остальное — включая согласие на обработку — живёт в разделе заявок. */
  const history: readonly ClientLead[] = leads.map((lead) => ({
    id: lead.id,
    topic: lead.topic,
    status: lead.status,
    comment: lead.comment,
    createdAt: lead.createdAt,
  }));

  /* 🔴 Через границу сервер→клиент уезжает проекция, а не карточка наряда
     целиком: позиции оборудования, заметка владельца и удержание в карточке
     клиента не показываются — значит и в браузер им незачем. */
  const works: readonly ClientOrder[] = orders.items.map((order) => ({
    id: order.id,
    number: order.number,
    type: order.type,
    status: order.status,
    at: order.at,
    address: order.address,
    price: order.price ?? null,
    installerName:
      order.installer === null ? null : (order.installer.name ?? order.installer.login),
  }));

  return (
    <div className={styles.page}>
      <Link className={styles.back} href={{ pathname: '/admin/clients' }}>
        {texts.back}
      </Link>

      <header className={styles.header}>
        <h1 className={styles.title}>{client.name}</h1>
        <p className={styles.meta}>
          {/* 🔴 Телефон — кнопка звонка, а не строка: с телефона по нему
              звонят, а не переписывают в другую руку (issue #350). Вид кнопки
              включается на узком экране, действие у ссылки одно и то же. */}
          <a className={`${styles.phone} tapAction`} href={phoneHref(client.phone)}>
            {formatPhone(client.phone)}
          </a>
          <span>{texts.since(client.createdAt)}</span>
          <span>{texts.leadCount(client.leadCount)}</span>
        </p>
      </header>

      <PanelTabs
        active={active}
        tabs={CLIENT_CARD_TABS}
        titles={CLIENT_TAB_TITLES}
        label={texts.tabsLabel}
        idPrefix="client"
        /* Счётчики у подписей (issue #602, макет `CardTabs.png`): по ним видно,
           есть ли за вкладкой что-нибудь, до того как на неё нажали. */
        counts={{ orders: orders.total, units: units.length }}
        panels={{
          data: (
            <>
              <ClientForm
                clientId={client.id}
                initial={{
                  name: client.name,
                  phone: client.phone,
                  address: client.address ?? '',
                  note: client.note ?? '',
                }}
                title={texts.cardTitle}
                hint={texts.cardHint}
                removable
              />

              {/* Обращения стоят рядом с данными, а не в «Заказах»: это след
                  разговора с человеком, а не работа с деньгами и датой. */}
              <ClientLeads leads={history} />
            </>
          ),
          orders: (
            <ClientOrders
              orders={{ items: works, total: orders.total }}
              allHref={{ pathname: '/admin/orders', query: { q: client.name, tab: 'all' } }}
            />
          ),
          /* «Сегодня» считает сервер: истекла гарантия или нет, не должно
             зависеть от часов на машине смотрящего. */
          units: <ClientUnits clientId={client.id} units={units} today={todayKey()} />,
        }}
      />
    </div>
  );
}
