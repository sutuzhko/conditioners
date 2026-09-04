import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';

import { LeadForm } from './LeadForm';
import { leadFormContent as texts } from './content';
import { forgetLeadContext, rememberLeadContext } from './context';
import {
  descriptionFixture,
  leadContextFixture,
  modelsFixture,
  phoneFixture,
  policyHrefFixture,
  titleFixture,
} from './fixtures';
import type { LeadSubmit } from './model';
import { forgetLeadSubject, rememberLeadSubject } from './subject';

/** Заявка «уходит» мгновенно: историю смотрят глазами, а не секундомером. */
const acceptingSubmit: LeadSubmit = () => Promise.resolve({ ok: true, id: 'demo' });

/** Отправка, которая не завершается: так видно состояние «отправляем». */
const hangingSubmit: LeadSubmit = () => new Promise(() => {});

const rejectingSubmit: LeadSubmit = () =>
  Promise.resolve({ ok: false, message: 'Похоже, в номере не хватает цифр', field: 'phone' });

const rateLimitedSubmit: LeadSubmit = () =>
  Promise.resolve({ ok: false, message: texts.errorRateLimited });

/** Заполняет обязательные поля и отправляет форму. */
async function fillAndSend(canvasElement: HTMLElement): Promise<void> {
  const canvas = within(canvasElement);

  await userEvent.type(canvas.getByLabelText(/Имя/), 'Ирина');
  /* 🔴 Цифры без разделителей — то, что человек и набирает в поле с маской:
   маска сама ставит «+7 (», скобки и дефисы. Набор вместе с «+7 » удваивал
   префикс, поле переставляло каретку на каждом знаке, и итог зависел от
   того, сколько знаков успело обработаться, — снимок такой истории не
   совпадал сам с собой (#526). */
  await userEvent.type(canvas.getByLabelText(/Телефон/), '9001234567');
  await userEvent.click(canvas.getByRole('checkbox'));
  await userEvent.click(canvas.getByRole('button', { name: texts.submit }));
}

const meta = {
  title: 'Фичи/Форма заявки',
  component: LeadForm,
  args: {
    phone: phoneFixture,
    policyHref: policyHrefFixture,
    title: titleFixture,
    description: descriptionFixture,
    models: modelsFixture,
  },
  parameters: { layout: 'padded' },
} satisfies Meta<typeof LeadForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: 'Пустая форма',
};

/**
 * Человек пришёл с расчётом и отметками. Контекст живёт в клиентском
 * хранилище, а не в пропсах, поэтому история наполняет его перед показом и
 * прибирает за собой — соседние истории обязаны остаться чистыми.
 */
export const WithContext: Story = {
  name: 'С контекстом со страницы',
  beforeEach: () => {
    rememberLeadContext(leadContextFixture);
    return () => forgetLeadContext();
  },
};

/**
 * Человек нажал «Заказать» у модели: адрес принёс слаг и тему, форма открылась
 * заполненной (ADR-129). Предмет живёт в клиентском хранилище — в историю его
 * кладёт `beforeEach`, а на сайте туда его пишет `LeadSubjectSync`.
 *
 * 🔴 Поле правится и стирается: это подсказка, а не замок.
 */
export const WithSubject: Story = {
  name: 'Модель пришла из адреса',
  beforeEach: () => {
    rememberLeadSubject({ model: modelsFixture[0].slug, topic: 'install' });
    return () => forgetLeadSubject();
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText(texts.modelLabel)).toHaveValue(modelsFixture[0].name);
  },
};

/** Слаг из адреса не нашёлся — форма открывается обычной, без единого упрёка. */
export const WithUnknownSubject: Story = {
  name: 'Модель из адреса не найдена',
  beforeEach: () => {
    rememberLeadSubject({ model: 'net-takoy-modeli' });
    return () => forgetLeadSubject();
  },
};

export const Prefilled: Story = {
  name: 'Тема выбрана заранее',
  args: {
    defaultTopic: 'Сервис и ремонт',
    title: 'Нужен ремонт кондиционера?',
    description: 'Опишите симптом — приедем на диагностику.',
  },
};

export const Invalid: Story = {
  name: 'Ошибки валидации',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: texts.submit }));
    await expect(canvas.getByLabelText(/Имя/)).toHaveAttribute('aria-invalid', 'true');
  },
};

export const Sending: Story = {
  name: 'Отправка',
  args: { submit: hangingSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
  },
};

export const Success: Story = {
  name: 'Заявка принята',
  args: { submit: acceptingSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
    await expect(within(canvasElement).getByText(texts.successTitle)).toBeInTheDocument();
  },
};

export const ServerError: Story = {
  name: 'Ошибка сервера',
  args: { submit: rateLimitedSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
    await expect(within(canvasElement).getByText(texts.errorRateLimited)).toBeInTheDocument();
  },
};

export const FieldRejectedByServer: Story = {
  name: 'Сервер отверг поле',
  args: { submit: rejectingSubmit },
  play: async ({ canvasElement }) => {
    await fillAndSend(canvasElement);
  },
};
