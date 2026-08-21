import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { JsonLd } from './JsonLd';

describe('Вывод разметки', () => {
  it('складывает узлы в один @graph и объявляет контекст один раз', () => {
    const { container } = render(
      <JsonLd nodes={[{ '@type': 'Organization', name: 'Пример' }, { '@type': 'WebSite' }]} />,
    );

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();

    const parsed = JSON.parse(script?.textContent ?? '');
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@graph']).toHaveLength(2);
  });

  it('пустые узлы отбрасывает, а из одних пустых скрипта не делает', () => {
    const { container } = render(<JsonLd nodes={[null, undefined]} />);

    expect(container.querySelector('script')).toBeNull();
  });

  it('🔴 закрывающий тег внутри данных не разрывает скрипт', () => {
    const { container } = render(
      <JsonLd nodes={[{ '@type': 'Article', headline: '</script><img src=x>' }]} />,
    );

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.textContent).not.toContain('</script>');
    expect(container.querySelector('img')).toBeNull();

    // после разбора текст остаётся исходным — экранирование только транспортное
    const parsed = JSON.parse(script?.textContent ?? '');
    expect(parsed['@graph'][0].headline).toBe('</script><img src=x>');
  });
});
