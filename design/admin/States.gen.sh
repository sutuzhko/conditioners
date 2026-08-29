. ./_screens.sh
# матрица состояний — вызывается дважды, для светлой и тёмной темы
matrix() {
cat <<EOF
  <div class="mx">
    <span class="hdr"></span>
    <span class="hdr">Покой</span><span class="hdr">Наведение</span><span class="hdr">Нажатие</span>
    <span class="hdr">Фокус с клавиатуры</span><span class="hdr">Отключено</span><span class="hdr">Занято или выбрано</span>

    <span class="rl">Кнопка solid<small>главное действие</small></span>
    <span><span class="btn solid">Сохранить</span></span>
    <span><span class="btn solid is-hover">Сохранить</span></span>
    <span><span class="btn solid is-hover is-active">Сохранить</span></span>
    <span><span class="btn solid is-focus">Сохранить</span></span>
    <span><span class="btn solid is-dis">Сохранить</span></span>
    <span><span class="btn solid" style="opacity:.85"><span class="spin" style="width:15px;height:15px;border-width:2px;border-top-color:#fff;border-color:rgb(255 255 255 / 35%)"></span>Отправляем</span></span>
    <span class="mxrow"></span>

    <span class="rl">Кнопка flat<small>второе по важности</small></span>
    <span><span class="btn flat">В работу</span></span>
    <span><span class="btn flat is-hover">В работу</span></span>
    <span><span class="btn flat is-hover is-active">В работу</span></span>
    <span><span class="btn flat is-focus">В работу</span></span>
    <span><span class="btn flat is-dis">В работу</span></span>
    <span><span class="btn flat">$I_CHECK Готово</span></span>
    <span class="mxrow"></span>

    <span class="rl">Кнопка bordered</span>
    <span><span class="btn bord">Отмена</span></span>
    <span><span class="btn bord is-hover">Отмена</span></span>
    <span><span class="btn bord is-hover is-active">Отмена</span></span>
    <span><span class="btn bord is-focus">Отмена</span></span>
    <span><span class="btn bord is-dis">Отмена</span></span>
    <span class="t-tiny fnt">—</span>
    <span class="mxrow"></span>

    <span class="rl">Кнопка light</span>
    <span><span class="btn light">Сбросить</span></span>
    <span><span class="btn light is-hover">Сбросить</span></span>
    <span><span class="btn light is-hover is-active">Сбросить</span></span>
    <span><span class="btn light is-focus">Сбросить</span></span>
    <span><span class="btn light is-dis">Сбросить</span></span>
    <span class="t-tiny fnt">—</span>
    <span class="mxrow"></span>

    <span class="rl">Кнопка опасного действия</span>
    <span><span class="btn danger">Удалить</span></span>
    <span><span class="btn danger is-hover">Удалить</span></span>
    <span><span class="btn danger is-hover is-active">Удалить</span></span>
    <span><span class="btn danger is-focus">Удалить</span></span>
    <span><span class="btn danger is-dis">Удалить</span></span>
    <span class="t-tiny fnt">подтверждение окном</span>
    <span class="mxrow"></span>

    <span class="rl">Поле flat<small>умолчание панели</small></span>
    <span><span class="inp flat col"><span class="lab">Клиент</span><span class="val">Лапшин</span></span></span>
    <span><span class="inp flat col is-hover"><span class="lab">Клиент</span><span class="val">Лапшин</span></span></span>
    <span class="t-tiny fnt">нет отдельного</span>
    <span><span class="inp flat col foc"><span class="lab">Клиент</span><span class="val">Лапшин|</span></span></span>
    <span><span class="inp flat col is-dis"><span class="lab">Логин</span><span class="val mono">admin</span></span></span>
    <span><span class="inp flat col err"><span class="lab">Телефон</span><span class="val mono">+7 (910) 155</span></span></span>
    <span class="mxrow"></span>

    <span class="rl">Поле bordered<small>плотные формы</small></span>
    <span><span class="inp bordered col"><span class="lab">Сумма</span><span class="val mono">34 900 ₽</span></span></span>
    <span><span class="inp bordered col is-hover"><span class="lab">Сумма</span><span class="val mono">34 900 ₽</span></span></span>
    <span class="t-tiny fnt">нет отдельного</span>
    <span><span class="inp bordered col foc"><span class="lab">Сумма</span><span class="val mono">34 900|</span></span></span>
    <span><span class="inp bordered col is-dis"><span class="lab">Сумма</span><span class="val mono">34 900 ₽</span></span></span>
    <span><span class="inp bordered col err"><span class="lab">Сумма</span><span class="val mono">—</span></span></span>
    <span class="mxrow"></span>

    <span class="rl">Галочка</span>
    <span><span class="cbx"></span></span>
    <span><span class="cbx" style="border-color:var(--ink2)"></span></span>
    <span><span class="cbx is-active" style="border-color:var(--brand)"></span></span>
    <span><span class="cbx is-focus"></span></span>
    <span><span class="cbx is-dis"></span></span>
    <span class="row" style="gap:8px"><span class="cbx on">$I_CHECK</span><span class="cbx ind"><span style="width:9px;height:2px;background:#fff;border-radius:1px"></span></span></span>
    <span class="mxrow"></span>

    <span class="rl">Переключатель</span>
    <span><span class="sw"><i></i></span></span>
    <span><span class="sw" style="border-color:var(--ink2)"><i></i></span></span>
    <span><span class="sw is-active"><i></i></span></span>
    <span><span class="sw is-focus"><i></i></span></span>
    <span><span class="sw is-dis"><i></i></span></span>
    <span><span class="sw on"><i></i></span></span>
    <span class="mxrow"></span>

    <span class="rl">Пункт навигации</span>
    <span><span class="nv" style="width:180px">$I_ORD Заказы</span></span>
    <span><span class="nv is-hover" style="width:180px">$I_ORD Заказы</span></span>
    <span class="t-tiny fnt">переход</span>
    <span><span class="nv is-focus" style="width:180px">$I_ORD Заказы</span></span>
    <span class="t-tiny fnt">роль не пускает</span>
    <span><span class="nv on" style="width:180px">$I_ORD Заказы <span class="cnt">7</span></span></span>
    <span class="mxrow"></span>

    <span class="rl">Строка таблицы</span>
    <span><span class="trow">Заказ № 128<span class="chip c-primary">В работе</span></span></span>
    <span><span class="trow is-hover">Заказ № 128<span class="chip c-primary">В работе</span></span></span>
    <span class="t-tiny fnt">открытие</span>
    <span><span class="trow is-focus">Заказ № 128<span class="chip c-primary">В работе</span></span></span>
    <span class="t-tiny fnt">—</span>
    <span><span class="trow is-sel">Заказ № 128<span class="chip c-primary">В работе</span></span></span>
    <span class="mxrow"></span>

    <span class="rl">Пункт меню</span>
    <span><span class="item" style="width:180px">$I_EDIT Править</span></span>
    <span><span class="item is-hover" style="width:180px">$I_EDIT Править</span></span>
    <span class="t-tiny fnt">выполнение</span>
    <span><span class="item is-focus" style="width:180px">$I_EDIT Править</span></span>
    <span><span class="item is-dis" style="width:180px">$I_EDIT Править</span></span>
    <span><span class="item bad is-hover" style="width:180px">$I_TRASH Удалить</span></span>
    <span class="mxrow"></span>

    <span class="rl">Вкладка</span>
    <span><span class="tab" style="padding:8px 0">Чеклист</span></span>
    <span><span class="tab" style="padding:8px 0;color:var(--ink2)">Чеклист</span></span>
    <span class="t-tiny fnt">переключение</span>
    <span><span class="tab is-focus" style="padding:8px 8px;border-radius:8px">Чеклист</span></span>
    <span><span class="tab is-dis" style="padding:8px 0">Чеклист</span></span>
    <span><span class="tab on" style="padding:8px 0">Наряд</span></span>
    <span class="mxrow"></span>

    <span class="rl">Страница в пагинации</span>
    <span><span class="pg"><span>2</span></span></span>
    <span><span class="pg"><span style="background:var(--bg-soft)">2</span></span></span>
    <span class="t-tiny fnt">переход</span>
    <span><span class="pg"><span class="is-focus">2</span></span></span>
    <span><span class="pg"><span class="dis">‹</span></span></span>
    <span><span class="pg"><span class="on">1</span></span></span>
    <span class="mxrow"></span>

    <span class="rl">Круглая кнопка действия</span>
    <span><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></span>
    <span><span class="acts"><span class="actbtn a-view" style="background:var(--line)">$I_EYE</span><span class="actbtn a-edit" style="background:var(--brand);color:#fff">$I_EDIT</span><span class="actbtn a-del" style="background:var(--error-ink);color:#fff">$I_TRASH</span></span></span>
    <span class="t-tiny fnt">выполнение</span>
    <span><span class="acts"><span class="actbtn a-edit is-focus">$I_EDIT</span></span></span>
    <span><span class="acts"><span class="actbtn a-view is-dis">$I_EYE</span></span></span>
    <span class="t-tiny fnt">подпись — в aria-label</span>
  </div>
EOF
}
cat <<EOF
<div class="board">
  <div>
    <span class="note">— Состояния —</span>
    <h2 style="font-family:var(--font-display);font-size:26px;font-weight:600;margin-top:8px;color:var(--ink)">Наведение, нажатие, фокус и всё остальное</h2>
    <p style="margin-top:8px;font-size:14px;color:var(--muted);max-width:980px">В макете экранов виден только покой, и по нему невозможно сверстать состояния. Здесь каждый интерактивный узел показан во всех шести — в обеих темах. Состояния нарисованы принудительно, потому что <span class="mono">:hover</span> на статичном макете не показать.</p>
  </div>

  <div class="sec">
    <div class="sh">Светлая тема</div>
    <div class="sd">Фокус — двухслойное кольцо: сначала отбивка цветом фона, потом контур акцентом. Так оно читается и на светлой карточке, и на тёмной панели; заливка с прозрачностью 12% на тёмном фоне была не видна вовсе.</div>
$(matrix)
  </div>

  <div class="sec dk" data-theme="dark">
    <div class="sh">Тёмная тема</div>
    <div class="sd">Проверена отдельно, а не выведена из светлой. Каждое состояние здесь берёт свои значения токенов: на тёмном фоне заливка наведения светлее, а не темнее.</div>
$(matrix)
  </div>

  <div class="sec">
    <div class="sh">Правила, которые за этим стоят</div>
    <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:6px">
      <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px">
        <span class="ttl" style="font-size:14px">Фокус не убирается никогда</span>
        <span class="t-lbl mut">Кольцо <span class="mono">--ring-focus-ring</span> обязательно на каждом интерактивном узле. Оно появляется от клавиатуры, а не от мыши: <span class="mono">:focus-visible</span>, не <span class="mono">:focus</span>.</span>
      </div></div>
      <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px">
        <span class="ttl" style="font-size:14px">Нажатие не двигает соседей</span>
        <span class="t-lbl mut">Отклик — <span class="mono">transform: scale(.97)</span>, а не изменение отступов или толщины границы: те сдвигают всё вокруг и дают дрожание.</span>
      </div></div>
      <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px">
        <span class="ttl" style="font-size:14px">Занято — не значит безымянно</span>
        <span class="t-lbl mut">В состоянии отправки содержимое кнопки прячется прозрачностью, а не <span class="mono">visibility</span>: иначе читалка объявляет безымянную «кнопку, занято» в самый дорогой момент (ADR-159).</span>
      </div></div>
      <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px">
        <span class="ttl" style="font-size:14px">Отключено — не только бледнее</span>
        <span class="t-lbl mut">Прозрачность 50% плюс <span class="mono">cursor: not-allowed</span> и <span class="mono">aria-disabled</span>. Рядом — подпись, почему нельзя: «Логин меняет владелец».</span>
      </div></div>
      <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px">
        <span class="ttl" style="font-size:14px">Наведение только там, где есть указатель</span>
        <span class="t-lbl mut">Под <span class="mono">@media (hover: hover)</span>. На сенсорном экране состояние наведения залипает после тапа и выглядит как выбор.</span>
      </div></div>
      <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px">
        <span class="ttl" style="font-size:14px">Переходы 150 мс, и не для всего</span>
        <span class="t-lbl mut">Анимируются цвет, фон, граница и тень. Ширина и высота — нет: они вызывают пересчёт раскладки. При <span class="mono">prefers-reduced-motion</span> переходы выключаются.</span>
      </div></div>
    </div>
  </div>

  <div style="margin-top:56px">
    <span class="note">— Блок данных —</span>
    <h2 style="font-family:var(--font-display);font-size:24px;font-weight:600;margin-top:8px;color:var(--ink)">Загрузка, пусто, ошибка</h2>
    <p style="margin-top:8px;font-size:14px;color:var(--muted);max-width:900px">Состояния самого блока, а не кнопки внутри него. Каждый раздел панели тянет данные с сервера, значит у каждого есть эти три состояния — и ни одно не «потом»: пустой раздел без подсказки читается как поломка, а «Загрузка…» строкой прыгает вёрсткой.</p>
    <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:20px">

      <div class="stack" style="gap:10px">
        <span class="devlab">Загрузка · скелетон</span>
        <div class="card"><div class="hd"><span class="ttl">Заявки</span><span class="sk" style="width:74px;height:28px;border-radius:var(--r-btn)"></span></div>
          <div class="bd" style="padding:0">
            <div class="mrow" style="gap:8px;border-bottom:1px solid var(--line)"><span class="sk" style="width:52%;height:14px"></span><span class="sk" style="width:34%;height:11px"></span></div>
            <div class="mrow" style="gap:8px;border-bottom:1px solid var(--line)"><span class="sk" style="width:64%;height:14px"></span><span class="sk" style="width:28%;height:11px"></span></div>
            <div class="mrow" style="gap:8px"><span class="sk" style="width:44%;height:14px"></span><span class="sk" style="width:38%;height:11px"></span></div>
          </div></div>
        <span class="devcap">Скелетон повторяет будущую раскладку строка в строку и занимает ту же высоту: содержимое приезжает на своё место, а не сдвигает соседей. У контейнера <span class="mono">aria-busy="true"</span>. Спиннер вместо скелетона допустим только там, где высота результата заранее неизвестна.</span>
      </div>

      <div class="stack" style="gap:10px">
        <span class="devlab">Пусто</span>
        <div class="card"><div class="hd"><span class="ttl">Заявки</span></div>
          <div class="bd" style="padding:36px 20px;text-align:center">
            <div style="width:44px;height:44px;margin:0 auto 12px;border-radius:50%;background:var(--accent-bg);display:flex;align-items:center;justify-content:center;color:var(--accent-ink)">$I_LEAD</div>
            <div class="strong" style="font-size:15px;margin-bottom:6px">Заявок пока нет</div>
            <div class="t-lbl mut" style="max-width:280px;margin:0 auto 14px">Они появятся здесь, как только кто-то отправит форму с сайта. Проверьте, что форма открывается и уведомления настроены.</div>
            <span class="btn flat sm">Проверить уведомления</span>
          </div></div>
        <span class="devcap">Пустое состояние всегда объясняет, почему пусто, и даёт следующий шаг. «Ничего не найдено» после фильтра — другой текст и другое действие: «Сбросить фильтры», а не «Проверить уведомления».</span>
      </div>

      <div class="stack" style="gap:10px">
        <span class="devlab">Ошибка</span>
        <div class="card"><div class="hd"><span class="ttl">Заявки</span></div>
          <div class="bd" style="padding:28px 20px;text-align:center">
            <div style="width:44px;height:44px;margin:0 auto 12px;border-radius:50%;background:var(--error-bg);display:flex;align-items:center;justify-content:center;color:var(--error-ink)">$I_WARN</div>
            <div class="strong" style="font-size:15px;margin-bottom:6px">Не удалось загрузить заявки</div>
            <div class="t-lbl mut" style="max-width:290px;margin:0 auto 14px">Сервер не ответил. Заявки при этом не потеряны — они записаны в базу и появятся, как только связь восстановится.</div>
            <div class="row" style="gap:8px;justify-content:center"><span class="btn solid sm">Повторить</span><span class="btn light sm">Обновить страницу</span></div>
          </div></div>
        <span class="devcap">Ошибка говорит, что произошло, что с данными и что делать. Успокоить владельца здесь важнее, чем показать код ответа: «заявки не потеряны» — это то, ради чего он смотрит на экран.</span>
      </div>

    </div>

    <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:24px">
      <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px">
        <span class="ttl" style="font-size:14px">Высота резервируется до данных</span>
        <span class="t-lbl mut">Скелетон занимает столько же, сколько займёт результат. Иначе кнопка под блоком уезжает под пальцем в момент прилёта данных — это <span class="mono">CLS</span>, и он платный.</span>
      </div></div>
      <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px">
        <span class="ttl" style="font-size:14px">Пусто и «не найдено» — разные экраны</span>
        <span class="t-lbl mut">Раздел без записей и фильтр без совпадений выглядят одинаково пустыми, а действия у них противоположные. Один текст на оба случая заводит владельца в тупик.</span>
      </div></div>
      <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px">
        <span class="ttl" style="font-size:14px">Ошибка не съедает страницу целиком</span>
        <span class="t-lbl mut">Падает блок — падает блок. Навигация, шапка и соседние карточки остаются рабочими: владелец должен уйти в другой раздел, а не перезагружать панель.</span>
      </div></div>
    </div>
  </div>
</div>
EOF
