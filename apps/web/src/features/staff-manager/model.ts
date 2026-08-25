/** Раздел команды: типы представления. Доменные схемы — в `entities/staff`. */
export type {
  AdminRole,
  InstallerNoteCard,
  StaffCard,
  StaffCreate,
  StaffUpdate,
} from '@/entities/staff/model';

export { ADMIN_ROLES, isAdminRole, staffTitle } from '@/entities/staff/model';

/** Ответ действия: успех либо готовый к показу текст ошибки. */
export type StaffResult = { readonly ok: true } | { readonly ok: false; readonly message: string };

/** Поля формы заведения монтажника — строки, как их вводит человек. */
export type StaffDraft = {
  readonly name: string;
  readonly login: string;
  readonly phone: string;
  readonly password: string;
};

export const emptyStaffDraft: StaffDraft = { name: '', login: '', phone: '', password: '' };

/** Правка аккаунта: пустой пароль означает «не менять». */
export type StaffAccountDraft = {
  readonly name: string;
  readonly login: string;
  readonly phone: string;
  readonly password: string;
};

/**
 * Действия раздела вынесены интерфейсом: истории и тесты подставляют свои,
 * не поднимая сеть.
 */
export type StaffApi = {
  readonly create: (draft: StaffDraft) => Promise<StaffResult>;
  readonly update: (
    id: string,
    patch: Partial<{
      name: string;
      login: string;
      phone: string | null;
      password: string;
      active: boolean;
    }>,
  ) => Promise<StaffResult>;
  readonly remove: (id: string) => Promise<StaffResult>;
  readonly addNote: (id: string, text: string) => Promise<StaffResult>;
  readonly removeNote: (id: string, noteId: string) => Promise<StaffResult>;
};

export type StaffStatus = 'idle' | 'sending' | 'success' | 'error';
