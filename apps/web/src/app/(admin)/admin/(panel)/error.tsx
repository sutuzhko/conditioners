'use client';

import { SectionError } from '@/widgets/admin-shell';

/**
 * Граница ошибки разделов панели (issue #336).
 *
 * 🔴 Стоит на группе `(panel)`, то есть внутри её layout: упавший раздел
 * показывает ошибку на месте содержимого, а шапка, колонка разделов и нижние
 * вкладки остаются рабочими. До неё любая ошибка раздела уходила в корневой
 * `app/error.tsx` и уносила панель целиком — вместе с навигацией.
 *
 * Сюда попадает и оборванный RSC-поток («Connection closed»), и исключение
 * серверного компонента; блоки со своей границей (`DataBlock`) до сюда не
 * доходят.
 */
export default function PanelSectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SectionError error={error} reset={reset} />;
}
