/** Данные для историй и тестов справочника характеристик. */
import type { SpecDictionaryDraft, SpecsSaveResult } from './model';

export const filledDictionary: SpecDictionaryDraft = {
  groups: [
    {
      title: 'Основное',
      fields: [
        { k: 'Мощность охлаждения', unit: 'кВт', hint: 'Сколько тепла отводит из помещения' },
        { k: 'Тип компрессора', unit: '', hint: 'Инверторный или обычный' },
      ],
    },
    {
      title: 'Шум и воздух',
      fields: [{ k: 'Уровень шума внутреннего блока', unit: 'дБ', hint: '' }],
    },
  ],
};

export const emptyDictionary: SpecDictionaryDraft = { groups: [] };

export const acceptingSave = async (): Promise<SpecsSaveResult> => ({ ok: true });

export const failingSave = async (): Promise<SpecsSaveResult> => ({
  ok: false,
  message: 'Сервер не принял изменения. Попробуйте ещё раз',
});
