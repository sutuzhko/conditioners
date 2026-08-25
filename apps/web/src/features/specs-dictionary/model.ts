/** Справочник характеристик: типы представления. Схема — в `entities/settings`. */

export type SpecFieldDraft = {
  readonly k: string;
  readonly unit: string;
  readonly hint: string;
};

export type SpecGroupDraft = {
  readonly title: string;
  readonly fields: readonly SpecFieldDraft[];
};

export type SpecDictionaryDraft = {
  readonly groups: readonly SpecGroupDraft[];
};

export const emptyField: SpecFieldDraft = { k: '', unit: '', hint: '' };
export const emptyGroup: SpecGroupDraft = { title: '', fields: [emptyField] };

export type SpecsSaveResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

export type SpecsStatus = 'idle' | 'sending' | 'success' | 'error';

/** Сохранение вынесено параметром: истории и тесты подставляют своё. */
export type SaveSpecs = (value: SpecDictionaryDraft) => Promise<SpecsSaveResult>;
