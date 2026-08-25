'use client';

import { useRouter } from 'next/navigation';

import { EMPTY_SPEC_DICTIONARY, type SpecDictionary } from '@/entities/product/lib/groupSpecs';
import {
  ProductForm,
  createProduct,
  deleteProduct,
  emptyProductValues,
  updateProduct,
  type ProductFormValues,
} from '@/features/product-form';
import { ProductPhotos, photoApi, type PhotoItem } from '@/features/product-photos';
import { ProductSaleForm, patchSale, type SaleFormValues } from '@/features/product-sale';

export interface ProductEditorProps {
  /** Пусто — создаём новую модель. */
  readonly id?: string | undefined;
  readonly values?: ProductFormValues | undefined;
  readonly photos?: readonly PhotoItem[] | undefined;
  readonly sale?: SaleFormValues | undefined;
  /** Обычная цена: от неё форма скидки считает процент. */
  readonly priceNum?: number | undefined;
  /** Справочник характеристик: подсказки в редакторе (ADR-094). */
  readonly specDictionary?: SpecDictionary | undefined;
}

/**
 * Обвязка формы модели: отправка и переходы.
 *
 * Клиентский слой тонкий намеренно — форма о маршрутизации не знает, поэтому
 * её можно показать в Storybook. Здесь только то, что без браузера не живёт.
 */
export function ProductEditor({
  id,
  values = emptyProductValues,
  photos = [],
  sale,
  priceNum = 0,
  specDictionary = EMPTY_SPEC_DICTIONARY,
}: ProductEditorProps) {
  const router = useRouter();

  const isNew = id === undefined;

  return (
    <>
      <ProductForm
        values={values}
        isNew={isNew}
        specDictionary={specDictionary}
        save={isNew ? createProduct : (next) => updateProduct(id, next)}
        {...(isNew ? {} : { remove: () => deleteProduct(id) })}
        onDone={(createdId) => {
          /* refresh обязателен: список и форма — серверные, и без сброса кеша
             маршрутизатора владелец вернётся к прежним данным. */
          router.refresh();
          if (isNew && createdId !== '') {
            router.push(`/admin/catalog/${createdId}`);
            return;
          }
          if (createdId === '') router.push('/admin/catalog');
        }}
      />

      {/* Фотографии и скидка есть только у сохранённой модели: и то, и другое
          требует её идентификатора. У новой их показывать нечему. */}
      {isNew || sale === undefined ? null : (
        <>
          <ProductPhotos photos={photos} api={photoApi(id)} onChanged={() => router.refresh()} />

          <ProductSaleForm
            priceNum={priceNum}
            values={sale}
            save={(next) => patchSale(id, next)}
            onSaved={() => router.refresh()}
          />
        </>
      )}
    </>
  );
}
