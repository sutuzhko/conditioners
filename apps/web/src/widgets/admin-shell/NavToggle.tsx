'use client';

import { Icon, IconButton } from '@/shared/ui';

import { useNavState } from './NavState';
import { adminShellContent as texts } from './content';

/**
 * Переключатель боковой навигации.
 *
 * Стоит первым в шапке, у самого края: колонка, которой он управляет, начинается
 * ровно под ним — связь читается без подписи.
 *
 * Своего класса у кнопки нет: единственное, что он делал, — прятал её ниже
 * 600px, а там теперь не показывается вся служебная строка целиком (issue
 * #659). Класс, не объявленный в модуле, приходит `undefined` и молча ничего
 * не значит — держать такую ссылку хуже, чем убрать.
 */
export function NavToggle() {
  const { open, toggle } = useNavState();

  return (
    <IconButton
      label={open ? texts.navHide : texts.navShow}
      icon={<Icon name="panel-left" />}
      aria-expanded={open}
      onClick={toggle}
    />
  );
}
