import { describe, expect, it } from 'vitest';

import { legalTitle } from '@/entities/settings/lib/legal';
import { buildOrganizationJsonLd } from '@/shared/seo';
import { render, screen, within } from '@testing-library/react';
import { Footer } from './Footer';
import {
  addressEmpty,
  addressFixture,
  addressPlaceholder,
  companyEmpty,
  companyFixture,
  companyPlaceholder,
  contactsEmpty,
  contactsFixture,
  contactsPlaceholder,
  legalEmpty,
  legalIp,
  legalOoo,
  legalPlaceholder,
  navFixture,
  policyHrefFixture,
} from './fixtures';

const setup = (props: Partial<Parameters<typeof Footer>[0]> = {}) =>
  render(
    <Footer
      company={companyFixture}
      contacts={contactsFixture}
      address={addressFixture}
      legal={legalIp}
      nav={navFixture}
      policyHref={policyHrefFixture}
      year={2026}
      {...props}
    />,
  );

describe('Footer', () => {
  it('это ориентир contentinfo с разделами и контактами', () => {
    setup();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Разделы сайта' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Контакты' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Реквизиты' })).toBeInTheDocument();
  });

  it('у ИП номер регистрации подписан «ОГРНИП»', () => {
    setup({ legal: legalIp });
    expect(screen.getByText('ОГРНИП')).toBeInTheDocument();
    expect(screen.queryByText('ОГРН')).not.toBeInTheDocument();
  });

  it('у ООО номер регистрации подписан «ОГРН»', () => {
    setup({ legal: legalOoo });
    expect(screen.getByText('ОГРН')).toBeInTheDocument();
    expect(screen.queryByText('ОГРНИП')).not.toBeInTheDocument();
  });

  it('реквизиты показаны целиком: наименование, ИНН, номер и юридический адрес', () => {
    setup({ legal: legalOoo });
    expect(screen.getByText('ООО «Демонстрация»')).toBeInTheDocument();
    expect(screen.getByText('ИНН')).toBeInTheDocument();
    expect(screen.getByText(legalOoo.inn)).toBeInTheDocument();
    expect(screen.getByText(legalOoo.ogrn)).toBeInTheDocument();
    expect(screen.getByText('Юридический адрес')).toBeInTheDocument();
  });

  it('🔴 наименование в футере — та же строка, что уезжает в разметку', () => {
    setup({ legal: legalOoo });

    // инвариант 9: видимый текст и `legalName` организации собираются одной
    // функцией из одного поля настроек (ADR-106) — разойтись им негде
    expect(screen.getByText(legalTitle(legalOoo))).toBeInTheDocument();
    expect(
      buildOrganizationJsonLd({
        siteUrl: 'https://example.test',
        company: companyFixture,
        legalName: legalTitle(legalOoo),
      }),
    ).toMatchObject({ legalName: legalTitle(legalOoo) });
  });

  it('незаполненные реквизиты не оставляют пустых строк', () => {
    setup({ legal: legalEmpty });
    expect(screen.queryByText('ИНН')).not.toBeInTheDocument();
    expect(screen.queryByText('ОГРНИП')).not.toBeInTheDocument();
  });

  it('телефон — ссылка tel:, почта — mailto:', () => {
    setup();
    expect(screen.getByRole('link', { name: /Позвонить/ })).toHaveAttribute(
      'href',
      'tel:+74872900000',
    );
    expect(screen.getByRole('link', { name: /Написать письмо/ })).toHaveAttribute(
      'href',
      'mailto:demo@example.com',
    );
  });

  it('адрес и часы работы приходят из настроек', () => {
    setup();
    expect(screen.getByText('300000, Тула, ул. Демонстрационная, 1, оф. 5')).toBeInTheDocument();
    expect(screen.getByText('Пн–Вс, 8:00–21:00')).toBeInTheDocument();
  });

  it('ссылка на политику обработки персональных данных на месте', () => {
    setup();
    expect(
      screen.getByRole('link', { name: 'Политика обработки персональных данных' }),
    ).toHaveAttribute('href', '/privacy');
  });

  it('активный раздел помечен aria-current', () => {
    setup({ nav: [{ label: 'Отзывы', href: '#reviews', current: true }] });
    const nav = screen.getByRole('navigation', { name: 'Разделы сайта' });
    expect(within(nav).getByRole('link', { name: 'Отзывы' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('копирайт собирается из названия компании и года', () => {
    setup();
    expect(screen.getByText(/© 2026 ТулаКлимат\. Все права защищены/)).toBeInTheDocument();
  });

  it('заглушки сидов видны как есть и ничего не ломают', () => {
    setup({
      company: companyPlaceholder,
      contacts: contactsPlaceholder,
      address: addressPlaceholder,
      legal: legalPlaceholder,
    });
    expect(screen.getAllByText('ЗАПОЛНИТЕ В АДМИНКЕ').length).toBeGreaterThan(0);
    expect(screen.getByText('ОГРНИП')).toBeInTheDocument();
  });

  it('пустые настройки не рисуют ни контактов, ни разделов', () => {
    setup({
      company: companyEmpty,
      contacts: contactsEmpty,
      address: addressEmpty,
      legal: legalEmpty,
      nav: [],
    });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Позвонить/ })).not.toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
