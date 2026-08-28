import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { LeadSubjectSync } from './LeadSubjectSync';
import { forgetLeadSubject, readLeadSubject } from './subject';

let search = '';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
}));

function renderWith(query: string) {
  search = query;
  return render(<LeadSubjectSync />);
}

afterEach(() => {
  forgetLeadSubject();
});

describe('LeadSubjectSync', () => {
  it('кладёт предмет из адреса в хранилище формы', () => {
    renderWith('model=split-09&topic=install');

    expect(readLeadSubject()).toEqual({ model: 'split-09', topic: 'install' });
  });

  it('берёт то, что в адресе есть: кнопка сервиса приходит без модели', () => {
    renderWith('topic=service');

    expect(readLeadSubject()).toEqual({ topic: 'service' });
  });

  it('адрес без предмета хранилище не трогает — форме нечего перерисовывать', () => {
    renderWith('utm_source=direct');

    expect(readLeadSubject()).toBeNull();
  });

  it('ничего не рисует: разметку страницы клиентский лист не занимает', () => {
    const { container } = renderWith('model=split-09');

    expect(container).toBeEmptyDOMElement();
  });
});
