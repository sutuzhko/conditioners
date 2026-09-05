import Link from 'next/link';

import type { OrderCard } from '@/entities/order/model';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import { todayKey, type DayKey } from '@/shared/lib/calendar';
import { Badge, ButtonLink, Card, EmptyState, buttonClassName } from '@/shared/ui';

import { ORDER_STATUS_TITLE, ORDER_STATUS_VARIANT, orderManagerContent as texts } from './content';
import { installerContent as own, installerWorkTitle, orderMarks } from './installer-content';
import {
  INSTALLER_WHENS,
  agendaGroups,
  agendaHref,
  agendaSummary,
  routeHref,
  type InstallerWhen,
} from './installer-model';
import { ORDERS_PATH } from './model';
import styles from './OrderInstallerAgenda.module.css';

export interface OrderInstallerAgendaProps {
  /** Наряды окна, уже отсортированные по времени: их так отдаёт репозиторий. */
  readonly orders: readonly OrderCard[];
  readonly when: InstallerWhen;
  /** Сегодняшний день. Прокидывается ради снимков и тестов (ADR-080). */
  readonly today?: DayKey | undefined;
}

/** Адрес объекта одной строкой: этаж дописывается к нему, а не стоит отдельно. */
function whereLine(order: OrderCard): string {
  return order.floor === null ? order.address : `${order.address} · ${order.floor} этаж`;
}

/**
 * Наряд дня монтажника — первый кадр `design/admin/Installer.body.html`,
 * issue #633.
 *
 * 🔴 Свой экран, а не таблица владельца в карточках. Фильтру по исполнителю,
 * своему имени в своей строке и подписям «Работа и объект» здесь взяться
 * неоткуда: список сгруппирован по времени, а не по состоянию, и отвечает на
 * один вопрос — «куда я еду дальше».
 *
 * 🔴 Действия одинаковы у всех карточек, включая ещё не начатые (дефект
 * макета: «Клиент» и «Маршрут» были нарисованы только у наряда в работе).
 * Позвонить клиенту и построить маршрут нужно как раз до выезда, а не после.
 *
 * Серверный компонент целиком: окно живёт в адресе, а звонок и карта — это
 * ссылки, которым браузер и без нас знает, что делать.
 */
export function OrderInstallerAgenda({
  orders,
  when,
  today = todayKey(),
}: OrderInstallerAgendaProps) {
  const summary = agendaSummary(orders);
  const groups = agendaGroups(orders);

  return (
    <div className={styles.agenda}>
      <header className={styles.head}>
        <h1 className={styles.title}>{texts.installerTitle}</h1>
        <p className={styles.summary}>{own.summary(when, summary.count, summary.minutes)}</p>
      </header>

      {/* Окно дня — ссылки, а не переключатель: адрес «наряды на неделю»
          отправляют себе в заметки и открывают утром одним нажатием. */}
      <nav className={styles.periods} aria-label={own.whenLabel}>
        {INSTALLER_WHENS.map((value) => (
          <Link
            key={value}
            className={buttonClassName({
              variant: value === when ? 'solid' : 'bordered',
              size: 'md',
            })}
            href={agendaHref(value)}
            aria-current={value === when ? 'page' : undefined}
          >
            {own.whenTitle[value]}
          </Link>
        ))}
      </nav>

      {groups.length === 0 ? (
        <Card as="section">
          <EmptyState
            icon="orders"
            title={own.emptyTitle}
            action={
              when === 'week' ? undefined : (
                <ButtonLink href={agendaHref('week')} size="sm" variant="bordered">
                  {own.emptyWeek}
                </ButtonLink>
              )
            }
          >
            {own.emptyText(when)}
          </EmptyState>
        </Card>
      ) : (
        groups.map((group) => (
          <section className={styles.group} key={group.day}>
            <h2 className={styles.day}>{own.dayTitle(group.day, today)}</h2>

            <ul className={styles.list}>
              {group.orders.map((order) => {
                const marks = orderMarks(order);

                return (
                  <Card
                    as="li"
                    key={order.id}
                    className={[styles.card, order.status === 'in_progress' ? styles.current : null]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <div className={styles.when}>
                      <time className={styles.clock} dateTime={order.at}>
                        {texts.clock(order.at)}
                      </time>
                      <span className={styles.number}>{texts.number(order.number)}</span>
                      <Badge variant={ORDER_STATUS_VARIANT[order.status]} dot>
                        {ORDER_STATUS_TITLE[order.status]}
                      </Badge>
                    </div>

                    <h3 className={styles.what}>{installerWorkTitle(order)}</h3>
                    <p className={styles.where}>{whereLine(order)}</p>

                    {marks.length === 0 ? null : (
                      <p className={styles.marks}>
                        {marks.map((mark) => (
                          <Badge key={mark.key} variant={mark.variant} size="sm">
                            {mark.text}
                          </Badge>
                        ))}
                      </p>
                    )}

                    {/* Звонок и маршрут — ссылки наружу: `tel:` и карты не
                      маршруты приложения, и типизированный Link им не нужен. */}
                    <div className={styles.actions}>
                      <a
                        className={`${buttonClassName({
                          variant: 'flat',
                          size: 'lg',
                          fullWidth: true,
                        })} ${styles.action}`}
                        href={phoneHref(order.client.phone)}
                        aria-label={own.callLabel(order.client.name)}
                        title={formatPhone(order.client.phone)}
                      >
                        {own.call}
                      </a>
                      <a
                        className={`${buttonClassName({
                          variant: 'flat',
                          size: 'lg',
                          fullWidth: true,
                        })} ${styles.action}`}
                        href={routeHref(order.address)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={own.routeLabel(order.address)}
                      >
                        {own.route}
                      </a>
                    </div>

                    <ButtonLink
                      className={styles.open}
                      href={{ pathname: `${ORDERS_PATH}/${order.id}` }}
                      size="lg"
                      fullWidth
                      aria-label={own.openLabel(order.number)}
                    >
                      {own.open}
                    </ButtonLink>
                  </Card>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
