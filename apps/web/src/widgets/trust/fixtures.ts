import type { Warranty } from '@/entities/settings/model';

import type { Achievement } from './model';

/**
 * Фикстуры блока: они же документируют, какие данные секции ждут от страницы
 * (docs/ORCHESTRATION.md, волна 3). В Storybook базы нет, а блок обязан
 * рисоваться — значит данные приходят отсюда.
 *
 * 🔴 Цифры ниже — образец формата, а не факты о компании: настоящие значения
 * владелец заполняет в админке. Основное состояние проекта — «цифр нет»,
 * ему отвечает история «Без цифр».
 */
export const achievements: readonly Achievement[] = [
  { value: 1200, suffix: '+', label: 'установок в Туле' },
  { value: 8, suffix: ' лет', label: 'на рынке' },
  { value: 1, suffix: ' день', label: 'от заявки до запуска' },
];

/** Сроки гарантии приходят из настроек свободным текстом. */
export const warranty: Warranty = { installation: '3 года', equipment: '1 год' };

/** Заполнена только гарантия на монтаж — рабочее состояние настроек. */
export const warrantyPartial: Warranty = { installation: '3 года', equipment: '' };

/** Настройки ещё не заполнены: карточки гарантии в блоке нет. */
export const warrantyEmpty: Warranty = { installation: '', equipment: '' };
