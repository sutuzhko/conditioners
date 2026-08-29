'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { crmSearchResultSchema, type CrmSearchHit } from '@/entities/crm/model';
import { dayKeyOf } from '@/shared/lib/calendar';
import { formatDate } from '@/shared/lib/format';
import { Icon } from '@/shared/ui';

import { KIND_LOOK, calendarSearchContent as texts } from './content';
import { crmHref, withTeam } from './navigation';
import styles from './CalendarSearch.module.css';

export interface CalendarSearchProps {
  /** Наложение занятости переносится в найденный день, как и в любой переход. */
  readonly team: boolean;
  /** Шов для тестов и историй: подменяет обращение к серверу. */
  readonly find?: ((query: string) => Promise<readonly CrmSearchHit[]>) | undefined;
}

/**
 * Поиск по календарю — [CRM §3.5.1](../../../../docs/CRM.md), эталон Apple
 * Calendar: поле в шапке, список совпадений под ним.
 *
 * 🔴 Находка ведёт **в день записи**, а не фильтрует показанное. Ищут именно
 * тогда, когда не помнят, в каком месяце был выезд, — и ответом обязан быть
 * переход туда, где запись лежит (issue #130–#132).
 */
export function CalendarSearch({ team, find = askServer }: CalendarSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<readonly CrmSearchHit[]>([]);
  const [state, setState] = useState<'idle' | 'searching' | 'ready' | 'failed'>('idle');
  const [active, setActive] = useState(0);
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  const needle = query.trim();

  useEffect(() => {
    if (needle === '') {
      setHits([]);
      setState('idle');
      return;
    }

    /* Пауза перед запросом: набирая «Первомайская», человек делает тринадцать
       нажатий, и тринадцать запросов к базе за полсекунды — это не поиск, а
       нагрузка. Отменяется тот же таймер, а не запрос: до сервера дело просто
       не доходит. */
    let alive = true;
    setState('searching');
    const timer = setTimeout(() => {
      void find(needle)
        .then((found) => {
          if (!alive) return;
          setHits(found);
          setActive(0);
          setState('ready');
        })
        .catch(() => {
          if (!alive) return;
          setHits([]);
          setState('failed');
        });
    }, DEBOUNCE_MS);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [needle, find]);

  const go = (hit: CrmSearchHit): void => {
    setQuery('');
    setHits([]);
    setState('idle');

    /* День берётся в поясе работ, а не в поясе браузера: запись, назначенная
       на 00:30 по Москве, иначе открывала бы предыдущий день (ADR-080). */
    const day = dayKeyOf(new Date(hit.at));
    router.push(crmHref(withTeam({ view: 'day', day, focus: hit.id }, team)));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (hits.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (index + 1) % hits.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (index - 1 + hits.length) % hits.length);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const hit = hits[active];
      if (hit !== undefined) go(hit);
      return;
    }
    if (event.key === 'Escape') {
      setQuery('');
      setHits([]);
      setState('idle');
    }
  };

  const open = needle !== '' && state !== 'idle';

  return (
    <div className={styles.box} ref={boxRef}>
      <span className={styles.glass} aria-hidden="true">
        <Icon name="search" size={16} />
      </span>

      <input
        className={styles.field}
        type="search"
        role="combobox"
        aria-label={texts.label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={texts.placeholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
      />

      {open ? (
        <div className={styles.drop}>
          {state === 'searching' ? <p className={styles.status}>{texts.searching}</p> : null}
          {state === 'failed' ? (
            <p className={styles.status} role="alert">
              {texts.failed}
            </p>
          ) : null}
          {state === 'ready' && hits.length === 0 ? (
            <p className={styles.status}>{texts.empty}</p>
          ) : null}

          {hits.length === 0 ? null : (
            <ul className={styles.list} id={listId} role="listbox" aria-label={texts.label}>
              {hits.map((hit, index) => (
                <li key={`${hit.kind}-${hit.id}`}>
                  <button
                    type="button"
                    className={[styles.hit, index === active ? styles.hitActive : null]
                      .filter(Boolean)
                      .join(' ')}
                    role="option"
                    aria-selected={index === active}
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(hit)}
                  >
                    <span className={styles.hitKind}>{kindTitle(hit)}</span>
                    <span className={styles.hitClient}>{hit.clientName}</span>
                    <span className={styles.hitWhen}>{formatDate(hit.at)}</span>
                    {hit.address === null ? null : (
                      <span className={styles.hitAddress}>{hit.address}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Пауза перед запросом. Меньше — и поиск бьёт по базе на каждой букве. */
const DEBOUNCE_MS = 250;

/** Чем находка называется в списке. Тексты — здесь, сервер их не знает. */
function kindTitle(hit: CrmSearchHit): string {
  if (hit.kind === 'order') return texts.order(hit.number);
  if (hit.kind === 'lead') return texts.lead;

  return KIND_LOOK[hit.eventKind].title;
}

/**
 * Обращение к серверу. Ответ разбирается схемой, а не берётся на веру: он
 * приходит снаружи, как и любое тело запроса (docs/CLAUDE.md, «TypeScript»).
 */
async function askServer(query: string): Promise<readonly CrmSearchHit[]> {
  const response = await fetch(`/api/admin/crm/search?q=${encodeURIComponent(query)}`, {
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Поиск вернул код ${response.status}`);

  return crmSearchResultSchema.parse(await response.json()).items;
}
