'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import { Modal, type ModalSize } from '../Modal/Modal';

export interface RouteModalProps {
  title: string;
  children: ReactNode;
  description?: string | undefined;
  footer?: ReactNode | undefined;
  size?: ModalSize | undefined;
  /**
   * Куда уйти, если возвращаться некуда: адрес окна открыли ссылкой, и в
   * истории браузера позади ничего нет. Без этого «Закрыть» на такой вкладке
   * не делает ничего — окно остаётся, а человек считает, что кнопка сломана.
   */
  fallbackHref: Route;
}

/**
 * Окно, живущее по собственному адресу.
 *
 * 🔴 Создание в панели открывается модальным окном, а не разворачивается
 * внутри содержимого (ADR-117): форма, выросшая посреди страницы, двигает
 * список ровно тогда, когда на него смотрят. Правка при этом остаётся
 * страницей — это разные по длительности действия.
 *
 * Адрес у окна свой, потому что окно без адреса нельзя ни прислать ссылкой, ни
 * закрыть кнопкой «назад», ни открыть заново после перезагрузки. Собирается
 * перехватывающим маршрутом Next: `(.)`-сегмент рисует это окно поверх
 * списка, прямой заход по тому же адресу отдаёт обычную страницу.
 *
 * Компонент живёт в ките, а не в разделе: следующий раздел панели берёт
 * готовое, иначе у каждого окно закрывается по-своему.
 */
export function RouteModal({
  title,
  children,
  description,
  footer,
  size,
  fallbackHref,
}: RouteModalProps) {
  const router = useRouter();

  /**
   * Закрытие — это шаг назад по истории: адрес окна из неё уходит, и повторное
   * «вперёд» открывает его снова. Замена адреса вместо шага назад стёрла бы
   * список, с которого окно открыли.
   */
  const close = (): void => {
    /* `window` может не быть на сервере — но компонент клиентский и окно
       рисуется только после монтирования, поэтому проверка тут лишняя. Зато
       длина истории говорит, есть ли куда возвращаться: единица означает, что
       эта вкладка открыта прямо на адресе окна. */
    if (globalThis.history.length > 1) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  };

  return (
    <Modal
      open
      onClose={close}
      title={title}
      size={size}
      {...(description === undefined ? {} : { description })}
      {...(footer === undefined ? {} : { footer })}
    >
      {children}
    </Modal>
  );
}
