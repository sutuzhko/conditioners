import type { ReactNode } from 'react';

import { Card } from '@/shared/ui';

/**
 * Во что одета форма.
 *
 * `section` — сама себе карточка с заголовком: так она стоит в содержимом
 * страницы. `bare` — только поля: рамку и заголовок даёт тот, кто её вставил,
 * будь то окно создания или карточка страницы.
 *
 * 🔴 Форма при этом одна и та же: заведение открывается окном, а прямой заход
 * по тому же адресу отдаёт страницу (ADR-117, ADR-137). Две формы для одного
 * действия разошлись бы на первой правке, а карточка внутри окна была бы
 * панелью в панели.
 */
export type StockSurface = 'section' | 'bare';

export function StockFormSurface({
  surface,
  children,
}: {
  readonly surface: StockSurface;
  readonly children: ReactNode;
}) {
  if (surface === 'bare') return <>{children}</>;

  return <Card as="section">{children}</Card>;
}
