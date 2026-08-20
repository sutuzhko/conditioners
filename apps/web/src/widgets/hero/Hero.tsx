import type { Product } from '@/entities/product/model';
import type { ButtonLinkHref } from '@/shared/ui';
import { Badge, ButtonLink, StatList } from '@/shared/ui';

import { heroContent as t } from './content';
import { HeroParticles } from './HeroParticles';
import { HeroPicker } from './HeroPicker';
import type { HeroStat } from './model';
import styles from './Hero.module.css';

export type HeroProps = {
  /**
   * Модели каталога для подбора. Виджет ничего не знает о базе: список
   * приносит страница (docs/ORCHESTRATION.md). Пустой список — рабочее
   * состояние: каталог ещё не заполнен.
   */
  readonly products: readonly Product[];
  /** Цифры полосы преимуществ. По умолчанию полосы нет: выдумывать их нельзя. */
  readonly stats?: readonly HeroStat[] | undefined;
  /** Плашка над заголовком, например география работ. Приходит из настроек. */
  readonly note?: string | undefined;
  /** Якорь или адрес формы заявки. */
  readonly leadHref?: ButtonLinkHref | undefined;
  /** Якорь или адрес каталога. */
  readonly catalogHref?: ButtonLinkHref | undefined;
  /** Момент расчёта скидки; задаётся в тестах и историях. */
  readonly now?: Date | undefined;
};

/**
 * Первый экран.
 *
 * 🔴 Это LCP-экран: заголовок, лид и кнопки рендерит сервер и они видны без
 * JavaScript (инвариант 1). Клиентские только листья — подбор, счётчики и
 * декоративный фон.
 */
export function Hero({
  products,
  stats = [],
  note,
  leadHref = '#zayavka',
  catalogHref = '#catalog',
  now,
}: HeroProps) {
  return (
    <section className={styles.hero}>
      <span className={styles.glow} aria-hidden="true" />
      <HeroParticles />

      <div className={styles.inner}>
        <div className={styles.copy}>
          {note === undefined || note === '' ? null : (
            <Badge variant="accent" className={styles.note}>
              <span className={styles.noteDot} aria-hidden="true" />
              {note}
            </Badge>
          )}

          <h1 className={styles.title}>
            {t.title.before}
            <span className={styles.accent}>{t.title.accent}</span>
          </h1>

          <p className={styles.lead}>{t.lead}</p>

          <div className={styles.actions}>
            <ButtonLink href={leadHref} size="lg">
              {t.primaryCta}
            </ButtonLink>
            <ButtonLink href={catalogHref} size="lg" variant="secondary">
              {t.secondaryCta}
            </ButtonLink>
          </div>

          <StatList items={stats} className={styles.stats} />
        </div>

        <HeroPicker products={products} leadHref={leadHref} now={now} />
      </div>
    </section>
  );
}
