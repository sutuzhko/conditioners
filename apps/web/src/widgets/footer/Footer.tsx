import Link from 'next/link';
import { BrandMark } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import type { Address, Company, Contacts, Legal } from '@/entities/settings/model';
import { footerContent } from './content';
import { legalShortTitle, publicRequisites } from '@/entities/settings/lib/legal';

import { formatAddress } from './lib';
import type { NavItem } from './model';
import styles from './Footer.module.css';

export interface FooterProps {
  company: Company;
  contacts: Contacts;
  address: Address;
  legal: Legal;
  nav: readonly NavItem[];
  /**
   * Адрес политики обработки персональных данных (docs/SEO.md §1). Обязателен и
   * приходит снаружи: карта URL принадлежит странице, а не блоку.
   */
  policyHref: ButtonLinkHref;
  /** год в копирайте; по умолчанию текущий — параметр нужен снепшотам и историям */
  year?: number | undefined;
}

/**
 * Футер: разделы, контакты и реквизиты. Все факты о компании приходят
 * пропсами из настроек — в коде нет ни одного (инвариант 8).
 */
export function Footer({
  company,
  contacts,
  address,
  legal,
  nav,
  policyHref,
  year = new Date().getFullYear(),
}: FooterProps) {
  const name = company.name.trim();
  const tagline = company.tagline.trim();
  const phones = contacts.phones.filter((phone) => phone.trim() !== '');
  const email = contacts.email.trim();
  const hours = contacts.hours.trim();
  const postal = formatAddress(address);

  /* 🔴 Состав реквизитов задаёт форма регистрации, и решает это один
     `publicRequisites` — тот же, что печатает политика обработки ПДн
     (PROJECT §5.3, ADR-112). Подписи приходят вместе со значением, пустые
     строки отфильтрованы, адрес регистрации предпринимателя не приходит
     вовсе: это персональные данные. */
  const requisites = publicRequisites(legal);
  /* Наименование, сведённое к одной форме собственности, — это ещё не
     наименование: печатать в футере одинокое «ИП» незачем. */
  const legalName = legalShortTitle(legal);
  const hasLegal = legalName !== legal.form || requisites.length > 0;

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.about}>
          <div className={styles.brand}>
            <BrandMark size={38} tone="onDark" />
            {name === '' ? null : <span className={styles.brandName}>{name}</span>}
          </div>
          {tagline === '' ? null : <p className={styles.tagline}>{tagline}</p>}
        </div>

        <div className={styles.columns}>
          {nav.length === 0 ? null : (
            <nav className={styles.column} aria-label={footerContent.navLabel}>
              <h2 className={styles.columnTitle}>{footerContent.navTitle}</h2>
              <ul className={styles.list}>
                {nav.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className={styles.link}
                      aria-current={item.current === true ? 'page' : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <section className={styles.column}>
            <h2 className={styles.columnTitle}>{footerContent.contactsTitle}</h2>
            <ul className={styles.list}>
              {phones.map((phone) => (
                <li key={phone}>
                  <a
                    href={phoneHref(phone)}
                    className={[styles.link, styles.phone].join(' ')}
                    aria-label={`${footerContent.callLabel} ${formatPhone(phone)}`}
                  >
                    {formatPhone(phone)}
                  </a>
                </li>
              ))}
              {email === '' ? null : (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className={styles.link}
                    aria-label={`${footerContent.emailLabel} ${email}`}
                  >
                    {email}
                  </a>
                </li>
              )}
              {postal === '' ? null : <li className={styles.text}>{postal}</li>}
              {hours === '' ? null : <li className={styles.text}>{hours}</li>}
            </ul>
          </section>

          {hasLegal ? (
            <section className={[styles.column, styles.legal].join(' ')}>
              <h2 className={styles.columnTitle}>{footerContent.legalTitle}</h2>
              {legalName === legal.form ? null : <p className={styles.legalName}>{legalName}</p>}
              {requisites.length === 0 ? null : (
                <dl className={styles.legalList}>
                  {requisites.map((row) => (
                    <div key={row.key} className={styles.legalRow}>
                      <dt className={styles.legalTerm}>{row.label}</dt>
                      <dd className={styles.legalValue}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ) : null}
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <span className={styles.copy}>
            © {year}
            {name === '' ? '' : ` ${name}.`} {footerContent.rights}
          </span>
          {/* 🔴 Отдельная вкладка: политику открывают из формы, наполовину
                    заполненной, и уход со страницы стирает введённое.
                    `rel` обязателен вместе с `target` — без него открытая
                    страница получает доступ к окну-источнику. */}
          <Link href={policyHref} className={styles.policy} target="_blank" rel="noreferrer">
            {footerContent.policyLabel}
          </Link>
        </div>
      </div>
    </footer>
  );
}
