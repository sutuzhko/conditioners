'use client';

import Image from 'next/image';
import { useId, useState } from 'react';

import type { LeadContextModel } from '@/entities/lead/model';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { pickByArea } from '@/entities/product/lib/pickByArea';
import type { PickerProduct } from './model';
import { rememberLeadContext } from '@/features/lead-form';
import { leadHref as leadHrefFor } from '@/shared/config/lead';
import { formatDate, formatMoney } from '@/shared/lib/format';
import type { ButtonLinkHref } from '@/shared/ui';
import { Badge, ButtonLink, Card, Chip, RangeSlider } from '@/shared/ui';

import { pickerContent as t } from './content';
import { AREA_DEFAULT, AREA_MAX, AREA_MIN, PLACE_TYPES, type PlaceType } from './model';
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

/** Сколько характеристик выносим в строку под названием: длиннее — не читается. */
/**
 * «21 дБ · 0.7 кВт · до 27 м²» — набор характеристик произвольный (инвариант 6),
 * поэтому берём первые по порядку владельца. Площадь выводим из `areaMax`, а
 * одноимённую характеристику отбрасываем: в сидах она дублирует то же значение.
 */
/**
 * Подбор кондиционера по площади — единственная интерактивная часть первого
 * экрана, поэтому `'use client'` стоит здесь, а не на секции: заголовок и лид
 * обязаны приходить готовым HTML (инвариант 1).
 *
 * Считает домен: `pickByArea` (docs/PROJECT.md §2.3) и `getActivePrice`.
 * Своей логики подбора и своей арифметики скидки здесь нет.
 */
export function HeroPicker({ products, leadHref, now }: HeroPickerProps) {
  const [area, setArea] = useState(AREA_DEFAULT);
  const [place, setPlace] = useState<PlaceType>(PLACE_TYPES[0]);
  const placeLabelId = useId();

  const recommended = pickByArea(products, area, place);

  return (
    <Card padding="lg" radius="xxl" elevation="raised" className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.eyebrow}>{t.title}</h2>
        {/* «онлайн-расчёт» обещает то, чего при пустом каталоге нет */}
        {recommended === null ? null : (
          <span className={styles.live}>
            <span className={styles.dot} aria-hidden="true" />
            {t.liveNote}
          </span>
        )}
      </div>

      {recommended === null ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{t.emptyTitle}</p>
          <p className={styles.emptyText}>{t.emptyText}</p>
          <ButtonLink href={leadHref} size="lg" fullWidth>
            {t.emptyCta}
          </ButtonLink>
        </div>
      ) : (
        <>
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
                <Chip key={option} selected={option === place} onClick={() => setPlace(option)}>
                  {option}
                </Chip>
              ))}
            </div>
          </div>

          <Recommendation product={recommended} now={now} area={area} place={place} />
        </>
      )}
    </Card>
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
    <Card variant="panel" padding="md" className={styles.result} aria-live="polite">
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.resultEyebrow}>{t.recommendation}</span>

      <div className={styles.model}>
        {photo === null ? (
          // заглушка с классом мощности вместо битой картинки (docs/DESIGN_BRIEF.md §8)
          <span className={styles.photoStub} aria-hidden="true">
            {product.badge}
          </span>
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
          <div className={styles.modelHead}>
            <Badge variant="accent" size="sm">
              {product.badge}
            </Badge>
            <h3 className={styles.modelName}>{product.name}</h3>
          </div>
          <p className={styles.specs}>{product.specsLine}</p>
          {product.tag === null ? null : <p className={styles.tag}>{product.tag}</p>}
        </div>
      </div>

      <div className={styles.priceRow}>
        <span className={styles.price}>{formatMoney(price.currentPrice)}</span>
        {price.oldPrice === null ? null : (
          <s className={styles.oldPrice}>{formatMoney(price.oldPrice)}</s>
        )}
        {price.saleActive ? (
          <Badge variant="accent" size="sm" className={styles.saleBadge}>
            {price.saleLabel ?? `−${price.discountPercent}%`}
          </Badge>
        ) : null}
        <span className={styles.priceNote}>{t.priceNote}</span>
        {product.link === null ? null : (
          <a className={styles.modelLink} href={product.link} target="_blank" rel="noreferrer">
            {t.modelLink}
          </a>
        )}
      </div>

      {/* 🔴 Строка срока занимает свою высоту и без скидки (ADR-126). Ползунок
          площади меняет рекомендованную модель, у соседней скидки может не
          быть — и без резерва кнопка «Получить смету» уезжает вверх ровно
          тогда, когда в неё целятся. CLS этого не ловит: сдвиг в пределах
          500 мс после действия человека не засчитывается. */}
      <p className={styles.saleUntil}>
        {price.saleTo === null ? '' : t.saleUntil(formatDate(price.saleTo))}
      </p>

      {/* 🔴 Две разные вещи, и обе нужны (ADR-129, ADR-133). Адрес несёт
          видимый предмет — модель и тему, — и переживает пересылку ссылки;
          снимок подбора невидим и остаётся снимком того, что человек делал.
          Подбор фиксируется в момент перехода к форме, а не на каждое
          движение ползунка: в заявку обязано попасть то, с чем человек пошёл
          оставлять телефон, а не то, мимо чего он проехал. */}
      <ButtonLink
        href={leadHrefFor({ model: product.slug, topic: 'install' })}
        size="lg"
        fullWidth
        className={styles.orderCta}
        onClick={() => rememberLeadContext({ pick: { area, place, model } })}
      >
        {t.order}
      </ButtonLink>
      <p className={styles.disclaimer}>{t.disclaimer}</p>
    </Card>
  );
}
