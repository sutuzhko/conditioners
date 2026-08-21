import type { ReactNode } from 'react';

import type {
  Address,
  Contacts as ContactsSettings,
  Geo,
  ServiceArea,
} from '@/entities/settings/model';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import { ButtonLink, Card, ClockIcon, PhoneIcon } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { contactsContent as t } from './content';
import { MapIcon, PinIcon } from './icons';
import { addressLine, yandexMapsHref } from './lib';
import styles from './Contacts.module.css';

const HEADING_ID = 'contacts-title';

export interface ContactsProps {
  /**
   * Телефоны, почта и часы работы. 🔴 Блок в базу не ходит: настройки
   * приносит страница (docs/ORCHESTRATION.md), и ни один факт о компании
   * не имеет права лежать в коде (инвариант 8).
   */
  contacts: ContactsSettings;
  address: Address;
  area: ServiceArea;
  /** Координаты для метки на карте. Не заданы — ссылка ищет по адресу. */
  geo?: Geo | null | undefined;
  /** Куда ведёт «Оставить заявку» — якорь формы задаёт страница. */
  leadHref?: ButtonLinkHref | undefined;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

type ContactRow = {
  readonly id: string;
  readonly label: string;
  readonly icon: ReactNode;
  readonly value: ReactNode;
};

/**
 * Контакты и карта.
 *
 * Серверный компонент: телефон и адрес обязаны быть в HTML сразу — их читают
 * и посетитель, и разметка `HVACBusiness` (инвариант 1, docs/SEO.md §4).
 *
 * 🔴 Строка, которой нет в настройках, не рисуется вовсе: пустая подпись
 * «Телефон» без номера выглядит как ошибка сайта, а придумать номер нельзя.
 */
export function Contacts({
  contacts,
  address,
  area,
  geo,
  leadHref = '#zayavka',
  id = 'kontakty',
}: ContactsProps) {
  const phones = contacts.phones.map((phone) => phone.trim()).filter((phone) => phone !== '');
  const hours = contacts.hours.trim();
  const served = area.served.trim();
  const districts = area.districts.map((item) => item.trim()).filter((item) => item !== '');
  const postal = addressLine(address);
  const mapHref = yandexMapsHref(address, geo);

  const maybeRows: readonly (ContactRow | null)[] = [
    postal === ''
      ? null
      : {
          id: 'address',
          label: t.addressLabel,
          icon: <PinIcon />,
          value: <address className={styles.address}>{postal}</address>,
        },
    phones.length === 0
      ? null
      : {
          id: 'phone',
          label: t.phoneLabel,
          icon: <PhoneIcon size={20} />,
          value: (
            <span className={styles.phones}>
              {phones.map((phone) => (
                <a
                  key={phone}
                  href={phoneHref(phone)}
                  className={styles.phone}
                  aria-label={`${t.callLabel} ${formatPhone(phone)}`}
                >
                  {formatPhone(phone)}
                </a>
              ))}
            </span>
          ),
        },
    hours === ''
      ? null
      : {
          id: 'hours',
          label: t.hoursLabel,
          icon: <ClockIcon size={20} />,
          value: <span className={styles.value}>{hours}</span>,
        },
    districts.length === 0
      ? null
      : {
          id: 'districts',
          label: t.districtsLabel,
          icon: <MapIcon />,
          value: <span className={styles.value}>{districts.join(', ')}</span>,
        },
  ];

  const rows = maybeRows.filter((row): row is ContactRow => row !== null);

  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <div className={mapHref === null ? `${styles.layout} ${styles.solo}` : styles.layout}>
          <div className={styles.info}>
            <p className={styles.kicker}>{t.kicker}</p>
            <h2 id={HEADING_ID} className={styles.title}>
              {served === '' ? t.titleFallback : served}
            </h2>

            {rows.length === 0 ? (
              <Card variant="soft" padding="lg" className={styles.empty}>
                <p className={styles.emptyTitle}>{t.emptyTitle}</p>
                <p className={styles.emptyText}>{t.emptyText}</p>
              </Card>
            ) : (
              <dl className={styles.rows} aria-label={t.listLabel}>
                {rows.map((row) => (
                  <div key={row.id} className={styles.row}>
                    <span className={styles.icon} aria-hidden="true">
                      {row.icon}
                    </span>
                    <div className={styles.rowBody}>
                      <dt className={styles.label}>{row.label}</dt>
                      <dd className={styles.definition}>{row.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            )}

            <ButtonLink href={leadHref} size="lg" fullWidth className={styles.cta}>
              {t.lead}
            </ButtonLink>
          </div>

          {/* 🔴 На месте встроенной карты — статичный блок со ссылкой:
              iframe Яндекс.Карт тянет сторонний скрипт и чужие cookie, а
              единственный внешний скрипт на сайте — Метрика (ADR-024). */}
          {mapHref === null ? null : (
            <div className={styles.map}>
              <div className={styles.mapGrid} aria-hidden="true" />
              <div className={styles.mapCard}>
                <p className={styles.mapTitle}>{t.mapTitle}</p>
                {postal === '' ? null : <p className={styles.mapAddress}>{postal}</p>}
                {served === '' ? null : <p className={styles.mapArea}>{served}</p>}
                <a
                  className={styles.mapLink}
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t.mapLink}
                </a>
                <p className={styles.mapNote}>{t.mapNote}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
