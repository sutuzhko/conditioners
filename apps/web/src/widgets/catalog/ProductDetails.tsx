import Image from 'next/image';
import Link from 'next/link';

import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import {
  EMPTY_SPEC_DICTIONARY,
  groupSpecs,
  type SpecDictionary,
} from '@/entities/product/lib/groupSpecs';
import { leadHref } from '@/shared/config/lead';
import { Badge, ButtonLink, Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import {
  areaLabel,
  catalogText,
  compareMarkLabel,
  photoAlt,
  powerClassLabel,
  productPageText as t,
} from './content';
import { mainPhoto, type CatalogProduct, type ProductHref } from './model';
import { ProductCta } from './ui/ProductCta';
import { ProductPrice } from './ui/ProductPrice';
import { SimilarProducts } from './ui/SimilarProducts';
import styles from './ProductDetails.module.css';

/**
 * Главное фото — LCP-элемент страницы, поэтому оно с `priority` и в размере
 * своего места: 16:10, 720px по длинной стороне хватает колонке в 560px с
 * запасом на ретину. Остальные снимки — миниатюрами.
 *
 * 🔴 Пропорция та же, что у карточки витрины (issue #259): человек приходит
 * сюда с карточки, и снимок не должен менять форму по дороге.
 */
const MAIN_WIDTH = 720;
const MAIN_HEIGHT = 450;

/**
 * 🔴 Границы совпадают с раскладкой страницы: до 600 снимок занимает ширину
 * контейнера, с 600 рядом встаёт колонка цены и забирает свои 280–360px,
 * с 1200 контейнер упирается в 1200 и колонка перестаёт расти.
 */
const MAIN_SIZES =
  '(max-width: 599px) calc(100vw - 32px), (max-width: 1199px) calc(100vw - 340px), 800px';
const THUMB_WIDTH = 200;
const THUMB_HEIGHT = 125;
const THUMB_SIZES = '120px';

export interface ProductDetailsProps {
  readonly product: CatalogProduct;
  /** Возврат в каталог. */
  readonly catalogHref: ButtonLinkHref;
  /**
   * Каталог с этой моделью, отмеченной для сравнения. Не задан — отметки на
   * странице нет: так же, как у карточки витрины, где сравнивать не с чем.
   */
  readonly compareHref?: ButtonLinkHref | undefined;
  /**
   * Похожие модели — уже отобранные страницей из того же списка каталога
   * (`similarProducts`). Пусто — раздела нет.
   */
  readonly similar?: readonly CatalogProduct[] | undefined;
  /** Адреса страниц моделей: нужны только вместе с `similar`. */
  readonly productHref?: ProductHref | undefined;
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
  catalogHref,
  compareHref,
  similar = [],
  productHref,
  now,
  specDictionary = EMPTY_SPEC_DICTIONARY,
}: ProductDetailsProps) {
  const price = getActivePrice(product, now);
  const main = mainPhoto(product.photos);
  const groups = groupSpecs(product.specs, specDictionary);

  /* 🔴 В полосе идут все снимки, включая открытый наверху (BUGS, аудит 28
     августа). Без него полоса выглядит переключателем, у которого нет
     текущего положения: под большой картинкой лежит одна чужая миниатюра, и
     вернуться к тому, что показано, нечем. */
  const thumbs = main === null ? [] : [main, ...product.photos.filter((p) => p.id !== main.id)];

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

            {thumbs.length < 2 ? null : (
              /* Все снимки лежат в HTML сразу: галерея с переключением по
                 клику — это JavaScript ради того, что и так помещается в
                 разметку, и картинки, которых не увидит Яндекс.Картинки. */
              <ul className={styles.thumbs} aria-label={t.photosLabel}>
                {thumbs.map((photo, index) => (
                  <li
                    key={photo.id}
                    className={index === 0 ? styles.thumbCurrent : undefined}
                    aria-current={index === 0 ? 'true' : undefined}
                  >
                    <Image
                      className={styles.thumb}
                      src={photo.url}
                      alt={altOf(photo.alt)}
                      width={THUMB_WIDTH}
                      height={THUMB_HEIGHT}
                      sizes={THUMB_SIZES}
                    />
                    {index === 0 ? <span className="srOnly">{t.currentPhoto}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.aside}>
            <Card padding="lg" className={styles.offer}>
              <p className={styles.area}>{areaLabel(product.areaMax)}</p>
              <ProductPrice price={price} />
              {/* Главное действие страницы — заливкой брендом, а не акцентной
                  пилюлей карточки: на витрине «Заказать» одна из четырёх кнопок
                  в ряду, здесь она единственная.

                  🔴 Кнопка уводит к форме вместе со своим предметом (ADR-129):
                  модель здесь ровно одна, и заставлять человека печатать её
                  название заново — потерянная заявка. */}
              <ButtonLink
                href={leadHref({ model: product.slug, topic: 'install' })}
                size="lg"
                fullWidth
                className={styles.cta}
              >
                {t.order}
              </ButtonLink>

              {compareHref === undefined ? null : (
                /* 🔴 Отметка сравнения — та же ссылка, что в каталоге
                   (ADR-109): выбор живёт в адресе, а не в состоянии. Со
                   страницы модели она уводит в каталог, где эта модель уже
                   отмечена, — сравнивать в одиночку нечего. */
                <Link
                  href={compareHref}
                  className={styles.compare}
                  aria-label={compareMarkLabel(product.name, false)}
                >
                  <span className={styles.compareMark} aria-hidden="true">
                    +
                  </span>
                  {catalogText.compareAdd}
                </Link>
              )}

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
        </div>

        {similar.length === 0 || productHref === undefined ? null : (
          <SimilarProducts products={similar} productHref={productHref} now={now} />
        )}

        {/* 🔴 Вторая дорога к заявке — внизу страницы, где человек дочитал
            характеристики и решает (BUGS: страница кончалась ничем). Она же
            закрывает страницу: отдельной ссылки «← Весь каталог» под ней
            больше нет — выход в каталог стоит здесь же, рядом с вопросом. */}
        <ProductCta
          leadHref={leadHref({ model: product.slug, topic: 'consult' })}
          catalogHref={catalogHref}
        />
      </div>
    </article>
  );
}
