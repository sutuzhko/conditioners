import Image from 'next/image';
import { Badge, ButtonLink, Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import {
  EMPTY_SPEC_DICTIONARY,
  groupSpecs,
  type SpecDictionary,
} from '@/entities/product/lib/groupSpecs';
import { areaLabel, catalogText, photoAlt, powerClassLabel } from '../content';
import { mainPhoto, type CatalogProduct } from '../model';
import { ProductPrice } from './ProductPrice';
import styles from './ProductCard.module.css';

/**
 * Ширина исходника карточки. Фото хранится с длинной стороной 1200px, витрине
 * столько не нужно: 480×360 при соотношении 4:3 покрывает десктопную карточку
 * с запасом на ретину, а `sizes` даёт браузеру выбрать меньший вариант.
 */
const PHOTO_WIDTH = 480;
const PHOTO_HEIGHT = 360;
const PHOTO_SIZES = '(max-width: 599px) 100vw, (max-width: 1199px) 50vw, 300px';

export interface ProductCardProps {
  product: CatalogProduct;
  /** Куда ведёт «Заказать» — якорь формы заявки задаёт страница. */
  orderHref: ButtonLinkHref;
  /** Момент расчёта скидки. Задаётся в тестах и снепшотах, в проде — «сейчас». */
  now?: Date | undefined;
  /** Справочник характеристик: он задаёт группы и их порядок (ADR-094). */
  specDictionary?: SpecDictionary | undefined;
}

/** Карточка модели на витрине. Серверная: интерактивности здесь нет. */
export function ProductCard({
  product,
  orderHref,
  now,
  specDictionary = EMPTY_SPEC_DICTIONARY,
}: ProductCardProps) {
  const price = getActivePrice(product, now);
  const photo = mainPhoto(product.photos);
  const alt = photo?.alt?.trim();
  const specGroups = groupSpecs(product.specs, specDictionary);

  return (
    <Card as="li" padding="none" radius="ml" elevation="none" interactive className={styles.card}>
      <div className={styles.media}>
        {photo === null ? (
          // заглушка вместо битой картинки: у моделей из сидов фото ещё нет
          <div className={styles.fallback}>
            <span className={styles.fallbackClass}>{product.badge}</span>
            <span className={styles.fallbackHint}>{catalogText.noPhoto}</span>
            <span className="srOnly">{powerClassLabel(product.badge)}</span>
          </div>
        ) : (
          <>
            <Image
              className={styles.image}
              src={photo.url}
              alt={alt === undefined || alt === '' ? photoAlt(product.name) : alt}
              width={PHOTO_WIDTH}
              height={PHOTO_HEIGHT}
              sizes={PHOTO_SIZES}
            />
            <Badge
              variant="dark"
              size="sm"
              className={styles.class}
              title={powerClassLabel(product.badge)}
            >
              {product.badge}
            </Badge>
          </>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.area}>{areaLabel(product.areaMax)}</p>
        {product.tag === null ? null : (
          <Badge variant="accent" size="sm" className={styles.tag}>
            {product.tag}
          </Badge>
        )}

        <div className={styles.price}>
          <ProductPrice price={price} />
        </div>

        {specGroups.length === 0 ? null : (
          /* 🔴 `details`, а не показ по клику на JavaScript: характеристики
             обязаны быть в HTML всегда, даже когда свёрнуты. Свёрнутый список
             из сорока строк не ломает сетку витрины, а робот и читатель с
             отключённым JS видят его целиком — то же правило, что у FAQ. */
          <details className={styles.specs}>
            <summary className={styles.specsSummary}>
              {catalogText.specsSummary}
              <span className={styles.specsCount}>
                {catalogText.specsCount(product.specs.length)}
              </span>
            </summary>

            {specGroups.map((group) => (
              <div className={styles.specGroup} key={group.title}>
                <p className={styles.specGroupTitle}>{group.title}</p>
                <dl className={styles.specList}>
                  {group.items.map((item) => (
                    <div className={styles.specRow} key={item.k}>
                      <dt>{item.k}</dt>
                      <dd>{item.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </details>
        )}

        <div className={styles.actions}>
          <ButtonLink href={orderHref} variant="accent" fullWidth className={styles.order}>
            {catalogText.order}
          </ButtonLink>
          {product.link === null ? null : (
            // ссылка к поставщику: внешняя и чужая, поэтому обычный <a>,
            // без предзагрузки Next и без передачи веса домену
            <a
              className={styles.external}
              href={product.link}
              target="_blank"
              rel="noopener nofollow"
              aria-label={`${catalogText.external}: ${product.name}`}
            >
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
