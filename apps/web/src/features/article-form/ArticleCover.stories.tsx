import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ArticleCover, type CoverRemove, type CoverUpload } from './ArticleCover';

/* Тип объявлен явно: иначе `satisfies` выведет из общих аргументов
   `{ ok: true }` и история с отказом перестанет ему соответствовать. */
const acceptingUpload: CoverUpload = async () => ({ ok: true });

const acceptingRemove: CoverRemove = async () => ({ ok: true });

const failingUpload: CoverUpload = async () => ({
  ok: false,
  message: 'Фото больше 5 МБ. Уменьшите снимок',
});

/**
 * Обложка прямо в истории: data-URI, чтобы она не зависела ни от загруженных
 * файлов, ни от работающего `/media`.
 *
 * 🔴 Витрина собирается статикой (ADR-231) и раздаёт только `apps/web/public`,
 * где лежат одни шрифты. Адрес `/media/demo-cover.jpg` в ней мёртв, и истории
 * с обложкой показывали значок битого файла вместо обложки — issue #676.
 *
 * `next/image` для `data:` сам ставит `unoptimized` (`get-img-props`), поэтому
 * ни одного пропа ради витрины в боевой код не уезжает.
 *
 * 🔴 Пропорции ровно 16:9, как у превью 320×180: высоту превью задаёт
 * соотношение самого кадра (`height: auto` без `aspect-ratio` в стилях), и
 * картинка другой формы сдвинула бы всё, что стоит под ней.
 */
const SAMPLE_COVER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">' +
      '<rect width="640" height="360" fill="#E2F4F8"/>' +
      '<rect y="286" width="640" height="74" fill="#CFF2F8"/>' +
      '<rect x="62" y="56" width="176" height="168" rx="10" fill="#FFFFFF" stroke="#A5F3FC" stroke-width="4"/>' +
      '<rect x="148" y="56" width="4" height="168" fill="#A5F3FC"/>' +
      '<rect x="62" y="138" width="176" height="4" fill="#A5F3FC"/>' +
      '<rect x="48" y="228" width="204" height="8" rx="4" fill="#CFF2F8"/>' +
      '<rect x="330" y="120" width="250" height="80" rx="20" fill="#FFFFFF" stroke="#A5F3FC" stroke-width="4"/>' +
      '<rect x="356" y="174" width="198" height="8" rx="4" fill="#A5F3FC"/>' +
      '<circle cx="548" cy="142" r="7" fill="#A5F3FC"/>' +
      '</svg>',
  );

const meta = {
  title: 'Админка/Обложка статьи',
  component: ArticleCover,
  args: { cover: null, upload: acceptingUpload },
} satisfies Meta<typeof ArticleCover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Обложки нет: в списке её место займёт плашка с рубрикой (ADR-127). */
export const БезОбложки: Story = {};

export const СОбложкой: Story = {
  args: { cover: SAMPLE_COVER },
};

export const ОтказСервера: Story = {
  args: { upload: failingUpload },
};

/** Обложка есть, и её можно убрать: вопрос задаётся настоящим окном. */
export const СОбложкойИСнятием: Story = {
  args: { cover: SAMPLE_COVER, remove: acceptingRemove },
};
