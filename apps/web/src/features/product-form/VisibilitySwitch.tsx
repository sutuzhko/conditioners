'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Switch, Tooltip } from '@/shared/ui';

import { productFormContent as texts } from './content';
import { setProductVisible } from './lib';
import type { SetVisible } from './model';
import styles from './VisibilitySwitch.module.css';

export interface VisibilitySwitchProps {
  readonly id: string;
  /** Название модели: подпись переключателя в списке из десяти строк общая. */
  readonly name: string;
  readonly visible: boolean;
  /** Шов для историй и тестов; по умолчанию — `PATCH /api/admin/models/{id}`. */
  readonly save?: SetVisible | undefined;
}

/**
 * Видимость модели прямо из списка каталога.
 *
 * 🔴 Снять модель с продажи — действие на один щелчок, а не повод открывать
 * карточку: в жару кончается склад, и владелец прячет то, чего нет, с
 * телефона. Поэтому переключатель, а не флажок формы: значение действует
 * немедленно (см. `Switch` в ките).
 *
 * Отказ сервера возвращает переключатель в прежнее положение и говорит об
 * этом словами: молча оставленное новое положение врало бы про состояние
 * сайта.
 */
export function VisibilitySwitch({
  id,
  name,
  visible,
  save = setProductVisible,
}: VisibilitySwitchProps) {
  const router = useRouter();

  const [on, setOn] = useState(visible);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const toggle = async (next: boolean): Promise<void> => {
    /* Положение меняется сразу: ожидание ответа на переключателе выглядит
       поломкой, а не работой. */
    setOn(next);
    setBusy(true);
    setMessage('');

    const result = await save(id, next);

    setBusy(false);
    if (result.ok) {
      /* Список серверный: без сброса кеша маршрутизатора соседние счётчики
         останутся от прежних данных. */
      router.refresh();
      return;
    }

    setOn(!next);
    setMessage(result.message ?? texts.serverError);
  };

  return (
    <div className={styles.root}>
      {/* 🔴 Подпись состояния уехала в подсказку, а видимой не осталось:
          в колонке она повторялась двадцать раз подряд и занимала место
          рядом с самим переключателем, который то же самое и показывает.
          Смысл при этом не потерян: состояние озвучивается ролью `switch`,
          а имя строки стоит в `aria-label` — просьба владельца от 5 сентября. */}
      <Tooltip text={on ? texts.inCatalog : texts.hidden}>
        <Switch
          size="sm"
          checked={on}
          disabled={busy}
          label={on ? texts.inCatalog : texts.hidden}
          labelHidden
          aria-label={texts.visibleLabel(name)}
          onChange={(event) => {
            void toggle(event.target.checked);
          }}
        />
      </Tooltip>

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
