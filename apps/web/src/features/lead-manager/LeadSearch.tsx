import Link from 'next/link';

import { Card, Input, buttonClassName } from '@/shared/ui';

import { leadManagerContent as texts } from './content';
import { LEADS_PATH, type LeadStatus } from './model';
import styles from './LeadSearch.module.css';

export interface LeadSearchProps {
  /** Запрос, с которым страница отрисована: поле открывается заполненным. */
  readonly query: string;
  /** Действующий фильтр статуса: поиск его не сбрасывает. */
  readonly status?: LeadStatus | undefined;
}

/**
 * Поиск по очереди: имя, телефон, адрес, тема, номер обращения (issue #601).
 *
 * 🔴 Серверный компонент без единой строки JavaScript. Обычная форма с
 * `method="get"` уводит запрос в адрес сама — так же, как это сделал бы
 * роутер, — и поиск по разделу не стоит панели ни байта бюджета. Найденное
 * при этом остаётся ссылкой: его можно прислать себе и вернуться завтра.
 *
 * Фильтр статуса едет скрытым полем: иначе поиск молча сбрасывал бы выбранную
 * стопку, и «найти среди новых» становилось бы невозможным.
 */
export function LeadSearch({ query, status }: LeadSearchProps) {
  return (
    <Card as="section" className={styles.card}>
      <form className={styles.form} action={LEADS_PATH} method="get">
        {status === undefined ? null : <input type="hidden" name="status" value={status} />}

        <Input
          label={texts.searchLabel}
          hint={texts.searchHint}
          placeholder={texts.searchPlaceholder}
          name="q"
          type="search"
          defaultValue={query}
          autoComplete="off"
          wrapperClassName={styles.field}
        />

        <div className={styles.actions}>
          <button className={buttonClassName({ size: 'sm' })} type="submit">
            {texts.searchSubmit}
          </button>

          {query === '' ? null : (
            <Link
              className={`${styles.reset} tapAction`}
              href={{
                pathname: LEADS_PATH,
                query: status === undefined ? {} : { status },
              }}
            >
              {texts.emptyFilteredAction}
            </Link>
          )}
        </div>
      </form>
    </Card>
  );
}
