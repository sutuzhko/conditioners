import type { Meta, StoryObj } from '@storybook/nextjs-vite';
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

const meta = {
  title: 'Блоки/Футер',
  component: Footer,
  parameters: { layout: 'fullscreen' },
  args: {
    company: companyFixture,
    contacts: contactsFixture,
    address: addressFixture,
    legal: legalIp,
    nav: navFixture,
    policyHref: policyHrefFixture,
    // год фиксирован, иначе снепшоты расходились бы 1 января
    year: 2026,
  },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Состав реквизитов задаёт форма регистрации (ADR-112): у предпринимателя это
 * ОГРНИП с датой и органом регистрации, у общества — ОГРН и место нахождения.
 * Обе истории нужны, потому что и число строк, и длина значений у форм разные.
 */
export const Ip: Story = { name: 'ИП — ОГРНИП, дата и орган регистрации' };

export const Ooo: Story = {
  name: 'ООО — сокращённое наименование и место нахождения',
  args: { legal: legalOoo },
};

/** Самая длинная строка реквизитов на 320px: название инспекции переносится. */
export const IpNarrow: Story = {
  name: 'ИП на 320 — орган регистрации переносится',
  globals: { viewport: { value: 'xs' } },
};

export const Tablet: Story = { name: 'Планшет 768', globals: { viewport: { value: 'md' } } };

export const Phone: Story = { name: 'Телефон 375', globals: { viewport: { value: 'sm' } } };

export const Narrow: Story = { name: 'Минимум 320', globals: { viewport: { value: 'xs' } } };

export const Placeholders: Story = {
  name: 'Данные компании ещё заглушки',
  args: {
    company: companyPlaceholder,
    contacts: contactsPlaceholder,
    address: addressPlaceholder,
    legal: legalPlaceholder,
  },
};

/** Реквизитов нет ни одного — раздела «Реквизиты» в футере тоже нет. */
export const Empty: Story = {
  name: 'Настройки пустые',
  args: {
    company: companyEmpty,
    contacts: contactsEmpty,
    address: addressEmpty,
    legal: legalEmpty,
    nav: [],
  },
};
