import { ReviewsCta } from './ReviewsCta';
import type { ButtonLinkHref } from '@/shared/ui';

import { reviewsContent as t } from './content';
import type { ReviewCardData } from './model';
import { ReviewsGallery } from './ui/ReviewsGallery';
import styles from './Reviews.module.css';

const HEADING_ID = 'reviews-title';

/**
 * Сколько мест держит лента. Двенадцать — это шесть колонок по два ряда:
 * лента уходит за край даже на широком экране, и по обрезанной карточке
 * сразу видно, что вбок она двигается. Число чётное: ряда два, и нечётное
 * оставило бы дыру в хвосте.
 */
const SLOTS = 12;

/**
 * От скольких отзывов лента едет сама. Меньше — ход показывал бы одни
 * заготовки: отзывы уехали бы за край, а на их месте ползла бы пустота.
 */
const DRIFT_FROM = 6;

/**
 * Где стоит приглашение, когда отзывов нет вовсе. Чуть левее середины: оно
 * занимает колонку целиком, а сдвинутый второй ряд смещает всё вправо на
 * полкарточки — «математический» центр оказывается правее видимого.
 */
const INVITE_AT = Math.floor(SLOTS / 2) - 2;

/**
 * Раскладка мест: что показать в каждом.
 *
 * 🔴 Пока лента стоит, отзывы кладутся от середины: она и видна на экране,
 * а края уходят под обрез. Сложенные в начало, они оказались бы за левым
 * краем — человек увидел бы только заготовки. Когда отзывов хватает на ход
 * ленты, порядок обычный: они идут подряд с начала, а заготовки закрывают
 * хвост, пока лента их не прокрутит.
 */
function layoutSlots(count: number): readonly (number | null)[] {
  if (count === 0) return Array.from({ length: SLOTS }, () => null);

  if (count >= DRIFT_FROM) {
    /* 🔴 Число мест чётное. Ряда два, и лента идёт колонками: нечётное число
       оставило бы последнюю колонку без нижней карточки, а дубль, которым
       лента замыкается сама на себя, начался бы с нижнего ряда — кладка на
       стыке разъехалась бы на полкарточки (ADR-124). */
    const total = Math.max(SLOTS, count + (count % 2));

    return Array.from({ length: total }, (_, at) => (at < count ? at : null));
  }

  /* Ряда два, поэтому места идут парами: колонка — это два подряд идущих
     места. Отзывы занимают колонки, начиная с центральной. */
  const columns = SLOTS / 2;
  const used = Math.ceil(count / 2);
  /* Округляем вниз: сдвинутый второй ряд смещает пару вправо на полкарточки,
     и «математический» центр оказывается правее видимого. */
  const from = 2 * Math.floor((columns - used) / 2);

  return Array.from({ length: SLOTS }, (_, at) => {
    const index = at - from;
    return index >= 0 && index < count ? index : null;
  });
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
 * Отзывы: витрина чужого опыта (макет v2, «Отзывы»).
 *
 * 🔴 Карточки приходят в HTML готовыми и индексируются без JavaScript
 * (инвариант 1): скрипт двигает ленту, но не рисует её содержимое. Отзывы
 * остаются в разметке целиком, сколько бы их ни было.
 *
 * Лента всегда держит пять мест. Настоящие отзывы занимают их по порядку,
 * оставшиеся закрывают заготовки: раздел, где две карточки болтаются в пустой
 * строке, читается как сломанный, а не как молодой.
 *
 * Форма переехала в модальное окно: рядом с лентой она забирала половину
 * ширины у самих отзывов, ради которых в раздел и приходят.
 */
export function Reviews({ reviews = [], policyHref, id = 'reviews' }: ReviewsProps) {
  const slots = layoutSlots(reviews.length);

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {t.title}
          </h2>
          <p className={styles.lead}>{t.lead}</p>
          <ReviewsCta policyHref={policyHref} className={styles.cta} />
        </header>
      </div>

      {/* Лента шире контейнера: она едет от края до края, как в макете.
          🔴 Пока отзывов мало, лента не едет сама: двигать пустые заготовки —
          это движение ради движения, и приглашение в середине уезжало бы
          от глаз. */}
      <ReviewsGallery
        reviews={reviews}
        slots={slots}
        inviteAt={INVITE_AT}
        drift={reviews.length >= DRIFT_FROM}
      />
    </section>
  );
}
