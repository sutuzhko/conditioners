import type { ReactNode } from 'react';

import { Card } from '@/shared/ui';

import styles from './ArticleForm.module.css';

/**
 * Во что одета часть формы.
 *
 * `section` — своя карточка с заголовком: так форма стоит в содержимом
 * страницы. `bare` — только поля под подзаголовком: рамку и название даёт
 * тот, кто её вставил, — окно создания. Карточка внутри окна была бы панелью
 * в панели.
 *
 * 🔴 Форма при этом одна и та же: заведение открывается окном, а прямой заход
 * по тому же адресу отдаёт страницу (ADR-117). Вторая форма того же действия
 * разошлась бы с первой на первой правке.
 */
export type ArticleSurface = 'section' | 'bare';

export interface ArticleFormSectionProps {
  readonly surface: ArticleSurface;
  readonly title: string;
  readonly children: ReactNode;
}

export function ArticleFormSection({ surface, title, children }: ArticleFormSectionProps) {
  if (surface === 'bare') {
    return (
      <section className={styles.bare}>
        {/* Уровнем ниже: название окна — уже второй уровень, и h2 здесь дал бы
            два одинаковых уровня подряд без общего родителя. */}
        <h3 className={styles.subtitle}>{title}</h3>
        {children}
      </section>
    );
  }

  return (
    <Card as="section">
      <h2 className={styles.title}>{title}</h2>
      {children}
    </Card>
  );
}
