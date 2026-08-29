import type { ReactNode } from 'react';

import { WeatherChip } from '@/features/weather-chip';
import type { ButtonLinkHref } from '@/shared/ui';
import { Badge, ButtonLink, StatList } from '@/shared/ui';

import { heroContent as t } from './content';
import { HeroParticles } from './HeroParticles';
import { HeroPicker } from './HeroPicker';
import { HERO_STATS_MAX, type HeroStat, type HeroWeather, type PickerProduct } from './model';
import styles from './Hero.module.css';

export type HeroProps = {
  /**
   * Модели каталога для подбора. Виджет ничего не знает о базе: список
   * приносит страница (docs/ORCHESTRATION.md). Пустой список — рабочее
   * состояние: каталог ещё не заполнен.
   */
  readonly products: readonly PickerProduct[];
  /** Цифры полосы преимуществ. По умолчанию полосы нет: выдумывать их нельзя. */
  readonly stats?: readonly HeroStat[] | undefined;
  /**
   * Плашка над заголовком: город и срок выезда. Приходит из настроек, и её
   * длину задаёт владелец — поэтому плашка переносит строку, а перечисление
   * городов области в неё не идёт вовсе (ADR-126): полный список живёт в
   * контактах и в разметке зоны обслуживания.
   */
  readonly note?: string | undefined;
  /**
   * Погода в городе. Запрос делает сервер страницы: чип из макета в прототипе
   * ходил в чужой сервис прямо из браузера и стоял на критическом пути LCP.
   * Не пришла — чипа нет, первый экран не меняется. Дальше цифры освежает сам
   * чип, пока вкладку держат открытой.
   */
  readonly weather?: HeroWeather | null | undefined;
  /** Город для подписи чипа — из настроек компании, а не из кода. */
  readonly city?: string | undefined;
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
  city,
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
          {note === undefined || note === '' ? null : (
            <Badge variant="accent" wrap className={styles.note}>
              <span className={styles.noteDot} aria-hidden="true" />
              {note}
            </Badge>
          )}

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

          {/* Чип погоды из макета: среднесуточная, пик и заметка про спрос.
              Без города в настройках подписи не будет — придумывать его код
              не вправе (инвариант 8), поэтому чип просто не рисуется. */}
          {weather && city !== undefined && city !== '' ? (
            <div className={styles.weather}>
              <WeatherChip city={city} weather={weather} />
            </div>
          ) : null}

          {/* Первые три цифры: четвёртая переносится во вторую строку и ломает
              ритм экрана (ADR-126). Лишние не рисуются, но и не пропадают из
              настроек — они остаются данными владельца. */}
          <StatList items={stats.slice(0, HERO_STATS_MAX)} className={styles.stats} />
        </div>

        <HeroPicker products={products} leadHref={leadHref} now={now} />
      </div>

      {children}
    </section>
  );
}
