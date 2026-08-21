import type { ReactNode } from 'react';
import type { Product } from '@/entities/product/model';
import { formatCelsius } from '@/shared/lib/format';
import type { ButtonLinkHref } from '@/shared/ui';
import { Badge, ButtonLink, StatList } from '@/shared/ui';

import { heroContent as t } from './content';
import { HeroParticles } from './HeroParticles';
import { HeroPicker } from './HeroPicker';
import type { HeroStat, HeroWeather } from './model';
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
  /**
   * Погода в городе. Запрос делает сервер страницы и кеширует на час: чип из
   * макета в прототипе ходил в чужой сервис прямо из браузера и стоял на
   * критическом пути LCP. Не пришла — чипа нет, первый экран не меняется.
   */
  readonly weather?: HeroWeather | null | undefined;
  /** Якорь или адрес формы заявки. */
  readonly leadHref?: ButtonLinkHref | undefined;
  /**
   * Полоса под первым экраном. Секция занимает не меньше высоты окна и кладёт
   * слот вниз, поэтому полоса видна без прокрутки. Слот, а не импорт: что
   * именно стоит под первым экраном — решение страницы, не блока.
   */
  readonly children?: ReactNode | undefined;
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
  weather,
  leadHref = '#lead',
  catalogHref = '#catalog',
  now,
  children,
}: HeroProps) {
  return (
    <section className={styles.hero}>
      <span className={styles.glow} aria-hidden="true" />
      <HeroParticles />

      <div className={styles.inner}>
        <div className={styles.copy}>
          {note === undefined || note === '' || weather ? (
            <p className={styles.marks}>
              {note === undefined || note === '' ? null : (
                <Badge variant="accent" className={styles.note}>
                  <span className={styles.noteDot} aria-hidden="true" />
                  {note}
                </Badge>
              )}
              {weather ? (
                <Badge variant="neutral" mono className={styles.weather}>
                  {`${t.weatherLabel} ${formatCelsius(weather.current)}, ${t.weatherPeak} ${formatCelsius(weather.max)}`}
                </Badge>
              ) : null}
            </p>
          ) : null}

          <h1 className={styles.title}>
            {t.title.before}
            <br />
            {t.title.middle}
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

      {children}
    </section>
  );
}
