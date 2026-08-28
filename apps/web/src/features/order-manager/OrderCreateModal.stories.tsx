import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { OrderCreateModal } from './OrderCreateModal';
import {
  acceptingApi,
  blocks,
  clients,
  failingApi,
  installers,
  selfEmployedInstaller,
  unassignedDraft,
} from './fixtures';

/**
 * Окно заведения наряда (ADR-117).
 *
 * У окна свой адрес: в приложении его рисует перехватывающий маршрут, а прямой
 * заход по тому же адресу отдаёт страницу. В историях показано само окно —
 * маршрут задаёт раздел.
 *
 * Размер `lg` — самый широкий из тех, что даёт кит: форма наряда самая длинная
 * в панели, и на узком окне её поля встают в одну колонку, растягивая прокрутку
 * вдвое.
 */
const meta = {
  title: 'Админка/Заказы · Окно заведения',
  component: OrderCreateModal,
  parameters: { layout: 'fullscreen' },
  args: { clients, installers, api: acceptingApi },
} satisfies Meta<typeof OrderCreateModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Пустая форма: номер выдаёт система, статус новому наряду назначает сервер. */
export const Заведение: Story = {};

/**
 * Наряд по обращению: черновик подставлен, подпись окна говорит, откуда он.
 *
 * Подписи задаёт раздел, а не окно: они принадлежат заявкам, а слайсы одного
 * слоя друг друга не импортируют — здесь они просто показаны словами.
 */
export const ПоОбращению: Story = {
  args: {
    initial: unassignedDraft,
    title: 'Черновик наряда',
    hint: 'Ирина Соколова · Монтаж и установка. Адрес и комментарий подставлены из обращения.',
  },
};

/**
 * 🔴 Занятость предупреждает, а не запрещает (ADR-115): день монтажника закрыт
 * целиком, кнопка «Завести наряд» при этом остаётся рабочей.
 */
export const МонтажникЗанят: Story = {
  args: {
    blocks,
    initial: { ...unassignedDraft, installerId: selfEmployedInstaller.id },
  },
};

/** Сервер не принял: окно остаётся открытым и подсвечивает названное поле. */
export const ОтказСервера: Story = {
  args: {
    api: failingApi,
    initial: { ...unassignedDraft, deductionSum: '1500', deductionReason: 'Брак' },
  },
};

/** Базы ещё нет: клиента выбрать не из кого — наряд не заведёшь. */
export const БезКлиентов: Story = {
  args: { clients: [], installers: [] },
};
