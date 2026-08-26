/**
 * Как оформлены отношения с человеком, который выполняет работы.
 *
 * 🔴 Почему словарь живёт в `shared`, а не в сущности. Оформление принадлежит
 * человеку (`entities/staff`), но последствия у него в наряде
 * (`entities/order`): от него зависит, чем является удержание — законным
 * уменьшением вознаграждения или внутренней пометкой. Импорт вбок между
 * слайсами одного слоя запрещён правилом зависимостей, а две копии словаря
 * разошлись бы на первом же переименовании. Общий словарь двух сущностей —
 * это `shared`, как `calendar` с поясом работ и `phone` с каноническим видом
 * номера.
 *
 * Юридический разбор — docs/CRM.md §9.
 */

export const EMPLOYMENTS = ['self_employed', 'contract', 'staff'] as const;

export type Employment = (typeof EMPLOYMENTS)[number];

export function isEmployment(value: string): value is Employment {
  return EMPLOYMENTS.some((employment) => employment === value);
}

const TITLES: Record<Employment, string> = {
  self_employed: 'Самозанятый',
  contract: 'Договор ГПХ',
  staff: 'Трудовой договор',
};

export function employmentTitle(employment: Employment): string {
  return TITLES[employment];
}

/**
 * Можно ли уменьшать вознаграждение за брак и срывы.
 *
 * 🔴 У работника по трудовому договору — нельзя: штрафов как вида взыскания в
 * ТК РФ нет, а удержания из зарплаты ограничены статьёй 137 и к этому случаю
 * не относятся. Запись в наряде остаётся, но она внутренняя: учитывать брак
 * владельцу нужно в любом случае, а вычитать сумму из выплаты — нет.
 *
 * У самозанятого и подрядчика по ГПХ уменьшение вознаграждения законно, когда
 * оно прописано в договоре; следить за этим — обязанность владельца, система
 * лишь не мешает ему вести учёт.
 *
 * Оформление не заведено — считаем, что нельзя: молчание не разрешение.
 */
export function deductionReducesFee(employment: Employment | null): boolean {
  return employment === 'self_employed' || employment === 'contract';
}
