'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '../Button/Button';
import { Modal, type ModalSize } from '../Modal/Modal';
import styles from './RouteModal.module.css';

export type RouteCloseOptions = {
  /**
   * Обновить список, к которому уходим. Нужно после удачного сохранения:
   * заведённая запись иначе не появится под окном.
   */
  readonly refresh?: boolean;
};

/**
 * Уход с адреса окна.
 *
 * Вынесен хуком, потому что закрыть окно нужно и самой форме — после удачного
 * сохранения. Копия правила в разделе разошлась бы с китом на первой правке.
 *
 * 🔴 **Обновление списка умеет только этот хук, и звать `router.refresh()`
 * рядом с закрытием бесполезно.** «Назад» — это переход, и запрос, начатый до
 * него, роутер отбрасывает: разделы честно вызывали `refresh()` перед
 * `close()`, окно уходило, а заведённой строки в списке не было — ни на
 * складе, ни в клиентах, ни в команде. Замерено в браузере: монтажник
 * создавался, список оставался прежним.
 *
 * Поэтому обновление откладывается до уборки эффекта: к этому моменту новый
 * адрес уже применён, и `refresh()` попадает в список, а не в исчезающее окно.
 */
/** Закрытие окна: уводит с его адреса и, если попросили, обновляет список. */
export type RouteClose = (options?: RouteCloseOptions) => void;

export function useRouteClose(fallbackHref: Route): RouteClose {
  const router = useRouter();
  const pendingRefresh = useRef(false);

  useEffect(
    () => () => {
      if (pendingRefresh.current) router.refresh();
    },
    [router],
  );

  return (options) => {
    pendingRefresh.current = options?.refresh === true;

    /* Закрытие — шаг назад по истории: адрес окна из неё уходит, и повторное
       «вперёд» открывает его снова. Замена адреса вместо шага назад стёрла бы
       список, с которого окно открыли.

       Длина истории говорит, есть ли куда возвращаться: единица означает, что
       вкладку открыли прямо на адресе окна. Там `back()` не делает ничего, и
       без запасного адреса «Закрыть» выглядела бы сломанной кнопкой. */
    if (globalThis.history.length > 1) {
      router.back();
      return;
    }

    router.replace(fallbackHref);
  };
}

export interface RouteModalProps {
  title: string;
  children: ReactNode;
  description?: string | undefined;
  footer?: ReactNode | undefined;
  size?: ModalSize | undefined;
  /**
   * Куда уйти, если возвращаться некуда: адрес окна открыли ссылкой, и в
   * истории браузера позади ничего нет.
   */
  fallbackHref: Route;
  /**
   * В форме есть несохранённый ввод. 🔴 Такое окно не закрывается молча по
   * Escape и клику мимо (ADR-117): человек, потерявший заполненную форму от
   * случайного нажатия, второй раз её заполнять не станет — он позвонит.
   */
  dirty?: boolean | undefined;
  /** Подписи вопроса. Тексты — забота раздела, а не кита. */
  confirmText?: string | undefined;
  confirmStay?: string | undefined;
  confirmLeave?: string | undefined;
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
  dirty = false,
  confirmText = 'Введённое не сохранено. Закрыть и потерять его?',
  confirmStay = 'Остаться',
  confirmLeave = 'Закрыть без сохранения',
}: RouteModalProps) {
  const leave = useRouteClose(fallbackHref);
  const [asking, setAsking] = useState(false);

  /**
   * Вопрос задаётся внутри того же окна, а не вторым диалогом поверх первого:
   * две ловушки фокуса стопкой — надёжный способ запереть человека с
   * клавиатурой между ними.
   *
   * 🔴 Пока вопрос показан, Escape и крестик означают «остаться», а не «уйти».
   * Раньше второе нажатие уходило мимо вопроса прямо в закрытие — то есть два
   * Escape подряд теряли заполненную форму молча, ровно тем случайным
   * нажатием, ради которого вопрос и заведён (ADR-117). Потерять введённое
   * можно только назвав это словом: кнопкой «Закрыть без сохранения».
   */
  const close = (): void => {
    if (asking) {
      setAsking(false);
      return;
    }

    if (dirty) {
      setAsking(true);
      return;
    }

    leave();
  };

  return (
    <Modal
      open
      onClose={close}
      title={title}
      size={size}
      {...(description === undefined ? {} : { description })}
      footer={
        asking ? (
          <div className={styles.confirm} role="alertdialog" aria-label={confirmText}>
            <p className={styles.question}>{confirmText}</p>
            <div className={styles.answers}>
              <Button variant="ghost" onClick={() => setAsking(false)}>
                {confirmStay}
              </Button>
              <Button className={styles.leave} variant="ghost" onClick={() => leave()}>
                {confirmLeave}
              </Button>
            </div>
          </div>
        ) : (
          footer
        )
      }
    >
      {children}
    </Modal>
  );
}
