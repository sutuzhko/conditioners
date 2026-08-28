import { describe, expect, it } from 'vitest';

import { legalShortTitle, legalTitle } from '@/entities/settings/lib/legal';
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

  it('у ИП печатаются ОГРНИП, дата и орган регистрации', () => {
    setup({ legal: legalIp });

    expect(screen.getByText('ИП Демонстрационный Д. Д.')).toBeInTheDocument();
    expect(screen.getByText('ИНН')).toBeInTheDocument();
    expect(screen.getByText(legalIp.inn)).toBeInTheDocument();
    expect(screen.getByText('ОГРНИП')).toBeInTheDocument();
    expect(screen.getByText(legalIp.ogrn)).toBeInTheDocument();
    expect(screen.getByText('Дата регистрации')).toBeInTheDocument();
    expect(screen.getByText('12 марта 2015')).toBeInTheDocument();
    expect(screen.getByText('Орган регистрации')).toBeInTheDocument();
    expect(screen.getByText(legalIp.regAuthority)).toBeInTheDocument();
    expect(screen.queryByText('ОГРН')).not.toBeInTheDocument();
  });

  it('🔴 адрес регистрации предпринимателя на сайт не выводится', () => {
    setup({ legal: legalIp });

    // это, как правило, домашний адрес — персональные данные (PROJECT §5.1);
    // посетителю показан фактический адрес приёма из группы `address`
    expect(screen.queryByText('Юридический адрес')).not.toBeInTheDocument();
    expect(screen.queryByText(legalIp.address)).not.toBeInTheDocument();
  });

  it('у ООО печатаются ОГРН и место нахождения, а КПП и руководитель — нет', () => {
    setup({ legal: legalOoo });

    expect(screen.getByText('ОГРН')).toBeInTheDocument();
    expect(screen.getByText(legalOoo.ogrn)).toBeInTheDocument();
    expect(screen.getByText('ИНН')).toBeInTheDocument();
    expect(screen.getByText(legalOoo.inn)).toBeInTheDocument();
    expect(screen.getByText('Юридический адрес')).toBeInTheDocument();
    expect(screen.getByText(legalOoo.address)).toBeInTheDocument();
    expect(screen.queryByText('ОГРНИП')).not.toBeInTheDocument();
    expect(screen.queryByText(legalOoo.kpp)).not.toBeInTheDocument();
    expect(screen.queryByText(legalOoo.director)).not.toBeInTheDocument();
  });

  it('у ООО в футере стоит сокращённое наименование', () => {
    setup({ legal: legalOoo });

    // полное фирменное наименование в три строки футер не читает; в документе
    // (политика ПДн) и в разметке остаётся полное — см. проверку ниже
    expect(screen.getByText('ООО «Демо»')).toBeInTheDocument();
    expect(screen.queryByText('ООО «Демонстрация»')).not.toBeInTheDocument();
  });

  it('🔴 наименование в футере и в разметке собираются одной функцией', () => {
    setup({ legal: legalOoo });

    // инвариант 9: и видимый текст, и `legalName` организации выводятся из
    // одного поля настроек (ADR-106). В разметку уходит полное наименование —
    // это официальное название лица, — а в футере стоит его сокращённая
    // форма, зарегистрированная тем же уставом; разными данными они стать
    // не могут, потому что поле одно.
    expect(screen.getByText(legalShortTitle(legalOoo))).toBeInTheDocument();
    expect(
      buildOrganizationJsonLd({
        siteUrl: 'https://example.test',
        company: companyFixture,
        legalName: legalTitle(legalOoo),
      }),
    ).toMatchObject({ legalName: legalTitle(legalOoo) });
  });

  it('незаполненные реквизиты не оставляют ни пустых строк, ни пустого раздела', () => {
    setup({ legal: legalEmpty });
    expect(screen.queryByText('ИНН')).not.toBeInTheDocument();
    expect(screen.queryByText('ОГРНИП')).not.toBeInTheDocument();
    // заголовок без единой строки под ним — это дефект, а не «пустое состояние»
    expect(screen.queryByRole('heading', { name: 'Реквизиты' })).not.toBeInTheDocument();
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
