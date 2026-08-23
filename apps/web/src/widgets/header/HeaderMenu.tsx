'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ButtonLink, Drawer, Icon, IconButton, ThemeToggle, buttonClassName } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { headerContent } from './content';
import type { NavItem } from './model';
import styles from './HeaderMenu.module.css';

export interface HeaderMenuProps {
  nav: readonly NavItem[];
  ctaHref: ButtonLinkHref;
  /** уже отформатированный телефон и готовый tel:-адрес — форматирует шапка */
  phone?: { readonly text: string; readonly href: string } | undefined;
  hours?: string | undefined;
  className?: string | undefined;
}

/**
 * Бургер и выдвижное меню. Единственная клиентская часть шапки: сама шапка
 * остаётся серверной, чтобы навигация попадала в HTML для робота.
 */
export function HeaderMenu({ nav, ctaHref, phone, hours, className }: HeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <IconButton
        label={headerContent.openMenu}
        variant="outline"
        size="sm"
        className={className}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        icon={<Icon name="burger" />}
      />
      <Drawer
        open={open}
        onClose={close}
        title={headerContent.menuTitle}
        closeLabel={headerContent.closeMenu}
        footer={
          <>
            <ButtonLink href={ctaHref} size="md" fullWidth onClick={close}>
              {headerContent.ctaLabel}
            </ButtonLink>
            {phone === undefined ? null : (
              <a
                href={phone.href}
                className={buttonClassName({ variant: 'secondary', size: 'md', fullWidth: true })}
                aria-label={`${headerContent.callLabel} ${phone.text}`}
                onClick={close}
              >
                <Icon name="phone" />
                {phone.text}
              </a>
            )}
            <div className={styles.theme}>
              {hours === undefined || hours === '' ? (
                <span />
              ) : (
                <span className={styles.hours}>{hours}</span>
              )}
              <ThemeToggle label={headerContent.themeLabel} size="sm" variant="outline" />
            </div>
          </>
        }
      >
        <nav aria-label={headerContent.menuNavLabel}>
          <ul className={styles.list}>
            {nav.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={styles.link}
                  aria-current={item.current === true ? 'page' : undefined}
                  onClick={close}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Drawer>
    </>
  );
}
