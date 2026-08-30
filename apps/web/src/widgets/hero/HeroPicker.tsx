'use client';

import Image from 'next/image';
import { useId, useState, type ReactNode } from 'react';

import type { LeadContextModel } from '@/entities/lead/model';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { pickByArea } from '@/entities/product/lib/pickByArea';
import type { PickerProduct } from './model';
import { rememberLeadContext } from '@/features/lead-form';
import { leadHref as leadHrefFor } from '@/shared/config/lead';
import { formatDate, formatMoney } from '@/shared/lib/format';
import type { ButtonLinkHref } from '@/shared/ui';
import { Badge, Button, ButtonLink, Card, Chip, RangeSlider, Skeleton } from '@/shared/ui';

import { pickerContent as t } from './content';
import {
  AREA_DEFAULT,
  AREA_MAX,
  AREA_MIN,
  PLACE_SHORT,
  PLACE_TYPES,
  type PlaceType,
} from './model';
import styles from './HeroPicker.module.css';

export type HeroPickerProps = {
  /** Видимые модели каталога. Пустой список — рабочее состояние проекта. */
  readonly products: readonly PickerProduct[];
  /**
   * Куда ведёт «подобрать по телефону» — общая кнопка первого экрана, у
   * которой предмета нет. 🔴 Кнопка у рекомендованной модели сюда не смотрит:
   * её адрес несёт слаг этой модели и считается на месте (ADR-129).
   */
  readonly leadHref: ButtonLinkHref;
  /** Момент расчёта скидки. Задаётся в тестах и историях, чтобы цена не «плыла». */
  readonly now?: Date | undefined;
  /**
   * Панель считает подбор заново: вместо данных — скелетоны тех же размеров,
   * кнопка на месте и приглушена.
   *
   * Проп, а не внутренний флаг: сегодня `pickByArea` считает синхронно и
   * состояние в бою не наступает, но высота карточки обязана быть одинаковой
   * во всех трёх состояниях **заранее** — иначе доказать это нечем, а первый
   * же асинхронный подбор придёт вместе с прыжком вёрстки. Задаётся в
   * историях и тестах — как и `now` выше.
   */
  readonly pending?: boolean | undefined;
};

/** Размер миниатюры модели в панели рекомендации — из макета. */
const PHOTO_SIZE = 104;

/**
 * 🔴 Размер на экране, а не размер файла. Миниатюра фиксирована вёрсткой —
 * 62px на всех ширинах, — а без подсказки `next/image` считает картинку
 * растянутой во всю ширину окна и тянет вариант `w=256`. Это первый экран,
 * то есть ровно то место, где считается LCP (BUGS §2528).
 */
const PHOTO_SIZES = '62px';

/**
 * Что показывает панель результата. Все три состояния лежат в разметке всегда
 * и в одной ячейке грида: высоту панели задаёт самое высокое из них, а кнопка
 * каждого прижата к низу — значит её координата одинакова во всех трёх
 * (issue #256). Держать высоту числом нельзя: она зависит и от ширины, и от
 * длины названия модели.
 */
type ResultState = 'found' | 'pending' | 'nofit';

function resultState(pending: boolean, fits: boolean): ResultState {
  if (pending) return 'pending';

  return fits ? 'found' : 'nofit';
}

/**
 * Подбор кондиционера по площади — единственная интерактивная часть первого
 * экрана, поэтому `'use client'` стоит здесь, а не на секции: заголовок и лид
 * обязаны приходить готовым HTML (инвариант 1).
 *
 * Считает домен: `pickByArea` (docs/PROJECT.md §2.3) и `getActivePrice`.
 * Своей логики подбора и своей арифметики скидки здесь нет.
 */
export function HeroPicker({ products, leadHref, now, pending = false }: HeroPickerProps) {
  const [area, setArea] = useState(AREA_DEFAULT);
  const [place, setPlace] = useState<PlaceType>(PLACE_TYPES[0]);
  const placeLabelId = useId();

  const recommended = pickByArea(products, area, place);

  /* Каталог пуст — подбирать не из чего, и ползунок без результата бессмыслен.
     Это не одно из трёх состояний панели, а другая карточка целиком. */
  if (recommended === null) {
    return (
      <Card padding="lg" radius="xxl" elevation="raised" className={styles.card}>
        <div className={styles.head}>
          {/* «онлайн-расчёт» обещает то, чего при пустом каталоге нет */}
          <h2 className={styles.eyebrow}>{t.title}</h2>
        </div>
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t.emptyTitle}</p>
          <p className={styles.emptyText}>{t.emptyText}</p>
          <ButtonLink href={leadHref} size="lg" fullWidth>
            {t.emptyCta}
          </ButtonLink>
        </div>
      </Card>
    );
  }

  /* 🔴 Подобранная модель закрывает заданную площадь — или не закрывает.
     `pickByArea` при нехватке мощности честно отдаёт самую сильную модель
     (docs/PROJECT.md §2.3), но выдавать её за подходящую нельзя: «до 50 м²»
     под запрос на 58 м² — это цена, которая не совпадёт с телефонной. */
  const state = resultState(pending, recommended.areaMax >= area);

  return (
    <Card padding="lg" radius="xxl" elevation="raised" className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.eyebrow}>{t.title}</h2>
        <span className={styles.live}>
          <span className={styles.dot} aria-hidden="true" />
          {t.liveNote}
        </span>
      </div>

      {/* Результат встаёт рядом с ползунком, когда карточка достаточно широка,
          — см. контейнерный запрос в модуле стилей. */}
      <div className={styles.body}>
        <div className={styles.controls}>
          <RangeSlider
            label={t.areaLabel}
            value={area}
            onChange={setArea}
            min={AREA_MIN}
            max={AREA_MAX}
            formatValue={t.area}
          />

          <div className={styles.places}>
            <span className={styles.placesLabel} id={placeLabelId}>
              {t.placeLabel}
            </span>
            <div className={styles.chips} role="group" aria-labelledby={placeLabelId}>
              {PLACE_TYPES.map((option) => (
                <Chip
                  key={option}
                  size="sm"
                  className={styles.placeChip}
                  selected={option === place}
                  onClick={() => setPlace(option)}
                  /* Имя кнопки не зависит от ширины экрана: видимая подпись
                     на телефоне короче, а читалка слышит полную. */
                  aria-label={option}
                >
                  <span className={styles.placeFull}>{option}</span>
                  <span className={styles.placeShort}>{PLACE_SHORT[option]}</span>
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <Card
          variant="panel"
          padding="md"
          className={styles.result}
          aria-busy={pending || undefined}
        >
          <span className={styles.glow} aria-hidden="true" />

          <div className={styles.states} aria-live="polite">
            <ResultBox active={state === 'found'}>
              <Recommendation product={recommended} now={now} area={area} place={place} />
            </ResultBox>

            <ResultBox active={state === 'pending'}>
              <Recalculating />
            </ResultBox>

            <ResultBox active={state === 'nofit'}>
              <NoFit area={area} place={place} leadHref={leadHref} />
            </ResultBox>
          </div>

          <p className={styles.disclaimer}>{t.disclaimer}</p>
        </Card>
      </div>
    </Card>
  );
}

type ResultBoxProps = {
  readonly active: boolean;
  readonly children: ReactNode;
};

/**
 * Оболочка одного состояния панели.
 *
 * 🔴 Спрятанное выключается тремя способами сразу, и это не перестраховка.
 * `visibility` убирает его из отрисовки и из порядка обхода, но сохраняет
 * место — на нём и держится равная высота. `inert` запрещает взаимодействие.
 * `aria-hidden` убирает из дерева доступности — и он же единственный, который
 * видит jsdom: CSS-модули там не применяются, и без него запрос по роли нашёл
 * бы три кнопки вместо одной (урок ADR-159: тест, который не может упасть,
 * хуже отсутствующего).
 */
function ResultBox({ active, children }: ResultBoxProps) {
  const hidden = !active;

  return (
    <div
      className={styles.state}
      data-hidden={hidden || undefined}
      inert={hidden}
      aria-hidden={hidden || undefined}
    >
      {children}
    </div>
  );
}

type RecommendationProps = {
  readonly product: PickerProduct;
  readonly now?: Date | undefined;
  /** Что человек задал в подборе — уезжает вместе с заявкой. */
  readonly area: number;
  readonly place: PlaceType;
};

function Recommendation({ product, now, area, place }: RecommendationProps) {
  const price = now === undefined ? getActivePrice(product) : getActivePrice(product, now);
  const photo = product.photo;

  /* 🔴 Цена в снимке — та, что стоит строкой ниже, и перечёркнутая только
     тогда, когда она действительно показана (инвариант 14, ADR-011). */
  const model: LeadContextModel = {
    slug: product.slug,
    name: product.name,
    price: price.currentPrice,
    oldPrice: price.oldPrice,
  };

  return (
    <>
      <div className={styles.resultHead}>
        <span className={styles.resultEyebrow}>{t.recommendation}</span>
        <Badge variant="accent" size="sm">
          {product.badge}
        </Badge>
      </div>

      <div className={styles.model}>
        {photo === null ? (
          /* Рамка вместо битой картинки (docs/DESIGN_BRIEF.md §8). Класса
             мощности здесь больше нет: он переехал пилюлей в шапку панели
             (issue #255), а повторять его дважды в четырёх сантиметрах — шум.
             Слот остаётся всегда: без него высота панели зависела бы от того,
             завёл ли владелец фотографию именно этой модели. */
          <span className={styles.photoStub} aria-hidden="true" />
        ) : (
          <Image
            className={styles.photo}
            src={photo.url}
            alt={photo.alt ?? t.photoAlt(product.name)}
            width={PHOTO_SIZE}
            height={PHOTO_SIZE}
            sizes={PHOTO_SIZES}
          />
        )}

        <div className={styles.modelInfo}>
          <h3 className={styles.modelName}>{product.name}</h3>
          <p className={styles.specs}>{product.specsLine}</p>
          {product.tag === null ? null : <p className={styles.tag}>{product.tag}</p>}
        </div>
      </div>

      <div className={styles.priceRow}>
        <span className={styles.price}>{formatMoney(price.currentPrice)}</span>
        {price.oldPrice === null ? null : (
          <s className={styles.oldPrice}>{formatMoney(price.oldPrice)}</s>
        )}
        <span className={styles.priceNote}>{t.priceNote}</span>
        {product.link === null ? null : (
          <a className={styles.modelLink} href={product.link} target="_blank" rel="noreferrer">
            {t.modelLink}
          </a>
        )}
      </div>

      {/* 🔴 Строка скидки занимает свою высоту всегда, даже пустая (ADR-126).
          Ползунок площади меняет рекомендованную модель, у соседней скидки
          может не быть — и без резерва панель становится ниже, а кнопка уезжает
          вверх ровно тогда, когда в неё целятся. CLS этого не ловит: сдвиг в
          пределах 500 мс после действия человека не засчитывается.

          Плашка и срок стоят одной строкой, а не двумя: обе про одну и ту же
          скидку, и два пустых резерва подряд — это 27 лишних точек дырки в
          первом экране у каждой модели без скидки. */}
      <p className={styles.saleRow}>
        {price.saleActive ? (
          <Badge variant="accent" size="sm">
            {price.saleLabel ?? `−${price.discountPercent}%`}
          </Badge>
        ) : null}
        {price.saleTo === null ? null : (
          <span className={styles.saleUntil}>{t.saleUntil(formatDate(price.saleTo))}</span>
        )}
      </p>

      {/* 🔴 Две разные вещи, и обе нужны (ADR-129, ADR-133). Адрес несёт
          видимый предмет — модель и тему, — и переживает пересылку ссылки;
          снимок подбора невидим и остаётся снимком того, что человек делал.
          Подбор фиксируется в момент перехода к форме, а не на каждое
          движение ползунка: в заявку обязано попасть то, с чем человек пошёл
          оставлять телефон, а не то, мимо чего он проехал. */}
      <ButtonLink
        href={leadHrefFor({ model: product.slug, topic: 'install' })}
        size="md"
        fullWidth
        className={styles.cta}
        onClick={() => rememberLeadContext({ pick: { area, place, model } })}
      >
        {t.order}
      </ButtonLink>
    </>
  );
}

/**
 * Идёт пересчёт: на месте данных — скелетоны ровно тех размеров, которые
 * данные займут (docs/CLAUDE.md, «Формы и состояния»: скелетон, а не
 * «Загрузка…» и не пустота).
 *
 * 🔴 Кнопка остаётся на месте и приглушена до 55%, а не спрятана: `visibility`
 * убирает имя из дерева доступности, и читалка объявила бы безымянную кнопку
 * на самом дорогом шаге сайта (ADR-159).
 */
function Recalculating() {
  return (
    <>
      <div className={styles.resultHead}>
        <span className={styles.resultEyebrow}>{t.recommendation}</span>
        <Skeleton variant="block" width="34px" height="18px" className={styles.skel} />
      </div>

      <div className={styles.model}>
        <Skeleton variant="block" width="62px" height="62px" className={styles.skelPhoto} />
        <div className={styles.modelInfo}>
          <Skeleton variant="block" width="210px" height="22px" className={styles.skel} />
          <Skeleton variant="block" width="160px" height="14px" className={styles.skel} />
        </div>
      </div>

      <div className={styles.priceRow}>
        <Skeleton variant="block" width="140px" height="30px" className={styles.skel} />
      </div>

      <p className={styles.saleUntil} />

      <Button variant="solid" size="md" fullWidth className={styles.cta} disabled>
        {t.order}
      </Button>

      {/* Скелетоны — декорация и помечены `aria-hidden`; читалке нужно слово */}
      <span className="srOnly">{t.pendingNote}</span>
    </>
  );
}

type NoFitProps = {
  readonly area: number;
  readonly place: PlaceType;
  readonly leadHref: ButtonLinkHref;
};

/**
 * Подходящей модели нет: заданную площадь одним блоком не закрыть.
 *
 * 🔴 Пустое состояние ведёт к разговору, а не в тупик, и не показывает цены:
 * смету на мульти-сплит считают по месту, а всё показанное на сайте обязано
 * совпасть с тем, что скажут по телефону.
 */
function NoFit({ area, place, leadHref }: NoFitProps) {
  return (
    <>
      <div className={styles.resultHead}>
        <span className={styles.resultEyebrow}>{t.noFitEyebrow}</span>
      </div>

      <h3 className={styles.noFitTitle}>{t.noFitTitle(area)}</h3>
      <p className={styles.noFitText}>{t.noFitText}</p>

      {/* Модели в снимке нет — подбирать было не из чего; площадь и помещение
          уезжают с заявкой и есть с чего начать разговор. */}
      <ButtonLink
        href={leadHref}
        size="md"
        fullWidth
        className={styles.cta}
        onClick={() => rememberLeadContext({ pick: { area, place, model: null } })}
      >
        {t.noFitCta}
      </ButtonLink>
    </>
  );
}
