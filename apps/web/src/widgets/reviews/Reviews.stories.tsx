import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { reviewsContent as t } from './content';
import { Reviews } from './Reviews';
import {
  policyHrefFixture,
  reviewWithPhotoFixture,
  reviewWithoutPhotoFixture,
  reviewsFixture,
} from './fixtures';

/**
 * Блок отзывов вместе с формой — одна секция макета.
 *
 * 🔴 Первой идёт пустая секция: настоящих отзывов у проекта нет, выдуманные
 * публиковать запрещено (инвариант 10, ADR-012), и ближайшие месяцы сайт
 * выглядит именно так. Остальные истории показывают, как блок поведёт себя,
 * когда отзывы появятся.
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
};

export const WithReviews: Story = {
  name: 'Несколько отзывов',
  args: { reviews: reviewsFixture },
};

export const WithPhoto: Story = {
  name: 'Отзыв с фотографией',
  args: { reviews: [reviewWithPhotoFixture, ...reviewsFixture.slice(0, 2)] },
};

export const WithoutDistrict: Story = {
  name: 'Отзыв без района',
  args: { reviews: [reviewWithoutPhotoFixture] },
};

/**
 * От шести отзывов лента едет сама — и получает кнопку остановки. Меньше
 * шести двигать нечего: за краями одни заготовки, и кнопки там нет.
 */
const drifting = [
  ...reviewsFixture,
  { ...reviewWithPhotoFixture, id: 'drift-1' },
  { ...reviewWithoutPhotoFixture, id: 'drift-2' },
];

export const Drifting: Story = {
  name: 'Лента едет — есть чем остановить',
  args: { reviews: drifting },
};

/**
 * 🔴 Состояние, ради которого кнопка и заведена (WCAG 2.2.2). Остановленная
 * лента меняет природу: движение прекращается, зато возвращается прокрутка —
 * иначе отзывы правее первого экрана становятся недостижимы.
 */
export const Paused: Story = {
  name: 'Лента остановлена — листается руками',
  args: { reviews: drifting },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    /* 🔴 Кнопки остановки нет, когда покоя попросила система (issue #436):
       компонент её не рисует намеренно — WCAG 2.2.2 требует механизм
       остановки у **движущегося** содержимого, а остановленную системой ленту
       останавливать нечем. Раннер снимков как раз просит покоя.

       🔴 Чью просьбу выполняет лента, сценарий узнаёт у системы сам, а не по
       наличию кнопки (#445). Компонент читает `prefers-reduced-motion` в
       эффекте, и в боевой сборке витрины сценарий обгонял его: кнопка ещё
       стояла, нажатие переключало ленту, а следом эффект узнавал о покое и
       убирал кнопку вовсе — искать «Возобновить» было уже негде. На
       дев-сервере эффект успевал первым, и гонка не была видна. Поэтому
       сначала ждём, пока лента согласится с системой, и только потом
       проверяем итог, а не путь. */
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
    await expect(canvas.getByRole('list', { name: t.listLabel })).toHaveStyle({
      overflowX: 'auto',
    });
    await expect(canvas.getByRole('status')).toHaveTextContent(t.pausedHint);
  },
};
