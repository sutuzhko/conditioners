/**
 * Данные формы модели: одни и те же для окна и для страницы за ним.
 *
 * 🔴 Перехватывающий маршрут рисует то же самое, что и прямой заход по адресу
 * (ADR-117). Второй запрос, собранный отдельно для окна, разошёлся бы с первым
 * на первой же правке — и окно показывало бы не то, что страница.
 */
import type { SpecDictionary } from '@/entities/product/lib/groupSpecs';
import { settingSchemas } from '@/entities/settings/model';
import { requireOwnerPage } from '@/server/guards';
import { getGroup } from '@/server/repo/settings';

/**
 * 🔴 Роль проверяется здесь, а не только в layout (ADR-095): страж выше
 * страницы успевает сменить адрес, но не остановить чтение — данные уезжают
 * в теле ответа.
 */
export async function productFormData(): Promise<{ readonly specDictionary: SpecDictionary }> {
  await requireOwnerPage();

  /* Справочник подсказывает названия характеристик в редакторе (ADR-094).
     Битая запись не должна ронять форму — разбираем со схемой. */
  const dictionary = settingSchemas.specs.safeParse((await getGroup('specs')) ?? {});

  return {
    specDictionary: dictionary.success ? dictionary.data : settingSchemas.specs.parse({}),
  };
}
