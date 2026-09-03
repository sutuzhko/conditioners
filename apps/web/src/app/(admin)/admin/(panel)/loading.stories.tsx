import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import CatalogLoading from './catalog/loading';
import LeadsLoading from './leads/loading';
import PanelLoading from './loading';
import OrdersLoading from './orders/loading';
import StockLoading from './stock/loading';

/**
 * Скелетоны разделов панели — то, что человек видит до прихода данных
 * (issue #334).
 *
 * 🔴 Зачем истории на `loading.tsx`. Скелетон обязан занимать ту же высоту,
 * что и готовая страница, иначе список прыгает под уже прочитанным
 * заголовком. Проверить это сквозным сценарием нельзя: попадёт заготовка в
 * ответ или нет, решает гонка сервера с самим собой — успели ли данные к
 * первому сбросу потока. Разовый замер эту гонку обходит, но регресс не
 * сторожит.
 *
 * История сторожит: файл измерений на каждый скелетон лежит в git, и правка
 * высоты заготовки видна диффом PR, как у любой другой истории (ADR-234).
 *
 * Истории живут в каталоге маршрута рядом со скелетонами, а не в `widgets`:
 * слою `widgets` запрещено импортировать из `app`, а скелетон раздела — это
 * файл маршрута. Next собирает в каталоге только свои имена (`page`,
 * `layout`, `loading`), соседний `.stories.tsx` ему не мешает.
 *
 * Разделы взяты не все, а по одному на устройство скелетона: настоящая шапка
 * с фильтрами (заявки), заготовка шапки с действием (заказы), таблица
 * (склад), сетка карточек (каталог) и сводка на входе.
 */
const meta = {
  title: 'Админка/Скелетоны разделов',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Заявки: шапка и фильтры настоящие, заготовка только у списка. */
export const Заявки: Story = { render: () => <LeadsLoading /> };

/** Заказы: заголовок зависит от роли, поэтому он заготовка со своим боксом. */
export const Заказы: Story = { render: () => <OrdersLoading /> };

/** Склад: таблица остатков и полоса итога. */
export const Склад: Story = { render: () => <StockLoading /> };

/** Каталог: сетка карточек товара. */
export const Каталог: Story = { render: () => <CatalogLoading /> };

/** Сводка на входе: плитки, ближайшие дела и готовность последней (ADR-241). */
export const Обзор: Story = { render: () => <PanelLoading /> };
