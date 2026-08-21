import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { formatMoney, formatNumber } from '@/shared/lib/format';

import { Hero } from './Hero';
import { discountedModels, heroModels, heroStats, saleNow, singleModel } from './fixtures';

/**
 * jsdom не реализует matchMedia. Отвечаем «пользователь просил меньше
 * движения»: счётчики сразу показывают конечное число, декоративный фон не
 * запускается — ровно то состояние, которое обязано быть в HTML без JS.
 */
beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * Testing Library схлопывает пробельные символы, включая неразрывный пробел из
 * `formatMoney`. Сравниваем с тем же текстом, что видит пользователь.
 */
const visible = (text: string): string => text.replace(/\u00A0/g, ' ');

/** Панель рекомендации — единственное место, где меняется подобранная модель. */
const recommendation = () => screen.getByRole('heading', { level: 3 });

describe('Первый экран', () => {
  it('заголовок и лид не зависят от подбора: их рисует сервер', () => {
    render(<Hero products={[]} />);

    const title = screen.getByRole('heading', { level: 1 });
    // Заголовок разбит на строки, а «за один день» связано неразрывными
    // пробелами — сверяем по частям, а не по слитной строке.
    expect(title).toHaveTextContent(/Кондиционеры в Туле/);
    expect(title).toHaveTextContent(/с установкой/);
    expect(title.textContent).toContain('за\u00A0один\u00A0день');
    expect(screen.getByText(/Продажа, монтаж и обслуживание/)).toBeInTheDocument();
  });

  it('подбирает модель по площади и меняет рекомендацию вслед за ползунком', () => {
    render(<Hero products={heroModels} />);
    expect(recommendation()).toHaveTextContent('Сплит-система 09');

    fireEvent.change(screen.getByRole('slider'), { target: { value: '40' } });
    expect(recommendation()).toHaveTextContent('Сплит-система 18');

    fireEvent.change(screen.getByRole('slider'), { target: { value: '15' } });
    expect(recommendation()).toHaveTextContent('Сплит-система 07');
  });

  it('«Офис» сдвигает подбор на класс выше: техника и люди греют помещение', async () => {
    const user = userEvent.setup();
    render(<Hero products={heroModels} />);
    expect(recommendation()).toHaveTextContent('Сплит-система 09');

    await user.click(screen.getByRole('button', { name: 'Офис' }));

    expect(recommendation()).toHaveTextContent('Сплит-система 12');
    expect(screen.getByRole('button', { name: 'Офис' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('показывает цену со скидкой, перечёркнутую старую и вычисленный процент', () => {
    render(<Hero products={discountedModels} now={saleNow} />);

    expect(screen.getByText(visible(formatMoney(34900)))).toBeInTheDocument();

    const oldPrice = screen.getByText(visible(formatMoney(38500)));
    expect(oldPrice.tagName).toBe('S');
    expect(screen.getByText('−9%')).toBeInTheDocument();
  });

  it('без скидки перечёркнутой цены нет', () => {
    render(<Hero products={heroModels} />);

    expect(screen.getByText(visible(formatMoney(38500)))).toBeInTheDocument();
    expect(document.querySelector('s')).toBeNull();
  });

  it('пустой каталог: вместо подбора — приглашение позвонить', () => {
    render(<Hero products={[]} />);

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByText('Каталог ещё наполняется')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Подобрать по телефону' })).toBeInTheDocument();
  });

  it('одна модель в каталоге подбирается при любой площади', () => {
    render(<Hero products={singleModel} />);
    expect(recommendation()).toHaveTextContent('Сплит-система 09');

    fireEvent.change(screen.getByRole('slider'), { target: { value: '60' } });
    expect(recommendation()).toHaveTextContent('Сплит-система 09');
  });

  it('модель без фото получает заглушку с классом мощности, а не битую картинку', () => {
    render(<Hero products={heroModels} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('фото модели выводится с осмысленным alt', () => {
    const [first] = heroModels;
    if (first === undefined) throw new Error('нужна хотя бы одна модель');
    const withPhoto = {
      ...first,
      photos: [{ id: 'p1', url: '/api/media/split-07.jpg', alt: null, isMain: true, sort: 0 }],
    };

    render(<Hero products={[withPhoto]} />);

    expect(
      screen.getByRole('img', { name: 'Сплит-система 07 — купить в Туле с установкой' }),
    ).toBeInTheDocument();
  });

  it('цифры полосы преимуществ приходят пропсами, а не из кода', () => {
    const { rerender } = render(<Hero products={[]} stats={heroStats} />);

    expect(screen.getByText(visible(`${formatNumber(1200)}+`))).toBeInTheDocument();
    expect(screen.getByText('установок в Туле')).toBeInTheDocument();

    rerender(<Hero products={[]} />);
    expect(screen.queryByText('установок в Туле')).not.toBeInTheDocument();
  });

  it('чип погоды показывает среднесуточную и пиковую температуру', () => {
    render(<Hero products={[]} weather={{ mean: 27, max: 31 }} city="Тула" />);

    // последний совпавший узел — самый глубокий, то есть сам чип, а не секция
    const chip = screen.getAllByText((text) => visible(text).includes('+27°')).at(-1);
    const text = visible(chip?.parentElement?.textContent ?? '');

    expect(text).toContain('Тула сегодня');
    expect(text).toContain('ср/сут');
    expect(text).toContain('+31°');
  });

  it('🔴 без города чипа нет: подпись «сегодня» без места ничего не значит', () => {
    const { container } = render(<Hero products={[]} weather={{ mean: 27, max: 31 }} />);

    expect(container.textContent).not.toContain('°');
  });

  it('заметка в чипе зависит от пиковой температуры, а не от календаря', () => {
    const note = (max: number): string => {
      const { container, unmount } = render(
        <Hero products={[]} weather={{ mean: max - 4, max }} city="Тула" />,
      );
      const text = container.textContent ?? '';
      unmount();
      return text;
    };

    expect(note(31)).toContain('пик сезона');
    expect(note(24)).toContain('сезон стартовал');
    expect(note(12)).toContain('до жары');
  });

  it('🔴 без данных о погоде чипа нет: выдуманная температура так же недопустима, как цена', () => {
    const { container } = render(<Hero products={[]} />);

    expect(container.textContent).not.toContain('°');
  });

  it('отрицательная температура выводится с минусом, а не с дефисом', () => {
    render(<Hero products={[]} weather={{ mean: -7, max: -3 }} city="Тула" />);

    const chip = screen.getAllByText((text) => visible(text).includes('−7°')).at(-1);
    const text = visible(chip?.parentElement?.textContent ?? '');

    expect(text).toContain('−3°');
    expect(text).not.toContain('-7');
  });
});
