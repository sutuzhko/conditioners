. ./_tabs.sh
T="Активные 7|Новые 2|История|Отказы|Все 24"
head3() { printf '<div class="col"><span class="devlab">%s</span>' "$1"; }
cat <<EOF

  <!-- 3. ИСТОРИЯ -->
  <div class="tsec">
$(tsec "Вкладка 3" "История" "Закрытые заказы. Появляются две колонки, которых нет нигде больше: маржа (её нет у активного заказа — материалы ещё не списаны) и отзыв (он приходит после закрытия). Сверху — итог за период.")
    <div class="row3">
$(head3 1440)
        <div class="frame dk">
$(trow "$T" 3)
          <div class="bd20">
            <div class="tbar" style="margin-bottom:12px">
              <div class="row" style="gap:8px"><span class="btn faded sm">$I_CAL Период</span><span class="chip c-primary lg">Август <span class="x">×</span></span></div>
              <div class="row" style="gap:16px"><span class="t-lbl mut">Закрыто <b class="ink mono">18</b></span><span class="t-lbl mut">Выручка <b class="ink mono">612 тыс ₽</b></span><span class="t-lbl mut">Маржа <b class="mono" style="color:var(--ok-ink)">471 тыс ₽ · 77%</b></span></div>
            </div>
            <div class="card"><div class="bd" style="padding:0"><table class="tbl">
              <thead><tr><th style="width:76px">Номер</th><th>Клиент</th><th style="width:150px">Монтажник</th><th style="width:110px">Закрыт</th><th class="rt" style="width:106px">Сумма</th><th class="rt" style="width:110px">Маржа</th><th style="width:130px">Отзыв</th></tr></thead>
              <tbody>
                <tr><td class="mono strong">№ 123</td><td><div class="strong">Ольга Лапшина</div><div class="t-tiny mut clip">Первомайская 3, кв. 78</div></td><td><span class="usr"><span class="ava xs">ПК</span><span class="nm" style="font-size:13px">Пётр К.</span></span></td><td class="mono t-lbl">24 авг</td><td class="rt mono strong">31 900 ₽</td><td class="rt mono" style="color:var(--ok-ink)">24 100 ₽</td><td><span class="chip c-success">5 звёзд</span></td></tr>
                <tr><td class="mono strong">№ 119</td><td><div class="strong">Николай</div><div class="t-tiny mut clip">Новомосковск, Мира 7</div></td><td><span class="usr"><span class="ava xs" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="nm" style="font-size:13px">Артём М.</span></span></td><td class="mono t-lbl">21 авг</td><td class="rt mono strong">27 400 ₽</td><td class="rt mono" style="color:var(--ok-ink)">19 800 ₽</td><td><span class="chip c-warn">3 звезды</span></td></tr>
                <tr><td class="mono strong">№ 118</td><td><div class="strong">ООО «Тулаторг»</div><div class="t-tiny mut clip">пр. Ленина 108, офис 312</div></td><td><span class="usr"><span class="ava xs" style="background:var(--ok-bg);color:var(--ok-ink)">ИС</span><span class="nm" style="font-size:13px">Иван С.</span></span></td><td class="mono t-lbl">19 авг</td><td class="rt mono strong">8 400 ₽</td><td class="rt mono" style="color:var(--ok-ink)">5 900 ₽</td><td class="mut t-lbl">нет</td></tr>
              </tbody></table></div></div>
          </div>
        </div></div>
$(head3 768)
        <div class="frame tb">
$(trow "$T" 3 sm)
          <div class="bd16">
            <div class="row" style="gap:14px;margin-bottom:10px;flex-wrap:wrap"><span class="t-lbl mut">Закрыто <b class="ink mono">18</b></span><span class="t-lbl mut">Выручка <b class="ink mono">612 тыс ₽</b></span><span class="t-lbl mut">Маржа <b class="mono" style="color:var(--ok-ink)">77%</b></span></div>
            <div class="card"><div class="bd" style="padding:0"><table class="tbl">
              <thead><tr><th style="width:70px">Номер</th><th>Клиент</th><th class="rt" style="width:100px">Сумма</th><th class="rt" style="width:96px">Маржа</th><th style="width:100px">Отзыв</th></tr></thead>
              <tbody>
                <tr><td class="mono strong">№ 123</td><td><div class="strong">Ольга Лапшина</div><div class="t-tiny mut">24 авг · Пётр К.</div></td><td class="rt mono strong">31 900 ₽</td><td class="rt mono" style="color:var(--ok-ink)">24 100 ₽</td><td><span class="chip c-success">5★</span></td></tr>
                <tr><td class="mono strong">№ 119</td><td><div class="strong">Николай</div><div class="t-tiny mut">21 авг · Артём М.</div></td><td class="rt mono strong">27 400 ₽</td><td class="rt mono" style="color:var(--ok-ink)">19 800 ₽</td><td><span class="chip c-warn">3★</span></td></tr>
              </tbody></table></div></div>
          </div>
        </div></div>
$(head3 390)
        <div class="frame ph" style="min-height:660px">
          <div class="mbar"><span class="row" style="gap:10px"><span class="iconbtn"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span><span class="mtitle">Заказы</span></span><span class="iconbtn">$I_SEARCH</span></div>
$(trow "$T" 3 xs)
          <div class="mbody">
            <div class="card"><div class="bd row" style="justify-content:space-between;padding:12px 14px"><span class="stack" style="gap:0"><span class="t-tiny mut">Закрыто за август</span><span class="num" style="font-size:18px">18</span></span><span class="stack" style="gap:0;text-align:right"><span class="t-tiny mut">Маржа</span><span class="num" style="font-size:18px;color:var(--ok-ink)">77%</span></span></div></div>
            <div class="card"><div class="mrow"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 123</span><span class="chip c-success">5 звёзд</span></div><span class="strong">Ольга Лапшина</span><span class="t-tiny mut">24 августа · Пётр К.</span><hr class="hr"><div class="row" style="justify-content:space-between"><span class="t-lbl mut">Сумма</span><span class="mono strong">31 900 ₽</span></div><div class="row" style="justify-content:space-between"><span class="t-lbl mut">Маржа</span><span class="mono strong" style="color:var(--ok-ink)">24 100 ₽</span></div></div></div>
            <div class="card"><div class="mrow"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 119</span><span class="chip c-warn">3 звезды</span></div><span class="strong">Николай</span><span class="t-tiny mut">21 августа · Артём М.</span><hr class="hr"><div class="row" style="justify-content:space-between"><span class="t-lbl mut">Сумма</span><span class="mono strong">27 400 ₽</span></div><div class="row" style="justify-content:space-between"><span class="t-lbl mut">Маржа</span><span class="mono strong" style="color:var(--ok-ink)">19 800 ₽</span></div></div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">768 — монтажник и дата уходят в подпись, оценка сокращается до «5★». 390 — итог периода отдельной карточкой сверху, дальше карточки заказов с суммой и маржой.</span>
  </div>

  <!-- 4. ОТКАЗЫ -->
  <div class="tsec">
$(tsec "Вкладка 4" "Отказы" "Причина обязательна: без неё раздел превращается в свалку, из которой не сделать выводов о воронке. Возврат в работу возможен — отказ не удаляет заказ.")
    <div class="row3">
$(head3 1440)
        <div class="frame dk">
$(trow "$T" 4)
          <div class="bd20"><div class="card"><div class="bd" style="padding:0"><table class="tbl">
            <thead><tr><th style="width:76px">Номер</th><th style="width:200px">Клиент</th><th style="width:110px">Отказ</th><th>Причина</th><th style="width:150px">Действие</th></tr></thead>
            <tbody>
              <tr><td class="mono strong">№ 117</td><td class="strong">Без имени</td><td class="mono t-lbl">18 авг</td><td class="t-lbl">Нашёл дешевле, отказался на этапе замера</td><td><span class="btn light sm">Вернуть в работу</span></td></tr>
              <tr><td class="mono strong">№ 112</td><td class="strong">Сергей Панин</td><td class="mono t-lbl">9 авг</td><td class="t-lbl">Не выходит на связь третий раз</td><td><span class="btn light sm">Вернуть в работу</span></td></tr>
              <tr><td class="mono strong">№ 104</td><td class="strong">Ирина Котова</td><td class="mono t-lbl">2 авг</td><td class="t-lbl">Перенесла на весну, просила напомнить в марте</td><td><span class="btn light sm">Вернуть в работу</span></td></tr>
            </tbody></table></div></div></div>
        </div></div>
$(head3 768)
        <div class="frame tb">
$(trow "$T" 4 sm)
          <div class="bd16"><div class="card"><div class="bd" style="padding:0"><table class="tbl">
            <thead><tr><th style="width:70px">Номер</th><th>Клиент и причина</th><th style="width:130px">Действие</th></tr></thead>
            <tbody>
              <tr><td class="mono strong">№ 117</td><td><div class="strong">Без имени · 18 авг</div><div class="t-tiny mut">Нашёл дешевле, отказался на этапе замера</div></td><td><span class="btn light sm">Вернуть</span></td></tr>
              <tr><td class="mono strong">№ 112</td><td><div class="strong">Сергей Панин · 9 авг</div><div class="t-tiny mut">Не выходит на связь третий раз</div></td><td><span class="btn light sm">Вернуть</span></td></tr>
            </tbody></table></div></div></div>
        </div></div>
$(head3 390)
        <div class="frame ph" style="min-height:660px">
          <div class="mbar"><span class="row" style="gap:10px"><span class="iconbtn"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span><span class="mtitle">Заказы</span></span></div>
$(trow "$T" 4 xs)
          <div class="mbody">
            <div class="card"><div class="mrow"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 117</span><span class="chip c-danger"><span class="dot"></span>Отказ</span></div><span class="strong">Без имени</span><span class="t-tiny mut">18 августа</span><span class="t-lbl">Нашёл дешевле, отказался на этапе замера</span><span class="btn light" style="width:100%">Вернуть в работу</span></div></div>
            <div class="card"><div class="mrow"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 112</span><span class="chip c-danger"><span class="dot"></span>Отказ</span></div><span class="strong">Сергей Панин</span><span class="t-tiny mut">9 августа</span><span class="t-lbl">Не выходит на связь третий раз</span><span class="btn light" style="width:100%">Вернуть в работу</span></div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">768 — дата уходит в строку с именем, причина под ней. 390 — причина полностью, без обрезки: ради неё вкладку и открывают.</span>
  </div>

  <!-- 5. ВСЕ -->
  <div class="tsec">
$(tsec "Вкладка 5" "Все" "Один список без фильтра по статусу — для поиска. Колонка статуса становится главной, сортировка по умолчанию по дате, поиск раскрыт.")
    <div class="row3">
$(head3 1440)
        <div class="frame dk">
$(trow "$T" 5)
          <div class="bd20">
            <div class="tbar" style="margin-bottom:12px">
              <span class="inp faded md solo" style="width:340px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Номер, клиент, адрес, модель</span></span></span>
              <div class="row" style="gap:8px"><span class="btn faded sm">$I_FILT Статус</span><span class="btn faded sm">$I_SORT По дате</span><span class="btn faded sm">$I_COLS Колонки</span></div>
            </div>
            <div class="card"><div class="bd" style="padding:0"><table class="tbl">
              <thead><tr><th style="width:76px">Номер</th><th>Клиент и объект</th><th style="width:110px">Тип</th><th style="width:120px">Когда</th><th style="width:132px">Статус</th><th class="rt" style="width:110px">Сумма</th></tr></thead>
              <tbody>
                <tr><td class="mono strong">№ 129</td><td class="strong">Максим Ильин</td><td><span class="chip c-default">Замер</span></td><td class="mono t-lbl">30 авг</td><td><span class="chip c-default"><span class="dot"></span>Новый</span></td><td class="rt mut">—</td></tr>
                <tr><td class="mono strong">№ 128</td><td class="strong">Дмитрий Лапшин</td><td><span class="chip c-default">Монтаж</span></td><td class="mono t-lbl">29 авг</td><td><span class="chip c-primary"><span class="dot"></span>В работе</span></td><td class="rt mono strong">34 900 ₽</td></tr>
                <tr><td class="mono strong">№ 125</td><td class="strong">Владислав Гринёв</td><td><span class="chip c-default">Ремонт</span></td><td class="mono t-lbl">31 авг</td><td><span class="chip c-danger"><span class="dot"></span>Просрочен</span></td><td class="rt mono strong">12 000 ₽</td></tr>
                <tr><td class="mono strong">№ 123</td><td class="strong">Ольга Лапшина</td><td><span class="chip c-default">Монтаж</span></td><td class="mono t-lbl">24 авг</td><td><span class="chip c-success"><span class="dot"></span>Выполнен</span></td><td class="rt mono strong">31 900 ₽</td></tr>
                <tr><td class="mono strong">№ 117</td><td class="strong">Без имени</td><td><span class="chip c-default">Монтаж</span></td><td class="mono t-lbl">18 авг</td><td><span class="chip c-danger"><span class="dot"></span>Отказ</span></td><td class="rt mut">—</td></tr>
              </tbody></table></div>
              <div class="pager" style="border-top:1px solid var(--line)"><span class="t-lbl mut">5 из 24</span><span class="pg"><span class="dis">‹</span><span class="on">1</span><span>2</span><span>3</span><span>›</span></span></div>
            </div>
          </div>
        </div></div>
$(head3 768)
        <div class="frame tb">
$(trow "$T" 5 sm)
          <div class="bd16">
            <div class="tbar" style="margin-bottom:10px"><span class="inp faded md solo" style="flex:1;min-width:0"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Номер, клиент, адрес</span></span></span><span class="btn faded sm">$I_FILT Статус</span></div>
            <div class="card"><div class="bd" style="padding:0"><table class="tbl">
              <thead><tr><th style="width:70px">Номер</th><th>Клиент</th><th style="width:100px">Когда</th><th style="width:126px">Статус</th></tr></thead>
              <tbody>
                <tr><td class="mono strong">№ 129</td><td><div class="strong">Максим Ильин</div><div class="t-tiny mut">Замер</div></td><td class="mono t-lbl">30 авг</td><td><span class="chip c-default"><span class="dot"></span>Новый</span></td></tr>
                <tr><td class="mono strong">№ 128</td><td><div class="strong">Дмитрий Лапшин</div><div class="t-tiny mut">Монтаж · 34 900 ₽</div></td><td class="mono t-lbl">29 авг</td><td><span class="chip c-primary"><span class="dot"></span>В работе</span></td></tr>
                <tr><td class="mono strong">№ 123</td><td><div class="strong">Ольга Лапшина</div><div class="t-tiny mut">Монтаж · 31 900 ₽</div></td><td class="mono t-lbl">24 авг</td><td><span class="chip c-success"><span class="dot"></span>Выполнен</span></td></tr>
              </tbody></table></div></div>
          </div>
        </div></div>
$(head3 390)
        <div class="frame ph" style="min-height:660px">
          <div class="mbar"><span class="row" style="gap:10px"><span class="iconbtn"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span><span class="mtitle">Заказы</span></span></div>
$(trow "$T" 5 xs)
          <div class="mbody">
            <span class="inp faded md solo" style="width:100%"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Номер, клиент, адрес, модель</span></span></span>
            <div class="card"><div class="bd" style="padding:0">
              <div class="mrow" style="gap:5px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 129</span><span class="chip c-default"><span class="dot"></span>Новый</span></div><span class="t-lbl">Максим Ильин · Замер</span><span class="t-tiny fnt mono">30 августа</span></div>
              <div class="mrow" style="gap:5px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 128</span><span class="chip c-primary"><span class="dot"></span>В работе</span></div><span class="t-lbl">Дмитрий Лапшин · 34 900 ₽</span><span class="t-tiny fnt mono">29 августа</span></div>
              <div class="mrow" style="gap:5px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 125</span><span class="chip c-danger"><span class="dot"></span>Просрочен</span></div><span class="t-lbl">Владислав Гринёв · 12 000 ₽</span><span class="t-tiny fnt mono">31 августа</span></div>
              <div class="mrow" style="gap:5px"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 123</span><span class="chip c-success"><span class="dot"></span>Выполнен</span></div><span class="t-lbl">Ольга Лапшина · 31 900 ₽</span><span class="t-tiny fnt mono">24 августа</span></div>
            </div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">На «Все» поиск главнее фильтров и занимает первое место на всех ширинах. 390 — плотный список строками, а не карточками: сюда приходят искать, а не читать.</span>
  </div>
</div>
EOF
