import { LEAD_STATUS_VARIANT } from '@/entities/lead/model';
import { WorkTypeBadge } from '@/entities/work-type/ui';
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Table,
  TableRow,
  TableRowLink,
  tableAboveClassName,
} from '@/shared/ui';

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
 * 🔴 Нажимается вся строка, а не одно имя (issue #740). Владелец целился в
 * тему и во время и не попадал никуда: строка выглядела целью, целью не
 * являясь, — а ниже 600px, где строка разворачивается карточкой на пол-экрана,
 * нажималась в ней одна подпись. Приём китовый (`TableRow`, `TableRowLink`), и
 * очередь его зовёт, а не повторяет: та же строка-цель нужна клиентам,
 * команде, каталогу и статьям, и четыре своих перекрытия разошлись бы на
 * первой же правке. Раздел решает здесь ровно одно — что поднято над
 * перекрытием: адрес и меню действий.
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

            /* Открытая строка отмечена не только краской: заливкой одной
               различие не читается ни при нарушениях цветовосприятия, ни на
               солнце. Полосу рисует раздел, признак ставит кит. */
            return (
              <TableRow
                key={lead.id}
                current={current}
                className={current ? styles.current : undefined}
              >
                <td role="cell" className={styles.number} data-label={texts.colNumber}>
                  {lead.number}
                </td>

                <td role="cell" className={styles.who} data-label={texts.colWho}>
                  {/* Ссылка одна — на имени, а нажимается вся строка: площадь
                      ей отдаёт перекрытие кита. */}
                  <TableRowLink
                    className={`${styles.name} tapAction`}
                    href={leadsHref({ status, page, query, lead: lead.id })}
                    aria-current={current ? 'page' : undefined}
                    label={texts.rowOpen(lead.number, lead.name)}
                    /* Прокрутка не сбрасывается: обращения перебирают, стоя в
                       середине очереди (ADR-258). */
                    scroll={false}
                  >
                    {lead.name}
                  </TableRowLink>

                  {/* 🔴 Адрес поднят над перекрытием — это единственное место
                      строки, где нажатие ничего не открывает. Его копируют в
                      карту, в наряд, в разговор, а под перекрытием протяжка
                      мышью давала пустую строку и засчитывалась как нажатие по
                      ссылке. */}
                  <span className={tableAboveClassName(styles.address)}>
                    {lead.address ?? texts.addressUnset}
                  </span>
                </td>

                <td role="cell" className={styles.topic} data-label={texts.colTopic}>
                  {/* 🔴 Ярлык красит справочник, а не раздел (ADR-343): у
                      «монтажа» в очереди тот же цвет, что у монтажа в
                      календаре и в наряде. Рядом с краской всегда стоит слово
                      — название вида работ (WCAG 1.4.1, issue #840).

                      🔴 Заявка без вида работ открывается как прежде — одной
                      темой в серой плашке (issue #841). Такими пришли все, кто
                      написал до справочника, и разбирать их темы задним числом
                      нельзя: угаданный по словам вид честнее не становится.

                      `wrap` у темы: её длину задаёт человек в форме (ADR-126).
                      Плашка без переноса не ужимается ниже своей строки —
                      «Установка мультисплит-системы на два внутренних блока»
                      выносила ячейку за край на 30px и тянула за собой всю
                      таблицу. */}
                  {lead.workType === null ? (
                    <Badge variant="neutral" size="sm" wrap>
                      {lead.topic}
                    </Badge>
                  ) : (
                    <>
                      <WorkTypeBadge workType={lead.workType} />
                      <span className={styles.topicText}>{lead.topic}</span>
                    </>
                  )}
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
                  {/* 🔴 Над перекрытием поднято само меню, а не его ячейка:
                      «Позвонить» обязано звонить, а не открывать карточку.
                      Ячейка остаётся частью строки — ниже 600px она идёт
                      полосой во всю ширину карточки, и поднятая целиком
                      отнимала бы у строки заметный кусок площади. */}
                  <LeadRowActions
                    className={tableAboveClassName()}
                    id={lead.id}
                    number={lead.number}
                    phone={lead.phone}
                  />
                </td>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
