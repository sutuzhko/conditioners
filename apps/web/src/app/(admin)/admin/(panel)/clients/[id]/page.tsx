import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import type { ReactNode } from 'react';

import {
  CLIENTS_PATH,
  CLIENT_CARD_TABS,
  CLIENT_TAB_TITLES,
  ClientForm,
  ClientLeads,
  ClientOrders,
  ClientUnits,
  clientCardTabFromParam,
  clientManagerContent as texts,
  type ClientCardTab,
  type ClientLead,
  type ClientOrder,
} from '@/features/client-manager';
import type { ClientCard, ClientUnitCard } from '@/entities/client/model';
import { getAdminSession, isOwner } from '@/server/auth';
import { requireOwnerPage } from '@/server/guards';
import { listByClient as listUnits } from '@/server/repo/client-units';
import { findById } from '@/server/repo/clients';
import { listByClient as listLeads } from '@/server/repo/leads';
import { listByClient as listOrders, type Viewer } from '@/server/repo/orders';
import { mediaExists } from '@/server/uploads/store';
import { todayKey } from '@/shared/lib/calendar';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import { TabLinks, TabPanels } from '@/shared/ui';
import { DataBlock, RowsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

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
 *
 * 🔴 Существование клиента решается **до** первого куска потока (issue #651).
 * Пока заготовка стояла на границе раздела, она уходила в ответ первой, и
 * `notFound()` заставал статус уже отправленным: карточка удалённого клиента
 * отвечала 200. Здесь до первого байта успевает пройти только поиск самого
 * клиента — по нему же собирается шапка, — а обращения, наряды и техника
 * приезжают следом, отдельным куском потока.
 */
export default async function AdminClientPage({ params, searchParams }: PageProps) {
  const session = await requireOwnerPage();

  const { id } = await params;
  const { tab } = await searchParams;
  const active = clientCardTabFromParam(tab);

  const viewer = { role: session.role, userId: session.userId };

  const client = await findById(id);
  if (client === null) notFound();

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

      {/* 🔴 Лента вкладок приезжает вместе с содержимым, а не раньше него: у
          подписей стоят счётчики, и лента без чисел, дорисованная потом,
          дёргала бы ширину вкладок под курсором. Заготовка держит и ленту, и
          три полотна той же высоты (ADR-239). */}
      <DataBlock
        surface="bare"
        skeleton={
          <>
            <TabLinks
              items={CLIENT_CARD_TABS.map((tab) => ({ key: tab, title: CLIENT_TAB_TITLES[tab] }))}
              label={texts.tabsLabel}
              busy
            />
            <RowsSkeleton rows={3} height="280px" />
          </>
        }
        title={texts.cardLoadFailed}
        note={blockErrorNote(CLIENTS_PATH)}
      >
        <ClientCard client={client} active={active} viewer={viewer} />
      </DataBlock>
    </div>
  );
}

/**
 * Вкладки карточки — то, что приезжает отдельным куском потока.
 *
 * Данные всех трёх вкладок читаются одним заходом и переключаются без похода
 * в сеть (ADR-256): вкладка — это состояние экрана, а не новая страница.
 */
async function ClientCard({
  client,
  active,
  viewer,
}: {
  readonly client: ClientCard;
  readonly active: ReturnType<typeof clientCardTabFromParam>;
  readonly viewer: Viewer;
}) {
  const [leads, listed, orders] = await Promise.all([
    listLeads(client.id),
    listUnits(client.id),
    listOrders(client.id, viewer),
  ]);

  const units = await withPhotoState(listed);

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

  const counts: Partial<Readonly<Record<ClientCardTab, number>>> = {
    orders: orders.total,
    units: units.length,
  };

  const panels: Readonly<Record<ClientCardTab, ReactNode>> = {
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
    /* «Сегодня» считает сервер: истекла гарантия или нет, не должно зависеть
       от часов на машине смотрящего. */
    units: <ClientUnits clientId={client.id} units={units} today={todayKey()} />,
  };

  /* Счётчики у подписей (issue #602, #585, макет `CardTabs.png`): по ним
     видно, есть ли за вкладкой что-нибудь, до того как на неё нажали. Порядок
     вкладок задаёт словарь `PANEL_TABS`, а не этот список (ADR-302). */
  return (
    <TabPanels
      items={CLIENT_CARD_TABS.map((tab) => {
        const title = CLIENT_TAB_TITLES[tab];
        const count = counts[tab];
        const panel = panels[tab];

        if (count === undefined) return { key: tab, title, panel };

        return { key: tab, title, panel, count, countLabel: texts.tabCount(tab, count) };
      })}
      active={active}
      label={texts.tabsLabel}
      idPrefix="client"
    />
  );
}

/**
 * Дожил ли снимок установки до сегодня — issue #690.
 *
 * 🔴 Спрашивает диск сервер, а не браузер. Ссылка в базе и файл на томе живут
 * порознь: том переехал, каталог не примонтирован, база наполнена в другом
 * окружении (ADR-326). Без этой проверки карточка рисует значок сломанной
 * картинки — то есть выглядит сломанной вёрсткой, а не пропавшим снимком.
 *
 * По одному `stat` на единицу техники со снимком, и только у одного клиента:
 * это карточка записи, а не список на тысячи строк, и обращение к локальному
 * тому стоит микросекунды против чтения базы, которое страница уже сделала.
 */
async function withPhotoState(
  units: readonly ClientUnitCard[],
): Promise<readonly ClientUnitCard[]> {
  return await Promise.all(
    units.map(async (unit) => {
      if (unit.photo === null) return unit;

      return { ...unit, photoMissing: !(await mediaExists(unit.photo)) };
    }),
  );
}
