import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { reviewsContent as t } from './content';
import { Reviews } from './Reviews';
import {
  longReviewFixture,
  manyReviewsFixture,
  policyHrefFixture,
  reviewWithPhotoFixture,
  reviewWithoutPhotoFixture,
  reviewsFixture,
} from './fixtures';

/**
 * Блок отзывов (issue #274, issue #275).
 *
 * 🔴 Первой идёт пустая секция: настоящих отзывов у проекта нет, выдуманные
 * публиковать запрещено (инвариант 10, ADR-012), и ближайшие месяцы сайт
 * выглядит именно так. Остальные истории показывают три раскладки, между
 * которыми выбирает ширина: колонка до 600, сетка 2×2 до 1200, лента дальше.
 */
const meta = {
  title: 'Блоки/Отзывы',
  component: Reviews,
  args: { policyHref: policyHrefFixture },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Reviews>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  name: 'Пустая секция — основное состояние',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 🔴 карусели в пустом разделе нет вовсе: лента без карточек — поломка
    await expect(canvas.queryByRole('list', { name: t.listLabel })).toBeNull();
  },
};

/** Два отзыва: ровно столько видно на телефоне до нажатия «Все отзывы». */
export const Two: Story = {
  name: 'Два отзыва — колонка',
  args: { reviews: reviewsFixture.slice(0, 2) },
};

/** Четыре отзыва: сетка 2×2 с 600 и колонка из двух до неё. */
export const Four: Story = {
  name: 'Четыре отзыва — сетка 2×2',
  args: { reviews: reviewsFixture },
};

export const WithPhoto: Story = {
  name: 'Отзыв с фотографией',
  args: { reviews: [reviewWithPhotoFixture, ...reviewsFixture.slice(0, 2)] },
};

export const WithoutDistrict: Story = {
  name: 'Один отзыв',
  args: { reviews: [reviewWithoutPhotoFixture] },
};

/**
 * 🔴 Длинный отзыв обрывается по четвёртой строке многоточием, а не краем
 * карточки, и получает подпись «Читать целиком» (issue #275). Полный текст
 * при этом остаётся в разметке: читалка читает его целиком, поисковик
 * индексирует целиком.
 */
export const Clipped: Story = {
  name: 'Длинный отзыв — обрыв по строке',
  args: { reviews: [longReviewFixture, ...reviewsFixture.slice(0, 3)] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    /* Подписей может быть несколько: на 1200 в ленте обрезаны и соседние
       отзывы. Проверяем, что она есть хотя бы у одного, а не что она одна. */
    await expect((await canvas.findAllByText(t.readFull)).length).toBeGreaterThan(0);
    // содержание не усечено: в разметке лежит весь текст
    await expect(canvas.getByText(longReviewFixture.text)).toBeInTheDocument();
  },
};

/**
 * 🔴 «Все отзывы» ничего не грузит — она снимает ограничение показа
 * (ADR-195). Скрытые карточки всё это время лежат в разметке.
 */
export const Expanded: Story = {
  name: 'Раскрыты все отзывы',
  args: { reviews: manyReviewsFixture },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const more = canvas.queryByRole('button', { name: t.showAll });

    /* 🔴 С 1200 кнопки нет вовсе: там лента и раскрывать нечего. История
       снимается на всех ширинах, и требовать кнопку на десктопе значило бы
       уронить сценарий там, где он проверяет ровно обратное. */
    if (more === null) {
      await expect(canvas.getByRole('list', { name: t.listLabel })).toBeInTheDocument();
      return;
    }

    await userEvent.click(more);
    await waitFor(() =>
      expect(canvas.getByRole('button', { name: t.showLess })).toHaveAttribute(
        'aria-expanded',
        'true',
      ),
    );
  },
};

/**
 * От шести отзывов лента на десктопе едет сама — и получает кнопку остановки.
 * Ниже 1200 те же отзывы лежат сеткой, и кнопки там нет: останавливать нечего.
 */
export const Drifting: Story = {
  name: 'Лента едет — есть чем остановить',
  args: { reviews: manyReviewsFixture },
};

/**
 * 🔴 Состояние, ради которого кнопка и заведена (WCAG 2.2.2). Остановленная
 * лента меняет природу: движение прекращается, зато возвращается прокрутка —
 * иначе отзывы правее первого экрана становятся недостижимы.
 *
 * 🔴 История закреплена за 1200: ниже ленты нет, и останавливать нечего
 * (ADR-219).
 */
export const Paused: Story = {
  name: 'Лента остановлена — листается руками',
  args: { reviews: manyReviewsFixture },
  tags: ['vr-1200'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const list = canvas.getByRole('list', { name: t.listLabel });

    /* 🔴 Ниже 1200 ленты нет вовсе: отзывы лежат сеткой, останавливать нечего
       (issue #274). Тег `vr-1200` закрепляет историю за десктопом, но
       сценарий обязан быть верным и без тега: молча падающий `play`
       красит снимок соседним состоянием, а прогон остаётся зелёным
       (ADR-220). */
    if (!window.matchMedia('(min-width: 1200px)').matches) {
      await waitFor(() => expect(canvas.queryByRole('button', { name: t.pauseTrack })).toBeNull());
      /* Подписи о состоянии ленты в дереве доступности тоже нет: там, где
         ленты нет, сообщать не о чем. */
      await expect(canvas.queryByRole('status')).toBeNull();
      await expect(list).toBeVisible();
      return;
    }

    /* 🔴 Кнопки остановки нет, когда покоя попросила система (issue #436):
       компонент её не рисует намеренно — WCAG 2.2.2 требует механизм
       остановки у **движущегося** содержимого. Раннер снимков как раз просит
       покоя.

       🔴 Чью просьбу выполняет лента, сценарий узнаёт у системы сам, а не по
       наличию кнопки (#445): компонент читает `prefers-reduced-motion` в
       эффекте, и в боевой сборке витрины сценарий обгонял его. */
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (calm) {
      await waitFor(() => expect(canvas.queryByRole('button', { name: t.pauseTrack })).toBeNull());
    } else {
      await userEvent.click(await canvas.findByRole('button', { name: t.pauseTrack }));
      await waitFor(() =>
        expect(canvas.getByRole('button', { name: t.resumeTrack })).toHaveAttribute(
          'aria-pressed',
          'true',
        ),
      );
    }
    // прокрутка вернулась не «по классу», а по вычисленному стилю
    await waitFor(() => expect(list).toHaveStyle({ overflowX: 'auto' }));
    await expect(canvas.getByRole('status')).toHaveTextContent(t.pausedHint);
  },
};

/**
 * 🔴 Окно с отзывом целиком (issue #275). В карточке текст обрезан по
 * четвёртой строке, и дочитать его можно только здесь — нажатием на всю
 * карточку, а не на подпись: площадь цели на телефоне важнее аккуратности.
 */
export const DialogOpen: Story = {
  name: 'Отзыв открыт целиком',
  args: { reviews: [longReviewFixture, ...reviewsFixture.slice(0, 3)] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(
      await canvas.findByRole('button', { name: t.openCard(longReviewFixture.name) }),
    );

    const dialog = await within(document.body).findByRole('dialog', { name: t.openTitle });
    await expect(within(dialog).getByText(longReviewFixture.text)).toBeInTheDocument();
  },
};

/**
 * Форма отзыва в окне (issue #277). Окно не шире 520px с 600px и занимает
 * ширину экрана с полем 12px ниже: `textarea` на четыре строки в колонку по
 * 230px не помещается.
 */
export const FormOpen: Story = {
  name: 'Форма отзыва открыта',
  args: { reviews: reviewsFixture },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await userEvent.click(await canvas.findByRole('button', { name: t.emptyCta }));

    const dialog = await within(document.body).findByRole('dialog');
    await expect(within(dialog).getByLabelText(/Имя/)).toBeInTheDocument();
  },
};
