import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Contacts } from './Contacts';
import { contactsContent as t } from './content';
import {
  addressEmpty,
  addressFixture,
  areaEmpty,
  areaFixture,
  contactsEmpty,
  contactsFixture,
  contactsTwoPhones,
  geoEmpty,
  geoFixture,
} from './fixtures';

function renderSection(props: Partial<Parameters<typeof Contacts>[0]> = {}) {
  return render(
    <Contacts
      contacts={contactsFixture}
      address={addressFixture}
      area={areaFixture}
      geo={geoFixture}
      {...props}
    />,
  );
}

describe('Блок контактов', () => {
  it('рисует адрес, телефон, часы и районы из настроек', () => {
    renderSection();

    // адрес виден дважды: строкой контактов и на карточке карты
    expect(screen.getAllByText('Тула, ул. Демонстрационная, 1, оф. 5')).toHaveLength(2);
    expect(screen.getByText(contactsFixture.hours)).toBeInTheDocument();
    expect(screen.getByText(areaFixture.districts.join(', '))).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: areaFixture.served })).toBeInTheDocument();
  });

  it('телефон — ссылка tel: с подписью для скринридера', () => {
    renderSection();

    const link = screen.getByRole('link', { name: /Позвонить/ });
    expect(link).toHaveAttribute('href', 'tel:+74872900000');
    expect(link).toHaveTextContent('+7 (4872) 90-00-00');
  });

  it('показывает все номера, а не только первый', () => {
    renderSection({ contacts: contactsTwoPhones });

    const links = screen.getAllByRole('link', { name: /Позвонить/ });
    expect(links).toHaveLength(2);
    expect(links[1]).toHaveAttribute('href', 'tel:+79001234567');
  });

  it('🔴 строку, которой нет в настройках, блок не рисует', () => {
    renderSection({
      contacts: { ...contactsFixture, hours: '' },
      area: { served: areaFixture.served, districts: [] },
    });

    expect(screen.queryByText(t.hoursLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(t.districtsLabel)).not.toBeInTheDocument();
    // а те, что заполнены, на месте
    expect(screen.getByText(t.addressLabel)).toBeInTheDocument();
    expect(screen.getByText(t.phoneLabel)).toBeInTheDocument();
  });

  it('🔴 пустые настройки не выдумывают контактов: ни цифр, ни адреса', () => {
    const { container } = renderSection({
      contacts: contactsEmpty,
      address: addressEmpty,
      area: areaEmpty,
      geo: geoEmpty,
    });

    expect(screen.getByText(t.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Позвонить/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: t.mapLink })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: t.titleFallback })).toBeInTheDocument();
    expect(container.textContent ?? '').not.toMatch(/\d/);
  });

  it('🔴 карта не встроена iframe: на её месте ссылка в новую вкладку (ADR-024)', () => {
    const { container } = renderSection();

    expect(container.querySelector('iframe')).toBeNull();

    const link = screen.getByRole('link', { name: t.mapLink });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel') ?? '').toContain('noopener');
    expect(link.getAttribute('href') ?? '').toContain('https://yandex.ru/maps/');
  });

  it('кнопка заявки ведёт на переданный якорь формы', () => {
    renderSection({ leadHref: '#zayavka' });

    expect(screen.getByRole('link', { name: t.lead })).toHaveAttribute('href', '#zayavka');
  });

  it('у секции один заголовок второго уровня — h1 принадлежит странице', () => {
    renderSection();

    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });
});
