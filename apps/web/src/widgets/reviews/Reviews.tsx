import type { ButtonLinkHref } from '@/shared/ui';

import { reviewsContent as t } from './content';
import { REVIEWS_DRIFT_FROM, type ReviewCardData } from './model';
import { ReviewsEmpty } from './ui/ReviewsEmpty';
import { ReviewsGallery } from './ui/ReviewsGallery';
import styles from './Reviews.module.css';

const HEADING_ID = 'reviews-title';

/**
 * Сколько мест держит лента на десктопе. Двенадцать — это шесть колонок по
 * два ряда: лента уходит за край даже на широком экране, и по затухающей
 * карточке справа сразу видно, что вбок она двигается. Число чётное: ряда
 * два, и нечётное оставило бы дыру в хвосте.
 *
 * 🔴 Мест столько только с 1200px. Ниже лента складывается в колонку и сетку,
 * и заготовки там не показываются вовсе: две настоящие карточки на телефоне —
 * это раздел, а не поломка (issue #274).
 */
const SLOTS = 12;

/**
 * Раскладка мест ленты: индекс отзыва или `null` под заготовку.
 *
 * Отзывы идут подряд с начала — первая карточка обязана быть видна целиком,
 * — а заготовки закрывают хвост, пока лента их не прокрутит.
 *
 * 🔴 Число мест чётное. Ряда два, и лента идёт колонками: нечётное число
 * оставило бы последнюю колонку без нижней карточки, а дубль, которым лента
 * замыкается сама на себя, начался бы с нижнего ряда — кладка на стыке
 * разъехалась бы на полкарточки (ADR-124).
 */
function layoutSlots(count: number): readonly (number | null)[] {
  const total = Math.max(SLOTS, count + (count % 2));

  return Array.from({ length: total }, (_, at) => (at < count ? at : null));
}

export interface ReviewsProps {
  /**
   * Одобренные отзывы в порядке вывода. 🔴 Блок в базу не ходит: список
   * приносит страница (docs/ORCHESTRATION.md, «Блок не ходит в базу»).
   *
   * Пустой список — основное состояние раздела: настоящих отзывов пока нет,
   * а выдуманные публиковать запрещено (инвариант 10, ADR-012).
   */
  reviews?: readonly ReviewCardData[] | undefined;
  /**
   * Адрес политики обработки персональных данных — уходит в форму. Пропсом,
   * а не литералом: `typedRoutes` не соберёт ссылку на несуществующий маршрут.
   */
  policyHref: ButtonLinkHref;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

/**
 * Отзывы: витрина чужого опыта (макет v2, «Отзывы»; issue #274).
 *
 * 🔴 Карточки приходят в HTML готовыми и индексируются без JavaScript
 * (инвариант 1): скрипт двигает ленту, но не рисует её содержимое. Отзывы
 * остаются в разметке целиком, сколько бы их ни было.
 *
 * Раскладок три, и выбирает между ними ширина, а не данные: до 600 — колонка
 * из двух карточек, до 1200 — сетка 2×2, дальше — лента с полями и
 * затуханием. Абзац на четыре строки в ленте на телефоне не читается: она
 * годится для того, что схватывается взглядом, а не для текста.
 *
 * Форма переехала в модальное окно: рядом с лентой она забирала половину
 * ширины у самих отзывов, ради которых в раздел и приходят.
 */
export function Reviews({ reviews = [], policyHref, id = 'reviews' }: ReviewsProps) {
  const empty = reviews.length === 0;

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {t.title}
          </h2>
          <p className={styles.lead}>{t.lead}</p>
        </header>
      </div>

      {/* 🔴 Пустой раздел — без карусели, а не карусель без карточек
          (issue #274). Лента из одних заготовок читается как поломка вёрстки,
          а карточка-приглашение, повторяющая отзыв, — как отзыв компании о
          самой себе (инвариант 10). */}
      {empty ? (
        <div className={styles.empty}>
          <ReviewsEmpty policyHref={policyHref} />
        </div>
      ) : (
        <ReviewsGallery
          reviews={reviews}
          slots={layoutSlots(reviews.length)}
          drift={reviews.length >= REVIEWS_DRIFT_FROM}
          policyHref={policyHref}
        />
      )}
    </section>
  );
}
