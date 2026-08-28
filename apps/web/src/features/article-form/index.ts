/** Публичный API формы статьи. */
export { ArticleForm, type ArticleFormProps } from './ArticleForm';
export { ArticleCreateModal, type ArticleCreateModalProps } from './ArticleCreateModal';
export type { ArticleSurface } from './ArticleFormSection';
export { ArticleCover, type ArticleCoverProps, type CoverUpload } from './ArticleCover';
export { articleCoverContent, articleFormContent } from './content';
export { createArticle, deleteArticle, toRequestBody, updateArticle, uploadCover } from './lib';
export {
  KNOWLEDGE_PATH,
  emptyArticleValues,
  type ArticleDelete,
  type ArticleFormStatus,
  type ArticleFormValues,
  type ArticleSave,
  type ArticleSaveResult,
} from './model';
