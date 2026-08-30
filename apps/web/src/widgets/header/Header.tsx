import Link from 'next/link';
import { Icon, BrandMark, ButtonLink, ThemeToggle, buttonClassName } from '@/shared/ui';
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
 *
 * 🔴 Что видно на какой ширине, решает CSS, а не JS (issue #247). Разметка
 * одна на все ширины: она приходит от сервера целиком, и на телефоне лишнее
 * не удаляется, а скрывается. Ниже 600 в полосе остаются ровно два
 * интерактивных элемента — бренд и кнопка меню: телефон и заявка уезжают в
 * липкую панель действий, тема — в шторку.
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
        {/* 🔴 Имя ссылки задано всегда, а не только когда названия нет.
            Знак бренда `aria-hidden`, а название скрыто от чтения как
            оформление — вместе это давало первую ссылку страницы вовсе без
            имени, и читалка объявляла «ссылка» (WCAG 2.4.4 и 4.1.2, уровень
            A). Название компании видно на любой ширине, но опираться на его
            видимость нельзя. */}
        <Link
          href={homeHref}
          className={styles.logo}
          aria-label={name === '' ? headerContent.homeLabel : name}
        >
          <BrandMark size={36} className={styles.mark} />
          {name === '' ? null : (
            <span className={styles.lockup} aria-hidden="true">
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
              <Icon name="phone" />
              {phone.text}
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
            iconEnd={<Icon name="arrow-right" />}
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
