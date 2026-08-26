import Image from 'next/image';
import Link from 'next/link';

import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import {
  EMPTY_SPEC_DICTIONARY,
  groupSpecs,
  type SpecDictionary,
} from '@/entities/product/lib/groupSpecs';
import { Badge, ButtonLink, Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { areaLabel, catalogText, photoAlt, powerClassLabel, productPageText as t } from './content';
import { mainPhoto, type CatalogProduct } from './model';
import { ProductPrice } from './ui/ProductPrice';
import styles from './ProductDetails.module.css';

/**
 * Главное фото — LCP-элемент страницы, поэтому оно с `priority` и в размере
 * своего места: 4:3, 720px по длинной стороне хватает колонке в 560px с
 * запасом на ретину. Остальные снимки — миниатюрами.
 */
const MAIN_WIDTH = 720;
const MAIN_HEIGHT = 540;
const MAIN_SIZES = '(max-width: 899px) 100vw, 560px';
const THUMB_WIDTH = 200;
const THUMB_HEIGHT = 150;
const THUMB_SIZES = '120px';

export interface ProductDetailsProps {
  readonly product: CatalogProduct;
  /** Кнопка заявки: форма живёт секцией лендинга, сюда приходит её адрес. */
  readonly orderHref: ButtonLinkHref;
  /** Возврат в каталог. */
  readonly catalogHref: ButtonLinkHref;
  /** 🔴 Момент расчёта скидки — тот же, что ушёл в разметку (ADR-101). */
  readonly now?: Date | undefined;
  /** Справочник характеристик: он раскладывает их по группам (ADR-094). */
  readonly specDictionary?: SpecDictionary | undefined;
}

/**
 * Страница модели (ADR-109): единственный `h1`, все характеристики, фото,
 * действующая цена и кнопка заявки.
 *
 * Серверный блок: цена и характеристики приходят в HTML готовыми — товарный
 * сниппет собирается из того же, что видит человек (инвариант 9).
 *
 * 🔴 Здесь и только здесь живут полные характеристики: в карточке витрины их
 * больше нет, чтобы один и тот же список не лежал на сайте дважды.
 */
export function ProductDetails({
  product,
  orderHref,
  catalogHref,
  now,
  specDictionary = EMPTY_SPEC_DICTIONARY,
}: ProductDetailsProps) {
  const price = getActivePrice(product, now);
  const main = mainPhoto(product.photos);
  const rest = product.photos.filter((photo) => photo.id !== main?.id);
  const groups = groupSpecs(product.specs, specDictionary);

  const altOf = (alt: string | null): string => {
    const own = alt?.trim() ?? '';
    return own === '' ? photoAlt(product.name) : own;
  };

  return (
    <article className={styles.page}>
      <div className={styles.container}>
        <header className={styles.head}>
          <Badge variant="dark" size="sm" title={powerClassLabel(product.badge)}>
            {product.badge}
          </Badge>
          <h1 className={styles.title}>{product.name}</h1>
          {product.tag === null ? null : (
            <Badge variant="accent" size="sm" className={styles.tag}>
              {product.tag}
            </Badge>
          )}
          <p className={styles.lead}>{t.lead(product.badge, product.areaMax)}</p>
        </header>

        <div className={styles.main}>
          <div className={styles.gallery}>
            {main === null ? (
              // фото ещё не загружено — заглушка вместо битой картинки
              <div className={styles.fallback}>
                <span className={styles.fallbackClass}>{product.badge}</span>
                <span className={styles.fallbackHint}>{catalogText.noPhoto}</span>
                <span className="srOnly">{powerClassLabel(product.badge)}</span>
              </div>
            ) : (
              <Image
                className={styles.mainPhoto}
                src={main.url}
                alt={altOf(main.alt)}
                width={MAIN_WIDTH}
                height={MAIN_HEIGHT}
                sizes={MAIN_SIZES}
                priority
              />
            )}

            {rest.length === 0 ? null : (
              /* Все снимки лежат в HTML сразу: галерея с переключением по
                 клику — это JavaScript ради того, что и так помещается в
                 разметку, и картинки, которых не увидит Яндекс.Картинки. */
              <ul className={styles.thumbs} aria-label={t.photosLabel}>
                {rest.map((photo) => (
                  <li key={photo.id}>
                    <Image
                      className={styles.thumb}
                      src={photo.url}
                      alt={altOf(photo.alt)}
                      width={THUMB_WIDTH}
                      height={THUMB_HEIGHT}
                      sizes={THUMB_SIZES}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Card padding="lg" className={styles.offer}>
            <p className={styles.area}>{areaLabel(product.areaMax)}</p>
            <ProductPrice price={price} />
            {/* Главное действие страницы — заливкой брендом, а не акцентной
                пилюлей карточки: на витрине «Заказать» одна из четырёх кнопок
                в ряду, здесь она единственная. */}
            <ButtonLink href={orderHref} size="lg" fullWidth className={styles.cta}>
              {t.order}
            </ButtonLink>
            {product.link === null ? null : (
              // чужой сайт: обычная ссылка, без предзагрузки и без веса домену
              <a
                className={styles.external}
                href={product.link}
                target="_blank"
                rel="noopener nofollow"
              >
                {catalogText.external}
                <span aria-hidden="true"> ↗</span>
              </a>
            )}
          </Card>
        </div>

        <section className={styles.specs} aria-labelledby="product-specs">
          <h2 className={styles.specsTitle} id="product-specs">
            {t.specsTitle}
          </h2>

          {groups.length === 0 ? (
            <p className={styles.specsEmpty}>{t.specsEmpty}</p>
          ) : (
            <div className={styles.specGroups}>
              {groups.map((group) => (
                <div className={styles.specGroup} key={group.title}>
                  <h3 className={styles.specGroupTitle}>{group.title}</h3>
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
            </div>
          )}
        </section>

        <p className={styles.back}>
          <Link href={catalogHref} className={styles.backLink}>
            {t.backToCatalog}
          </Link>
        </p>
      </div>
    </article>
  );
}
