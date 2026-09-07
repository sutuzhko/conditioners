import type { Metadata } from 'next';

import {
  EMPTY_REVIEW_FILTER,
  REVIEWS_PATH,
  ReviewFilters,
  ReviewList,
  ReviewTable,
  reviewModerationContent as texts,
  reviewFilterOf,
  reviewFilterOn,
  reviewStatusOfTab,
  reviewTabFromParam,
  reviewTabItems,
  reviewTabShowsTable,
  reviewsQuery,
  type ReviewCard,
  type ReviewFilter,
  type ReviewSearchParams,
  type ReviewTab,
} from '@/features/review-moderation';
import { requireOwnerPage } from '@/server/guards';
import { listByStatus } from '@/server/repo/reviews';
import { mediaExists } from '@/server/uploads/store';
import { pageNumber } from '@/shared/lib/paging';
import { Pager, TabLinks } from '@/shared/ui';
import { DataBlock, blockErrorNote } from '@/widgets/admin-shell';

import { ReviewsSkeleton } from './ReviewsSkeleton';
import styles from '../leads/page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Модерация отзывов.
 *
 * По умолчанию открывается на «На модерации»: именно они требуют решения, а
 * остальные вкладки — архив, в который заходят по надобности. Архив только
 * растёт — отклонённые и архивные не удаляются (инвариант 7), — поэтому
 * список разбит на страницы.
 *
 * 🔴 Вкладка и отбор разбираются здесь, до чтения данных: раздел идёт в базу
 * за тем статусом, что стоит в адресе, и приходит уже открытым на нём (issue
 * #340). Мусор в параметре открывает первую вкладку, а не роняет раздел
 * (#341).
 *
 * 🔴 Список уехал в свой кусок потока (issue #495). Вкладки и отбор зависят
 * только от адреса, а список — от базы и от диска: за снимками идёт по
 * `stat` на отзыв (`withPhotoState`), и держать ради них пустым весь экран
 * незачем. Выигрыш не только в скорости: упавший запрос теперь забирает
 * список, а не раздел — вкладка остаётся подсвеченной, набранный отбор
 * остаётся в полях, и «Повторить» стоит на месте списка (issue #581).
 *
 * 🔴 Заголовок ошибки называет отзывы, а не раздел: `DataBlock` стоит вокруг
 * одного блока, и обещать «раздел не загрузился», когда вкладки работают,
 * значит описывать экран неверно.
 */
export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<ReviewSearchParams>;
}) {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const params = await searchParams;
  const selected = reviewTabFromParam(params.tab);

  /* 🔴 Отбор действует только на «Все» — на остальных вкладках статус задаёт
     сама вкладка, и второе условие поверх неё означало бы два фильтра одного
     поля в одном экране (макет `ContentTabs`, вкладка 4). */
  const filter: ReviewFilter = selected === 'all' ? reviewFilterOf(params) : EMPTY_REVIEW_FILTER;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <TabLinks items={reviewTabItems()} active={selected} label={texts.filterLabel} />

      {selected === 'all' ? <ReviewFilters filter={filter} /> : null}

      <DataBlock
        skeleton={<ReviewsSkeleton />}
        title={texts.loadFailed}
        note={blockErrorNote(REVIEWS_PATH)}
      >
        <ReviewsBlock tab={selected} filter={filter} page={pageNumber(params.page)} />
      </DataBlock>
    </div>
  );
}

/**
 * Список и страницы — то, что приезжает отдельным куском потока.
 *
 * Обёртка `data-block` — единственный узел блока, не зависящий от данных: по
 * нему сквозные сценарии находят кусок потока и меряют его положение. Своей
 * геометрии она не приносит: `.block` — та же колонка с тем же зазором, что и
 * `.page`, и список стоит там же, где стояла заготовка.
 *
 * Пагинация живёт здесь же: число страниц знает только выборка, и вынести её
 * наружу значило бы сделать второй такой же запрос.
 */
async function ReviewsBlock({
  tab,
  filter,
  page,
}: {
  readonly tab: ReviewTab;
  readonly filter: ReviewFilter;
  readonly page: number;
}) {
  const status = reviewStatusOfTab(tab);

  const found = await listByStatus({
    ...(status === undefined ? {} : { status }),
    ...(filter.query === '' ? {} : { query: filter.query }),
    ...(filter.status === undefined ? {} : { status: filter.status }),
    ...(filter.rating === undefined ? {} : { rating: filter.rating }),
    page,
  });

  /* 🔴 Пустая вкладка и пустой раздел — разные новости с противоположными
     шагами (issue #335). Раздел стартует без единого отзыва (инвариант 10), и
     сказать там «их скрыл выбранный статус» значит соврать. Второй запрос
     уходит только тогда, когда вкладка пуста, — то есть почти никогда. */
  const anyReviews =
    found.total > 0 || (status !== undefined && (await listByStatus({ page: 1 })).total > 0);

  const reviews = await withPhotoState(found.items);

  return (
    <div className={styles.block} data-block="reviews">
      <ReviewsOfTab
        tab={tab}
        reviews={reviews}
        filtered={status !== undefined && anyReviews}
        searched={reviewFilterOn(filter)}
      />

      <Pager
        page={found.page}
        pages={found.pages}
        basePath={REVIEWS_PATH}
        query={reviewsQuery(tab, filter)}
        label={texts.pagerLabel}
        numbers
      />
    </div>
  );
}

/**
 * Помечает отзывы, у которых ссылка на снимок есть, а файла нет — issue #662.
 *
 * 🔴 Спрашивает диск сервер, а не браузер. Ссылка в базе и файл на томе живут
 * порознь: том переехал, каталог не примонтирован, база наполнена в другом
 * окружении. Без этой проверки карточка рисует значок битого файла и живую
 * ссылку «открыть в полный размер», ведущую в 404, — то есть выглядит
 * сломанной вёрсткой, а не отсутствующим снимком.
 *
 * По одному `stat` на отзыв со снимком, и только на показанной странице:
 * список разбит на страницы, а обращение к локальному тому стоит микросекунды
 * против запроса в базу, который страница уже сделала.
 */
async function withPhotoState(reviews: readonly ReviewCard[]): Promise<readonly ReviewCard[]> {
  return Promise.all(
    reviews.map(async (review) => {
      if (review.photo === null) return review;

      return { ...review, photoMissing: !(await mediaExists(review.photo)) };
    }),
  );
}

/**
 * Карточки или таблица — в зависимости от вкладки.
 *
 * 🔴 Карточки остались только на первой вкладке (issue #613): там решают по
 * тексту целиком. На остальных ищут конкретный отзыв — и там таблица со
 * своими колонками, а на «Все» ещё и сквозной отбор по статусу и оценке.
 *
 * Развилка здесь, а не внутри списка: карточка и строка таблицы — разные
 * представления с разной геометрией, и компонент, умеющий оба, был бы
 * переключателем на двести строк вместо двух компонентов по сто.
 */
function ReviewsOfTab({
  tab,
  reviews,
  filtered,
  searched,
}: {
  readonly tab: ReviewTab;
  readonly reviews: readonly ReviewCard[];
  readonly filtered: boolean;
  readonly searched: boolean;
}) {
  if (!reviewTabShowsTable(tab)) {
    return <ReviewList reviews={reviews} tab={tab} filtered={filtered} />;
  }

  return <ReviewTable reviews={reviews} tab={tab} filtered={filtered} searched={searched} />;
}
