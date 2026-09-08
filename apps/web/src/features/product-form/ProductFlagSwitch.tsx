'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Switch, Tooltip } from '@/shared/ui';

import { productFormContent as texts } from './content';
import { setProductFlag } from './lib';
import type { ProductFlag, SetProductFlag } from './model';
import styles from './ProductFlagSwitch.module.css';

export interface ProductFlagSwitchProps {
  readonly id: string;
  /** Название модели: подпись переключателя в списке из десяти строк общая. */
  readonly name: string;
  /** Какой признак переключается: видимость в каталоге или витрина главной. */
  readonly flag: ProductFlag;
  readonly on: boolean;
  /**
   * Класс на корень. Нужен списку каталога: строка там нажимается целиком, и
   * переключатель обязан подняться над её перекрытием — иначе нажатие по
   * дорожке открывало бы карточку модели вместо того, чтобы снять её с
   * продажи (issue #743).
   */
  readonly className?: string | undefined;
  /** Шов для историй и тестов; по умолчанию — `PATCH /api/admin/models/{id}`. */
  readonly save?: SetProductFlag | undefined;
}

/**
 * Подписи признака: имя ввода для читалки и состояние для подсказки.
 *
 * Живут словарём, а не тремя тернарниками по месту: у следующего признака
 * набор тот же, и добавляется он строкой.
 */
const FLAG_TEXTS: Readonly<
  Record<
    ProductFlag,
    {
      readonly on: string;
      readonly off: string;
      readonly label: (name: string) => string;
    }
  >
> = {
  visible: { on: texts.inCatalog, off: texts.hidden, label: texts.visibleLabel },
  featured: { on: texts.onHome, off: texts.notOnHome, label: texts.featuredLabel },
};

/**
 * Признак модели прямо из списка каталога: видимость и витрина главной.
 *
 * 🔴 Снять модель с продажи — действие на один щелчок, а не повод открывать
 * карточку: в жару кончается склад, и владелец прячет то, чего нет, с
 * телефона. Поэтому переключатель, а не флажок формы: значение действует
 * немедленно (см. `Switch` в ките). То же и с витриной (issue #751): до этого
 * «На главной» была плашкой, и снять модель с главной можно было только из
 * карточки — при том, что соседняя колонка той же природы переключалась на
 * месте.
 *
 * Отказ сервера возвращает переключатель в прежнее положение и говорит об
 * этом словами: молча оставленное новое положение врало бы про состояние
 * сайта.
 */
export function ProductFlagSwitch({
  id,
  name,
  flag,
  on: initial,
  className,
  save = setProductFlag,
}: ProductFlagSwitchProps) {
  const router = useRouter();
  const words = FLAG_TEXTS[flag];

  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const toggle = async (next: boolean): Promise<void> => {
    /* Положение меняется сразу: ожидание ответа на переключателе выглядит
       поломкой, а не работой. */
    setOn(next);
    setBusy(true);
    setMessage('');

    const result = await save(id, flag, next);

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

  /* Свой класс первым, добавленный снаружи — вторым: сборщик измерений
     называет узел первым классом-модулем (ADR-234). */
  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      {/* 🔴 Подпись состояния уехала в подсказку, а видимой не осталось:
          в колонке она повторялась двадцать раз подряд и занимала место
          рядом с самим переключателем, который то же самое и показывает.
          Смысл при этом не потерян: состояние озвучивается ролью `switch`,
          а имя строки стоит в `aria-label` — просьба владельца от 5 сентября.
          Подсказка кита открывается наведением и фокусом (WCAG 1.4.13). */}
      <Tooltip text={on ? words.on : words.off}>
        <Switch
          size="sm"
          checked={on}
          disabled={busy}
          label={on ? words.on : words.off}
          labelHidden
          aria-label={words.label(name)}
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
