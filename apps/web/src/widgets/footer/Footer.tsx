import Link from 'next/link';
import type { ButtonLinkHref } from '@/shared/ui';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import type { Address, Company, Contacts, Legal } from '@/entities/settings/model';
import { BrandMark } from './BrandMark';
import { footerContent } from './content';
import { formatAddress, legalTitle, ogrnLabel } from './lib';
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

/** Строка реквизитов, если значение заполнено. */
function LegalRow({ label, value }: { label: string; value: string }) {
  if (value.trim() === '') return null;
  return (
    <div className={styles.legalRow}>
      <dt className={styles.legalTerm}>{label}</dt>
      <dd className={styles.legalValue}>{value}</dd>
    </div>
  );
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

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.about}>
          <div className={styles.brand}>
            <BrandMark size={38} />
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

          <section className={[styles.column, styles.legal].join(' ')}>
            <h2 className={styles.columnTitle}>{footerContent.legalTitle}</h2>
            <p className={styles.legalName}>{legalTitle(legal)}</p>
            <dl className={styles.legalList}>
              <LegalRow label={footerContent.innLabel} value={legal.inn} />
              <LegalRow label={ogrnLabel(legal)} value={legal.ogrn} />
              <LegalRow label={footerContent.legalAddressLabel} value={legal.address} />
            </dl>
          </section>
        </div>
      </div>

      <div className={styles.bottom}>
        <div className={styles.bottomInner}>
          <span className={styles.copy}>
            © {year}
            {name === '' ? '' : ` ${name}.`} {footerContent.rights}
          </span>
          <Link href={policyHref} className={styles.policy}>
            {footerContent.policyLabel}
          </Link>
        </div>
      </div>
    </footer>
  );
}
