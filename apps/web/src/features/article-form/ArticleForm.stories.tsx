import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { ArticleForm } from './ArticleForm';
import { articleFormContent as texts } from './content';
import {
  acceptingSave,
  draftArticle,
  failingSave,
  filledArticle,
  pendingSave,
  rejectingSave,
} from './fixtures';
import { emptyArticleValues } from './model';

const meta = {
  title: 'Админка/Статья',
  component: ArticleForm,
  args: {
    values: filledArticle,
    save: acceptingSave,
    /* Адрес сайта и приписка приходят с сервера — в коде их нет
       (инвариант 8). В историях это заведомо демонстрационные значения. */
    siteUrl: 'https://example.test',
    titleSuffix: 'Демо-стенд',
    updatedAt: '2026-09-03T11:02:00.000Z',
  },
} satisfies Meta<typeof ArticleForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Опубликованная статья. Предпросмотр в историях — сырой текст: настоящий
    разбор живёт в домене, а рисование в виджете, и композирует их страница. */
export const Опубликована: Story = {
  args: {
    remove: async () => ({ ok: true }),
    renderPreview: (body) => <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{body}</pre>,
  },
};

export const Черновик: Story = {
  args: { values: draftArticle, remove: async () => ({ ok: true }) },
};

export const НоваяСтатья: Story = {
  args: { values: emptyArticleValues, isNew: true },
};

export const Сохранение: Story = {
  args: { save: pendingSave },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.save }));
  },
};

export const ОшибкаПоля: Story = {
  args: { save: rejectingSave },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.save }));
  },
};

export const ОтказСервера: Story = {
  args: { save: failingSave },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: texts.save }));
  },
};

/**
 * Вкладка «Текст»: редактор, панель разметки и боковая колонка состояния.
 * Обложку рисует слот — на странице это загрузчик файла, в истории заглушка.
 */
export const ВкладкаТекст: Story = {
  args: {
    tab: 'text',
    remove: async () => ({ ok: true }),
    renderPreview: (body) => <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{body}</pre>,
    cover: <CoverSlot />,
  },
};

/** Вкладка «SEO»: живое превью выдачи, счётчики длины и вычисленный каноникал. */
export const ВкладкаSEO: Story = {
  args: { tab: 'seo', remove: async () => ({ ok: true }) },
};

/** Длина сверх рекомендованной: счётчик красится, ввод при этом не запрещён. */
export const ВкладкаSEOПеребор: Story = {
  args: {
    tab: 'seo',
    values: {
      ...filledArticle,
      seoTitle: 'Монтаж кондиционера в Туле под ключ: цена, сроки, гарантия и что входит в смету',
      seoDescription: '',
    },
  },
};

/** Пустой адрес у сохранённой статьи: каноникала нет, и это названо ошибкой. */
export const ВкладкаSEOБезАдреса: Story = {
  args: { tab: 'seo', values: { ...filledArticle, slug: '' } },
};

/** Вкладка «Публикация»: переключатель, дата, рубрика и анонс. */
export const ВкладкаПубликация: Story = {
  args: { tab: 'publish', values: draftArticle, cover: <CoverSlot /> },
};

/** Заглушка обложки: настоящую рисует страница — она грузит файл своей ручкой. */
function CoverSlot() {
  return (
    <div
      style={{
        border: '1px dashed var(--line-ui)',
        borderRadius: 'var(--r-md)',
        color: 'var(--muted)',
        fontSize: 'var(--fs-caption)',
        padding: '32px 12px',
        textAlign: 'center',
      }}
    >
      Обложка статьи
    </div>
  );
}
