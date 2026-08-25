/** Подписи раздела профиля. */
import type { AdminRole } from '@/entities/staff/model';

const ROLE_TITLES: Record<AdminRole, string> = {
  owner: 'владелец',
  installer: 'монтажник',
};

export const profileFormContent = {
  title: 'Профиль',
  lead: 'Личные данные и пароль. Логин меняет владелец — его печатают на бумажке и диктуют по телефону.',

  personalTitle: 'Личные данные',
  name: 'Имя',
  login: 'Логин',
  phone: 'Телефон',
  save: 'Сохранить',
  saving: 'Сохраняем…',
  saved: 'Сохранено',

  passwordTitle: 'Смена пароля',
  passwordHint:
    'После смены все остальные открытые сессии закрываются — на чужом компьютере войти по старому паролю не получится.',
  passwordCurrent: 'Текущий пароль',
  passwordNext: 'Новый пароль',
  passwordSubmit: 'Сменить пароль',
  passwordSending: 'Меняем…',
  passwordDone: 'Пароль изменён',

  themeTitle: 'Тема интерфейса',
  themeHint: 'Выбор запоминается в этом браузере и на сайт не влияет.',

  roleTitle: (role: AdminRole): string => ROLE_TITLES[role],

  networkError: 'Не удалось связаться с сервером. Изменения не сохранены',
  serverError: 'Сервер не принял изменения. Попробуйте ещё раз',
} as const;
