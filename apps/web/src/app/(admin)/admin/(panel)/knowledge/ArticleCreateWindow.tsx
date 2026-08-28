'use client';

import { parseArticleBody } from '@/entities/article/lib/parseArticleBody';
import { ArticleCreateModal } from '@/features/article-form';
import { ArticleBody } from '@/widgets/article';

/**
 * Окно новой статьи: сборка предпросмотра.
 *
 * 🔴 Слот предпросмотра — функция, а функции не переживают границу
 * сервер→клиент: собрать его обязан клиентский лист, а не страница
 * перехватывающего маршрута. Разбор живёт в домене, рисование — в виджете,
 * и фича не имеет права импортировать виджет: композирует их слой страниц —
 * ровно так же, как `ArticleEditor` для страницы правки.
 */
export function ArticleCreateWindow() {
  return (
    <ArticleCreateModal renderPreview={(body) => <ArticleBody blocks={parseArticleBody(body)} />} />
  );
}
