import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { StepsTimeline } from './StepsTimeline';
import { installDay, installSteps, stepsContent, timelineContent } from './content';
import { emptyWarranty, fullWarranty, installationOnlyWarranty } from './fixtures';

describe('Монтаж — четыре шага', () => {
  it('рисует все шаги в заданном порядке', () => {
    render(<StepsTimeline />);

    const items = screen.getAllByRole('listitem').slice(0, installSteps.length);
    const titles = items.map((item) => within(item).getByRole('heading').textContent);

    expect(titles).toEqual(installSteps.map((step) => step.title));
  });

  it('показывает сроки гарантии, переданные из настроек', () => {
    render(<StepsTimeline warranty={fullWarranty} />);

    const terms = screen.getByLabelText(stepsContent.warranty.title);

    expect(within(terms).getByText(stepsContent.warranty.installation)).toBeInTheDocument();
    expect(within(terms).getByText('3 года')).toBeInTheDocument();
    expect(within(terms).getByText('1 год')).toBeInTheDocument();
  });

  it('незаполненное поле гарантии просто выпадает из списка', () => {
    render(<StepsTimeline warranty={installationOnlyWarranty} />);

    const terms = screen.getByLabelText(stepsContent.warranty.title);

    expect(within(terms).getByText('3 года')).toBeInTheDocument();
    expect(within(terms).queryByText(stepsContent.warranty.equipment)).not.toBeInTheDocument();
  });

  it('без гарантии в настройках строки нет вовсе — умолчания не существует', () => {
    const { unmount } = render(<StepsTimeline warranty={emptyWarranty} />);
    expect(screen.queryByLabelText(stepsContent.warranty.title)).not.toBeInTheDocument();
    unmount();

    render(<StepsTimeline />);
    expect(screen.queryByLabelText(stepsContent.warranty.title)).not.toBeInTheDocument();
  });
});

describe('Монтаж — цифры-обещания', () => {
  it('в текстах шагов нет цифр: срок работ владелец меняет из админки', () => {
    for (const step of installSteps) {
      expect(step.title).not.toMatch(/\d/);
      expect(step.text).not.toMatch(/\d/);
    }
  });

  it('шапка таймлайна не обещает срок: он показывает порядок работ, а не часы', () => {
    const head = [timelineContent.kicker, timelineContent.title, timelineContent.note].join(' ');

    expect(head).not.toMatch(/\d/);
  });

  it('без переданных настроек в шагах и шапке таймлайна не остаётся ни одной цифры', () => {
    const { container } = render(<StepsTimeline />);

    // номера шагов — нумерация, а не срок: их убираем и смотрим на остальное
    const steps = container.querySelector('ol');
    for (const node of steps?.querySelectorAll('[class*="stepNum"]') ?? []) {
      node.remove();
    }

    expect(steps?.textContent).not.toMatch(/\d/);

    // 🔴 цифры внутри пунктов таймлайна («20–30 минут вакуумным насосом») —
    // требование технологии и главный аргумент раздела про обман, а не
    // обещание клиенту. А вот шапка таймлайна могла бы пообещать общий срок —
    // там цифр быть не должно
    const head = container.querySelector('[class*="timelineHead"]');

    expect(head).not.toBeNull();
    expect(head?.textContent).not.toMatch(/\d/);
  });
});

describe('Монтаж — таймлайн дня', () => {
  it('показывает все восемь пунктов с временами', () => {
    render(<StepsTimeline />);

    for (const entry of installDay) {
      expect(screen.getByText(entry.time)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: entry.title })).toBeInTheDocument();
    }
  });

  it('время размечено элементом time с машинным значением', () => {
    const { container } = render(<StepsTimeline />);

    const times = [...container.querySelectorAll('time')].map((node) => node.dateTime);

    expect(times).toEqual(installDay.map((entry) => entry.time));
  });

  it('уровни заголовков идут без пропусков: h2 секции, h3 таймлайна, h4 пунктов', () => {
    render(<StepsTimeline />);

    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Четыре шага до прохлады');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(installSteps.length + 1);
    expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(installDay.length);
  });
});

/** Раскрывашка дня по часам и её заголовок-переключатель. */
function dayDetails(container: HTMLElement): HTMLDetailsElement {
  const details = container.querySelector('details');
  if (details === null) throw new Error('Раскрывашки дня по часам нет в разметке');
  return details;
}

describe('Монтаж — день по часам свёрнут родным details (issue #270)', () => {
  it('🔴 свёрнут по умолчанию, а содержимое лежит в HTML: восемь пунктов на месте', () => {
    const { container } = render(<StepsTimeline />);

    const details = dayDetails(container);
    expect(details.open).toBe(false);
    expect(within(details).getAllByRole('listitem')).toHaveLength(installDay.length);
    for (const entry of installDay) {
      expect(within(details).getByText(entry.text)).toBeInTheDocument();
    }
  });

  it('переключатель — summary с подписью «День монтажа по часам»', () => {
    const { container } = render(<StepsTimeline />);

    const summary = container.querySelector('summary');
    expect(summary).not.toBeNull();
    expect(summary?.textContent).toBe(timelineContent.kicker);
    // summary — первый ребёнок details: иначе браузер не сделает его переключателем
    expect(dayDetails(container).firstElementChild).toBe(summary);
  });

  it('открывается и закрывается нажатием; содержимое не размонтируется', async () => {
    const user = userEvent.setup();
    const { container } = render(<StepsTimeline />);
    const details = dayDetails(container);
    // подпись раскрывашки повторяется подзаголовком панели — берём сам summary
    const summary = within(details).getByText(timelineContent.kicker, { selector: 'summary *' });

    await user.click(summary);
    expect(details.open).toBe(true);
    expect(within(details).getAllByRole('listitem')).toHaveLength(installDay.length);

    await user.click(summary);
    expect(details.open).toBe(false);
    expect(within(details).getAllByRole('listitem')).toHaveLength(installDay.length);
  });

  it('раскрывашка на клавиатуре: summary — первая цель Tab: шаги нефокусируемы', async () => {
    const user = userEvent.setup();
    const { container } = render(<StepsTimeline />);

    await user.tab();
    expect(container.querySelector('summary')).toHaveFocus();
  });
});
