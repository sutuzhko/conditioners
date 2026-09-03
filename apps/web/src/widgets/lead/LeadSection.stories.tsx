import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { leadFormContent } from '@/features/lead-form';

import { LeadSection } from './LeadSection';
import { modelsFixture, phoneFixture, policyHrefFixture, responseTimeFixture } from './fixtures';

/**
 * Секция заявки целиком: слева — что будет после отправки, справа — форма.
 *
 * Секция стоит на собственном тёмном градиенте, одинаковом в обеих темах,
 * поэтому истории смотрятся и в светлой, и в тёмной: меняется в них только
 * карточка формы, фон остаётся прежним.
 */
const meta = {
  title: 'Блоки/Заявка',
  component: LeadSection,
  args: {
    phone: phoneFixture,
    policyHref: policyHrefFixture,
    responseTime: responseTimeFixture,
    models: modelsFixture,
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LeadSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Обычное состояние',
};

/**
 * 🔴 Владелец мог не заполнить настройки: тогда нет ни запасного телефона, ни
 * обещанного срока ответа. Секция при этом остаётся рабочей и ничего не
 * выдумывает — это основное состояние до заполнения «Компании» (инвариант 8).
 */
export const WithoutSettings: Story = {
  name: 'Без телефона в настройках',
  args: { phone: '', responseTime: undefined },
};

export const Prefilled: Story = {
  name: 'Тема выбрана заранее',
  args: { defaultTopic: 'Сервис и ремонт' },
};

/**
 * Человек пришёл по кнопке «Заказать» у модели: `/?model=...&topic=install#lead`.
 * Параметры читает `LeadSubjectSync` внутри секции — история задаёт их адресом,
 * как это происходит на сайте (ADR-129).
 */
export const WithSubject: Story = {
  name: 'Пришли с кнопки у модели',
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: { pathname: '/', query: { model: modelsFixture[0].slug, topic: 'install' } },
    },
  },
};

/**
 * 🔴 Необязательные поля свёрнуты по умолчанию (issue #276): открытая анкета
 * из девяти полей отпугивает раньше, чем человек дойдёт до кнопки. История
 * показывает раскрытое состояние — восемь полей, которые экономят звонок.
 */
export const ExtrasOpen: Story = {
  name: 'Раскрывашка открыта',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByText(leadFormContent.extrasLabel));
    await expect(canvas.getByLabelText(leadFormContent.addressLabel)).toBeVisible();
  },
};

export const Tablet: Story = { name: 'Планшет 768', globals: { viewport: { value: 'md' } } };

export const Phone: Story = { name: 'Телефон 375', globals: { viewport: { value: 'sm' } } };

export const Narrow: Story = { name: 'Минимум 320', globals: { viewport: { value: 'xs' } } };
