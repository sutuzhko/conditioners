/** Публичный API формы модели каталога. */
export { ProductCreateModal, type ProductCreateModalProps } from './ProductCreateModal';
export { ProductForm, type ProductFormProps } from './ProductForm';
export { ProductRowRemove, type ProductRowRemoveProps } from './ProductRowRemove';
export { ProductFlagSwitch, type ProductFlagSwitchProps } from './ProductFlagSwitch';
export { SpecsEditor, type SpecsEditorProps } from './SpecsEditor';
export { productFormContent } from './content';
export {
  createProduct,
  deleteProduct,
  emptyProductValues,
  setProductFlag,
  toFormValues,
  toRequestBody,
  updateProduct,
} from './lib';
export { CATALOG_NEW_PATH, CATALOG_PATH, CATALOG_SPECS_PATH } from './model';
export type {
  ProductDelete,
  ProductFlag,
  ProductFormStatus,
  ProductFormValues,
  ProductSave,
  ProductSaveResult,
  SetProductFlag,
  SpecPair,
} from './model';
