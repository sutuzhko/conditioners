import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { OrderCardView } from './OrderCardView';
import { ORDER_STATUS_TITLE, orderManagerContent as texts } from './content';
import { freshOrder, order, overtimeOrder } from './fixtures';

describe('Наряд в списке', () => {
  it('показывает номер, статус и время по Москве', () => {
    render(<OrderCardView order={order} />);

    expect(screen.getByRole('heading', { name: texts.number(order.number) })).toBeInTheDocument();
    expect(screen.getByText(ORDER_STATUS_TITLE.assigned)).toBeInTheDocument();
    // 08:00 UTC — это 11:00 в Туле, а не в поясе того, кто смотрит
    expect(screen.getByText(/11:00/)).toBeInTheDocument();
  });

  it('телефон клиента — ссылка для звонка', () => {
    render(<OrderCardView order={order} />);

    expect(screen.getByRole('link', { name: /910/ })).toHaveAttribute('href', 'tel:+79101552468');
  });

  it('номер ведёт в карточку наряда', () => {
    render(<OrderCardView order={order} />);

    expect(screen.getByRole('link', { name: texts.number(order.number) })).toHaveAttribute(
      'href',
      `/admin/orders/${order.id}`,
    );
  });

  it('неназначенный наряд говорит об этом словами, а не пустотой', () => {
    render(<OrderCardView order={freshOrder} />);

    expect(screen.getByText(texts.installerNone)).toBeInTheDocument();
  });

  it('переработка стоит рядом с длительностью и названа фактом, а не доплатой', () => {
    render(<OrderCardView order={overtimeOrder} />);

    expect(screen.getByText(texts.overtime(2 * 60 + 15))).toBeInTheDocument();
  });

  it('🔴 без переработки о ней не говорится вовсе: ноль — это не «переработки не было»', () => {
    /* Ключ приходит из проекции под роль и может не прийти совсем (ADR-114):
       карточка молчит и в этом случае, а не показывает «0 мин». */
    render(<OrderCardView order={order} />);

    expect(screen.queryByText(/Переработка/)).not.toBeInTheDocument();

    render(<OrderCardView order={{ ...order, overtimeMin: 0 }} />);

    expect(screen.queryByText(/Переработка/)).not.toBeInTheDocument();
  });

  it('высотные работы видны уже в списке: от них зависит, кого назначить', () => {
    render(<OrderCardView order={order} />);

    expect(screen.getByText(texts.heightWorks)).toBeInTheDocument();
  });
});
