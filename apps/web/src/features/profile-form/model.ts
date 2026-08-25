/** Раздел профиля: типы представления. Доменные схемы — в `entities/staff`. */
export type { AdminRole, StaffCard } from '@/entities/staff/model';

export type ProfileResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string };

export type ProfileStatus = 'idle' | 'sending' | 'success' | 'error';

/** Действия вынесены интерфейсом: истории и тесты подставляют свои. */
export type ProfileApi = {
  readonly save: (patch: { name: string; phone: string }) => Promise<ProfileResult>;
  readonly changePassword: (input: { current: string; next: string }) => Promise<ProfileResult>;
};
