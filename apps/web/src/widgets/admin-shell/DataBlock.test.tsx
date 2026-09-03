import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { blockErrorContent as texts } from './content';
import { DataBlock } from './DataBlock';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
  usePathname: () => '/admin/leads',
  /* Граница зовёт его на каждой пойманной ошибке: настоящий бросает дальше
     редиректы и 404 роутера, а обычную ошибку пропускает молча. */
  unstable_rethrow: () => undefined,
}));

/**
 * Блок падает, пока «сервер не ответил», и отдаёт данные после «свежего
 * ответа». Переключатель — объект, а не счётчик рендеров: React при падении
 * перерисовывает дерево синхронно ещё раз, и счётчик засчитал бы этот повтор
 * за успешный ответ.
 */
function Flaky({ server }: { server: { failing: boolean } }) {
  if (server.failing) throw new Error('Connection closed.');
  return <p>Данные пришли</p>;
}

/* Пойманную границей ошибку React дублирует событием `error` на window —
   jsdom считает его необработанным. Тест про то, что граница ловит, поэтому
   дубль гасится. */
const swallow = (event: ErrorEvent): void => {
  event.preventDefault();
};

describe('DataBlock', () => {
  beforeEach(() => {
    /* Граница пишет ошибку в консоль намеренно — в тесте это шум. */
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.addEventListener('error', swallow);
    refresh.mockClear();
  });

  afterEach(() => {
    window.removeEventListener('error', swallow);
    vi.restoreAllMocks();
  });

  it('показывает данные, когда блок отрисовался', () => {
    render(
      <DataBlock skeleton={<span>скелетон</span>} title="Не удалось загрузить заявки">
        <p>Данные пришли</p>
      </DataBlock>,
    );

    expect(screen.getByText('Данные пришли')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('🔴 ловит падение блока сам: ошибка с заголовком и объяснением на месте данных', () => {
    render(
      <DataBlock skeleton={<span>скелетон</span>} title="Не удалось загрузить заявки">
        <Flaky server={{ failing: true }} />
      </DataBlock>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Не удалось загрузить заявки' }),
    ).toBeInTheDocument();
    expect(screen.getByText(texts.note)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.retry })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: texts.reload })).toBeInTheDocument();
  });

  it('🔴 «Повторить» запрашивает свежий ответ и рисует блок заново', async () => {
    const user = userEvent.setup();
    const server = { failing: true };

    render(
      <DataBlock skeleton={<span>скелетон</span>} title="Не удалось загрузить заявки">
        <Flaky server={server} />
      </DataBlock>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();

    /* Сервер ожил — как после `router.refresh()` в живой панели. */
    server.failing = false;
    await user.click(screen.getByRole('button', { name: texts.retry }));

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Данные пришли')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('объяснение блока подменяется своим', () => {
    render(
      <DataBlock
        skeleton={<span>скелетон</span>}
        title="Не удалось загрузить наряды"
        note="Наряды записаны в базу."
      >
        <Flaky server={{ failing: true }} />
      </DataBlock>,
    );

    expect(screen.getByText('Наряды записаны в базу.')).toBeInTheDocument();
  });
});
