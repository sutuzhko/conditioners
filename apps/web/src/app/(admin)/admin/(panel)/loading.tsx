import { Skeleton } from '@/shared/ui';

import styles from './loading.module.css';

/**
 * Состояние перехода между разделами панели.
 *
 * 🔴 Переходы в админке — клиентская навигация: документ не перезагружается,
 * но данные каждого раздела читаются на сервере по запросу (`force-dynamic`).
 * Без этого файла Next держит на экране прежнюю страницу, пока идёт ответ, и
 * нажатие выглядит непроизошедшим — отсюда ощущение «зависшей загрузки».
 *
 * Скелетон повторяет общий каркас раздела: заголовок, подзаголовок и полотно
 * содержимого. Точнее — не нужно: разделы разные, а обещать конкретную
 * раскладку и показать другую хуже, чем показать нейтральную.
 */
export default function PanelLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <Skeleton variant="block" width="min(320px, 60%)" height="34px" />
      <Skeleton variant="text" lines={2} width="min(560px, 90%)" />
      <Skeleton variant="block" height="320px" />
    </div>
  );
}
