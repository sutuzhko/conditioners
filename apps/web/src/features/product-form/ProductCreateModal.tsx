'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { EMPTY_SPEC_DICTIONARY, type SpecDictionary } from '@/entities/product/lib/groupSpecs';
import { RouteModal, useRouteClose } from '@/shared/ui';

import { productFormContent as texts } from './content';
import { createProduct } from './lib';
import { CATALOG_PATH, emptyProductValues, type ProductSave } from './model';
import { ProductForm } from './ProductForm';

export interface ProductCreateModalProps {
  /** Справочник характеристик: подсказки названий и типовые наборы (ADR-094). */
  readonly specDictionary?: SpecDictionary | undefined;
  /** Шов для историй и тестов: по умолчанию — запрос к ручке каталога. */
  readonly save?: ProductSave | undefined;
}

/**
 * Заведение модели каталога — окном с собственным адресом (ADR-117).
 *
 * 🔴 Окно, а не отдельная страница: форму создания открывают из списка и в
 * список же возвращаются — уходить со всего раздела ради неё незачем. Правка
 * при этом остаётся страницей: там фотографии, скидка и характеристики по
 * группам, то есть работа другой длительности.
 *
 * Само окно — из кита (`RouteModal`), здесь только то, что оно заводит.
 */
export function ProductCreateModal({
  specDictionary = EMPTY_SPEC_DICTIONARY,
  save = createProduct,
}: ProductCreateModalProps) {
  const close = useRouteClose(CATALOG_PATH);
  const router = useRouter();

  /**
   * 🔴 Несохранённый ввод — это любое изменение в форме. Признак снимается
   * событием, а не полями формы: копия правила «чем считать заполненным»
   * разошлась бы с китом на первой правке (ADR-141). Ложное срабатывание тут
   * дешевле пропуска: лишний вопрос стоит одного клика, потерянная форма
   * модели — четырёх десятков полей заново.
   *
   * Именно `onChange`, а не `onInput`: у `<select>` React берёт `onChange` из
   * нативного `change`, а `input` приходит раньше — перерисовка по нему
   * откатывает управляемый список к прежнему значению. Здесь это гасило выбор
   * в «типовых характеристиках из группы»: набор добавлялся со второго раза.
   */
  const [dirty, setDirty] = useState(false);

  return (
    <RouteModal
      title={texts.createTitle}
      description={texts.createHint}
      size="lg"
      fallbackHref={CATALOG_PATH}
      dirty={dirty}
    >
      <div onChange={() => setDirty(true)}>
        <ProductForm
          values={emptyProductValues}
          isNew
          surface="bare"
          specDictionary={specDictionary}
          save={save}
          onDone={(id) => {
            setDirty(false);

            /* 🔴 Сохранили — уходим в карточку модели, а не в список. Заведение
               модели это первый шаг из двух: фотографии, скидка и
               характеристики задаются в карточке, и без них модель на витрину
               не выпустишь. Вернув владельца в список, окно заставило бы его
               искать там только что созданную строку — так эта форма
               работала страницей, и терять это поведение незачем.

               Отличие от склада, где окно закрывается в список, не в
               непоследовательности: позиция склада заведением закончена, а
               модель — нет.

               🔴 Обновления списка здесь нет и не нужно: уходим не в список, а
               в карточку — за её данными роутер сходит сам. Звать
               `router.refresh()` рядом с переходом всё равно бесполезно,
               переход отбрасывает начатый до него запрос.

               `replace`, а не `push`: адрес окна уходит из истории, и «назад»
               из карточки ведёт в список, а не открывает пустую форму заново. */
            if (id === '') {
              /* Сервер принял модель, но идентификатора не назвал — вести
                 некуда, закрываемся в список и просим его обновить. */
              close({ refresh: true });
              return;
            }

            router.replace(`${CATALOG_PATH}/${id}`);
          }}
        />
      </div>
    </RouteModal>
  );
}
