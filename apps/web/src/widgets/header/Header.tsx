import Link from 'next/link';
import { ArrowIcon, BrandMark, ButtonLink, PhoneIcon, ThemeToggle, buttonClassName } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { formatPhone, phoneHref } from '@/shared/lib/format';
import type { Company, Contacts } from '@/entities/settings/model';
import { DEFAULT_CTA_HREF, headerContent } from './content';
import { HeaderMenu } from './HeaderMenu';
import type { NavItem } from './model';
import styles from './Header.module.css';

export interface HeaderProps {
  /** название и подпись бренда: в замок они приходят из настроек, а не из кода */
  company: Company;
  contacts: Contacts;
  nav: readonly NavItem[];
  homeHref?: ButtonLinkHref | undefined;
  /** куда ведёт кнопка заявки; по умолчанию — якорь формы на лендинге */
  ctaHref?: ButtonLinkHref | undefined;
}

/**
 * Стеклянная sticky-шапка. Серверный компонент: навигация и телефон обязаны
 * быть в HTML до всякого JS (инвариант 1). Клиентская только одна деталь —
 * бургер с выдвижным меню.
 */
export function Header({
  company,
  contacts,
  nav,
  homeHref = '/',
  ctaHref = DEFAULT_CTA_HREF,
}: HeaderProps) {
  const rawPhone = contacts.phones[0];
  const phone =
    rawPhone === undefined || rawPhone.trim() === ''
      ? undefined
      : { text: formatPhone(rawPhone), href: phoneHref(rawPhone) };

  const name = company.name.trim();
  const tagline = company.tagline.trim();

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link
          href={homeHref}
          className={styles.logo}
          aria-label={name === '' ? headerContent.homeLabel : undefined}
        >
          <BrandMark size={38} />
          {name === '' ? null : (
            <span className={styles.lockup}>
              <span className={styles.name}>{name}</span>
              {tagline === '' ? null : <span className={styles.tagline}>{tagline}</span>}
            </span>
          )}
        </Link>

        {nav.length === 0 ? null : (
          <nav className={styles.nav} aria-label={headerContent.navLabel}>
            <ul className={styles.navList}>
              {nav.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={styles.navLink}
                    aria-current={item.current === true ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className={styles.actions}>
          {phone === undefined ? null : (
            <a
              href={phone.href}
              className={[buttonClassName({ variant: 'secondary', size: 'md' }), styles.phone].join(
                ' ',
              )}
              aria-label={`${headerContent.callLabel} ${phone.text}`}
            >
              <PhoneIcon />
              <span className={styles.phoneText}>{phone.text}</span>
            </a>
          )}

          <ThemeToggle
            label={headerContent.themeLabel}
            size="sm"
            variant="outline"
            className={styles.theme}
          />

          <ButtonLink
            href={ctaHref}
            size="md"
            className={styles.cta}
            aria-label={headerContent.ctaLabel}
            iconEnd={
              <span className={styles.ctaArrow}>
                <ArrowIcon />
              </span>
            }
          >
            <span className={styles.ctaLong}>{headerContent.ctaLabel}</span>
            <span className={styles.ctaShort}>{headerContent.ctaLabelShort}</span>
          </ButtonLink>

          {nav.length === 0 ? null : (
            <HeaderMenu
              nav={nav}
              ctaHref={ctaHref}
              phone={phone}
              hours={contacts.hours}
              className={styles.burger}
            />
          )}
        </div>
      </div>
    </header>
  );
}
