/**
 * Публичный API входа в админку. Форма живёт в `features`, а не в странице:
 * её нужно показывать в Storybook во всех состояниях, а страница —
 * серверная и в историю не помещается.
 */
export { LoginForm, type LoginFormProps } from './LoginForm';
export { adminLoginContent } from './content';
export { emptyLoginValues, postLogin, validateLoginValues } from './lib';
export {
  loginSchema,
  type LoginFieldErrors,
  type LoginResult,
  type LoginStatus,
  type LoginSubmit,
  type LoginValues,
} from './model';
