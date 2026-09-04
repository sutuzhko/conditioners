import Link from 'next/link';

import type { PanelTab } from '@/shared/config/admin-tabs';
import { formatMoney } from '@/shared/lib/format';
import { Badge, Card, Chart, StatTile, StatTiles, Table } from '@/shared/ui';

import { adminSummaryContent as texts } from './summary-content';
import styles from './AdminSummary.module.css';

/** Сегмент сводки: ключи словаря вкладок панели (`PANEL_TABS.overview`). */
export type SummarySegment = PanelTab<'overview'>;

/**
 * Цифры сегмента «Обзор» — про работу компании, а не про содержимое сайта
 * (CRM.md §3.8).
 *
 * Владелец заходит в панель утром за четырьмя вопросами: кто написал, сколько
 * работ в руках, сколько заработали и не ждёт ли ответа отзыв.
 */
export type SummaryCounts = {
  /** Заявок в статусе «новая» — то, ради чего владелец заходит в панель. */
  readonly newLeads: number;
  /** Наряды в работе: назначенные и те, где монтажник уже на объекте. */
  readonly activeOrders: number;
  /** Выручка месяца — то же число, что в сегменте «Деньги». */
  readonly revenue: number;
  /** Отзывов на модерации. */
  readonly pendingReviews: number;
};

/** Цифры сегмента «Работа»: успеваем ли, а не сколько заработали. */
export type WorkCounts = {
  readonly done: number;
  readonly active: number;
  readonly fresh: number;
  readonly installers: number;
};

/** Почему наряд попал в «Требуют внимания»: время вышло или некому ехать. */
export type AttentionReason = 'overdue' | 'unassigned';

export type AttentionItem = {
  readonly id: string;
  /** «№ 1059 · Монтаж» — подпись собирает раздел, сводка видов работ не знает. */
  readonly title: string;
  /** Чем объясняется: «Пётр Кузнецов, 28 августа, 11:00». */
  readonly note: string;
  readonly href: string;
  readonly reason: AttentionReason;
};

/** Доля вида работ в выручке: подпись готова, проценты посчитаны. */
export type MoneyShare = {
  readonly title: string;
  readonly sum: number;
  readonly percent: number;
};

export type MoneySummary = {
  readonly revenue: number;
  readonly average: number;
  readonly payout: number;
  readonly cash: number;
  readonly shares: readonly MoneyShare[];
  readonly weeks: readonly { readonly label: string; readonly sum: number }[];
};

export type ReadinessSummary = {
  readonly ready: boolean;
  /** Группы настроек, где ещё стоит заглушка или пусто обязательное поле. */
  readonly unfinished: readonly string[];
};

/**
 * 🔴 Наряд и дело — разные сущности с разным смыслом (ADR-093): наряд это
 * работа с деньгами и исполнителем, дело — напоминание позвонить. В общем
 * списке они идут вперемешку по времени, но помечены по-разному: сводка, в
 * которой одно неотличимо от другого, врёт о том, что предстоит сделать.
 */
export type UpcomingNature = 'order' | 'event';

/**
 * Строка «Ближайших дел» в том виде, в каком её показывает сводка.
 *
 * Все подписи приходят готовыми: сводка не знает ни видов дел, ни типов
 * нарядов, ни часового пояса работ — за них отвечают их разделы.
 */
export type UpcomingItem = {
  readonly id: string;
  readonly nature: UpcomingNature;
  /** «сегодня 18:00», «завтра 10:00», «14 июля, 09:00». */
  readonly when: string;
  /** Что это: «Монтаж», «Звонок». */
  readonly kind: string;
  readonly clientName: string;
  /** Куда ведёт строка: наряд — в свою карточку, дело — в календарь. */
  readonly href: string;
  readonly overdue: boolean;
};

/**
 * Данные открытого сегмента.
 *
 * 🔴 Размеченное объединение, а не три необязательных ключа: страница читает
 * из базы ровно то, что показывает открытый сегмент, и «деньги без сегмента
 * денег» не должно даже собираться.
 */
export type SummaryData =
  | {
      readonly segment: 'overview';
      readonly counts: SummaryCounts;
      readonly readiness: ReadinessSummary;
      readonly upcoming: readonly UpcomingItem[];
    }
  | {
      readonly segment: 'work';
      readonly work: WorkCounts;
      readonly attention: readonly AttentionItem[];
    }
  | { readonly segment: 'money'; readonly money: MoneySummary };

export interface AdminSummaryProps {
  readonly data: SummaryData;
  /** Период, за который посчитаны числа: «Август 2026». */
  readonly period: string;
}

/** Адрес сегмента. Первый в адрес не уезжает: `/admin` и есть «Обзор». */
export function segmentHref(segment: SummarySegment): {
  readonly pathname: string;
  readonly query?: Record<string, string>;
} {
  return segment === 'overview'
    ? { pathname: '/admin' }
    : { pathname: '/admin', query: { tab: segment } };
}

const SEGMENTS: readonly SummarySegment[] = ['overview', 'work', 'money'];

/**
 * Сводка на входе в панель: что требует внимания прямо сейчас (issue #344).
 *
 * 🔴 Три сегмента, а не три вкладки. Разделы не равноправны: «Обзор» отвечает
 * на вопрос «как дела», «Работа» и «Деньги» его раскрывают, — и переключатель
 * обязан выглядеть выбором точки зрения на одно и то же, а не переходом в
 * другой раздел.
 *
 * 🔴 Сегмент живёт в адресе (ADR-255, issue #339): `/admin?tab=money` —
 * ссылка, которую владелец сохраняет в закладки. Разбирает его страница на
 * сервере, поэтому раздел приходит открытым на нужном сегменте, без мигания
 * первым.
 *
 * 🔴 Порядок блоков постоянен во всех трёх сегментах: шапка, ряд сегментов,
 * четыре плитки, панель под ними (ADR-241). Плитка не переезжает от того,
 * какие данные пришли, — и скелетон обещает ту же раскладку, что придёт.
 */
export function AdminSummary({ data, period }: AdminSummaryProps) {
  return (
    <div className={styles.summary}>
      {/* 🔴 Заголовок страницы: вход в панель — единственный экран, у которого
          его когда-то не было вовсе, и читалка объявляла его безымянным
          (инвариант 4). */}
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <div className={styles.bar}>
        <nav className={styles.segments} aria-label={texts.segmentsLabel}>
          {SEGMENTS.map((segment) => (
            <Link
              className={[styles.segment, segment === data.segment ? styles.current : null]
                .filter(Boolean)
                .join(' ')}
              key={segment}
              href={segmentHref(segment)}
              aria-current={segment === data.segment ? 'page' : undefined}
            >
              {texts.segmentTitle[segment]}
            </Link>
          ))}
        </nav>

        {/* Период — подпись, а не выбор: сводка считается за текущий месяц, и
            кнопка, которая ничего не открывает, обманывает ожидание. */}
        <p className={styles.period}>{period}</p>
      </div>

      {data.segment === 'overview' ? <OverviewSegment data={data} /> : null}
      {data.segment === 'work' ? <WorkSegment data={data} /> : null}
      {data.segment === 'money' ? <MoneySegment money={data.money} /> : null}
    </div>
  );
}

/** Сегмент «Обзор»: четыре числа, ближайшие дела и готовность сайта. */
function OverviewSegment({
  data,
}: {
  readonly data: Extract<SummaryData, { segment: 'overview' }>;
}) {
  const { counts, readiness, upcoming } = data;

  return (
    <>
      <StatTiles className={styles.tiles} label={texts.segmentTitle.overview}>
        <LinkedTile
          href="/admin/leads"
          label={texts.leads}
          value={String(counts.newLeads)}
          note={texts.leadsNote}
        />
        <LinkedTile
          href="/admin/orders"
          label={texts.orders}
          value={String(counts.activeOrders)}
          note={texts.ordersNote}
        />
        {/* 🔴 Выручка и отзывы уходят с первого экрана телефона: они живут в
            своих сегментах, а на 358px четыре плитки становятся нечитаемыми
            (issue #344). Прячет их модуль — данные при этом те же. */}
        <LinkedTile
          className={styles.wide}
          href={segmentHref('money')}
          label={texts.revenue}
          value={formatMoney(counts.revenue)}
          note={texts.revenueNote}
        />
        <LinkedTile
          className={styles.wide}
          href="/admin/reviews"
          label={texts.reviews}
          value={String(counts.pendingReviews)}
          note={texts.reviewsNote}
        />
      </StatTiles>

      {/* От 1200 расписание и готовность идут рядом (1.6fr / 1fr) — так стоит в
          макете, и так на первом экране помещается и то, и другое. Ниже они
          складываются в столбец, и порядок остаётся прежним. */}
      <div className={styles.pair}>
        <Card as="section" className={styles.panel} aria-labelledby="upcoming-title">
          <h2 className={styles.cardTitle} id="upcoming-title">
            {texts.upcomingTitle}
          </h2>
          <p className={styles.text}>{texts.upcomingNote}</p>

          {upcoming.length === 0 ? (
            <p className={styles.text}>{texts.upcomingEmpty}</p>
          ) : (
            <ul className={styles.events}>
              {upcoming.map((item) => (
                <li className={styles.event} key={`${item.nature}-${item.id}`}>
                  <Link className={`${styles.eventLink} tapAction`} href={{ pathname: item.href }}>
                    <span className={styles.eventWhen}>{item.when}</span>
                    {/* Природа записи — словом и плашкой, а не одним цветом:
                      наряд и дело различаются деньгами, и путать их нельзя
                      даже в монохромном режиме. */}
                    <Badge size="sm" variant={item.nature === 'order' ? 'accent' : 'neutral'}>
                      {texts.natureTitle(item.nature)}
                    </Badge>
                    <span className={styles.eventKind}>{item.kind}</span>
                    <span className={styles.eventName}>{item.clientName}</span>
                    {item.overdue ? <Badge variant="warning">{texts.upcomingOverdue}</Badge> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Link className={`${styles.link} tapAction`} href={{ pathname: '/admin/crm' }}>
            {texts.upcomingCta}
          </Link>
        </Card>

        {/* 🔴 Карточка готовности стоит последней всегда, а о незаполненных
            настройках говорит цветом и содержимым (ADR-241). Раньше она
            переезжала наверх, пока настройки не заполнены, — и позиция плиток
            зависела от данных, которых у скелетона нет. */}
        <Card
          as="section"
          variant={readiness.ready ? 'soft' : 'accent'}
          aria-labelledby="readiness-title"
        >
          <h2 className={styles.cardTitle} id="readiness-title">
            {texts.readinessTitle}
          </h2>

          {readiness.ready ? (
            <p className={styles.text}>{texts.readinessDone}</p>
          ) : (
            <>
              <p className={styles.text}>{texts.readinessPending}</p>
              <ul className={styles.groups}>
                {readiness.unfinished.map((group) => (
                  <li key={group}>
                    <Badge variant="warning">{texts.groupTitle(group)}</Badge>
                  </li>
                ))}
              </ul>
              <Link className={`${styles.link} tapAction`} href={{ pathname: '/admin/company' }}>
                {texts.readinessCta}
              </Link>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

/** Сегмент «Работа»: загрузка и то, что стоит. */
function WorkSegment({ data }: { readonly data: Extract<SummaryData, { segment: 'work' }> }) {
  const { work, attention } = data;

  return (
    <>
      <StatTiles className={styles.tiles} label={texts.segmentTitle.work}>
        <LinkedTile
          href={{ pathname: '/admin/orders', query: { tab: 'history' } }}
          label={texts.workDone}
          value={String(work.done)}
          note={texts.workDoneNote}
        />
        <LinkedTile
          href="/admin/orders"
          label={texts.workActive}
          value={String(work.active)}
          note={texts.workActiveNote}
        />
        <LinkedTile
          className={styles.wide}
          href={{ pathname: '/admin/orders', query: { tab: 'new' } }}
          label={texts.workFresh}
          value={String(work.fresh)}
          note={texts.workFreshNote}
        />
        <LinkedTile
          className={styles.wide}
          href="/admin/team"
          label={texts.workInstallers}
          value={String(work.installers)}
          note={texts.workInstallersNote}
        />
      </StatTiles>

      <Card as="section" className={styles.panel} aria-labelledby="attention-title">
        <h2 className={styles.cardTitle} id="attention-title">
          {texts.attentionTitle}
        </h2>
        <p className={styles.text}>{texts.attentionNote}</p>

        {attention.length === 0 ? (
          <p className={styles.text}>{texts.attentionEmpty}</p>
        ) : (
          <ul className={styles.events}>
            {attention.map((item) => (
              /* 🔴 Строка срыва подсвечена тинтом, и на нём тинт складывался
                 бы дважды. `--badge-fill` снимает заливку плашки, а
                 приглушённая подпись поднимается до `--body` (issue #347). */
              <li className={`${styles.event} ${styles.rowbad}`} key={item.id}>
                <Link className={`${styles.eventLink} tapAction`} href={{ pathname: item.href }}>
                  <span className={styles.eventName}>{item.title}</span>
                  <Badge size="sm" variant="danger">
                    {item.reason === 'overdue' ? texts.attentionOverdue : texts.attentionUnassigned}
                  </Badge>
                  <span className={styles.eventNote}>{item.note}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link className={`${styles.link} tapAction`} href={{ pathname: '/admin/orders' }}>
          {texts.attentionCta}
        </Link>
      </Card>
    </>
  );
}

/**
 * Сегмент «Деньги».
 *
 * 🔴 Числа отсюда не расходятся с тем, что видно в заказах: это те же наряды
 * и те же поля, а не отдельный отчёт (issue #344). Закупочных цен,
 * себестоимости и маржи здесь нет — их нет и в базе (CRM.md §11.7).
 */
function MoneySegment({ money }: { readonly money: MoneySummary }) {
  const empty = money.revenue === 0;

  return (
    <>
      <StatTiles className={styles.tiles} label={texts.segmentTitle.money}>
        <StatTile
          className={`${styles.tile} ${styles.leadTile}`}
          label={texts.moneyRevenue}
          value={formatMoney(money.revenue)}
          note={texts.moneyRevenueNote}
        />
        <StatTile
          className={styles.tile}
          label={texts.moneyAverage}
          value={formatMoney(money.average)}
          note={texts.moneyAverageNote}
        />
        <StatTile
          className={styles.tile}
          label={texts.moneyPayout}
          value={formatMoney(money.payout)}
          note={texts.moneyPayoutNote}
        />
        <StatTile
          className={`${styles.tile} ${styles.wide}`}
          label={texts.moneyCash}
          value={formatMoney(money.cash)}
          note={texts.moneyCashNote}
        />
      </StatTiles>

      {/* От 1200 график и структура выручки идут рядом (1.6fr / 1fr) — как в
          макете; ниже складываются в столбец. */}
      <div className={styles.pair}>
        <Card
          as="section"
          className={`${styles.panel} ${styles.chartCard}`}
          aria-labelledby="money-chart-title"
        >
          <h2 className={styles.cardTitle} id="money-chart-title">
            {texts.moneyChartTitle}
          </h2>

          {empty ? (
            <p className={styles.text}>{texts.moneyEmpty}</p>
          ) : (
            <Chart
              series={[
                {
                  id: 'revenue',
                  name: texts.moneyRevenue,
                  points: money.weeks.map((week) => week.sum),
                },
              ]}
              labels={money.weeks.map((week) => week.label)}
              title={texts.moneyChartTitle}
              format={formatMoney}
            />
          )}
        </Card>

        <Card as="section" className={styles.panel} aria-labelledby="money-shares-title">
          <h2 className={styles.cardTitle} id="money-shares-title">
            {texts.moneySharesTitle}
          </h2>
          <p className={styles.text}>{texts.moneySharesNote}</p>

          {money.shares.length === 0 ? (
            <p className={styles.text}>{texts.moneyEmpty}</p>
          ) : (
            <Table variant="cards" label={texts.moneySharesTitle}>
              <thead>
                <tr role="row">
                  <th scope="col">{texts.moneyShareType}</th>
                  <th className={styles.right} scope="col">
                    {texts.moneyShareSum}
                  </th>
                  <th className={styles.right} scope="col">
                    {texts.moneyShareShare}
                  </th>
                </tr>
              </thead>
              <tbody>
                {money.shares.map((share) => (
                  <tr key={share.title} role="row">
                    <td role="cell" data-label={texts.moneyShareType}>
                      {share.title}
                    </td>
                    <td className={styles.money} role="cell" data-label={texts.moneyShareSum}>
                      {formatMoney(share.sum)}
                    </td>
                    <td className={styles.percent} role="cell" data-label={texts.moneyShareShare}>
                      {texts.moneySharePercent(share.percent)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}

/**
 * Плитка-переход: цифра без «куда идти» заставляет искать раздел в колонке
 * слева.
 *
 * 🔴 Ссылкой служит вся плитка, а не подпись под числом. Подпись — строка в
 * 17px высотой, и по WCAG 2.5.8 это цель меньше нормы: замер на 390 давал
 * 82×17 при 44×44 (ADR-183). Плитка целиком — цель 174×115, и попасть по ней
 * пальцем можно не целясь.
 */
function LinkedTile({
  href,
  label,
  value,
  note,
  className,
}: {
  readonly href: string | { readonly pathname: string; readonly query?: Record<string, string> };
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly className?: string | undefined;
}) {
  return (
    <Link
      className={[styles.tileLink, className].filter(Boolean).join(' ')}
      href={typeof href === 'string' ? { pathname: href } : href}
    >
      <StatTile className={styles.tile} label={label} value={value} note={note} />
    </Link>
  );
}
