import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { ArrowIcon, CheckIcon, ClockIcon, PhoneIcon, ShieldIcon } from './icons';

const icons = [
  ['ArrowIcon', ArrowIcon],
  ['CheckIcon', CheckIcon],
  ['ClockIcon', ClockIcon],
  ['PhoneIcon', PhoneIcon],
  ['ShieldIcon', ShieldIcon],
] as const;

describe('иконки UI Kit', () => {
  // Иконка стоит рядом с текстом, который её объясняет: озвученная иконка
  // заставила бы скринридер прочитать подпись дважды.
  it.each(icons)('%s декоративна', (_name, Icon) => {
    const { container } = render(<Icon />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each(icons)('%s принимает размер', (_name, Icon) => {
    const { container } = render(<Icon size={28} />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveAttribute('width', '28');
    expect(svg).toHaveAttribute('height', '28');
  });
});
