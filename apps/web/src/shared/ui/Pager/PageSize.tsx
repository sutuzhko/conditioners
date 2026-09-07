'use client';

import { useRouter } from 'next/navigation';

import { Select } from '../Select/Select';
import styles from './PageSize.module.css';

export interface PageSizeOption {
  /** Что видно в списке: «8», «20», «50». */
  readonly label: string;
  /** Адрес списка с этим шагом. Считает вызывающий: правила отбора у него. */
  readonly href: string;
}

export interface PageSizeProps {
  /** Видимая подпись слева от поля: «Строк на странице». */
  readonly title: string;
  /** Адрес действующего шага — он же один из `options[].href`. */
  readonly value: string;
  readonly options: readonly PageSizeOption[];
  readonly className?: string | undefined;
}

/**
 * Шаг листания списка: «Строк на странице ⌄ 20» (issue #748).
 *
 * 🔴 Одно поле выбора, а не ряд ступеней. Ступени стояли ссылками — по одной
 * на значение, — и в подвале склада получался ряд пилюль рядом с рядом
 * пилюль: «8» читалось третьей страницей разбивки, и ниже 600px ступени
 * пришлось раздевать до текста отдельным правилом, чтобы их отличить.
 * В макете (`design/admin/Stock.body.html`) это одна кнопка с шевроном, и
 * одна цель вместо трёх снимает путаницу целиком.
 *
 * 🔴 На `shared/ui/Select`, а не на своём `<select>`. Сырой контрол разошёлся
 * бы с китом по высоте, фокусу и тёмной теме на первой же правке токенов —
 * и стал бы четвёртой редакцией там, где три сводятся в одну.
 *
 * 🔴 Подпись видна и озвучена одним текстом: имя полю даёт `aria-label`, а
 * тот же текст стоит рядом видимой надписью. Подпись кита сюда не годится —
 * в панели она ложится внутрь поля, а здесь по макету стоит слева от него.
 *
 * 🔴 Шаг живёт в адресе, а не в состоянии: ссылку на список можно сохранить и
 * прислать, а сам список рисует сервер. Адреса считает вызывающий и передаёт
 * готовыми — правила отбора и сброс на первую страницу принадлежат разделу, а
 * не киту.
 *
 * 🔴 Значение пункта — сам адрес, а не число. Так адреса всех ступеней стоят
 * в разметке и видны и человеку, и тесту: ступени были ссылками, и потерять
 * вместе с ними проверяемость «куда ведёт шаг» значило бы разменять один
 * дефект на другой. Действующий шаг вызывающий считает той же функцией, что и
 * пункты, — разойтись им нечем.
 */
export function PageSize({ title, value, options, className }: PageSizeProps) {
  const router = useRouter();

  return (
    <span className={[styles.root, className].filter(Boolean).join(' ')}>
      {/* Надпись скрыта от чтения: тот же текст читалка получает именем поля,
          и без `aria-hidden` она услышала бы его дважды (ADR-159). */}
      <span className={styles.title} aria-hidden="true">
        {title}
      </span>

      <Select
        variant="bordered"
        className={styles.select}
        wrapperClassName={styles.field}
        aria-label={title}
        value={value}
        options={options.map(({ href, label }) => ({ value: href, label }))}
        onChange={(event) => router.push(event.target.value)}
      />
    </span>
  );
}
