import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReviewsTrack', () => {
  it('останавливает самоход, когда экономию движения включили после маунта', () => {
    const media = calmSwitch();
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');

    render(
      <ReviewsTrack label="Отзывы">
        <li>Отзыв</li>
      </ReviewsTrack>,
    );

    media.matches = true;
    media.dispatchEvent(new Event('change'));

    expect(cancel).toHaveBeenCalled();
  });

  it('при включённой с самого начала экономии движения самоход не стартует', () => {
    const media = calmSwitch();
    media.matches = true;
    const raf = vi.spyOn(window, 'requestAnimationFrame');

    render(
      <ReviewsTrack label="Отзывы">
        <li>Отзыв</li>
      </ReviewsTrack>,
    );

    expect(raf).not.toHaveBeenCalled();
  });
});
