/** Публичный API формы модели каталога. */
export { ProductCreateModal, type ProductCreateModalProps } from './ProductCreateModal';
export { ProductForm, type ProductFormProps } from './ProductForm';
export { SpecsEditor, type SpecsEditorProps } from './SpecsEditor';
export { productFormContent } from './content';
export {
  createProduct,
  deleteProduct,
  emptyProductValues,
  toFormValues,
  toRequestBody,
  updateProduct,
} from './lib';
export { CATALOG_NEW_PATH, CATALOG_PATH, CATALOG_SPECS_PATH } from './model';
export type {
  ProductDelete,
  ProductFormStatus,
  ProductFormValues,
  ProductSave,
  ProductSaveResult,
  SpecPair,
} from './model';
