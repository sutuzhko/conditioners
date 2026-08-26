/** Раздел команды: типы представления. Доменные схемы — в `entities/staff`. */
import type { Employment } from '@/shared/lib/employment';

export type {
  AdminRole,
  InstallerNoteCard,
  StaffCard,
  StaffCreate,
  StaffUpdate,
} from '@/entities/staff/model';

export { ADMIN_ROLES, isAdminRole, staffTitle } from '@/entities/staff/model';

/**
 * Словарь оформления берём из `shared/lib/employment` — тот же, что читает
 * наряд. Реэкспорт, а не своя копия: разошедшиеся списки означали бы, что
 * одна и та же запись в двух разделах панели считается по-разному.
 */
export { EMPLOYMENTS, employmentTitle, isEmployment } from '@/shared/lib/employment';
export type { Employment } from '@/shared/lib/employment';

/**
 * Ответ действия: успех либо готовый к показу текст ошибки.
 *
 * `field` приходит от сервера, когда отказ адресный («логин занят»): без него
 * человек читает сообщение и не понимает, какое из четырёх полей чинить.
 */
export type StaffResult =
  { readonly ok: true } | { readonly ok: false; readonly message: string; readonly field?: string };

/**
 * Оформление в форме: пустая строка — «не заведено».
 *
 * 🔴 Отдельного значения словаря под «не заведено» нет и не должно быть:
 * это отсутствие ответа, а не четвёртый вид отношений. Пустой `select`
 * означает, что владелец ещё не выбрал, и наряд исходит из того, что
 * уменьшать вознаграждение нельзя.
 */
export type EmploymentChoice = Employment | '';

/** Поля формы заведения монтажника — строки, как их вводит человек. */
export type StaffDraft = {
  readonly name: string;
  readonly login: string;
  readonly phone: string;
  readonly employment: EmploymentChoice;
  readonly password: string;
};

export const emptyStaffDraft: StaffDraft = {
  name: '',
  login: '',
  phone: '',
  employment: '',
  password: '',
};

/** Правка аккаунта: пустой пароль означает «не менять». */
export type StaffAccountDraft = {
  readonly name: string;
  readonly login: string;
  readonly phone: string;
  readonly employment: EmploymentChoice;
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
      /** Пустая строка — «оформление не заведено»: `select` отдаёт строку. */
      employment: EmploymentChoice;
      password: string;
      active: boolean;
    }>,
  ) => Promise<StaffResult>;
  readonly remove: (id: string) => Promise<StaffResult>;
  readonly addNote: (id: string, text: string) => Promise<StaffResult>;
  readonly removeNote: (id: string, noteId: string) => Promise<StaffResult>;
};

export type StaffStatus = 'idle' | 'sending' | 'success' | 'error';
