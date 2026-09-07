import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ORDERS_PATH,
  ORDER_CARD_TAB_TITLE,
  OrderConsumption,
  OrderHistory,
  OrderInstallerHead,
  OrderInstallerView,
  OrderOwnerActions,
  OrderOwnerView,
  installerContent as own,
  orderCardTabFromParam,
  orderCardTabsFor,
  orderManagerContent as texts,
  type ConsumptionLoad,
} from '@/features/order-manager';
import type { AdminSession } from '@/server/auth';
import { requirePage } from '@/server/guards';
import { findById, type Viewer } from '@/server/repo/orders';
import { consumptionOf, directory } from '@/server/repo/stock';
import { TabLinks } from '@/shared/ui';
import { DataBlock, RowsSkeleton, blockErrorNote } from '@/widgets/admin-shell';

import { OrderResultEditor } from '../OrderResultEditor';
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
     ровно в тот момент, когда монтажник целится в кнопку (ADR-239).

     Лента — настоящая, а не серая полоса: у подписей стоят счётчики, и
     полоса другой высоты сдвинула бы содержимое вниз в момент приезда
     данных. Подсвеченной вкладки в ней нет — подсветить можно только не ту. */
  const skeleton = (
    <>
      <TabLinks
        items={orderCardTabsFor(session.role !== 'owner').map((key) => ({
          key,
          title: ORDER_CARD_TAB_TITLE[key],
        }))}
        label={texts.workTabsLabel}
        busy
        scroll
      />
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

      {/* 🔴 Шапка стоит над вкладками, а не внутри «Наряда» (issue #598): в
          каком состоянии работа и что с ней можно сделать, нужно видеть и с
          вкладки чеклиста. Она собрана из самого наряда и приезжает с первым
          же куском ответа — списки и расход её не задерживают. */}
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.number(order.number)}</h1>
        <OrderOwnerActions order={order} />
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
      materialsCount={consumption.ok ? consumption.moves.length : undefined}
    >
      <OrderInstallerView order={order} />
    </OrderWork>
  );
}

/**
 * Карточка наряда глазами владельца — отдельный кусок потока.
 *
 * 🔴 Наряд читается, а не заполняется (issue #598). Прежде здесь стояла форма
 * правки со всеми полями наряда — она и давала карточке 5156px высоты на 390
 * у наряда в работе. Правка уехала на свой адрес, а карточка отдаёт то, ради
 * чего её открывают: объект, оборудование, деньги, исполнителя.
 *
 * 🔴 Блок расхода читает склад сам, с клиента: наряд отдаётся страницей, а
 * остаток меняется прямо здесь — после каждого списания он обязан быть новым,
 * не перезагружая карточку целиком. Через границу уезжают только данные:
 * функция сервер→клиент не переживает сериализацию.
 *
 * 🔴 Ни клиентов, ни монтажников, ни занятости эта страница больше не читает:
 * они нужны были списками формы, а форма отсюда ушла. Четыре запроса из пяти
 * при каждом открытии карточки перестали делаться вовсе.
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
  const consumption = await loadConsumption(order.id, session);

  return (
    <OrderWork
      order={order}
      tab={tab}
      materials={
        <OrderConsumption orderId={order.id} initial={consumption} checklist={order.checklist} />
      }
      /* Счётчик «Расхода» знает только удавшееся чтение: на отказе склада
         числа нет, и рисовать ноль нельзя — он соврал бы, что списаний нет,
         хотя их просто не прочитали. */
      materialsCount={consumption.ok ? consumption.moves.length : undefined}
      history={<OrderHistory entries={order.history ?? []} />}
    >
      <OrderOwnerView
        order={order}
        result={
          <OrderResultEditor
            orderId={order.id}
            extraWork={order.extraWork}
            report={order.report}
            resultAt={order.resultAt}
          />
        }
      />
    </OrderWork>
  );
}
