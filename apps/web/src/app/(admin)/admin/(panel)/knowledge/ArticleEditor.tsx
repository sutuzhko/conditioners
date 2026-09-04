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
  removeCover,
  uploadCover,
  type ArticleFormValues,
  type ArticleTab,
} from '@/features/article-form';
import { ArticleBody } from '@/widgets/article';

export interface ArticleEditorProps {
  readonly id?: string | undefined;
  readonly values?: ArticleFormValues | undefined;
  readonly cover?: string | null | undefined;
  /** Открытая вкладка. Не задана — форма показывает всё сразу (создание). */
  readonly tab?: ArticleTab | undefined;
  readonly siteUrl?: string | undefined;
  readonly titleSuffix?: string | undefined;
  readonly updatedAt?: string | undefined;
}

/**
 * Обвязка формы статьи: отправка, переходы и предпросмотр.
 *
 * Предпросмотр собирается здесь, а не в самой форме: разбор живёт в домене,
 * рисование — в виджете, и фича не имеет права импортировать виджет.
 * Страница же композирует и то, и другое — и предпросмотр показывает ровно
 * то, что увидит посетитель, тем же самым кодом.
 *
 * 🔴 Обложка тоже приходит слотом: она грузится своей ручкой и стоит то в
 * боковой колонке вкладки «Текст», то на вкладке «Публикация» — решает это
 * форма, а не редактор (issue #355).
 */
export function ArticleEditor({
  id,
  values = emptyArticleValues,
  cover = null,
  tab,
  siteUrl,
  titleSuffix,
  updatedAt,
}: ArticleEditorProps) {
  const router = useRouter();

  const isNew = id === undefined;

  return (
    <ArticleForm
      values={values}
      isNew={isNew}
      save={isNew ? createArticle : (next) => updateArticle(id, next)}
      {...(isNew ? {} : { remove: () => deleteArticle(id) })}
      {...(tab === undefined ? {} : { tab })}
      {...(siteUrl === undefined ? {} : { siteUrl })}
      {...(titleSuffix === undefined ? {} : { titleSuffix })}
      {...(updatedAt === undefined ? {} : { updatedAt })}
      {...(isNew
        ? {}
        : {
            cover: (
              <ArticleCover
                cover={cover}
                upload={(file) => uploadCover(id, file)}
                remove={() => removeCover(id)}
                onChanged={() => router.refresh()}
              />
            ),
          })}
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
  );
}
