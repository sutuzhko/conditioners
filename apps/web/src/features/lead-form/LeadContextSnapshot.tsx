'use client';

import { useEffect } from 'react';

import type { LeadContextModel } from '@/entities/lead/model';

import { rememberLeadContext } from './context';

export interface LeadContextSnapshotProps {
  /** Модель страницы, с которой человек уйдёт в форму по кнопке «Заказать». */
  readonly model?: LeadContextModel | undefined;
  /** Отмеченные модели: снимок отметок сравнения на момент показа страницы. */
  readonly liked?: readonly LeadContextModel[] | undefined;
}

/**
 * Снимок с серверной страницы в хранилище контекста.
 *
 * 🔴 Нужен там, где кнопка «Заказать» уводит на форму с другой страницы:
 * каталог и карточка модели собираются на сервере и не несут ни строчки
 * своего JavaScript (ADR-109), поэтому позвать `rememberLeadContext` из
 * ссылки они не могут, а адрес формы понёс бы только слаги — из них уже не
 * восстановить ни имени, ни цены, которую человек видел.
 *
 * Компонент ничего не рисует: разметка страницы не меняется ни на символ,
 * инвариант 1 в силе. Цену и название считает сервер в тот же момент, что и
 * витрину, — снимок совпадает с экраном по построению (ADR-101).
 */
export function LeadContextSnapshot({ model, liked }: LeadContextSnapshotProps): null {
  /* Пропсы приходят из серверного компонента новыми объектами на каждый
     рендер, и эффект повторяется. Это безопасно: запись того же снимка
     хранилище не трогает и подписчиков не будит. */
  useEffect(() => {
    rememberLeadContext({
      ...(model === undefined ? {} : { model }),
      ...(liked === undefined ? {} : { liked: [...liked] }),
    });
  }, [model, liked]);

  return null;
}
