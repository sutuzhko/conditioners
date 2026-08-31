import type { Page } from '@playwright/test';

/**
 * Готовность истории Storybook к снимку — общая для публичного раннера и
 * раннера панели. Раньше эта последовательность стояла двумя копиями, и
 * первая же правка развела их: панель ждала окончания анимаций, публичный
 * раннер — нет.
 *
 * 🔴 Снимок обязан попадать в одно и то же состояние истории, а не в
 * случайный момент её оживания. Три ожидания подряд закрывают три разных
 * способа промахнуться.
 */

declare global {
  interface Window {
    /**
     * Внутренний объект витрины. Публичного признака «история доготовилась»
     * Storybook не отдаёт, а `storyFinished` приходит событием — его нельзя
     * опросить из `waitForFunction` после перехода на страницу.
     */
    readonly __STORYBOOK_PREVIEW__?: {
      readonly currentRender?: { readonly phase?: string };
    };
  }
}

/** Состояния, после которых история больше не меняется сама. */
const SETTLED_PHASES = ['finished', 'errored', 'aborted'];

export async function waitForStoryReady(page: Page): Promise<void> {
  /* Готовность разметки объявляет сам Storybook: `sb-show-main` появляется,
     когда история отрисована, `sb-show-preparing-story` уходит, когда она
     доготовилась. Ждать видимости `#storybook-root` нельзя — у историй с
     пустым состоянием («Главная — следа нет») он честно нулевой высоты, и
     ожидание не кончается никогда (docs/BUGS.md). */
  await page.waitForFunction(() => {
    const { classList } = document.body;
    return classList.contains('sb-show-main') && !classList.contains('sb-show-preparing-story');
  });

  /* 🔴 Ждём окончания сценария истории — `play` (issue #404).
     Отрисовка и сценарий это разные вещи: `sb-show-main` появляется, когда
     история отрисована, а `play` только начинает нажимать кнопки. У историй
     `UI Kit/Modal — Открытие и закрытие` и `UI Kit/Drawer` сценарий открывает
     окно, убеждается, что оно видно, и закрывает его по Escape. Снимок без
     этого ожидания заставал историю в любой из трёх точек — до нажатия, при
     открытом окне, после закрытия, — и каждая из них устойчива сама по себе:
     Playwright честно сообщал «captured a stable screenshot» и сравнивал с
     эталоном, снятым в другой точке. Так падали десять снимков `--opening` из
     двенадцати.

     Ожидание общее, а не только для историй со сценарием: признак «есть
     `play`» живёт в тегах индекса, и раннер, который верит тегу, промолчит в
     тот день, когда тег переименуют. Надбавка — около 100мс на историю. */
  await page.waitForFunction((phases) => {
    const phase = window.__STORYBOOK_PREVIEW__?.currentRender?.phase;
    return phase !== undefined && phases.includes(phase);
  }, SETTLED_PHASES);

  /* Ждём, пока в документе не останется идущих конечных анимаций и переходов.
     `animations: 'disabled'` у снимка гасит только то, что уже началось к
     моменту вызова.

     Бесконечные анимации пропускаются намеренно — мерцание скелетона не
     закончится никогда, и его гасит сам Playwright. */
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => {
      const timing = animation.effect?.getComputedTiming();
      return timing?.iterations === Infinity || animation.playState !== 'running';
    }),
  );
}
