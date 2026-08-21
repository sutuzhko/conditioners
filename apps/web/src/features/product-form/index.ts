/** Публичный API формы модели каталога. */
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
export type {
  ProductDelete,
  ProductFormStatus,
  ProductFormValues,
  ProductSave,
  ProductSaveResult,
  SpecPair,
} from './model';
