import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityList } from './ActivityList';
import { activityLogContent as texts } from './content';
import { activityJournal, activityJournalEmpty, activityJournalPaged } from './fixtures';

describe('журнал событий списком', () => {
  it('строка называет автора, действие и сущность', () => {
    render(<ActivityList journal={activityJournal} />);

    expect(screen.getByText('Богдан')).toBeInTheDocument();
    expect(screen.getByText('Снятие отзыва с публикации')).toBeInTheDocument();
    expect(screen.getAllByText('Отзыв')).toHaveLength(activityJournal.items.length);
  });

  /* 🔴 Два состояния пустого автора, а не одно (ADR-345, решение о роде
     автора). Свести их к одному слову значит соврать в одном из двух случаев:
     «Система» о человеке либо «удалена» о заявке с сайта. */
  it('событие без автора по природе называет систему', () => {
    render(<ActivityList journal={activityJournal} />);

    expect(screen.getByText(texts.noAuthor)).toBeInTheDocument();
  });

  it('событие удалённой учётки называет удаление, а не систему', () => {
    render(<ActivityList journal={activityJournal} />);

    expect(screen.getByText(texts.authorGone)).toBeInTheDocument();
  });

  it('прочерка в колонке «Кто» нет ни в одном случае', () => {
    render(<ActivityList journal={activityJournal} />);

    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  /**
   * 🔴 Состояний автора три, и на одном экране они обязаны быть тремя разными
   * подписями — не двумя.
   *
   * Проверка идёт по колонке «Кто» целиком, а не по трём отдельным словам:
   * так она поймает и обратное упрощение — если два состояния однажды сведут
   * к одному слову, набор подписей схлопнется, и тест это назовёт.
   */
  it('три состояния автора дают три разные подписи, а не две', () => {
    render(<ActivityList journal={activityJournal} />);

    const who = screen
      .getAllByRole('cell')
      .filter((cell) => cell.getAttribute('data-label') === texts.colWho)
      .map((cell) => cell.textContent);

    expect(who).toHaveLength(activityJournal.items.length);
    expect(new Set(who)).toEqual(new Set(['Богдан', 'Ирина', texts.noAuthor, texts.authorGone]));
  });

  it('время события показано моментом, а не датой: журнал читают по порядку', () => {
    render(<ActivityList journal={activityJournal} />);

    const [when] = screen.getAllByText(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
    expect(when).toBeInTheDocument();
  });

  /* 🔴 Список без разбивки не открывается: событий тысячи в месяц (PRD). */
  it('разбивка показывается, когда страниц больше одной', () => {
    render(<ActivityList journal={activityJournalPaged} />);

    expect(screen.getByRole('navigation', { name: texts.pagerLabel })).toBeInTheDocument();
  });

  it('пустой журнал объясняет пустоту, а не показывает пустую таблицу', () => {
    render(<ActivityList journal={activityJournalEmpty} />);

    expect(screen.getByText(texts.emptyTitle)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  /**
   * 🔴 Действий над событием нет намеренно (ADR-345): запись создаёт система и
   * не правится. Проверка держит это правило — кнопка, добавленная сюда из
   * лучших побуждений, красит тест.
   */
  it('над событием нет ни одного действия', () => {
    render(<ActivityList journal={activityJournal} />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
