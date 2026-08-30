'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ButtonLink, Drawer, Icon, IconButton, ThemeSwitch, buttonClassName } from '@/shared/ui';
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
 *
 * Подвал шторки держит служебное и действия (issue #248). Телефон и заявка
 * дублируют шапку и липкую панель, поэтому с 600px из подвала уходят: там они
 * уже видны, и второй раз предлагать то же самое незачем.
 */
export function HeaderMenu({ nav, ctaHref, phone, hours, className }: HeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <IconButton
        label={headerContent.openMenu}
        variant="outline"
        size="md"
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
            <div className={styles.service}>
              {/* пустой узел держит место: без него переключатель уезжал бы
                  влево, когда владелец не заполнил часы работы */}
              {hours === undefined || hours === '' ? (
                <span />
              ) : (
                <span className={styles.hours}>{hours}</span>
              )}
              <ThemeSwitch label={headerContent.themeGroupLabel} />
            </div>

            <div className={styles.actions}>
              {phone === undefined ? null : (
                <a
                  href={phone.href}
                  className={buttonClassName({
                    variant: 'bordered',
                    size: 'md',
                    fullWidth: true,
                  })}
                  aria-label={`${headerContent.callLabel} ${phone.text}`}
                  onClick={close}
                >
                  <Icon name="phone" />
                  {phone.text}
                </a>
              )}
              <ButtonLink href={ctaHref} size="md" fullWidth onClick={close}>
                {headerContent.ctaLabel}
              </ButtonLink>
            </div>
          </>
        }
      >
        <nav aria-label={headerContent.menuNavLabel}>
          <ul className={styles.list}>
            {nav.map((item) => (
              <li key={item.label} className={styles.item}>
                <Link
                  href={item.href}
                  className={styles.link}
                  aria-current={item.current === true ? 'page' : undefined}
                  onClick={close}
                >
                  <span className={styles.label}>{item.label}</span>
                  <Icon name="chevron-right" size={16} className={styles.chevron} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Drawer>
    </>
  );
}
