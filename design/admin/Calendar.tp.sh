. ./_screens.sh
cat <<EOF
  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — три дня вместо недели</span>
    <div class="frame"><div class="app rail" style="min-height:920px">
$(rail crm)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "29–31 августа" "Календарь работ · рабочее окно 09–19" '<span class="btn solid sm">'"$I_PLUS"' Запись</span>')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="row" style="gap:10px">
            <span class="row" style="gap:2px"><span class="iconbtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span><span class="iconbtn">$I_CHEV</span></span>
            <span class="btn bord sm">Сегодня</span>
            <span class="seg" style="margin-left:auto"><span>День</span><span class="on">3 дня</span><span>Месяц</span></span>
          </div>
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <span class="chip c-primary lg"><span class="dot"></span>Пётр К. 32 ч</span>
            <span class="chip c-info lg"><span class="dot"></span>Артём М. 44 ч</span>
            <span class="chip c-success lg"><span class="dot"></span>Иван С. 28 ч</span>
            <span class="chip c-default lg">Олег В. — отпуск</span>
          </div>
          <div class="card flat" style="overflow:hidden">
            <div class="dayhd" style="grid-template-columns:48px repeat(3,minmax(0,1fr))">
              <div></div>
              <div class="dh today"><div class="dw">пт</div><div class="dn">29</div></div>
              <div class="dh"><div class="dw">сб</div><div class="dn">30</div></div>
              <div class="dh"><div class="dw">вс</div><div class="dn">31</div></div>
            </div>
            <div class="allday" style="grid-template-columns:48px repeat(3,minmax(0,1fr))">
              <div class="glab">весь<br>день</div>
              <div class="cell"><span class="chip c-warn" style="width:100%;justify-content:flex-start">Заявка № 41</span></div>
              <div class="cell" style="grid-column:span 2"><span class="chip c-default" style="width:100%;justify-content:flex-start">Олег В. — отпуск</span></div>
            </div>
            <div class="hours" style="height:520px;grid-template-columns:48px repeat(3,minmax(0,1fr))">
              <div class="hgut">
                <i style="top:0">08</i><i style="top:52px">09</i><i style="top:104px">10</i><i style="top:156px">11</i><i style="top:208px">12</i>
                <i style="top:260px">13</i><i style="top:312px">14</i><i style="top:364px">15</i><i style="top:416px">16</i><i style="top:468px">17</i>
              </div>
              <div class="hcol" style="background:var(--stripe-b)">
                <div class="ev" style="top:312px;height:150px;background:var(--accent-bg);border-left-color:var(--brand);color:var(--on-accent)"><b>Монтаж 09 инвертор</b><span class="t">14:00 · Пётр К.</span></div>
                <div class="ev" style="top:494px;height:26px;background:var(--info-bg);border-left-color:var(--info-ink);color:var(--info-ink)"><b>ТО и чистка</b></div>
              </div>
              <div class="hcol">
                <div class="ev" style="top:104px;height:150px;background:var(--ok-bg);border-left-color:var(--ok-ink);color:var(--ok-ink)"><b>Монтаж 07</b><span class="t">10:00 · Иван С.</span></div>
              </div>
              <div class="hcol"></div>
              <div class="now" style="top:364px;left:48px"></div>
            </div>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Семь колонок по 88px не читаются. Неделя становится тремя днями — прокруткой вбок листаются остальные; вид «неделя» остаётся, но перестаёт быть умолчанием.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — повестка вместо сетки</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BURG" "Календарь" '<span class="iconbtn">'"$I_SEARCH"'</span><span class="btn solid sm icon">'"$I_PLUS"'</span>')
      <div style="padding:10px 14px;background:var(--card);border-bottom:1px solid var(--line);display:flex;gap:8px;align-items:center">
        <span class="seg" style="flex:1"><span class="on" style="flex:1;justify-content:center">Повестка</span><span style="flex:1;justify-content:center">День</span><span style="flex:1;justify-content:center">Месяц</span></span>
      </div>
      <div class="mbody" style="gap:12px">
        <div class="row" style="gap:8px"><span class="chip c-primary lg">Пётр К.</span><span class="chip c-info lg">Артём М.</span><span class="chip c-success lg">Иван С.</span></div>
        <div class="stack" style="gap:8px">
          <span class="cap" style="margin:0">Пятница, 29 августа · сегодня</span>
          <div class="card" style="border-left:3px solid var(--brand)"><div class="mrow" style="gap:6px">
            <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong">14:00 — 17:00</span><span class="chip c-primary"><span class="dot"></span>В работе</span></div>
            <span class="strong" style="font-size:15px">Монтаж 09 инвертор</span>
            <span class="t-tiny mut">Тула, Оборонная 12, кв. 34 · Пётр К.</span>
          </div></div>
          <div class="card" style="border-left:3px solid var(--info-ink)"><div class="mrow" style="gap:6px">
            <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong">17:30 — 18:30</span><span class="chip c-warn"><span class="dot"></span>Назначен</span></div>
            <span class="strong" style="font-size:15px">ТО и чистка</span>
            <span class="t-tiny mut">Тула, пр. Ленина 108, офис 312 · Артём М.</span>
          </div></div>
          <div class="card" style="border-left:3px solid var(--warn-ink)"><div class="mrow" style="gap:6px">
            <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong t-lbl">весь день</span><span class="chip c-warn"><span class="dot"></span>Новая</span></div>
            <span class="strong" style="font-size:15px">Заявка № 41 — замер</span>
            <span class="t-tiny mut">Щёкино, Пионерская 4 · время не назначено</span>
          </div></div>
        </div>
        <div class="stack" style="gap:8px">
          <span class="cap" style="margin:0">Суббота, 30 августа</span>
          <div class="card" style="border-left:3px solid var(--ok-ink)"><div class="mrow" style="gap:6px">
            <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong">10:00 — 13:00</span><span class="chip c-warn"><span class="dot"></span>Назначен</span></div>
            <span class="strong" style="font-size:15px">Монтаж 07</span>
            <span class="t-tiny mut">Новомосковск, Мира 7 · Иван С.</span>
          </div></div>
        </div>
      </div>
$(otab cal)
    </div>
    <span class="devcap">Часовая сетка на 390 бессмысленна: колонка дня 340px, а запись на час — 52px высоты. Повестка отвечает на тот же вопрос списком, и цвет слоя остаётся полосой слева.</span>
  </div>
