/** Раздел команды: типы представления. Доменные схемы — в `entities/staff`. */
import type { Route } from 'next';

import type { OrderStatus, OrderType } from '@/entities/order/model';
import { PANEL_TABS, resolvePanelTab, type PanelTab } from '@/shared/config/admin-tabs';
import type { Employment } from '@/shared/lib/employment';

export type {
  AdminRole,
  InstallerNoteCard,
  StaffCard,
  StaffCreate,
  StaffDetails,
  StaffUpdate,
} from '@/entities/staff/model';

export {
  ADMIN_ROLES,
  isAdminRole,
  isSelfEmployedWithoutInn,
  staffTitle,
} from '@/entities/staff/model';

/**
 * Словарь оформления берём из `shared/lib/employment` — тот же, что читает
 * наряд. Реэкспорт, а не своя копия: разошедшиеся списки означали бы, что
 * одна и та же запись в двух разделах панели считается по-разному.
 */
export { EMPLOYMENTS, employmentTitle, isEmployment } from '@/shared/lib/employment';
export type { Employment } from '@/shared/lib/employment';

/* ---------- Адреса раздела ---------- */

export const TEAM_PATH = '/admin/team' satisfies Route;

/**
 * Адрес окна создания (ADR-117). Окно живёт по собственному адресу, а не в
 * состоянии компонента: иначе ссылку на форму нельзя прислать, «назад» уводит
 * из раздела, а обновление страницы теряет ввод.
 *
 * Проверен маршрутом через `satisfies` — как и остальные адреса разделов, см.
 * `article-form/model.ts`.
 */
export const TEAM_NEW_PATH = '/admin/team/new' satisfies Route;

/* ---------- Вкладки карточки ---------- */

/**
 * Четыре вкладки карточки монтажника (issue #351, CRM.md §3.6): аккаунт,
 * заказы, выплаты с удержаниями и заметки владельца.
 *
 * 🔴 Две последние монтажник не видит, и закрыты они ролью **на сервере**, а
 * не скрытой кнопкой: скрытая кнопка — подсказка интерфейса, а не защита
 * (CRM.md §6). Раздел «Монтажники» целиком владельческий, и `requireOwnerPage`
 * отвечает монтажнику отказом ещё до чтения данных.
 */
export const STAFF_CARD_TABS = PANEL_TABS.staffCard;
export type StaffCardTab = PanelTab<'staffCard'>;

/** Вкладка из адреса. Мусор и пустота открывают «Аккаунт» (issue #341). */
export function staffCardTabFromParam(value: unknown): StaffCardTab {
  return resolvePanelTab(STAFF_CARD_TABS, value);
}

/**
 * Наряд в карточке монтажника: чем занимался, у кого и на какие деньги.
 *
 * 🔴 Проекция, а не `OrderCard` целиком: в браузер уезжает ровно то, что
 * видно на экране. Заметка владельца по наряду в этот список не входит.
 *
 * 🔴 `deduction` — удержание, а не штраф. Штрафов как вида взыскания в ТК РФ
 * нет, удержания ограничены статьёй 137 (CRM.md §9, ADR-114), и основание у
 * записи обязательно.
 */
export type StaffOrder = {
  readonly id: string;
  readonly number: number;
  readonly type: OrderType;
  readonly status: OrderStatus;
  /** ISO в UTC: в московское время переводит подпись при показе. */
  readonly at: string;
  readonly address: string;
  readonly clientName: string;
  /** Выплата монтажнику за этот наряд. Его деньги — приходят всегда. */
  readonly fee: number;
  readonly deduction: number;
  readonly deductionReason: string | null;
};

/** Наряды монтажника с их общим числом: карточка показывает последние. */
export type StaffOrders = {
  readonly items: readonly StaffOrder[];
  readonly total: number;
};

/**
 * Показатели монтажника — четыре плитки карточки (CRM.md §3.6).
 *
 * 🔴 Удержания стоят отдельной цифрой, а не вычтены из заработанного: вычесть
 * законно не у всякого оформления (`deductionReducesFee`, ADR-114), и решение
 * принимает владелец, а не таблица.
 */
export type StaffTotals = {
  readonly done: number;
  readonly active: number;
  readonly feeDone: number;
  readonly deductions: number;
};

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
  /** Пустая строка — «ИНН не заведён»: реквизит узнают позже. */
  readonly inn: string;
  readonly password: string;
};

export const emptyStaffDraft: StaffDraft = {
  name: '',
  login: '',
  phone: '',
  employment: '',
  inn: '',
  password: '',
};

/** Правка аккаунта: пустой пароль означает «не менять». */
export type StaffAccountDraft = {
  readonly name: string;
  readonly login: string;
  readonly phone: string;
  readonly employment: EmploymentChoice;
  readonly inn: string;
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
      /** Пустая строка — «ИНН не заведён»: поле отдаёт строку. */
      inn: string;
      password: string;
      active: boolean;
    }>,
  ) => Promise<StaffResult>;
  readonly remove: (id: string) => Promise<StaffResult>;
  readonly addNote: (id: string, text: string) => Promise<StaffResult>;
  readonly removeNote: (id: string, noteId: string) => Promise<StaffResult>;
};

export type StaffStatus = 'idle' | 'sending' | 'success' | 'error';
