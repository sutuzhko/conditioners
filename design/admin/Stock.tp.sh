. ./_screens.sh
cat <<EOF
  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — таблица с прокруткой внутри контейнера</span>
    <div class="frame"><div class="app rail" style="min-height:920px">
$(rail stock)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Склад" "3 позиции ниже порога" '<span class="btn solid sm">'"$I_PLUS"' Приход</span>')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
            <div class="card" style="border-color:var(--error-line)"><div class="stat" style="padding:14px"><span class="l t-lbl">Ниже порога</span><span class="v"><span class="n" style="font-size:23px;color:var(--error-ink)">3</span></span></div></div>
            <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Подходят к порогу</span><span class="v"><span class="n" style="font-size:23px;color:var(--warn-ink)">5</span></span></div></div>
          </div>
          <div class="tbar"><span class="inp faded md solo" style="flex:1;min-width:0"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Название или группа</span></span></span><span class="btn faded sm">$I_FILT Ниже порога</span></div>
          <div class="card flat" style="overflow:hidden">
            <div style="overflow-x:auto">
              <table class="tbl" style="min-width:840px">
                <thead><tr><th style="width:230px">Позиция</th><th class="rt" style="width:100px">Склад</th><th class="rt" style="width:130px">Пётр К.</th><th class="rt" style="width:130px">Артём М.</th><th class="rt" style="width:130px">Иван С.</th><th class="rt" style="width:100px">Итого</th><th class="rt" style="width:90px">Порог</th></tr></thead>
                <tbody>
                  <tr style="background:var(--error-bg)"><td><div class="strong">Медная труба 1/4″</div><div class="t-tiny mut">метр</div></td><td class="rt mono">4</td><td class="rt mono">6</td><td class="rt mono">2</td><td class="rt mono fnt">0</td><td class="rt"><span class="chip c-danger">12</span></td><td class="rt mono mut">40</td></tr>
                  <tr style="background:var(--error-bg)"><td><div class="strong">Кронштейны 450</div><div class="t-tiny mut">пара</div></td><td class="rt mono">1</td><td class="rt mono">1</td><td class="rt mono fnt">0</td><td class="rt mono fnt">0</td><td class="rt"><span class="chip c-danger">2</span></td><td class="rt mono mut">5</td></tr>
                  <tr style="background:var(--warn-bg)"><td><div class="strong">Фреон R32</div><div class="t-tiny mut">килограмм</div></td><td class="rt mono">5,4</td><td class="rt mono fnt">0</td><td class="rt mono fnt">0</td><td class="rt mono fnt">0</td><td class="rt"><span class="chip c-warn">5,4</span></td><td class="rt mono mut">6</td></tr>
                  <tr><td><div class="strong">Медная труба 3/8″</div><div class="t-tiny mut">метр</div></td><td class="rt mono">85</td><td class="rt mono">14</td><td class="rt mono">10</td><td class="rt mono">6</td><td class="rt"><span class="chip c-success">115</span></td><td class="rt mono mut">40</td></tr>
                  <tr><td><div class="strong">Кабель 4×1,5</div><div class="t-tiny mut">метр</div></td><td class="rt mono">240</td><td class="rt mono">30</td><td class="rt mono">25</td><td class="rt mono">15</td><td class="rt"><span class="chip c-success">310</span></td><td class="rt mono mut">80</td></tr>
                </tbody>
              </table>
            </div>
            <div style="height:6px;background:linear-gradient(90deg,transparent 60%,rgb(15 23 42 / 7%))"></div>
          </div>
          <span class="hint">Прокрутка живёт внутри контейнера таблицы: страница по горизонтали не едет. У правого края — затухание, единственный признак, что колонок больше.</span>
        </div>
      </div>
    </div></div>
    <span class="devcap">Четыре зоны в 696px честно не помещаются. Вместо сжатия до нечитаемого — прокрутка с затуханием и залипающей первой колонкой.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — склад в машине</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BURG" "Склад" '<span class="iconbtn">'"$I_SEARCH"'</span><span class="btn solid sm icon">'"$I_PLUS"'</span>')
      <div class="mbody" style="gap:10px">
        <div class="row" style="gap:8px"><span class="chip c-danger lg">Ниже порога 3</span><span class="chip c-default lg">Все 42</span></div>
        <div class="card" style="border-color:var(--error-line)"><div class="mrow" style="gap:8px">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="strong" style="font-size:15px">Медная труба 1/4″</span><span class="chip c-danger">12 м</span></div>
          <div class="t-tiny mut">Порог 40 м · не хватает 28</div>
          <div class="row" style="gap:6px;flex-wrap:wrap">
            <span class="chip c-default">Склад 4</span><span class="chip c-default">Пётр К. 6</span><span class="chip c-default">Артём М. 2</span><span class="chip c-default">Иван С. 0</span>
          </div>
        </div></div>
        <div class="card" style="border-color:var(--error-line)"><div class="mrow" style="gap:8px">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="strong" style="font-size:15px">Кронштейны 450</span><span class="chip c-danger">2 пары</span></div>
          <div class="t-tiny mut">Порог 5 пар · не хватает 3</div>
          <div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip c-default">Склад 1</span><span class="chip c-default">Пётр К. 1</span></div>
        </div></div>
        <div class="card" style="border-color:var(--warn-line)"><div class="mrow" style="gap:8px">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="strong" style="font-size:15px">Фреон R32</span><span class="chip c-warn">5,4 кг</span></div>
          <div class="t-tiny mut">Порог 6 кг · подходит к порогу</div>
          <div class="row" style="gap:6px"><span class="chip c-default">Склад 5,4</span></div>
        </div></div>
        <div class="card"><div class="mrow" style="gap:8px">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="strong" style="font-size:15px">Медная труба 3/8″</span><span class="chip c-success">115 м</span></div>
          <div class="t-tiny mut">Порог 40 м</div>
        </div></div>
      </div>
      <div class="sticky-act">
        <div class="row" style="gap:8px"><span class="btn bord" style="flex:1">Переместить</span><span class="btn solid" style="flex:1.3">$I_PLUS Списать в наряд</span></div>
        <span class="t-tiny fnt" style="text-align:center">Перетаскивание — ускоритель для мыши; здесь та же операция формой</span>
      </div>
    </div>
    <span class="devcap">Таблица «позиции × зоны» на 390 не живёт. Каждая позиция — карточка: остаток крупно, зоны чипами, «не хватает» словами.</span>
  </div>
