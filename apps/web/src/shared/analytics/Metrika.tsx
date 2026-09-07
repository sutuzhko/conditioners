import { METRIKA_GOALS } from './goals';

/**
 * Счётчик Яндекс.Метрики (ADR-024, issue #678).
 *
 * 🔴 Компонент серверный, и тег приходит в HTML вместе со страницей: тот же
 * приём, что у разметки Schema.org и у скрипта темы. Номер пустой — не
 * возвращается ничего: пустой скрипт с пустым id хуже отсутствия, он
 * выглядит работающим счётчиком.
 *
 * 🔴 `tag.js` не грузится на первом экране. Встроенный кусок ниже не ходит в
 * сеть вовсе: он объявляет очередь `ym` (вызовы целей, сделанные до загрузки,
 * в ней и подождут) и вешает слушателя на телефоны, а сам файл счётчика
 * запрашивается только после события `load`. Счётчик не имеет права стоять на
 * критическом пути LCP — пороги проекта часть определения «готово».
 */

/**
 * Номер счётчика — только цифры. Схема настроек это уже проверяет, но строка
 * попадает **внутрь тега `<script>`**, и полагаться на то, что проверка выше
 * по течению никогда не изменится, здесь нельзя: цена ошибки — исполняемый
 * код на каждой публичной странице.
 */
const COUNTER_ID = /^\d+$/;

/**
 * Тело встроенного скрипта.
 *
 * Имена целей подставляются из общего списка, а не пишутся строкой: иначе
 * цель телефона существовала бы в двух местах и разошлась бы при первой же
 * правке.
 */
function counterScript(id: string): string {
  return `
(function (w, d) {
  w.ym = w.ym || function () { (w.ym.a = w.ym.a || []).push(arguments) };
  w.ym.l = 1 * new Date();
  w.ym(${id}, 'init', {
    clickmap: true,
    trackLinks: true,
    accurateTrackBounce: true,
    webvisor: true
  });
  w.ymGoal = function (goal) { w.ym(${id}, 'reachGoal', goal) };

  d.addEventListener('click', function (e) {
    var t = e.target;
    var link = t && t.closest ? t.closest('a[href^="tel:"]') : null;
    if (link) w.ymGoal('${METRIKA_GOALS.phone}');
  }, true);

  function load() {
    if (d.getElementById('ym-tag')) return;
    var s = d.createElement('script');
    s.id = 'ym-tag';
    s.async = true;
    s.src = 'https://mc.yandex.ru/metrika/tag.js';
    d.head.appendChild(s);
  }

  if (d.readyState === 'complete') setTimeout(load, 0);
  else w.addEventListener('load', function () { setTimeout(load, 0) }, { once: true });
})(window, document);
`;
}

export type MetrikaProps = {
  /** Номер счётчика из настроек. Пустая строка — счётчика на странице нет. */
  readonly counterId: string;
};

export function Metrika({ counterId }: MetrikaProps) {
  if (!COUNTER_ID.test(counterId)) return null;

  return <script dangerouslySetInnerHTML={{ __html: counterScript(counterId) }} />;
}
