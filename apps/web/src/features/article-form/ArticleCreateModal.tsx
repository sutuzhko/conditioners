'use client';

import { useState, type ReactNode } from 'react';

import { RouteModal, useRouteClose } from '@/shared/ui';

import { ArticleForm } from './ArticleForm';
import { articleFormContent as texts } from './content';
import { createArticle } from './lib';
import { KNOWLEDGE_PATH, emptyArticleValues, type ArticleSave } from './model';

export interface ArticleCreateModalProps {
  /**
   * Предпросмотр текста — слотом, как и у самой формы: рисовать статью умеет
   * виджет, а фича не имеет права его импортировать. Собирает слот клиентский
   * лист раздела: функция границу сервер→клиент не переживает.
   */
  readonly renderPreview?: ((body: string) => ReactNode) | undefined;
  /** Шов для историй и тестов: по умолчанию — настоящая отправка. */
  readonly save?: ArticleSave | undefined;
}

/**
 * Новая статья — окном с собственным адресом (ADR-117).
 *
 * 🔴 Форма здесь та же самая, что и на странице `/admin/knowledge/new`: окно
 * даёт ей рамку и заголовок, а прямой заход по тому же адресу отдаёт страницу.
 * Второй, «короткой», формы создания быть не может — статья без текста не
 * заводится вовсе (`body` обязателен по контракту §6), и урезанная форма
 * означала бы статью, которую нельзя сохранить.
 *
 * Правка сюда не попадает: она остаётся страницей.
 */
export function ArticleCreateModal({
  renderPreview,
  save = createArticle,
}: ArticleCreateModalProps) {
  const close = useRouteClose(KNOWLEDGE_PATH);

  /**
   * 🔴 Несохранённый ввод — это любое изменение в форме. Признак снимается
   * событием изменения, а не полями: копия правила «чем считать заполненным»
   * разошлась бы с китом и с соседними разделами на первой правке (ADR-141).
   * Лишний вопрос стоит одного клика, потерянный текст статьи — вечера работы.
   *
   * Именно `onChange`, а не `onInput`: у `<select>` React берёт `onChange` из
   * нативного `change`, а `input` приходит раньше — перерисовка по нему
   * откатывает управляемый список к прежнему значению, и первый выбор
   * теряется молча.
   */
  const [dirty, setDirty] = useState(false);

  return (
    <RouteModal
      title={texts.createTitle}
      description={texts.createHint}
      size="lg"
      fallbackHref={KNOWLEDGE_PATH}
      dirty={dirty}
      confirmText={texts.createConfirm}
    >
      <div onChange={() => setDirty(true)}>
        {/* Разделы формы уходят на третий уровень: второй занят названием
            окна, и заголовки без пропусков — инвариант 4. */}
        <ArticleForm
          values={emptyArticleValues}
          isNew
          save={save}
          surface="bare"
          headingLevel={3}
          {...(renderPreview === undefined ? {} : { renderPreview })}
          onDone={() => {
            /* Сохранили — окно уходит само и просит обновить список: звать
               `router.refresh()` рядом с закрытием бесполезно, «назад»
               отбрасывает начатый до него запрос. Обложка загружается уже в
               карточке статьи, ей нужен её адрес. */
            setDirty(false);
            close({ refresh: true });
          }}
        />
      </div>
    </RouteModal>
  );
}
