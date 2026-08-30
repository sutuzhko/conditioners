import Image from 'next/image';
import Link from 'next/link';

import { Badge, ButtonLink, Card, Icon } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { leadHref } from '@/shared/config/lead';
import { getActivePrice } from '@/entities/product/lib/getActivePrice';
import { areaLabel, catalogText, compareMarkLabel, photoAlt, powerClassLabel } from '../content';
import { mainPhoto, type CatalogProduct } from '../model';
import { ProductPrice } from './ProductPrice';
import styles from './ProductCard.module.css';

/**
 * Ширина исходника карточки. Фото хранится с длинной стороной 1200px, витрине
 * столько не нужно: 480×300 при соотношении 16:10 покрывает десктопную
 * карточку с запасом на ретину, а `sizes` даёт браузеру выбрать меньший
 * вариант.
 */
const PHOTO_WIDTH = 480;
const PHOTO_HEIGHT = 300;

/**
 * 🔴 Границы совпадают с числом колонок сетки (issue #260), а не с ширинами
 * «на глаз»: до 600 колонка одна и снимок занимает почти всю ширину окна, с
 * 600 их две, с 900 три, с 1200 сетка упирается в контейнер и колонка
 * перестаёт расти. Ошибка здесь стоит лишнего мегабайта на первом экране.
 */
const PHOTO_SIZES =
  '(max-width: 599px) calc(100vw - 32px), (max-width: 899px) 45vw, (max-width: 1199px) 30vw, 288px';

/** Размер значка в заглушке снимка: он занимает место картинки, а не строки. */
const FALLBACK_ICON = 44;

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
 * 🔴 Явное действие ровно одно — «Заказать» (issue #259). До этого их было
 * три: текстовая ссылка «Подробнее», текстовая кнопка «+ Сравнить» и заказ.
 * «Подробнее» дублировало ссылку заголовка — два пункта на один адрес в
 * списке ссылок скринридера, — а «Сравнить» не помещалась в свою строку и на
 * 375 обрезалась до «+ Сравнит». Теперь на страницу модели ведёт название,
 * сравнение стало кнопкой-иконкой в углу снимка, а «Заказать» осталась
 * единственной кнопкой во всю ширину.
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
          /* 🔴 Заглушка рисует градиент и значок, а не пустой прямоугольник:
             пустое место на месте снимка читается как битая картинка, а не
             как «фото ещё не завели». Состояние рабочее — в сидах фото нет
             ни у одной модели. */
          <div className={styles.fallback}>
            <Icon name="conditioner" size={FALLBACK_ICON} />
            <span className={styles.fallbackHint}>{catalogText.noPhoto}</span>
          </div>
        ) : (
          <Image
            className={styles.image}
            src={photo.url}
            alt={alt === undefined || alt === '' ? photoAlt(product.name) : alt}
            width={PHOTO_WIDTH}
            height={PHOTO_HEIGHT}
            sizes={PHOTO_SIZES}
          />
        )}

        {/* Класс мощности стоит поверх снимка и поверх заглушки одинаково:
            это признак модели, а не украшение картинки.

            🔴 Вслух читается расшифровка, а не маркировка: «07» в отрыве от
            слова «класс» не значит ничего. Имя даёт скрытая подпись, а не
            `title`, — два источника имени часть читалок объявляет дважды
            (ADR-159). */}
        <Badge variant="dark" size="sm" mono className={styles.class}>
          <span aria-hidden="true">{product.badge}</span>
          <span className="srOnly">{powerClassLabel(product.badge)}</span>
        </Badge>

        {compareHref === undefined ? null : (
          /* 🔴 Отметка сравнения — ссылка, а не чекбокс: выбор живёт в
             адресе (ADR-109). Ссылкой он переживает обновление страницы,
             открывается на другом устройстве и не стоит ни килобайта в
             бюджете JS (ADR-088).

             Подписи у кнопки нет, поэтому `aria-label` обязателен, а
             состояние читается не одним цветом: значок меняется с плюса на
             галочку, и скринридер получает имя модели вместе с тем, что
             повторное нажатие снимает отметку. */
          <Link
            href={compareHref}
            className={compared ? `${styles.compare} ${styles.comparePicked}` : styles.compare}
            aria-label={compareMarkLabel(product.name, compared)}
            aria-current={compared ? 'true' : undefined}
          >
            <Icon name={compared ? 'check' : 'plus'} size={20} />
          </Link>
        )}
      </div>

      <div className={styles.body}>
        <h3 className={styles.name}>
          <Link href={detailsHref} className={styles.nameLink}>
            {product.name}
          </Link>
        </h3>

        {/* Площадь и ярлык-подсказка — одной строкой. Строка держит место и
            когда ярлыка нет: без неё цена у модели без ярлыка поднималась бы
            выше соседей по ряду. */}
        <div className={styles.meta}>
          <span className={styles.area}>{areaLabel(product.areaMax)}</span>
          {product.tag === null ? null : (
            <Badge variant="accent" size="sm" className={styles.tag}>
              {product.tag}
            </Badge>
          )}
        </div>

        <ProductPrice price={price} />

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
        </div>
      </div>
    </Card>
  );
}
