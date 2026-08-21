import Link from 'next/link';

import type { ButtonLinkHref } from '@/shared/ui';

import { SavingsCalculator } from './SavingsCalculator';
import { savingsContent } from './content';
import {
  HOURS_DEFAULT,
  TARIFF_DAY_DEFAULT,
  TARIFF_MODE_DEFAULT,
  TARIFF_NIGHT_DEFAULT,
  type TariffMode,
} from './model';
import styles from './SavingsBlock.module.css';

export type SavingsBlockProps = {
  /**
   * Ссылка на разбор «Инвертор или on/off» в Базе знаний. Не задана — лид
   * остаётся без ссылки: вести в никуда хуже, чем не вести никуда.
   */
  readonly articleHref?: ButtonLinkHref | undefined;
  /**
   * Часы суток (0…23), отмеченные при первом показе сетки. Пустой список —
   * пустая сетка: расчёт покажет нули и объяснит, почему.
   */
  readonly defaultHours?: readonly number[] | undefined;
  /** Режим тарифа при первом показе: единый счётчик или «день/ночь». */
  readonly defaultTariffMode?: TariffMode | undefined;
  /**
   * Стартовые значения ползунков тарифа, ₽/кВт·ч. Тарифы пересматривают
   * каждый год, поэтому их можно задать снаружи, не трогая код блока.
   */
  readonly defaultTariffDay?: number | undefined;
  readonly defaultTariffNight?: number | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  readonly id?: string | undefined;
};

const HEADING_ID = 'savings-title';

/**
 * «Инверторный кондиционер окупает себя» — оценка экономии на электричестве.
 *
 * Серверный компонент: заголовок, лид и 🔴 оговорка про приблизительность
 * приходят готовым HTML. Оговорка сознательно вынесена сюда, а не внутрь
 * клиентского расчёта, — она обязана быть в разметке независимо от того,
 * выполнился ли JavaScript. Блок обещает деньги, и цена этого обещания должна
 * быть видна вместе с ним.
 */
export function SavingsBlock({
  articleHref,
  defaultHours = HOURS_DEFAULT,
  defaultTariffMode = TARIFF_MODE_DEFAULT,
  defaultTariffDay = TARIFF_DAY_DEFAULT,
  defaultTariffNight = TARIFF_NIGHT_DEFAULT,
  id = 'savings',
}: SavingsBlockProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.intro}>
          <p className={styles.kicker}>{savingsContent.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {savingsContent.title}
          </h2>
          <p className={styles.lead}>
            {savingsContent.lead}{' '}
            {articleHref === undefined ? null : (
              <>
                {savingsContent.leadArticleBefore}
                <Link href={articleHref} className={styles.articleLink}>
                  {savingsContent.leadArticleText}
                </Link>
                {savingsContent.leadArticleAfter}
              </>
            )}
          </p>
        </header>

        <SavingsCalculator
          defaultHours={defaultHours}
          defaultMode={defaultTariffMode}
          defaultTariffDay={defaultTariffDay}
          defaultTariffNight={defaultTariffNight}
        />

        <p className={styles.disclaimer}>{savingsContent.disclaimer}</p>
      </div>
    </section>
  );
}
