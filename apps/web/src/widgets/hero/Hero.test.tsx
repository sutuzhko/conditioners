import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { formatMoney, formatNumber } from '@/shared/lib/format';

import { forgetLeadContext, readLeadContext } from '@/features/lead-form';

import { Hero } from './Hero';
import { heroContent, pickerContent } from './content';
import {
  discountedPickerModels,
  heroPickerModels,
  heroStats,
  heroStatsFour,
  saleNow,
  singlePickerModel,
} from './fixtures';

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
    render(<Hero products={heroPickerModels} />);
    expect(recommendation()).toHaveTextContent('Сплит-система 09');

    fireEvent.change(screen.getByRole('slider'), { target: { value: '40' } });
    expect(recommendation()).toHaveTextContent('Сплит-система 18');

    fireEvent.change(screen.getByRole('slider'), { target: { value: '15' } });
    expect(recommendation()).toHaveTextContent('Сплит-система 07');
  });

  it('«Офис» сдвигает подбор на класс выше: техника и люди греют помещение', async () => {
    const user = userEvent.setup();
    render(<Hero products={heroPickerModels} />);
    expect(recommendation()).toHaveTextContent('Сплит-система 09');

    await user.click(screen.getByRole('button', { name: 'Офис' }));

    expect(recommendation()).toHaveTextContent('Сплит-система 12');
    expect(screen.getByRole('button', { name: 'Офис' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('показывает цену со скидкой, перечёркнутую старую и вычисленный процент', () => {
    render(<Hero products={discountedPickerModels} now={saleNow} />);

    expect(screen.getByText(visible(formatMoney(34900)))).toBeInTheDocument();

    const oldPrice = screen.getByText(visible(formatMoney(38500)));
    expect(oldPrice.tagName).toBe('S');
    expect(screen.getByText('−9%')).toBeInTheDocument();
  });

  it('без скидки перечёркнутой цены нет', () => {
    render(<Hero products={heroPickerModels} />);

    expect(screen.getByText(visible(formatMoney(38500)))).toBeInTheDocument();
    expect(document.querySelector('s')).toBeNull();
  });

  /**
   * 🔴 ADR-126. Ползунок площади меняет модель, а с ней — состав блока цены.
   * Строка скидки — плашка процента и срок — стоит в разметке и без скидки:
   * там она пустая и держит свою высоту, иначе кнопка «Смета на эту модель»
   * уезжает из-под курсора ровно тогда, когда в неё целятся. Высоту видно
   * только браузером — здесь проверяется то, чем она держится: элемент есть в
   * обоих состояниях.
   */
  it('🔴 место под скидку занято и тогда, когда скидки нет', () => {
    /* Строка скидки — соседка кнопки сверху: резерв стоит именно там, где
       иначе схлопывался бы блок цены. */
    const saleLine = (): Element | null =>
      screen.getByRole('link', { name: /Смета на эту модель/ }).previousElementSibling;

    const { unmount } = render(<Hero products={discountedPickerModels} now={saleNow} />);
    expect(saleLine()?.tagName).toBe('P');
    expect(saleLine()?.textContent).toContain('Цена действует до');
    unmount();

    render(<Hero products={heroPickerModels} />);
    expect(saleLine()?.tagName).toBe('P');
    expect(saleLine()?.textContent).toBe('');
  });

  it('пустой каталог: вместо подбора — приглашение позвонить', () => {
    render(<Hero products={[]} />);

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
    expect(screen.getByText('Каталог ещё наполняется')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Подобрать по телефону' })).toBeInTheDocument();
  });

  /**
   * 🔴 Единственная модель каталога подбирается, пока закрывает площадь. Выше
   * `pickByArea` честно отдаёт её же — самую мощную из имеющихся, — но
   * показывать её с ценой было бы обещанием, которого не подтвердят по
   * телефону: панель переходит в состояние «нужен отдельный расчёт» (#256).
   */
  it('одна модель подбирается, пока закрывает площадь', () => {
    render(<Hero products={singlePickerModel} />);
    expect(recommendation()).toHaveTextContent('Сплит-система 09');

    fireEvent.change(screen.getByRole('slider'), { target: { value: '60' } });
    expect(recommendation()).toHaveTextContent(pickerContent.noFitTitle(60));
  });

  it('модель без фото получает заглушку с классом мощности, а не битую картинку', () => {
    render(<Hero products={heroPickerModels} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('фото модели выводится с осмысленным alt', () => {
    /* Модель берётся та, что подбирается по умолчанию: у неподходящей по
       площади панель показывает не рекомендацию, а приглашение к расчёту. */
    const [, second] = heroPickerModels;
    if (second === undefined) throw new Error('нужна подбираемая модель');
    /* Подпись у фотографии не задана — её обязан подставить блок: пустой alt
       у картинки товара это дыра и в доступности, и в выдаче по картинкам. */
    const withPhoto = { ...second, photo: { url: '/api/media/split-09.jpg', alt: null } };

    render(<Hero products={[withPhoto]} />);

    expect(
      screen.getByRole('img', { name: 'Сплит-система 09 — купить в Туле с установкой' }),
    ).toBeInTheDocument();
  });

  it('цифры полосы преимуществ приходят пропсами, а не из кода', () => {
    const { rerender } = render(<Hero products={[]} stats={heroStats} />);

    expect(screen.getByText(visible(`${formatNumber(1200)}+`))).toBeInTheDocument();
    expect(screen.getByText('установок в Туле')).toBeInTheDocument();

    rerender(<Hero products={[]} />);
    expect(screen.queryByText('установок в Туле')).not.toBeInTheDocument();
  });

  /**
   * 🔴 ADR-126. Четвёртая цифра не помещается в ряд и переносится во вторую
   * строку, ломая ритм экрана. Это ограничение макета, а не данных: владелец
   * заводит сколько нужно, первый экран берёт первые три.
   */
  it('🔴 полоса показывает первые три цифры, даже когда заведено четыре', () => {
    render(<Hero products={[]} stats={heroStatsFour} />);

    expect(document.querySelectorAll('dt')).toHaveLength(3);
    expect(screen.getByText('установок в Туле')).toBeInTheDocument();
    expect(screen.queryByText('среднее время ответа')).not.toBeInTheDocument();
  });

  /* 🔴 Инвариант 8: текст капсулы приходит из настроек, а его длину задаёт
     владелец. Обрезать его нечем — плашка переносит строку (ADR-126). */
  it('плашка первого экрана рисует текст настроек целиком', () => {
    const promise = 'Тула и область — выезд в день обращения, замер бесплатно';
    render(<Hero products={[]} note={promise} />);

    expect(screen.getByText(promise)).toBeInTheDocument();
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

describe('Первый экран — кнопка приносит свой предмет (ADR-129)', () => {
  it('🔴 кнопка у рекомендации ведёт к форме со слагом этой модели и темой монтажа', () => {
    render(<Hero products={singlePickerModel} />);

    expect(screen.getByRole('link', { name: pickerContent.order })).toHaveAttribute(
      'href',
      '/?model=split-sistema-09&topic=install#lead',
    );
  });

  it('🔴 общая кнопка первого экрана предмета не имеет и остаётся на своём адресе', () => {
    render(<Hero products={singlePickerModel} leadHref="/#lead" />);

    expect(screen.getByRole('link', { name: heroContent.primaryCta })).toHaveAttribute(
      'href',
      '/#lead',
    );
  });
});

describe('Первый экран — подбор уезжает с заявкой', () => {
  /* Снимок стирается до теста: хранилище живёт модулем и переживает рендер. */
  beforeEach(() => {
    forgetLeadContext();
  });

  it('🔴 запоминает площадь, помещение и подобранную модель', async () => {
    const user = userEvent.setup();
    render(<Hero products={heroPickerModels} />);

    fireEvent.change(screen.getByRole('slider'), { target: { value: '40' } });
    await user.click(screen.getByRole('button', { name: 'Офис' }));
    await user.click(screen.getByRole('link', { name: /Смета на эту модель/ }));

    const pick = readLeadContext()?.pick;
    expect(pick?.area).toBe(40);
    expect(pick?.place).toBe('Офис');
    expect(pick?.model?.name).toBe(recommendation().textContent);
  });

  it('🔴 в снимок уходит цена со скидкой и та, что была перечёркнута', async () => {
    const user = userEvent.setup();
    render(<Hero products={discountedPickerModels} now={saleNow} />);

    await user.click(screen.getByRole('link', { name: /Смета на эту модель/ }));

    const model = readLeadContext()?.pick?.model;
    expect(model?.price).toBeDefined();
    expect(model?.oldPrice).not.toBeNull();
    expect(Number(model?.oldPrice)).toBeGreaterThan(Number(model?.price));
  });

  it('без перехода к форме подбор не запоминается', () => {
    render(<Hero products={heroPickerModels} />);

    fireEvent.change(screen.getByRole('slider'), { target: { value: '30' } });

    expect(readLeadContext()).toBeNull();
  });
});
