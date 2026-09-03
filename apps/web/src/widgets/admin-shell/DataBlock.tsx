'use client';

import { unstable_rethrow, useRouter } from 'next/navigation';
import { Component, Suspense, useTransition, type ErrorInfo, type ReactNode } from 'react';

import { Button, Card, ErrorState } from '@/shared/ui';

import { blockErrorContent as texts } from './content';

export interface BlockErrorProps {
  /** Что не загрузилось: «Не удалось загрузить заявки». */
  readonly title: string;
  /** Что с данными: заявки записаны в базу и появятся, как только связь восстановится. */
  readonly note: string;
  /** Сбрасывает границу: после свежего ответа сервера блок рисуется заново. */
  readonly onReset: () => void;
}

/**
 * Ошибка блока с действиями (issue #336).
 *
 * 🔴 «Повторить» действительно повторяет: данные блока приходят с сервера в
 * составе RSC-ответа, и одного сброса границы мало — повторный рендер получил
 * бы тот же оборванный кусок и упал бы снова. Поэтому в одном переходе идут
 * `router.refresh()` — свежий ответ на текущий адрес — и сброс границы: React
 * держит на экране ошибку, пока ответ не пришёл, и только затем рисует блок
 * заново. Если сервер снова не ответил, граница ловит ошибку ещё раз, и на
 * экране остаётся та же карточка — без мигания.
 *
 * «Обновить страницу» — запасной выход: полная перезагрузка документа, когда
 * повтор не помогает (например, истекла сессия и панель отвечает входом).
 */
export function BlockError({ title, note, onReset }: BlockErrorProps) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const retry = (): void => {
    start(() => {
      router.refresh();
      onReset();
    });
  };

  const reload = (): void => {
    window.location.reload();
  };

  return (
    <ErrorState
      title={title}
      actions={
        <>
          <Button type="button" size="sm" loading={pending} onClick={retry}>
            {texts.retry}
          </Button>
          {/* Не выключается на время повтора: перезагрузка документа с висящим
              переходом не конфликтует, а нужна она ровно тогда, когда повтор
              идёт долго и не помогает. */}
          <Button type="button" size="sm" variant="light" onClick={reload}>
            {texts.reload}
          </Button>
        </>
      }
    >
      {note}
    </ErrorState>
  );
}

/**
 * На чём стоит ошибка: в своей карточке — когда блок сам был списком карточек
 * или таблицей; без неё — когда блок живёт внутри чужой карточки.
 */
export type BlockSurface = 'card' | 'bare';

type BoundaryProps = {
  readonly title: string;
  readonly note: string;
  readonly surface: BlockSurface;
  readonly children: ReactNode;
};

type BoundaryState = { readonly error: Error | null };

/**
 * Граница ошибки блока.
 *
 * 🔴 Единственный классовый компонент проекта, и он вынужденный: границу
 * ошибки React даёт только через `getDerivedStateFromError`, хука для неё
 * нет, а сторонняя обёртка — это зависимость ради двадцати строк. Логика
 * границы здесь и заканчивается: что показать и как повторить, решает
 * функциональный `BlockError`.
 */
class Boundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    /* 🔴 `redirect()`, `notFound()` и `forbidden()` серверного компонента
       приходят сюда обычным исключением: поймать их — значит показать
       карточку «Не удалось загрузить» вместо перехода или 404, а на проверке
       доступа (ADR-095) — оставить человека в чужом разделе. Своя граница
       обязана пропускать их дальше, как это делает граница Next. */
    unstable_rethrow(error);
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    /* След в консоли браузера — единственное место, где ошибку блока видно
       с клиента: на сервере она уже записана, а владельцу показан текст. */
    console.error(error, info.componentStack);
  }

  private readonly reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error !== null) {
      const failed = (
        <BlockError title={this.props.title} note={this.props.note} onReset={this.reset} />
      );
      return this.props.surface === 'card' ? <Card as="section">{failed}</Card> : failed;
    }

    return this.props.children;
  }
}

export interface DataBlockProps {
  /** Скелетон блока: та же раскладка и та же высота, что у данных (issue #334). */
  readonly skeleton: ReactNode;
  /** Что не загрузилось, если блок упал. */
  readonly title: string;
  /** Что с данными. По умолчанию — общее объяснение про базу. */
  readonly note?: string | undefined;
  /** Поверхность ошибки: своя карточка (умолчание) или голый блок внутри чужой. */
  readonly surface?: BlockSurface | undefined;
  /** Асинхронный серверный компонент: его данные приезжают отдельным куском потока. */
  readonly children: ReactNode;
}

/**
 * Асинхронный блок панели: скелетон, данные или ошибка — и ничего вокруг
 * не страдает (issue #334, #336).
 *
 * Страница кладёт внутрь асинхронный серверный компонент. `Suspense` даёт ему
 * собственный кусок RSC-потока: шапка, фильтры и соседние блоки приезжают
 * первыми, на месте блока стоит скелетон. Упал запрос блока — ошибку ловит
 * граница здесь же, и навигация с соседями остаются рабочими: владелец уходит
 * в другой раздел, а не перезагружает панель.
 *
 * Компонент клиентский, но дети — серверные: через границу уезжает готовая
 * разметка, а не функция (HANDOFF: функции не переживают сериализацию).
 */
export function DataBlock({
  skeleton,
  title,
  note = texts.note,
  surface = 'card',
  children,
}: DataBlockProps) {
  return (
    <Suspense fallback={skeleton}>
      <Boundary title={title} note={note} surface={surface}>
        {children}
      </Boundary>
    </Suspense>
  );
}
