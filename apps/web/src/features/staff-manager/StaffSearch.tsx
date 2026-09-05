import Link from 'next/link';

import { Card, Input, buttonClassName } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { TEAM_PATH } from './model';
import styles from './StaffSearch.module.css';

export interface StaffSearchProps {
  /** Запрос, с которым страница отрисована: поле открывается заполненным. */
  readonly query: string;
}

/**
 * Поиск по команде: имя, логин, телефон (issue #602, макет `Team.png`).
 *
 * 🔴 Серверный компонент без единой строки JavaScript. Обычная форма с
 * `method="get"` уводит запрос в адрес сама — так же, как это сделал бы
 * роутер, — и поиск по разделу не стоит панели ни байта бюджета. Найденное
 * при этом остаётся ссылкой: её можно прислать себе и вернуться завтра.
 */
export function StaffSearch({ query }: StaffSearchProps) {
  return (
    <Card as="section" className={styles.card}>
      <form className={styles.form} action={TEAM_PATH} method="get">
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
            <Link className={`${styles.reset} tapAction`} href={{ pathname: TEAM_PATH }}>
              {texts.searchReset}
            </Link>
          )}
        </div>
      </form>
    </Card>
  );
}
