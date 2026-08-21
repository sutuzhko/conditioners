import Link from 'next/link';
import type { ReactNode } from 'react';

import type { ButtonLinkHref } from '@/shared/ui';
import { ArrowIcon, Card } from '@/shared/ui';

import { servicesContent as t } from './content';
import { ServiceIcon, SplitIcon, WrenchIcon } from './icons';
import type { ServiceKey } from './model';
import styles from './Services.module.css';

const icons: Record<ServiceKey, ReactNode> = {
  sale: <SplitIcon />,
  install: <WrenchIcon />,
  service: <ServiceIcon />,
};

export interface ServicesProps {
  /**
   * Куда ведёт ссылка каждой карточки. Карту URL держит страница, блок только
   * подставляет адрес; значения по умолчанию — якоря главной из макета.
   */
  hrefs?: Partial<Record<ServiceKey, ButtonLinkHref>> | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

const DEFAULT_HREFS: Record<ServiceKey, ButtonLinkHref> = {
  sale: '#catalog',
  install: '#installation',
  service: '#service',
};

const HEADING_ID = 'services-title';

/**
 * Сетка услуг: продажа, монтаж, обслуживание.
 *
 * Серверный компонент — карточки приходят в HTML готовыми и видны без
 * JavaScript (инвариант 1). Тексты описывают услугу, а не компанию, поэтому
 * живут в `content.ts`, а не в настройках.
 */
export function Services({ hrefs, id = 'services' }: ServicesProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {t.title}
          </h2>
          <p className={styles.lead}>{t.lead}</p>
        </header>

        <ul className={styles.grid}>
          {t.items.map((item) => (
            <Card
              as="li"
              key={item.key}
              padding="xl"
              elevation="none"
              interactive
              className={styles.card}
            >
              <span className={styles.iconBox}>{icons[item.key]}</span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardText}>{item.text}</p>
              <Link href={hrefs?.[item.key] ?? DEFAULT_HREFS[item.key]} className={styles.link}>
                {item.link}
                <ArrowIcon />
              </Link>
            </Card>
          ))}
        </ul>
      </div>
    </section>
  );
}
