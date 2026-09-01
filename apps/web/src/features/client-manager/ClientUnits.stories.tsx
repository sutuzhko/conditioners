import type { Meta, StoryObj } from '@storybook/nextjs-vite';

import { ClientUnits } from './ClientUnits';
import { acceptingUnitApi, expiredUnits, ownUnits, singleUnit, today, units } from './fixtures';

const meta = {
  title: 'Админка/Техника клиента',
  component: ClientUnits,
  // Допущение инвариантов — причина в reason (ADR-230)
  parameters: {
    invariants: {
      allow: [
        {
          rule: 'images',
          reason:
            'фото из тома загрузок сервера (/media, /api/media): в статической витрине его нет (ADR-207)',
        },
      ],
    },
  },
  /* Раздел обновляет страницу после правки, а значит зовёт `useRouter`: без
     мока навигации App Router история падает ещё до отрисовки. */
  args: { clientId: 'c1', units, today, api: acceptingUnitApi },
} satisfies Meta<typeof ClientUnits>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Несколько единиц: у человека и сплит в спальне, и завеса на входе. */
export const Базовое: Story = {};

/** Один монтаж — со снимком «после» и ссылкой на наряд, из которого он вырос. */
export const Одна: Story = {
  args: { units: singleUnit },
};

/** Техники нет: ни одного выполненного монтажа и ничего не заведено руками. */
export const Пусто: Story = {
  args: { units: [] },
};

/** Гарантия кончилась: следующий выезд — платный ремонт, а не гарантийный. */
export const ГарантияИстекла: Story = {
  args: { units: expiredUnits },
};

/**
 * Техника клиента без нашей продажи: поставлена до этой системы или куплена
 * человеком самому себе. Наряда за ней нет, гарантия не записана.
 */
export const БезНаряда: Story = {
  args: { units: ownUnits },
};
