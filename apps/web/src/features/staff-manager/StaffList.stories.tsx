import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { StaffList } from './StaffList';
import {
  acceptingApi,
  activeInstaller,
  contractInstaller,
  disabledInstaller,
  failingApi,
  namelessInstaller,
  selfEmployedNoInn,
  staffInstaller,
  staffLoadFixture,
  unsetEmploymentInstaller,
} from './fixtures';

/**
 * Команда таблицей (issue #602, макет `Team.png`): загрузка недели, деньги,
 * доступ переключателем прямо в строке.
 *
 * Ниже 600px строки разворачиваются карточками — восемь колонок на телефоне
 * не читаются вовсе.
 */
const meta = {
  title: 'Админка/Команда',
  component: StaffList,
  args: {
    staff: [activeInstaller, contractInstaller, disabledInstaller],
    stats: staffLoadFixture,
    api: acceptingApi,
  },
  parameters: {
    /* 🔴 Подсказки на ярлыках открываются наведением и фокусом (WCAG 1.4.13);
       в снимке они закрыты, и это верное состояние по умолчанию — строка
       читается ярлыком, а не абзацем. */
    docs: { description: { component: 'Таблица команды с загрузкой недели и доступом в строке.' } },
  },
} satisfies Meta<typeof StaffList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Базовое: Story = {};

/** Раздел стартует пустым: первого монтажника заводит владелец. */
export const Пусто: Story = {
  args: { staff: [] },
};

/** Искали — не нашли. Команда при этом есть, и объяснение другое. */
export const НичегоНеНайдено: Story = {
  args: { staff: [], query: 'Сидоров' },
};

/**
 * Показателей ещё нет — например, база только что заведена. Строка не врёт
 * нулями там, где данных нет вовсе.
 */
export const БезПоказателей: Story = {
  args: { stats: undefined },
};

/**
 * 🔴 Состояния, за которые платит компания: оформление не заведено (наряд не
 * уменьшает вознаграждение) и самозанятый без ИНН (статус на дату выплаты
 * проверить нечем).
 */
export const ПредупрежденияОформления: Story = {
  args: { staff: [unsetEmploymentInstaller, selfEmployedNoInn, staffInstaller] },
};

/** Имя не заполнено — показываем логин, а не пустое место. */
export const БезИмени: Story = {
  args: { staff: [namelessInstaller] },
};

export const ОтказСервера: Story = {
  args: { api: failingApi },
};
