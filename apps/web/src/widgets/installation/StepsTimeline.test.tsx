import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

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
