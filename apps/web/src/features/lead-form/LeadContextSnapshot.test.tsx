import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { LeadContextSnapshot } from './LeadContextSnapshot';
import { forgetLeadContext, readLeadContext } from './context';

const model = { slug: 'split-09', name: 'Сплит-система 09', price: 34_900, oldPrice: null };
const liked = [
  model,
  { slug: 'split-12', name: 'Сплит-система 12', price: 41_900, oldPrice: null },
];

beforeEach(() => {
  forgetLeadContext();
});

describe('LeadContextSnapshot', () => {
  it('🔴 ничего не рисует: разметка серверной страницы не меняется', () => {
    const { container } = render(<LeadContextSnapshot model={model} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('переносит модель страницы и отметки в контекст заявки', () => {
    render(<LeadContextSnapshot model={model} liked={liked} />);

    expect(readLeadContext()?.model?.name).toBe('Сплит-система 09');
    expect(readLeadContext()?.liked).toHaveLength(2);
  });

  it('повторный рендер не будит хранилище: снимок тот же', () => {
    const { rerender } = render(<LeadContextSnapshot liked={liked} />);
    const first = readLeadContext();

    rerender(<LeadContextSnapshot liked={[...liked]} />);

    expect(readLeadContext()).toBe(first);
  });

  it('без снимка ничего не записывает', () => {
    render(<LeadContextSnapshot />);

    expect(readLeadContext()).toBeNull();
  });
});
