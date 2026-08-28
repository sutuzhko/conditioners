import Image from 'next/image';
import Link from 'next/link';

import { Badge, ButtonLink, Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { leadHref } from '@/shared/config/lead';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { areaLabel, catalogText, compareMarkLabel, photoAlt, powerClassLabel } from '../content';
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
  /** Адрес страницы модели: карточка — вход в неё (ADR-109). */
  detailsHref: ButtonLinkHref;
  /**
   * Адрес с отметкой сравнения: тот же каталог, но со слагом этой модели,
   * добавленным в `?compare=` или убранным оттуда. Не задан — отметки на
   * карточке нет вовсе (страница модели, снимок без сравнения).
   */
  compareHref?: ButtonLinkHref | undefined;
  /** Модель уже отмечена: подпись меняется, а ссылка снимает отметку. */
  compared?: boolean | undefined;
  /** Момент расчёта скидки. Задаётся в тестах и снепшотах, в проде — «сейчас». */
  now?: Date | undefined;
}

/**
 * Карточка модели на витрине и в каталоге. Серверная: интерактивности нет.
 *
 * 🔴 Полных характеристик в карточке нет (ADR-109): они живут на странице
 * модели. Один и тот же список в двух местах — внутренний дубль, а сорок
 * свёрнутых строк в каждой из двенадцати карточек утяжеляли бы HTML каталога
 * втрое без единого нового слова для поиска.
 *
 * Ссылка на модель одна — заголовок; кликабельна при этом вся карточка
 * (перекрытие в CSS). Второй ссылки с анкором «Подробнее» здесь нет
 * сознательно: осмысленный анкор — название модели (docs/SEO.md §5), а два
 * пункта на один адрес в списке ссылок скринридера — шум.
 */
export function ProductCard({
  product,
  detailsHref,
  compareHref,
  compared = false,
  now,
}: ProductCardProps) {
  const price = getActivePrice(product, now);
  const photo = mainPhoto(product.photos);
  const alt = photo?.alt?.trim();

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
        <h3 className={styles.name}>
          <Link href={detailsHref} className={styles.nameLink}>
            {product.name}
          </Link>
        </h3>
        <p className={styles.area}>{areaLabel(product.areaMax)}</p>
        {product.tag === null ? null : (
          <Badge variant="accent" size="sm" className={styles.tag}>
            {product.tag}
          </Badge>
        )}

        <div className={styles.price}>
          <ProductPrice price={price} />
        </div>

        <div className={styles.meta}>
          {/* Подсказка, что за карточкой есть страница. Не ссылка: ссылка здесь
              уже есть — заголовок, растянутый на всю карточку. */}
          <p className={styles.details} aria-hidden="true">
            {catalogText.more} →
          </p>

          {compareHref === undefined ? null : (
            /* 🔴 Отметка сравнения — ссылка, а не чекбокс: выбор живёт в
               адресе (ADR-109). Ссылкой он переживает обновление страницы,
               открывается на другом устройстве и не стоит ни килобайта в
               бюджете JS (ADR-088).

               Состояние читается не только цветом: меняется подпись, рядом
               стоит знак, а скринридер получает имя модели и то, что
               повторное нажатие снимает отметку. */
            <Link
              href={compareHref}
              className={compared ? `${styles.compare} ${styles.comparePicked}` : styles.compare}
              aria-label={compareMarkLabel(product.name, compared)}
              aria-current={compared ? 'true' : undefined}
            >
              <span className={styles.compareMark} aria-hidden="true">
                {compared ? '✓' : '+'}
              </span>
              {compared ? catalogText.compareOn : catalogText.compareAdd}
            </Link>
          )}
        </div>

        <div className={styles.actions}>
          {/* 🔴 Адрес считает сама карточка (ADR-129): предмет кнопки — та
              модель, у которой она стоит, и знает его только карточка.
              Страница передавала бы всем карточкам один и тот же якорь, а
              форма открывалась бы пустой. */}
          <ButtonLink
            href={leadHref({ model: product.slug, topic: 'install' })}
            variant="accent"
            fullWidth
            className={styles.order}
          >
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
