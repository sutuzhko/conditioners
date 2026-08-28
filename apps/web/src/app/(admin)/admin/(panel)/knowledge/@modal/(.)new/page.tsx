import { requireOwnerPage } from '@/server/guards';

import { ArticleCreateWindow } from '../../ArticleCreateWindow';

export const dynamic = 'force-dynamic';

/**
 * Окно «Новая статья» поверх списка.
 *
 * 🔴 Проверка роли стоит в самой странице (ADR-095): страж выше неё успевает
 * сменить адрес, но не остановить рендер того, что показывать нельзя.
 */
export default async function AdminNewArticleModal() {
  await requireOwnerPage();

  return <ArticleCreateWindow />;
}
