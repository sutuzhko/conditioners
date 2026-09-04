import { iconRegistry, type IconDef, type IconName } from './registry';

export interface IconProps {
  readonly name: IconName;
  /** Сторона квадрата в пикселях. По умолчанию 20 — размер иконки в строке текста. */
  readonly size?: number | undefined;
  readonly className?: string | undefined;
  /**
   * Подпись для экранного диктора. Задана — иконка озвучивается (`role="img"`);
   * не задана — считается украшением и скрывается от чтения.
   *
   * 🔴 Подпись нужна там, где иконка несёт смысл в одиночку: кнопка меню,
   * закрытие модального окна. Рядом с текстом она украшение, и озвучивать её
   * значит заставить человека выслушать «телефон телефон».
   */
  readonly title?: string | undefined;
}

/**
 * 🔴 Сетка набора одна на все глифы, и записи её не переопределяют (issue
 * #553): иконка из чужой сетки попадает узлами в другие доли пикселя и рядом
 * с соседями по ряду читается замыленной, даже когда толщина после
 * масштабирования совпадает.
 */
const VIEW_BOX = '0 0 24 24';

/**
 * Иконка из общего набора (Solar Icon Set, начертание Broken).
 *
 * Цвет наследуется через `currentColor`: иконка окрашивается тем же правилом,
 * что и текст рядом, и отдельного управления цветом ей не нужно.
 */
export function Icon({ name, size = 20, className, title }: IconProps) {
  const { node, strokeWidth = 1.5 }: IconDef = iconRegistry[name];

  /* Обводка и заливка задаются здесь один раз на весь набор. Элементы,
     нарисованные заливкой, перебивают их у себя: в одном глифе бывает и то,
     и другое. */
  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEW_BOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title === undefined ? undefined : 'img'}
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
    >
      {title === undefined ? null : <title>{title}</title>}
      {node}
    </svg>
  );
}
