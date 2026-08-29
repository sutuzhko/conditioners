. ./_parts.sh
cat <<EOF

  <!-- ═══ ВЫБОР И ВВОД ═══ -->
  <div class="sec">
    <div class="sh">Выбор, ввод и подсказка</div>
    <div class="sd">Компоненты эталона, которых в нынешней панели нет вовсе: автодополнение, группы выбора, ползунок, числовое поле с шагом, поле даты сегментами, копируемая строка.</div>
    <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;align-items:start">

      <div class="stack" style="gap:14px">
        <div>
          <span class="cap">автодополнение</span>
          <div class="inp bordered foc"><span class="body"><span class="lab">Клиент</span><span class="val">Лапш</span></span><span class="ico">$I_DOWN</span></div>
          <div class="pop" style="margin-top:6px">
            <div class="grp">Найдено 2</div>
            <div class="item on"><span class="ava xs">ДЛ</span><span class="stack" style="gap:0"><span style="color:inherit">Дмитрий Лапшин</span><span class="t-tiny" style="opacity:.75">+7 (910) 155-24-68 · 3 заказа</span></span></div>
            <div class="item"><span class="ava xs">ОЛ</span><span class="stack" style="gap:0"><span>Ольга Лапшина</span><span class="t-tiny fnt">+7 (920) 700-11-02 · 1 заказ</span></span></div>
            <div class="item"><span class="ico" style="color:var(--accent-text)">$I_PLUS</span><span style="color:var(--accent-text)">Завести нового клиента</span></div>
          </div>
        </div>
        <div>
          <span class="cap">числовое поле с шагом</span>
          <div class="inp bordered" style="padding-right:4px"><span class="body"><span class="lab">Длительность, ч</span><span class="val mono">3</span></span>
            <span class="bgrp"><span class="btn bord sm icon">−</span><span class="btn bord sm icon">+</span></span></div>
        </div>
        <div>
          <span class="cap">дата сегментами</span>
          <div class="inp bordered"><span class="body"><span class="lab">Дата монтажа</span><span class="val mono">29.08.2026</span></span><span class="ico">$I_CAL</span></div>
        </div>
      </div>

      <div class="stack" style="gap:14px">
        <div>
          <span class="cap">группа переключателей</span>
          <div class="stack" style="gap:2px">
            <label class="opt"><span class="rdo on"></span><span class="stack" style="gap:0"><span class="txt">Клиент платит компании</span><span class="sub">по счёту или картой</span></span></label>
            <label class="opt"><span class="rdo"></span><span class="stack" style="gap:0"><span class="txt">Наличными монтажнику</span><span class="sub">сумма показывается монтажнику</span></span></label>
          </div>
        </div>
        <div>
          <span class="cap">группа галочек</span>
          <div class="stack" style="gap:2px">
            <label class="opt"><span class="cbx on">$I_CHECK</span><span class="txt">Штробление</span></label>
            <label class="opt"><span class="cbx"></span><span class="txt">Высотные работы</span></label>
            <label class="opt"><span class="cbx ind"><span style="width:9px;height:2px;background:#fff;border-radius:1px"></span></span><span class="txt">Демонтаж старого блока</span></label>
          </div>
        </div>
        <div>
          <span class="cap">ползунок</span>
          <div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="t-lbl mut">Длина трассы</span><span class="mono strong">4,5 м</span></div>
          <div style="position:relative;height:22px">
            <div style="position:absolute;top:9px;left:0;right:0;height:5px;border-radius:99px;background:var(--line)"></div>
            <div style="position:absolute;top:9px;left:0;width:30%;height:5px;border-radius:99px;background:var(--brand)"></div>
            <div style="position:absolute;top:0;left:calc(30% - 11px);width:22px;height:22px;border-radius:50%;background:var(--card);border:2px solid var(--brand);box-shadow:var(--sh-sm)"></div>
          </div>
          <div class="row mono t-tiny fnt" style="justify-content:space-between"><span>3 м</span><span>15 м</span></div>
        </div>
      </div>

      <div class="stack" style="gap:14px">
        <div>
          <span class="cap">копируемая строка и клавиши</span>
          <div class="snip"><span style="flex:1">+7 (910) 155-24-68</span><span class="iconbtn" style="width:24px;height:24px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></span></div>
          <div class="row" style="gap:6px;margin-top:10px"><span class="kbd">⌘</span><span class="kbd">K</span><span class="t-tiny mut">— поиск по панели</span></div>
          <div class="row" style="gap:6px;margin-top:6px"><span class="kbd">N</span><span class="t-tiny mut">— новая запись в календаре</span></div>
        </div>
        <div>
          <span class="cap">подсказка и загрузка</span>
          <div class="row" style="gap:14px;align-items:flex-start">
            <div class="stack" style="gap:6px;align-items:center"><span class="tip">Скрыто от монтажника</span><span class="btn bord icon sm">$I_MORE</span></div>
            <div class="stack" style="gap:6px;align-items:center;padding-top:4px"><span class="spin"></span><span class="t-tiny fnt">спиннер</span></div>
            <div class="stack" style="gap:6px;align-items:center">
              <svg width="40" height="40" viewBox="0 0 44 44"><circle cx="22" cy="22" r="18" fill="none" stroke="var(--line)" stroke-width="5"/><circle cx="22" cy="22" r="18" fill="none" stroke="var(--brand)" stroke-width="5" stroke-linecap="round" stroke-dasharray="113" stroke-dashoffset="34" transform="rotate(-90 22 22)"/></svg>
              <span class="t-tiny fnt">кольцо 70%</span>
            </div>
          </div>
        </div>
        <div>
          <span class="cap">люди</span>
          <div class="row" style="gap:16px;flex-wrap:wrap">
            <span class="avagrp"><span class="ava xs">ПК</span><span class="ava xs" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="ava xs" style="background:var(--ok-bg);color:var(--ok-ink)">ИС</span><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">+2</span></span>
            <span class="usr"><span style="position:relative"><span class="ava">ПК</span><span class="bdg dot" style="background:var(--ok-ink)"></span></span><span class="stack" style="gap:0"><span class="nm">Пётр Кузнецов</span><span class="ds">на смене · 32 ч</span></span></span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ НАЛОЖЕНИЯ ═══ -->
  <div class="sec">
    <div class="sh">Меню, всплывающая карточка, сообщения</div>
    <div class="sd">Меню строки таблицы, карточка записи календаря у самой записи и четыре вида сообщений. Опасное действие отделено линией и окрашено — но подписано словом, не только цветом.</div>
    <div class="grid" style="grid-template-columns:230px 300px minmax(0,1fr);gap:24px;align-items:start">
      <div>
        <span class="cap">меню строки</span>
        <div class="pop">
          <div class="item">$I_ORD Открыть наряд</div>
          <div class="item">$I_CAL Перенести дату <span class="k kbd">D</span></div>
          <div class="item">$I_TEAM Сменить монтажника</div>
          <div class="item">$I_PRICE Печать документов</div>
          <hr class="hr" style="margin:6px 4px">
          <div class="item bad"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13"/></svg> Отменить заказ</div>
        </div>
      </div>
      <div>
        <span class="cap">карточка записи календаря</span>
        <div class="card" style="box-shadow:var(--sh-lg)">
          <div class="hd"><span class="row" style="gap:8px"><span style="width:10px;height:10px;border-radius:3px;background:var(--brand)"></span><span class="ttl" style="font-size:14px">Монтаж 09 инвертор</span></span><span class="iconbtn" style="width:24px;height:24px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m7 7 10 10M17 7 7 17"/></svg></span></div>
          <div class="bd stack" style="gap:8px;padding:12px 14px">
            <span class="row" style="gap:8px"><span class="ico mut">$I_CAL</span><span class="t-lbl">29 августа, 14:00 — 17:00</span></span>
            <span class="row" style="gap:8px"><span class="ico mut">$I_STOCK</span><span class="t-lbl">Тула, Оборонная 12, кв. 34</span></span>
            <span class="row" style="gap:8px"><span class="ava xs">ПК</span><span class="t-lbl">Пётр Кузнецов</span></span>
            <span class="chip c-primary" style="align-self:flex-start"><span class="dot"></span>В работе</span>
          </div>
          <div class="ft row" style="gap:8px"><span class="btn flat sm" style="flex:1">Открыть наряд</span><span class="btn light sm">Править</span></div>
        </div>
      </div>
      <div class="stack" style="gap:10px">
        <span class="cap" style="margin:0">сообщения</span>
        <div class="alert a-primary"><span class="ai">$I_WARN</span><div><div class="at">Заявка ждёт больше суток</div><div class="ad">Обращение № 39 пришло вчера в 11:20 и не взято в работу.</div></div></div>
        <div class="alert a-success"><span class="ai">$I_CHECK</span><div><div class="at">Заказ № 128 сохранён</div><div class="ad">Монтажник получит уведомление в Telegram.</div></div></div>
        <div class="alert a-warn"><span class="ai">$I_WARN</span><div><div class="at">Три позиции ниже порога</div><div class="ad">Медная труба 1/4″, кронштейны 450, фреон R32.</div></div></div>
        <div class="alert a-danger"><span class="ai">$I_WARN</span><div><div class="at">Уведомление не доставлено</div><div class="ad">Telegram ответил 403: бот заблокирован получателем. <b>Повторить</b></div></div></div>
      </div>
    </div>
  </div>

  <!-- ═══ ВКЛАДКИ, СПИСКИ, АККОРДЕОН ═══ -->
  <div class="sec">
    <div class="sh">Вкладки, списки, раскрывашки</div>
    <div class="sd">Три вида вкладок эталона под разные задачи: подчёркивание — для страницы, сегменты — для переключения вида, обведённые сегменты — для фильтра, который держит состояние.</div>
    <div class="grid" style="grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:24px;align-items:start">
      <div class="stack" style="gap:18px">
        <div><span class="cap">подчёркивание — вкладки страницы</span>
          <div class="tabs"><span class="tab on">Наряд</span><span class="tab">Чеклист <span class="chip c-warn" style="height:17px;padding:0 5px;margin-left:4px">4 из 9</span></span><span class="tab">Документы</span><span class="tab">История</span></div></div>
        <div><span class="cap">сегменты — переключение вида</span>
          <div class="row" style="gap:12px"><span class="seg"><span>День</span><span class="on">Неделя</span><span>Месяц</span></span>
          <span class="seg bord"><span class="on">$I_CHECK Активные</span><span>Все</span></span></div></div>
        <div><span class="cap">раскрывашки — длинная форма компании</span>
          <div class="card flat"><div class="bd" style="padding:0 14px">
            <div class="acc"><div class="head"><span class="row" style="gap:10px"><span class="ico mut">$I_COMP</span><span style="font-size:14px;font-weight:600;color:var(--ink)">Контакты и адрес</span></span><span class="chip c-success">заполнено</span></div></div>
            <div class="acc"><div class="head"><span class="row" style="gap:10px"><span class="ico mut">$I_PRICE</span><span style="font-size:14px;font-weight:600;color:var(--ink)">Способы оплаты</span></span><span class="chip c-warn">2 поля пусты</span></div>
              <div class="body">Пока не заполнено — на сайте вместо этих данных стоят заглушки. Публиковать в таком виде нельзя.</div></div>
            <div class="acc" style="border-bottom:0"><div class="head"><span class="row" style="gap:10px"><span class="ico mut">$I_BOOK</span><span style="font-size:14px;font-weight:600;color:var(--ink)">Реквизиты</span></span><span class="chip c-success">заполнено</span></div></div>
          </div></div></div>
      </div>
      <div>
        <span class="cap">список с выбором</span>
        <div class="card flat"><div class="bd" style="padding:6px">
          <div class="item on"><span class="ava xs">ПК</span><span class="stack" style="gap:0"><span>Пётр Кузнецов</span><span class="t-tiny" style="opacity:.75">32 ч на неделе</span></span><span class="k">$I_CHECK</span></div>
          <div class="item"><span class="ava xs" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="stack" style="gap:0"><span>Артём Морозов</span><span class="t-tiny fnt">44 ч · переработка</span></span></div>
          <div class="item"><span class="ava xs" style="background:var(--ok-bg);color:var(--ok-ink)">ИС</span><span class="stack" style="gap:0"><span>Иван Соколов</span><span class="t-tiny fnt">28 ч на неделе</span></span></div>
          <div class="item" style="opacity:.55"><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">ОВ</span><span class="stack" style="gap:0"><span>Олег Волков</span><span class="t-tiny fnt">отпуск до 8 сентября</span></span></div>
        </div></div>
        <span class="cap" style="margin-top:18px">выдвижная панель на телефоне</span>
        <div style="padding:16px 16px 0;border-radius:var(--r-md);background:var(--overlay)">
          <div class="card" style="border-radius:18px 18px 0 0;box-shadow:var(--sh-lg)">
            <div style="display:flex;justify-content:center;padding:8px 0 0"><span style="width:36px;height:4px;border-radius:99px;background:var(--line-ui)"></span></div>
            <div class="hd"><span class="ttl">Фильтры</span><span class="btn light sm">Сбросить</span></div>
            <div class="bd stack" style="gap:10px">
              <label class="opt"><span class="cbx on">$I_CHECK</span><span class="txt">Активные</span></label>
              <label class="opt"><span class="cbx"></span><span class="txt">Новые</span></label>
              <label class="opt"><span class="cbx on">$I_CHECK</span><span class="txt">Этот месяц</span></label>
            </div>
            <div class="ft"><span class="btn solid" style="width:100%;height:44px">Показать 7 заказов</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
EOF
