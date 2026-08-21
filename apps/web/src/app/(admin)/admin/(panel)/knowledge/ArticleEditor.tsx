'use client';

import { useRouter } from 'next/navigation';

import { parseArticleBody } from '@/entities/article/lib/parseArticleBody';
import {
  ArticleCover,
  ArticleForm,
  createArticle,
  deleteArticle,
  emptyArticleValues,
  updateArticle,
  uploadCover,
  type ArticleFormValues,
} from '@/features/article-form';
import { ArticleBody } from '@/widgets/article';

export interface ArticleEditorProps {
  readonly id?: string | undefined;
  readonly values?: ArticleFormValues | undefined;
  readonly cover?: string | null | undefined;
}

/**
 * Обвязка формы статьи: отправка, переходы и предпросмотр.
 *
 * Предпросмотр собирается здесь, а не в самой форме: разбор живёт в домене,
 * рисование — в виджете, и фича не имеет права импортировать виджет.
 * Страница же композирует и то, и другое — и предпросмотр показывает ровно
 * то, что увидит посетитель, тем же самым кодом.
 */
export function ArticleEditor({
  id,
  values = emptyArticleValues,
  cover = null,
}: ArticleEditorProps) {
  const router = useRouter();

  const isNew = id === undefined;

  return (
    <>
      {/* Обложка есть только у сохранённой статьи: загрузка требует её
          идентификатора. У новой её показывать некуда. */}
      {isNew ? null : (
        <ArticleCover
          cover={cover}
          upload={(file) => uploadCover(id, file)}
          onChanged={() => router.refresh()}
        />
      )}

      <ArticleForm
        values={values}
        isNew={isNew}
        save={isNew ? createArticle : (next) => updateArticle(id, next)}
        {...(isNew ? {} : { remove: () => deleteArticle(id) })}
        renderPreview={(body) => <ArticleBody blocks={parseArticleBody(body)} />}
        onDone={(createdId) => {
          router.refresh();
          if (isNew && createdId !== '') {
            router.push(`/admin/knowledge/${createdId}`);
            return;
          }
          if (createdId === '') router.push('/admin/knowledge');
        }}
      />
    </>
  );
}
