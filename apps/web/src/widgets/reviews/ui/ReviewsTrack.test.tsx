import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { reviewsContent as t } from '../content';
import { ReviewsTrack } from './ReviewsTrack';

/**
 * Управляемая замена matchMedia: настоящий EventTarget, чтобы `change`
 * доходил до подписчиков компонента, плюс изменяемое поле matches —
 * тест сам решает, что «ответила» операционная система.
 */
function calmSwitch() {
  const media = Object.assign(new EventTarget(), {
    matches: false,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addListener: (): void => undefined,
    removeListener: (): void => undefined,
  });
  vi.spyOn(window, 'matchMedia').mockImplementation(() => media);
  return media;
}

function track(): HTMLElement {
  return screen.getByRole('list', { name: 'Отзывы' });
}

const cards = (
  <>
    <li>Отзыв</li>
    <li>Второй</li>
  </>
);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReviewsTrack', () => {
  it('останавливает самоход, когда экономию движения включили после маунта', () => {
    const media = calmSwitch();
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    render(<ReviewsTrack label="Отзывы">{cards}</ReviewsTrack>);

    /* Событие системы меняет состояние компонента — значит, идёт через act:
       иначе React справедливо жалуется, что проверяется промежуточный
       результат, а не то, что увидит человек. */
    act(() => {
      media.matches = true;
      media.dispatchEvent(new Event('change'));
    });

    expect(cancel).toHaveBeenCalled();
    // и вместе с ходом лента получила прокрутку — одно без другого не считается
    expect(track().className).toContain('scrollable');
  });

  it('при включённой с самого начала экономии движения самоход не стартует', () => {
    const media = calmSwitch();
    media.matches = true;
    const raf = vi.spyOn(window, 'requestAnimationFrame');

    render(<ReviewsTrack label="Отзывы">{cards}</ReviewsTrack>);

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
    const media = calmSwitch();
    media.matches = true;

    render(<ReviewsTrack label="Отзывы">{cards}</ReviewsTrack>);

    expect(track().className).toContain('scrollable');
  });

  /**
   * WCAG 2.2.2 требует механизм остановки у **движущегося** содержимого.
   * Лента, которую уже остановила система, не движется, и кнопка рядом с ней
   * не делает ничего: нажатие не меняет ни хода, ни прокрутки. Пустой контрол
   * хуже отсутствующего — по нему нажимают и не понимают, что произошло.
   */
  it('при экономии движения кнопки нет: останавливать уже нечего', () => {
    const media = calmSwitch();
    media.matches = true;

    render(<ReviewsTrack label="Отзывы">{cards}</ReviewsTrack>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    // но сказать, что лента стоит, всё равно надо: полосы прокрутки мало
    expect(screen.getByRole('status')).toHaveTextContent(t.pausedHint);
  });

  it('едущая лента прокрутку не отдаёт: её двигает только компонент', () => {
    calmSwitch();

    render(<ReviewsTrack label="Отзывы">{cards}</ReviewsTrack>);

    expect(track().className).not.toContain('scrollable');
  });

  /**
   * 🔴 WCAG 2.2.2 «Pause, Stop, Hide»: движение, которое стартует само и
   * длится дольше пяти секунд, обязано иметь механизм остановки. Пауза по
   * наведению им не считается — у человека с телефона указателя нет.
   */
  it('🔴 лента останавливается кнопкой и отдаёт прокрутку', async () => {
    calmSwitch();
    const user = userEvent.setup();

    render(<ReviewsTrack label="Отзывы">{cards}</ReviewsTrack>);

    const button = screen.getByRole('button', { name: t.pauseTrack });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);

    expect(track().className).toContain('scrollable');
    expect(screen.getByRole('button', { name: t.resumeTrack })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('второе нажатие возвращает ход и снимает прокрутку', async () => {
    calmSwitch();
    const user = userEvent.setup();

    render(<ReviewsTrack label="Отзывы">{cards}</ReviewsTrack>);

    await user.click(screen.getByRole('button', { name: t.pauseTrack }));
    await user.click(screen.getByRole('button', { name: t.resumeTrack }));

    expect(track().className).not.toContain('scrollable');
    expect(screen.getByRole('button', { name: t.pauseTrack })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('остановка объявляется голосом, а не только полосой прокрутки', async () => {
    calmSwitch();
    const user = userEvent.setup();

    render(<ReviewsTrack label="Отзывы">{cards}</ReviewsTrack>);

    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();

    await user.click(screen.getByRole('button', { name: t.pauseTrack }));

    expect(status).toHaveTextContent(t.pausedHint);
  });

  it('у ленты, которой не за чем ехать, кнопки нет — останавливать нечего', () => {
    calmSwitch();

    render(
      <ReviewsTrack label="Отзывы" drift={false}>
        {cards}
      </ReviewsTrack>,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
