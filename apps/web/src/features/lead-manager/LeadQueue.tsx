import Link from 'next/link';

import { LEAD_STATUS_VARIANT } from '@/entities/lead/model';
import { Badge, ButtonLink, Card, EmptyState, Table } from '@/shared/ui';

import { leadManagerContent as texts } from './content';
import { LeadRowActions } from './LeadRowActions';
import { leadsHref, type LeadQueueItem, type LeadStatus } from './model';
import styles from './LeadQueue.module.css';

export interface LeadQueueProps {
  readonly leads: readonly LeadQueueItem[];
  /** Открытое обращение: строка отмечается `aria-current`, а не только краской. */
  readonly selected?: string | undefined;
  /** Действующий фильтр, поиск и страница: они переезжают в ссылку каждой строки. */
  readonly status?: LeadStatus | undefined;
  readonly page?: number | undefined;
  readonly query?: string | undefined;
  /** Выбран фильтр или поиск: пустая очередь тогда объясняется иначе. */
  readonly filtered?: boolean | undefined;
  /**
   * Момент отсчёта относительного времени. Приходит со страницы, чтобы вся
   * очередь мерилась от одного «сейчас», а не построчно.
   */
  readonly now?: Date | undefined;
}

/**
 * Очередь обращений — левая колонка раздела (issue #349, #601).
 *
 * 🔴 Таблица, а не список карточек (макет `Leads.png`). Очередь читают
 * колонками: номер, кто и откуда, тема, сколько ждёт. У карточек эти значения
 * стоят в разных местах каждой строки, и «кто ждёт дольше всех» приходится
 * искать глазами вместо того, чтобы прочитать сверху вниз.
 *
 * 🔴 Серверный компонент. Выбор живёт в адресе, поэтому строка — обычная
 * ссылка, и «назад» браузера возвращает к предыдущему обращению, а не
 * выбрасывает из раздела. Клиентский код есть только у меню действий строки —
 * там, где спрашивают подтверждение.
 *
 * Ниже 600px `variant="cards"` разворачивает строки карточками: пять колонок
 * на телефоне превращаются в боковую прокрутку, а по очереди звонят стоя.
 */
export function LeadQueue({
  leads,
  selected,
  status,
  page,
  query,
  filtered = false,
  now,
}: LeadQueueProps) {
  if (leads.length === 0) {
    /* 🔴 Пусто и «ничего не найдено» — разные состояния с противоположными
       шагами (issue #335). Фильтр и поиск живут в адресе, поэтому сброс —
       ссылка, а не обработчик: он работает и без единой строки JavaScript. */
    return (
      <Card as="section" className={styles.empty}>
        {filtered ? (
          <EmptyState
            icon="search"
            title={texts.emptyFiltered}
            action={
              <ButtonLink href="/admin/leads" size="sm" variant="bordered">
                {texts.emptyFilteredAction}
              </ButtonLink>
            }
          >
            {texts.emptyFilteredText}
          </EmptyState>
        ) : (
          <EmptyState
            icon="leads"
            title={texts.emptyTitle}
            action={
              <ButtonLink href="/admin/notifications" size="sm" variant="bordered">
                {texts.emptyAction}
              </ButtonLink>
            }
          >
            {texts.emptyText}
          </EmptyState>
        )}
      </Card>
    );
  }

  return (
    <Card as="section" className={styles.queue} padding="none">
      <Table variant="cards" label={texts.queueLabel} className={styles.table}>
        <thead>
          <tr>
            <th className={styles.numberHead} scope="col">
              {texts.colNumber}
            </th>
            <th scope="col">{texts.colWho}</th>
            <th scope="col">{texts.colTopic}</th>
            <th scope="col">{texts.colWhen}</th>
            <th scope="col">{texts.colStatus}</th>
            <th className={styles.actionsHead} scope="col">
              <span className="srOnly">{texts.colActions}</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => {
            const current = lead.id === selected;

            return (
              <tr
                key={lead.id}
                role="row"
                className={current ? styles.current : undefined}
                /* Открытая строка отмечена не только краской: заливкой одной
                   различие не читается ни при нарушениях цветовосприятия, ни
                   на солнце. */
                data-current={current ? '' : undefined}
              >
                <td role="cell" className={styles.number} data-label={texts.colNumber}>
                  {lead.number}
                </td>

                <td role="cell" className={styles.who} data-label={texts.colWho}>
                  {/* 🔴 Ссылка на имени, а не на всей строке: строка таблицы
                      ссылкой быть не может, а вложить в неё кнопку меню —
                      значит вложить интерактив в интерактив. */}
                  <Link
                    className={`${styles.name} tapAction`}
                    href={leadsHref({ status, page, query, lead: lead.id })}
                    aria-current={current ? 'page' : undefined}
                    /* Прокрутка не сбрасывается: обращения перебирают, стоя в
                       середине очереди (ADR-258). */
                    scroll={false}
                  >
                    {lead.name}
                  </Link>

                  <span className={styles.address}>{lead.address ?? texts.addressUnset}</span>
                </td>

                <td role="cell" className={styles.topic} data-label={texts.colTopic}>
                  {/* 🔴 `wrap`: тема приходит из формы, её длину задаёт
                      человек (ADR-126). Плашка без переноса не ужимается ниже
                      своей строки — «Установка мультисплит-системы на два
                      внутренних блока» выносила ячейку за край на 30px и
                      тянула за собой всю таблицу. */}
                  <Badge variant="neutral" size="sm" wrap>
                    {lead.topic}
                  </Badge>
                </td>

                <td role="cell" className={styles.when} data-label={texts.colWhen}>
                  <time dateTime={lead.createdAt}>{texts.waiting(lead.createdAt, now)}</time>
                </td>

                <td role="cell" data-label={texts.colStatus}>
                  <Badge variant={LEAD_STATUS_VARIANT[lead.status]} size="sm">
                    {texts.statusTitle(lead.status)}
                  </Badge>
                </td>

                <td role="cell" className={styles.actions}>
                  <LeadRowActions id={lead.id} number={lead.number} phone={lead.phone} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
