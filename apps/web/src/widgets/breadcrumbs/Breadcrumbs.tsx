import Link from 'next/link';

import { JsonLd, buildBreadcrumbListJsonLd, HOME_ROUTE } from '@/shared/seo';
import type { BreadcrumbItem } from '@/shared/seo';

import { breadcrumbsContent as t } from './content';
import styles from './Breadcrumbs.module.css';

/**
 * Хлебные крошки: видимый след и разметка `BreadcrumbList` (docs/SEO.md §4).
 *
 * 🔴 Оба выхода строятся из одного списка, поэтому подписи в разметке и на
 * экране совпадают по построению (инвариант 9).
 *
 * Компонент серверный: и след, и разметка приходят в HTML готовыми.
 *
 * Главная подставляется сама — страница передаёт только свой путь вглубь.
 * Ставится на всех страницах кроме главной (docs/SEO.md §5): след из одного
 * звена не описывает путь, поэтому такой набор ничего не рисует.
 */
export interface BreadcrumbsProps {
  /**
   * Путь от корня, без главной: `[{ name: 'База знаний', path: '/knowledge' }, { name: 'Статья' }]`.
   * У последнего элемента — текущей страницы — пути нет.
   */
  readonly items: readonly BreadcrumbItem[];
  /** Канонический домен: в разметке адреса обязаны быть абсолютными. */
  readonly siteUrl: string;
}

export function Breadcrumbs({ items, siteUrl }: BreadcrumbsProps) {
  const trail: readonly BreadcrumbItem[] = [
    { name: HOME_ROUTE.title, path: HOME_ROUTE.path },
    ...items.filter((item) => item.name.trim() !== ''),
  ];

  if (trail.length < 2) return null;

  return (
    <nav className={styles.nav} aria-label={t.label}>
      <JsonLd nodes={[buildBreadcrumbListJsonLd({ siteUrl, items: trail })]} />
      <ol className={styles.list}>
        {trail.map((item, index) => {
          const isLast = index === trail.length - 1;

          return (
            <li key={`${item.name}-${index}`} className={styles.item}>
              {item.path === undefined || isLast ? (
                <span className={styles.current} aria-current={isLast ? 'page' : undefined}>
                  {item.name}
                </span>
              ) : (
                <Link className={styles.link} href={{ pathname: item.path }}>
                  {item.name}
                </Link>
              )}
              {isLast ? null : (
                <span className={styles.separator} aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
