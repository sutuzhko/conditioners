import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';

import { StaffList } from './StaffList';
import { staffManagerContent as texts } from './content';
import { staffTitle } from './model';
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
 * Команда таблицей (issue #602, макет `Team.body.html`): загрузка недели,
 * деньги, доступ переключателем прямо в строке.
 *
 * 🔴 Колонка телефона уступила место оформлению (issue #745): номер копируют
 * из меню строки, а ярлыки «Самозанятый» и «Без ИНН» перестали висеть третьим
 * ярусом под именем и растить строку вдвое (issue #746).
 *
 * Ниже 600px строки разворачиваются карточками — девять колонок на телефоне
 * не читаются вовсе, и номер там снова виден.
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

/**
 * 🔴 Меню строки — тот же набор и тот же порядок, что у клиентов (issue #744,
 * #745): открыть · позвонить · скопировать · удалить. Два списка людей в одной
 * панели не должны требовать двух разных привычек.
 *
 * Удаление у первой строки закрыто: за человеком закреплены наряды, и причина
 * написана прямо в подписи пункта — подсказка на отключённом элементе не
 * открывается ни фокусом, ни половиной указателей.
 */
export const МенюДействий: Story = {
  /* 🔴 Допущение инвариантов, а не отговорка (ADR-230). История показывает
     раскрытый слой, и он накрывает то, что под ним: на 1440 — кнопку меню
     третьей строки, на 390 — область прокрутки списка. Это устройство
     выпадающего меню, а не дефект: слой открывается **вниз от своей кнопки**
     и её самой не закрывает — накрытая кнопка принадлежит «Артёму Белову»,
     третьей строке, тогда как открыто меню первой, «Дмитрия Соколова».
     Закрытое состояние тех же строк проверяет история
     `админка-команда--базовое`, и накрытия там нет ни одного.

     🔴 Допущение поставлено **после** того, как разобрана каждая из восьми
     находок, а не вместо разбора: одна из них была настоящей — на 768 меню
     расходилось до ~450px по длинной подписи отключённого пункта и залезало
     на середину области прокрутки. Это починено пределом ширины в ките
     (`RowMenu.module.css`), а не допущено здесь. */
  parameters: {
    invariants: {
      allow: [
        {
          rule: 'occlusion',
          reason:
            'история показывает раскрытый слой; меню накрывает кнопку соседней строки и область под собой по устройству, закрытое состояние проверяет админка-команда--базовое',
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', {
        name: texts.rowActions(staffTitle(activeInstaller)),
      }),
    );
  },
};
