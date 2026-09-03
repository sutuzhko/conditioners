import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { reviewsContent as t } from '../content';
import { ReviewsTrack } from './ReviewsTrack';

/**
 * Управляемая замена matchMedia: настоящие EventTarget на запрос, чтобы
 * `change` доходил до подписчиков компонента, плюс изменяемое поле matches —
 * тест сам решает, что «ответила» операционная система.
 *
 * 🔴 Запросов теперь два, и путать их нельзя. Ширина решает, лента перед нами
 * или сетка: до 1200px отзывы лежат колонкой и сеткой, и ни хода, ни кнопки
 * остановки там нет вовсе (issue #274). Прежняя заглушка отвечала «нет» на
 * всё подряд — с ней компонент считал бы себя сеткой и ни одна проверка
 * ленты не проверяла бы ленту.
 */
function media(): {
  calm: EventTarget & { matches: boolean };
  wide: EventTarget & { matches: boolean };
} {
  const make = (query: string, matches: boolean) =>
    Object.assign(new EventTarget(), {
      matches,
      media: query,
      onchange: null,
      addListener: (): void => undefined,
      removeListener: (): void => undefined,
    });

  const calm = make('(prefers-reduced-motion: reduce)', false);
  const wide = make('(min-width: 1200px)', true);

  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) => (query.includes('min-width') ? wide : calm) as unknown as MediaQueryList,
  );

  return { calm, wide };
}

function list(): HTMLElement {
  return screen.getByRole('list', { name: 'Отзывы' });
}

const cards = (
  <>
    <li>Отзыв</li>
    <li>Второй</li>
  </>
);

function renderTrack(props: { drift?: boolean; clipped?: boolean } = {}) {
  const { drift = true, clipped = false } = props;
  return render(
    <ReviewsTrack id="reviews-list" label="Отзывы" drift={drift} clipped={clipped}>
      {cards}
    </ReviewsTrack>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReviewsTrack', () => {
  it('останавливает самоход, когда экономию движения включили после маунта', () => {
    const { calm } = media();
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    renderTrack();

    /* Событие системы меняет состояние компонента — значит, идёт через act:
       иначе React справедливо жалуется, что проверяется промежуточный
       результат, а не то, что увидит человек. */
    act(() => {
      calm.matches = true;
      calm.dispatchEvent(new Event('change'));
    });

    expect(cancel).toHaveBeenCalled();
    // и вместе с ходом лента получила прокрутку — одно без другого не считается
    expect(list().className).toContain('scrollable');
  });

  it('при включённой с самого начала экономии движения самоход не стартует', () => {
    const { calm } = media();
    calm.matches = true;
    const raf = vi.spyOn(window, 'requestAnimationFrame');

    renderTrack();

    expect(raf).not.toHaveBeenCalled();
  });

  /**
   * 🔴 Главный дефект этого компонента, и его не видно ни снимком, ни глазами
   * на своей машине. Экономия движения останавливала ленту, а прокрутка при
   * этом оставалась выключенной — лента замирала навсегда: ни колесом, ни
   * пальцем, ни полосой. Отзывы правее первого экрана становились недостижимы
   * для человека, который попросил меньше движения: в HTML они есть, робот их
   * видит, а прочитать их нечем.
   */
  it('🔴 при экономии движения лента отдаёт прокрутку человеку', () => {
    const { calm } = media();
    calm.matches = true;

    renderTrack();

    expect(list().className).toContain('scrollable');
  });

  /**
   * WCAG 2.2.2 требует механизм остановки у **движущегося** содержимого.
   * Лента, которую уже остановила система, не движется, и кнопка рядом с ней
   * не делает ничего: нажатие не меняет ни хода, ни прокрутки. Пустой контрол
   * хуже отсутствующего — по нему нажимают и не понимают, что произошло.
   */
  it('при экономии движения кнопки нет: останавливать уже нечего', () => {
    const { calm } = media();
    calm.matches = true;

    renderTrack();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    // но сказать, что лента стоит, всё равно надо: полосы прокрутки мало
    expect(screen.getByRole('status')).toHaveTextContent(t.pausedHint);
  });

  it('едущая лента прокрутку не отдаёт: её двигает только компонент', () => {
    media();

    renderTrack();

    expect(list().className).not.toContain('scrollable');
  });

  /**
   * 🔴 WCAG 2.2.2 «Pause, Stop, Hide»: движение, которое стартует само и
   * длится дольше пяти секунд, обязано иметь механизм остановки. Пауза по
   * наведению им не считается — у человека с телефона указателя нет.
   */
  it('🔴 лента останавливается кнопкой и отдаёт прокрутку', async () => {
    media();
    const user = userEvent.setup();

    renderTrack();

    const button = screen.getByRole('button', { name: t.pauseTrack });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);

    expect(list().className).toContain('scrollable');
    expect(screen.getByRole('button', { name: t.resumeTrack })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('второе нажатие возвращает ход и снимает прокрутку', async () => {
    media();
    const user = userEvent.setup();

    renderTrack();

    await user.click(screen.getByRole('button', { name: t.pauseTrack }));
    await user.click(screen.getByRole('button', { name: t.resumeTrack }));

    expect(list().className).not.toContain('scrollable');
    expect(screen.getByRole('button', { name: t.pauseTrack })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('остановка объявляется голосом, а не только полосой прокрутки', async () => {
    media();
    const user = userEvent.setup();

    renderTrack();

    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    await user.click(screen.getByRole('button', { name: t.pauseTrack }));

    expect(status).toHaveTextContent(t.pausedHint);
  });

  it('у ленты, которой не за чем ехать, кнопки нет — останавливать нечего', () => {
    media();

    renderTrack({ drift: false });

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  /**
   * 🔴 До 1200px ленты нет вовсе: отзывы лежат колонкой и сеткой (issue #274).
   * Двигать там нечего, и кнопка остановки над неподвижными карточками —
   * контрол, который ничего не делает.
   */
  it('🔴 ниже 1200 лента не едет и кнопки остановки не заводит', () => {
    const { wide } = media();
    wide.matches = false;
    const raf = vi.spyOn(window, 'requestAnimationFrame');

    renderTrack();

    expect(raf).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  /**
   * 🔴 Свёрнутый список — это стиль, а не удаление: скрытые карточки остаются
   * в разметке, и робот видит раздел целиком (ADR-195, инвариант 1).
   */
  it('🔴 свёрнутый список не выбрасывает карточки из разметки', () => {
    media();

    renderTrack({ clipped: true });

    expect(list().className).toContain('clipped');
    expect(list().children).toHaveLength(2);
  });
});
