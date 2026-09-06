import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ORDERS_PATH,
  OrderConsumption,
  OrderHistory,
  OrderInstallerHead,
  OrderInstallerView,
  installerContent as own,
  orderCardTabFromParam,
  orderCardTabsFor,
  orderDraftOf,
  orderManagerContent as texts,
  type ConsumptionLoad,
} from '@/features/order-manager';
import type { AdminSession } from '@/server/auth';
import { requirePage } from '@/server/guards';
import { listInstallers } from '@/server/repo/admin-users';
import { listAll } from '@/server/repo/clients';
import { findById, type Viewer } from '@/server/repo/orders';
import { consumptionOf, directory } from '@/server/repo/stock';
import { dayKeyOf } from '@/shared/lib/calendar';
import { DataBlock, RowsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

import { loadBlocks, loadWork } from '../blocks';
import { OrderEditor } from '../OrderEditor';
import { OrderWork } from './OrderWork';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  /** Вкладка карточки живёт в адресе (issue #339). */
  searchParams: Promise<{ tab?: string }>;
};

export async function generateMetadata({ params }: Pick<PageProps, 'params'>): Promise<Metadata> {
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
 * Работа с нарядом разложена по пяти вкладкам (CRM.md §3.3, issue #346):
 * наряд с итогом работ, расход материалов, чеклист выезда, документы и
 * фотографии, история изменений.
 *
 * 🔴 Существование наряда решается **до** первого куска потока (issue #651).
 * Пока заготовка стояла на границе раздела, она уходила в ответ первой, и
 * `notFound()` заставал статус уже отправленным: чужой наряд отвечал
 * монтажнику 200 с телом «не найдено». Здесь до первого байта успевает пройти
 * только чтение самого наряда — сужённое по исполнителю в самом запросе, — а
 * расход, списки клиентов и занятость приезжают следом.
 */
/**
 * 🔴 Начальные данные расхода читаются здесь, а не запрашиваются с клиента.
 *
 * Открытие наряда стоило до одиннадцати запросов: движения плюс справочник
 * склада по страницам. Платил за это монтажник у машины — тот, у кого сеть
 * хуже всего (issue #88).
 *
 * Сбой чтения не роняет страницу целиком: блок расхода умеет показывать свою
 * ошибку, а наряд, чеклист и документы к складу отношения не имеют.
 */
async function loadConsumption(orderId: string, viewer: Viewer): Promise<ConsumptionLoad> {
  try {
    const [consumption, stock] = await Promise.all([
      consumptionOf(orderId, viewer),
      directory(viewer),
    ]);

    return { ok: true, moves: consumption.items, stock };
  } catch {
    return { ok: false, message: texts.consumptionLoadError };
  }
}

/** Наряд, каким его отдаёт репозиторий смотрящему: состав полей зависит от роли. */
type OrderOnCard = NonNullable<Awaited<ReturnType<typeof findById>>>;

export default async function AdminOrderPage({ params, searchParams }: PageProps) {
  const session = await requirePage();
  const { id } = await params;

  /* Вкладка разбирается здесь, на сервере: карточка приходит открытой на той,
     что стоит в адресе, а мусор в параметре открывает первую (issue #340,
     #341). Набор вкладок зависит от роли: у монтажника нет истории, и
     присланный ему `?tab=history` открывает «Наряд», а не пустоту. */
  const { tab } = await searchParams;
  const activeTab = orderCardTabFromParam(tab, orderCardTabsFor(session.role !== 'owner'));

  const viewer = { role: session.role, userId: session.userId };
  const order = await findById(id, viewer);
  if (order === null) notFound();

  /* 🔴 Заготовка держит ленту вкладок и полотно открытой вкладки: без резерва
     экран, собранный на телефоне по мобильной сети, прыгает под пальцем
     ровно в тот момент, когда монтажник целится в кнопку (ADR-239). */
  const skeleton = (
    <>
      <RowsSkeleton rows={1} height="44px" />
      <RowsSkeleton rows={1} height="620px" />
    </>
  );

  if (session.role !== 'owner') {
    return (
      <div className={styles.page}>
        <Link className={styles.back} href={{ pathname: '/admin/orders' }}>
          {own.back}
        </Link>

        {/* 🔴 Шапка стоит над вкладками, а не внутри «Наряда»: что за работа и
            в каком она состоянии, нужно видеть и с вкладки чеклиста. Она
            собрана из самого наряда и приезжает с первым же куском ответа. */}
        <OrderInstallerHead order={order} />

        <DataBlock
          surface="bare"
          skeleton={skeleton}
          title={texts.cardLoadFailed}
          note={blockErrorNote(ORDERS_PATH)}
        >
          <InstallerCard order={order} tab={activeTab} viewer={viewer} />
        </DataBlock>
      </div>
    );
  }

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

      <DataBlock
        surface="bare"
        skeleton={skeleton}
        title={texts.cardLoadFailed}
        note={blockErrorNote(ORDERS_PATH)}
      >
        <OwnerCard order={order} tab={activeTab} session={session} />
      </DataBlock>
    </div>
  );
}

/**
 * Карточка наряда глазами монтажника — отдельный кусок потока.
 *
 * 🔴 История монтажнику не приходит вовсе — её нет и в разметке, и в ленте
 * вкладок: `history` не передан, и вкладок остаётся четыре.
 *
 * Расход монтажнику открыт: он и списывает материал с объекта. Что видно в
 * форме, решает сервер — ему придёт только своя машина.
 */
async function InstallerCard({
  order,
  tab,
  viewer,
}: {
  readonly order: OrderOnCard;
  readonly tab: ReturnType<typeof orderCardTabFromParam>;
  readonly viewer: Viewer;
}) {
  const consumption = await loadConsumption(order.id, viewer);

  return (
    <OrderWork
      order={order}
      tab={tab}
      forInstaller
      materials={
        <OrderConsumption orderId={order.id} initial={consumption} checklist={order.checklist} />
      }
    >
      <OrderInstallerView order={order} />
    </OrderWork>
  );
}

/**
 * Карточка наряда глазами владельца — отдельный кусок потока.
 *
 * 🔴 Блок расхода читает склад сам, с клиента: наряд отдаётся страницей, а
 * остаток меняется прямо здесь — после каждого списания он обязан быть новым,
 * не перезагружая карточку целиком. Через границу уезжают только данные:
 * функция сервер→клиент не переживает сериализацию.
 */
async function OwnerCard({
  order,
  tab,
  session,
}: {
  readonly order: OrderOnCard;
  readonly tab: ReturnType<typeof orderCardTabFromParam>;
  readonly session: AdminSession;
}) {
  const day = dayKeyOf(new Date(order.at));

  /* Списки нужны только владельцу: монтажник наряд не переназначает. */
  const [consumption, clients, installers, blocks, work] = await Promise.all([
    loadConsumption(order.id, session),
    listAll(),
    listInstallers(true),
    loadBlocks(session, day),
    loadWork(session, day, order.id),
  ]);

  return (
    <OrderWork
      order={order}
      tab={tab}
      materials={
        <OrderConsumption orderId={order.id} initial={consumption} checklist={order.checklist} />
      }
      history={<OrderHistory entries={order.history ?? []} />}
    >
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
  );
}
