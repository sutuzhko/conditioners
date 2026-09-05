import Link from 'next/link';

import { Card, Input, Select, buttonClassName } from '@/shared/ui';

import { adminKnowledgeContent as texts } from './content';
import {
  ARTICLE_ORDERS,
  ARTICLE_STATES,
  KNOWLEDGE_PATH,
  articleFilterOn,
  type ArticleFilter,
} from './model';
import styles from './ArticleSearch.module.css';

export interface ArticleSearchProps {
  /** Отбор, с которым страница отрисована: поля открываются заполненными. */
  readonly filter: ArticleFilter;
  /**
   * Рубрики, которые владелец уже завёл.
   *
   * 🔴 Из базы, а не из перечня в коде (инвариант 8): рубрику владелец
   * вписывает сам в форме статьи, и зашитый список устарел бы в тот же день.
   */
  readonly categories: readonly string[];
}

const STATE_LABELS: Record<(typeof ARTICLE_STATES)[number], string> = {
  published: texts.filterStatePublished,
  draft: texts.filterStateDraft,
};

const ORDER_LABELS: Record<(typeof ARTICLE_ORDERS)[number], string> = {
  new: texts.filterOrderNew,
  old: texts.filterOrderOld,
};

/**
 * Отбор статей: рубрика, состояние, порядок и поиск по тексту (issue #614).
 *
 * 🔴 Серверный компонент без единой строки своего JavaScript. Обычная форма с
 * `method="get"` уводит условия в адрес сама — так же, как это сделал бы
 * роутер, — и раздел не платит за фильтры ни байтом бюджета. Найденное при
 * этом остаётся ссылкой: его можно прислать себе и вернуться завтра.
 *
 * Номера страницы среди полей нет намеренно: новый отбор начинается с первой
 * страницы, а не с той, на которой человек стоял в прошлом списке.
 */
export function ArticleSearch({ filter, categories }: ArticleSearchProps) {
  return (
    <Card as="section" className={styles.card}>
      <form className={styles.form} action={KNOWLEDGE_PATH} method="get" role="search">
        <Input
          label={texts.searchLabel}
          hint={texts.searchHint}
          placeholder={texts.searchPlaceholder}
          name="q"
          type="search"
          defaultValue={filter.query}
          autoComplete="off"
          wrapperClassName={styles.field}
        />

        {/* 🔴 Список рубрик стоит и тогда, когда рубрик ещё нет. Появляющееся
            поле переносило бы строку отбора на узком экране в тот момент,
            когда приезжают данные, — а заготовка раздела рисует ту же форму
            заранее и знать про рубрики не может (ADR-239). */}
        <Select
          label={texts.filterCategory}
          name="category"
          defaultValue={filter.category}
          wrapperClassName={styles.select}
          options={[
            { value: '', label: texts.filterCategoryAll },
            ...categories.map((category) => ({ value: category, label: category })),
          ]}
        />

        <Select
          label={texts.filterState}
          name="state"
          defaultValue={filter.state ?? ''}
          wrapperClassName={styles.select}
          options={[
            { value: '', label: texts.filterStateAll },
            ...ARTICLE_STATES.map((state) => ({ value: state, label: STATE_LABELS[state] })),
          ]}
        />

        <Select
          label={texts.filterOrder}
          name="order"
          defaultValue={filter.order ?? 'new'}
          wrapperClassName={styles.select}
          options={ARTICLE_ORDERS.map((order) => ({ value: order, label: ORDER_LABELS[order] }))}
        />

        <div className={styles.actions}>
          <button className={buttonClassName({ size: 'sm' })} type="submit">
            {texts.searchSubmit}
          </button>

          {/* Сброс — ссылка, а не кнопка: условия живут в адресе, и снять их
              значит уйти на адрес раздела без хвоста. */}
          {articleFilterOn(filter) ? (
            <Link className={`${styles.reset} tapAction`} href={{ pathname: KNOWLEDGE_PATH }}>
              {texts.reset}
            </Link>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
