/** Данные для историй и тестов формы статьи. */
import type { ArticleFormValues, ArticleSave, ArticleSaveResult } from './model';

export const filledArticle: ArticleFormValues = {
  title: 'Инвертор или обычный кондиционер',
  category: 'Выбор техники',
  date: '2026-08-01',
  minutes: '6',
  excerpt: 'Чем инверторный компрессор отличается от обычного и когда переплата за него окупается.',
  body: '## Коротко\n\nИнвертор дороже, но тише и экономнее.\n\n- меньше расход\n- ниже уровень шума\n\n> Разница окупается за три-четыре сезона.',
  published: true,
  slug: 'invertor-ili-onoff',
  seoTitle: '',
  seoDescription: '',
};

export const draftArticle: ArticleFormValues = {
  ...filledArticle,
  published: false,
};

export const acceptingSave: ArticleSave = async () => ({ ok: true, id: 'demo' });

export const rejectingSave: ArticleSave = async () => ({
  ok: false,
  message: 'Анонс слишком короткий',
  field: 'excerpt',
});

export const failingSave: ArticleSave = async () => ({
  ok: false,
  message: 'Сервер не принял изменения. Попробуйте ещё раз',
});

export const pendingSave: ArticleSave = () => new Promise<ArticleSaveResult>(() => {});
