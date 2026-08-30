import Link from 'next/link';

import { ButtonLink, Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { catalogText, productPageText as t } from '../content';
import styles from './ProductCta.module.css';

export interface ProductCtaProps {
  /**
   * Форма заявки с уже подставленной моделью. Адрес считает страница модели,
   * а не блок: предмет кнопки знает тот, у кого она стоит (ADR-146).
   */
  readonly leadHref: ButtonLinkHref;
  /** Дорога дальше, если эта модель не подошла. */
  readonly catalogHref: ButtonLinkHref;
}

/**
 * Призыв под характеристиками модели: тёмная панель с вопросом и кнопкой.
 *
 * 🔴 Собран здесь, а не вынесен в `shared/ui`, сознательно. Такой же блок
 * есть у статьи Базы знаний, но правило зависимостей запрещает импорт вбок
 * между слайсами одного слоя, а общей абстракции тут нет: у статьи вторая
 * половина панели — список ссылок на соседние материалы, здесь — выход в
 * каталог. Общего остаётся ровно `Card` и `ButtonLink`, и они уже в ките.
 * Новый компонент кита с собственным CSS при этом стоил бы места в чанке,
 * который грузит лендинг (BUGS, «Бочонок `shared/ui`»), — за блок, который
 * лендинг не рисует.
 *
 * Серверный: интерактивности нет, обе кнопки — обычные ссылки.
 */
export function ProductCta({ leadHref, catalogHref }: ProductCtaProps) {
  return (
    <Card as="aside" variant="panel" padding="xl" radius="lg" className={styles.cta}>
      <div className={styles.text}>
        <p className={styles.title}>{t.ctaTitle}</p>
        <p className={styles.lead}>{t.ctaText}</p>
      </div>
      <div className={styles.actions}>
        {/* 🔴 Тема здесь «консультация», а не «монтаж»: кнопка в панели цены
            уже зовёт на монтаж, и две одинаковые кнопки на одной странице
            спорили бы друг с другом, а в заявке терялся бы вопрос человека. */}
        <ButtonLink href={leadHref} variant="flat" size="lg">
          {t.ctaAction}
        </ButtonLink>
        <Link href={catalogHref} className={styles.link}>
          {catalogText.all}
        </Link>
      </div>
    </Card>
  );
}
