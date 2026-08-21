'use client';

import { useRouter } from 'next/navigation';

import {
  ProductForm,
  createProduct,
  deleteProduct,
  emptyProductValues,
  updateProduct,
  type ProductFormValues,
} from '@/features/product-form';

export interface ProductEditorProps {
  /** Пусто — создаём новую модель. */
  readonly id?: string | undefined;
  readonly values?: ProductFormValues | undefined;
}

/**
 * Обвязка формы модели: отправка и переходы.
 *
 * Клиентский слой тонкий намеренно — форма о маршрутизации не знает, поэтому
 * её можно показать в Storybook. Здесь только то, что без браузера не живёт.
 */
export function ProductEditor({ id, values = emptyProductValues }: ProductEditorProps) {
  const router = useRouter();

  const isNew = id === undefined;

  return (
    <ProductForm
      values={values}
      isNew={isNew}
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
  );
}
