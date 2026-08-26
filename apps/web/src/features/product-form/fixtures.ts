/** Данные для историй и тестов формы модели. */
import type { ProductFormValues, ProductSave, ProductSaveResult } from './model';

export const filledProduct: ProductFormValues = {
  name: 'Сплит-система 09',
  badge: '09',
  areaMax: '27',
  priceNum: '38500',
  tag: 'инвертор',
  brand: '',
  sku: '',
  link: '',
  slug: 'split-sistema-09',
  sort: '0',
  visible: true,
  featured: true,
  seoTitle: '',
  seoDescription: '',
  specs: [
    { k: 'Площадь', v: 'до 27 м²' },
    { k: 'Уровень шума', v: '21 дБ' },
  ],
};

export const acceptingSave: ProductSave = async () => ({ ok: true, id: 'demo' });

export const rejectingSave: ProductSave = async () => ({
  ok: false,
  message: 'Цена должна быть больше нуля',
  field: 'priceNum',
});

export const failingSave: ProductSave = async () => ({
  ok: false,
  message: 'Сервер не принял изменения. Попробуйте ещё раз',
});

/** Сохранение, которое не завершается: состояние «сохраняем» в истории. */
export const pendingSave: ProductSave = () => new Promise<ProductSaveResult>(() => {});
