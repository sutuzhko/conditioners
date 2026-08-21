import { SETTING_PLACEHOLDER } from '@/entities/settings/lib/readiness';
import type { Warranty } from '@/entities/settings/model';

/**
 * Данные историй и тестов.
 *
 * 🔴 Это витрина вёрстки, а не контент: ни цена, ни условия гарантии отсюда на
 * сайт не попадают — блок рисует то, что пришло пропсами из базы.
 */

/** Стартовая цена монтажа: в проде приходит из прайса. */
export const installFromFixture = 5500;

export const warrantyFixture: Warranty = {
  installation:
    'Гарантия на монтаж — 3 года по договору: герметичность трассы, крепёж и дренаж. ' +
    'Приезжаем и устраняем бесплатно.',
  equipment:
    'На технику действует гарантия производителя — от 1 до 5 лет в зависимости от бренда, ' +
    'талон оформляем при запуске.',
};

/** Реальное состояние проекта: сиды заполнены заметной заглушкой. */
export const warrantyPlaceholder: Warranty = {
  installation: SETTING_PLACEHOLDER,
  equipment: SETTING_PLACEHOLDER,
};

/** Владелец до раздела ещё не дошёл — ответ обязан обойтись без сроков. */
export const warrantyEmpty: Warranty = { installation: '', equipment: '' };
