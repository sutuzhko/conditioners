import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react';

import { Tooltip } from '../Tooltip/Tooltip';
import styles from './TableActions.module.css';

export interface TableActionsProps {
  /**
   * Круглые действия строки — до трёх. Больше трёх не помещается в колонку
   * и уводит взгляд от самих данных: четвёртое и дальше уходят в меню строки.
   */
  readonly children: ReactNode;
  /** Имя группы для озвучки: «Действия над нарядом № 1059». */
  readonly label: string;
  readonly className?: string | undefined;
}

/**
 * Правая колонка действий строки таблицы (issue #329).
 *
 * 🔴 Действия видны всегда, а не проявляются по наведению. Наведения нет ни
 * на телефоне, ни у клавиатуры, и спрятанное за ним действие для половины
 * способов ввода не существует вовсе. Приглушены они цветом, а не
 * прозрачностью: прозрачный значок на тинте строки срыва теряет контраст.
 */
export function TableActions({ children, label, className }: TableActionsProps) {
  return (
    <div
      className={[styles.actions, className].filter(Boolean).join(' ')}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}

/**
 * Смысл действия, а не его цвет: `open` — уйти и посмотреть, `edit` —
 * изменить, `remove` — убрать. Краска выводится отсюда, поэтому одинаковые
 * по смыслу действия во всех разделах панели выглядят одинаково.
 */
export type TableActionTone = 'open' | 'edit' | 'remove';

interface ActionLook {
  /** Имя для озвучки и всплывающей подсказки: «Удалить: Сплит-система 09». */
  readonly label: string;
  readonly icon: ReactNode;
  readonly tone?: TableActionTone | undefined;
  readonly className?: string | undefined;
}

function actionClassName(tone: TableActionTone = 'open', className?: string | undefined): string {
  return [styles.action, styles[tone], className].filter(Boolean).join(' ');
}

/**
 * Значок внутри действия. Спрятан от дерева доступности вместе с подсказкой:
 * имя даёт `aria-label`, и продублированное `title` читалки объявляют дважды
 * — «Удалить, Удалить» (ADR-159).
 *
 * 🔴 Пролёт растянут на всю кнопку. Пока он обнимал только глиф, подсказка
 * появлялась лишь над самим значком, а на полях круга — уже нет: владелец
 * навёл на кнопку и подсказки не увидел.
 *
 * 🔴 Имя действия дублируется подсказкой кита — она обёрнута снаружи кнопки,
 * а не внутри неё: наведение обязано ловиться на любой точке круга. Родное
 * `title` отсюда убрано: оно появляется через секунду, не открывается с
 * клавиатуры и не убирается по Esc — то есть для половины способов ввода его
 * нет. Обрезка контейнером таблицы подсказке больше не грозит: пузырёк уходит
 * порталом (issue #332, тот же приём, что у меню строки).
 */
function ActionIcon({ icon }: { readonly icon: ReactNode }) {
  return (
    <span className={styles.iconArea} aria-hidden="true">
      {icon}
    </span>
  );
}

export interface TableActionProps
  extends
    ActionLook,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children' | 'className'> {}

/**
 * Действие строки, которое что-то делает здесь же: убрать, отправить,
 * переключить.
 *
 * 🔴 Подпись у каждой строки своя («Удалить: Сплит-система 09»), а не общая
 * на колонку. Десять одинаковых «Удалить» подряд читалке бесполезны: они не
 * говорят, что именно удаляется.
 */
export function TableAction({
  label,
  icon,
  tone,
  className,
  type = 'button',
  ...rest
}: TableActionProps) {
  return (
    <Tooltip text={label}>
      <button {...rest} type={type} className={actionClassName(tone, className)} aria-label={label}>
        <ActionIcon icon={icon} />
      </button>
    </Tooltip>
  );
}

/** Пропсы наследуем у самого Link: маршруты типизированы, и адрес обязан
    проверяться компилятором. */
type NextLinkProps = ComponentProps<typeof Link>;

export interface TableActionLinkProps
  extends ActionLook, Omit<NextLinkProps, 'children' | 'className'> {}

/**
 * Действие строки, которое ведёт на другой адрес: открыть карточку,
 * посмотреть запись на сайте.
 *
 * Ссылка, а не кнопка с переходом: переход обязан открываться средним кликом
 * и в новой вкладке — из списка карточки открывают именно так.
 */
export function TableActionLink({
  label,
  icon,
  tone,
  className,
  href,
  ...rest
}: TableActionLinkProps) {
  return (
    <Tooltip text={label}>
      <Link {...rest} href={href} className={actionClassName(tone, className)} aria-label={label}>
        <ActionIcon icon={icon} />
      </Link>
    </Tooltip>
  );
}
