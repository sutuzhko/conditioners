'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button, Card, Input } from '@/shared/ui';

import { clientManagerContent as texts } from './content';
import styles from './ClientSearch.module.css';

export interface ClientSearchProps {
  /** Запрос, с которым страница отрисована: поле открывается заполненным. */
  readonly query: string;
  readonly total: number;
}

/**
 * Поиск по базе: имя, адрес или любой кусок телефона.
 *
 * Запрос уезжает в адрес, а не в состояние компонента: найденное можно
 * оставить в закладках, прислать себе в мессенджер и вернуться к нему завтра —
 * ровно как фильтр статусов в разделе заявок.
 *
 * `action` и `method` оставлены на форме нарочно: без JS браузер отправит её
 * сам и получит тот же адрес, что построил бы роутер.
 */
export function ClientSearch({ query, total }: ClientSearchProps) {
  const router = useRouter();
  const [value, setValue] = useState(query);

  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const text = value.trim();
    router.push(text === '' ? '/admin/clients' : `/admin/clients?q=${encodeURIComponent(text)}`);
  };

  return (
    <Card as="section" className={styles.card}>
      <form className={styles.form} action="/admin/clients" method="get" onSubmit={submit}>
        <Input
          label={texts.searchLabel}
          hint={texts.searchHint}
          placeholder={texts.searchPlaceholder}
          name="q"
          type="search"
          value={value}
          autoComplete="off"
          wrapperClassName={styles.field}
          onChange={(event) => setValue(event.target.value)}
        />

        <div className={styles.actions}>
          <Button type="submit" size="sm">
            {texts.search}
          </Button>

          {query === '' ? null : (
            <Link className={styles.reset} href={{ pathname: '/admin/clients' }}>
              {texts.searchReset}
            </Link>
          )}
        </div>
      </form>

      {/* Счёт базы переехал в подпись раздела (issue #602): здесь остаётся
          только итог поиска — то, что относится к самому полю. */}
      {query === '' ? null : <p className={styles.total}>{texts.found(total)}</p>}
    </Card>
  );
}
