import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Image from 'next/image';
import { useEffect, type ReactNode } from 'react';

/**
 * Истории-фикстуры измерителя инвариантов (issue #456, ADR-230).
 *
 * 🔴 Правило, которое ни разу не падало, не доказано — отказ сценария падал
 * молча четырьмя историями из тридцати двух (ADR-220). Поэтому у каждого
 * правила есть история с нарочным нарушением, и спек `invariants/fixtures.spec.ts`
 * требует от измерителя поймать ровно его: не меньше — правило сломано, не
 * больше — правило ловит лишнее.
 *
 * Разметка — инлайн-стилями, а не модулем: это не компонент интерфейса, а
 * заведомо неверная страница, и её «неверность» должна читаться в самой
 * истории, а не в соседнем CSS. Токены и HeroUI здесь ни при чём.
 *
 * `!dev` убирает раздел из боковой панели витрины (тег `dev` — встроенный
 * признак показа в панели), но оставляет в `index.json`: раннеры снимков
 * фильтруют разделы `Блоки/`, `Страницы/`, `UI Kit/`, `Кит/`, и фикстуры в
 * кадры не попадают.
 */

const meta = {
  title: 'Фикстуры/Инварианты',
  tags: ['!dev'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Правила измерителя — копия объединения из `e2e/vr/invariants/measure.ts`:
 * слой `shared` не импортирует ничего извне, даже тип. Разойдутся — спек
 * фикстур отбросит неизвестное правило и покраснеет на несовпадении.
 */
type InvariantRule =
  | 'overflow-x'
  | 'target-size'
  | 'target-size-touch'
  | 'theme'
  | 'clipped-text'
  | 'occlusion'
  | 'fonts'
  | 'images'
  | 'stability';

/** Что измеритель обязан найти на этой истории — ровно это и ничего больше. */
const expects = (...rules: readonly InvariantRule[]): NonNullable<Story['parameters']> => ({
  invariants: { expect: rules },
});

const FRAME: { readonly width: number; readonly height: number } = { width: 48, height: 48 };

function Button({
  children,
  ...style
}: {
  readonly children: ReactNode;
  readonly width: number;
  readonly height: number;
}): ReactNode {
  return (
    <button type="button" style={{ ...style, padding: 0 }}>
      {children}
    </button>
  );
}

/**
 * Фон тела красится противоположной темой: измеритель смотрит на фон
 * документа, а история сама по себе фон документа не задаёт. Перекраска
 * снимается при размонтировании — соседние истории её не наследуют.
 */
function PaintedBody({ color }: { readonly color: string }): ReactNode {
  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = color;
    return () => {
      document.body.style.background = previous;
    };
  }, [color]);
  return <p>Фон тела перекрашен вопреки теме</p>;
}

export const OverflowX: Story = {
  name: 'overflow-x — документ шире окна',
  parameters: expects('overflow-x'),
  render: () => <div style={{ width: 'calc(100vw + 200px)', height: 20 }} />,
};

export const TargetSize: Story = {
  name: 'target-size — цель 12×12',
  parameters: expects('target-size'),
  render: () => (
    <button type="button" aria-label="Закрыть" style={{ width: 12, height: 12, padding: 0 }} />
  ),
};

/**
 * Спек фикстур идёт на 768 — это сенсорная раскладка, и 32×32 нарушает
 * политику 44×44 (ADR-183), но не AA-порог 24: правило-политика отдельное и
 * не красит (ADR-232), а фикстура доказывает, что оно всё же ловит.
 */
export const TargetSizeTouch: Story = {
  name: 'target-size-touch — цель 32×32 в сенсорной раскладке',
  parameters: expects('target-size-touch'),
  render: () => (
    <button type="button" aria-label="Ещё" style={{ width: 32, height: 32, padding: 0 }} />
  ),
};

export const ThemeMismatch: Story = {
  name: 'theme — светлый фон при тёмной теме',
  /* Спек фикстур читает этот тег и запрашивает историю с `globals=theme:dark`. */
  tags: ['theme-dark'],
  parameters: expects('theme'),
  render: () => <PaintedBody color="#fff" />,
};

export const ClippedText: Story = {
  name: 'clipped-text — строка обрезана без многоточия',
  parameters: expects('clipped-text'),
  render: () => (
    <p style={{ width: 60, overflow: 'hidden', whiteSpace: 'nowrap' }}>
      Очень длинная строка без переноса
    </p>
  ),
};

export const Occlusion: Story = {
  name: 'occlusion — полоса поверх кнопки',
  parameters: expects('occlusion'),
  render: () => (
    <>
      <Button {...FRAME}>Ок</Button>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          background: 'rgba(0, 0, 0, 0.1)',
        }}
      />
    </>
  ),
};

export const Fonts: Story = {
  name: 'fonts — шрифт с несуществующим файлом',
  parameters: expects('fonts'),
  render: () => (
    <>
      <style>{`@font-face { font-family: 'Призрак'; src: url('/nope-invariants.woff2'); }`}</style>
      <p style={{ fontFamily: 'Призрак' }}>Текст призрачным шрифтом</p>
    </>
  ),
};

export const Images: Story = {
  name: 'images — картинка не загрузилась',
  parameters: expects('images'),
  render: () => <Image alt="Схема" width={40} height={40} src="/nope-invariants.png" unoptimized />,
};

/**
 * Контрольная кнопка для правила `stability` (ADR-212, #465): опорная история
 * объявляет её селектор и два состояния — сдвинутое и такое же. Раннер обязан
 * поймать сдвиг и не поймать совпадение.
 */
function Control({ top }: { readonly top: number }): ReactNode {
  return (
    <button
      id="control"
      type="button"
      style={{ position: 'absolute', top, left: 16, width: 160, height: 44 }}
    >
      Далее
    </button>
  );
}

export const StabilityAnchor: Story = {
  name: 'stability — опорная: кнопка на 40px',
  parameters: {
    invariants: {
      expect: ['stability'],
      /* id состояний — из имён экспортов ниже: `StabilityShifted` → `stability-shifted` */
      stability: {
        control: '#control',
        states: ['фикстуры-инварианты--stability-shifted', 'фикстуры-инварианты--stability-same'],
      },
    },
  },
  render: () => <Control top={40} />,
};

export const StabilityShifted: Story = {
  name: 'stability — состояние: кнопка уехала на 30px',
  parameters: expects(),
  render: () => <Control top={70} />,
};

export const StabilitySame: Story = {
  name: 'stability — состояние: кнопка на месте',
  parameters: expects(),
  render: () => <Control top={40} />,
};

export const Clean: Story = {
  name: 'чистая история — нарушений нет',
  parameters: expects(),
  render: () => <Button {...FRAME}>Ок</Button>,
};
