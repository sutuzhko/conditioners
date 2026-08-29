. ./_screens.sh
cat <<EOF
<div class="board touch">

  <!-- ══════ 1440 ══════ -->
  <div class="col">
    <span class="devlab">1440 · десктоп — таблица со всеми колонками</span>
    <div class="page" style="padding:0">
      <div class="app" style="width:1440px;min-height:940px">
$(aside orders)
        <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Заказы" "24 всего · 7 активных · 2 просрочены" '<span class="btn solid">'"$I_PLUS"' Новый заказ</span>')
          <div class="main">
            <div class="tabs"><span class="tab on">Активные <span class="chip c-default" style="height:18px;padding:0 6px;margin-left:5px">7</span></span><span class="tab">Новые <span class="chip c-default" style="height:18px;padding:0 6px;margin-left:5px">2</span></span><span class="tab">История</span><span class="tab">Отказы</span><span class="tab">Все</span></div>
            <div class="tbar">
              <div class="row" style="gap:8px">
                <span class="btn faded sm">$I_FILT Фильтр <span class="chip c-primary" style="height:17px;padding:0 5px">2</span></span>
                <span class="btn faded sm">$I_SORT Сортировка</span>
                <span class="btn faded sm">$I_COLS Колонки</span>
                <span class="chip c-primary lg">Этот месяц <span class="x">×</span></span>
                <span class="chip c-primary lg">Пётр К. <span class="x">×</span></span>
              </div>
              <span class="inp faded md solo" style="width:280px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Номер, клиент, адрес, модель</span></span></span>
            </div>
            <div class="card flat" style="overflow:hidden">
              <table class="tbl">
                <thead><tr>
                  <th style="width:40px"><span class="cbx"></span></th>
                  <th style="width:80px">Номер</th><th style="width:110px">Тип</th><th>Клиент и объект</th>
                  <th style="width:180px">Монтажник</th><th style="width:126px">Когда</th>
                  <th style="width:132px">Статус</th><th class="rt" style="width:116px">Сумма</th><th style="width:126px">Действия</th>
                </tr></thead>
                <tbody>
                  <tr><td><span class="cbx on">$I_CHECK</span></td><td class="mono strong">№ 128</td><td><span class="chip c-default">Монтаж</span></td>
                    <td><div class="strong">Дмитрий Лапшин</div><div class="t-tiny mut clip">Тула, Оборонная 12, кв. 34</div></td>
                    <td><span class="usr"><span class="ava xs">ПК</span><span class="nm" style="font-size:13px">Пётр Кузнецов</span></span></td>
                    <td class="mono t-lbl">29 авг<br><span class="t-tiny fnt">14:00</span></td>
                    <td><span class="chip c-primary"><span class="dot"></span>В работе</span></td>
                    <td class="rt mono strong">34 900 ₽</td>
                    <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                  <tr><td><span class="cbx"></span></td><td class="mono strong">№ 127</td><td><span class="chip c-default">ТО</span></td>
                    <td><div class="strong">ООО «Тулаторг»</div><div class="t-tiny mut clip">Тула, пр. Ленина 108, офис 312</div></td>
                    <td><span class="usr"><span class="ava xs" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="nm" style="font-size:13px">Артём Морозов</span></span></td>
                    <td class="mono t-lbl">29 авг<br><span class="t-tiny fnt">17:30</span></td>
                    <td><span class="chip c-warn"><span class="dot"></span>Назначен</span></td>
                    <td class="rt mono strong">8 400 ₽</td>
                    <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                  <tr><td><span class="cbx"></span></td><td class="mono strong">№ 126</td><td><span class="chip c-default">Монтаж</span></td>
                    <td><div class="strong">Алла Викторовна</div><div class="t-tiny mut clip">Щёкино, Пионерская 4 · высотные работы</div></td>
                    <td><span class="mut t-lbl">не назначен</span></td>
                    <td class="mono t-lbl">30 авг<br><span class="t-tiny fnt">10:00</span></td>
                    <td><span class="chip c-default"><span class="dot"></span>Новый</span></td>
                    <td class="rt mono strong">52 300 ₽</td>
                    <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                  <tr><td><span class="cbx"></span></td><td class="mono strong">№ 125</td><td><span class="chip c-default">Ремонт</span></td>
                    <td><div class="strong">Владислав Гринёв</div><div class="t-tiny mut clip">Тула, Металлургов 22, кв. 108</div></td>
                    <td><span class="usr"><span class="ava xs" style="background:var(--ok-bg);color:var(--ok-ink)">ИС</span><span class="nm" style="font-size:13px">Иван Соколов</span></span></td>
                    <td class="mono t-lbl" style="color:var(--error-ink)">31 авг<br><span class="t-tiny">09:00</span></td>
                    <td><span class="chip c-danger"><span class="dot"></span>Просрочен</span></td>
                    <td class="rt mono strong">12 000 ₽</td>
                    <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                  <tr><td><span class="cbx"></span></td><td class="mono strong">№ 124</td><td><span class="chip c-default">Монтаж</span></td>
                    <td><div class="strong">Николай</div><div class="t-tiny mut clip">Новомосковск, Мира 7, кв. 12</div></td>
                    <td><span class="usr"><span class="ava xs" style="background:var(--ok-bg);color:var(--ok-ink)">ИС</span><span class="nm" style="font-size:13px">Иван Соколов</span></span></td>
                    <td class="mono t-lbl">2 сен<br><span class="t-tiny fnt">11:00</span></td>
                    <td><span class="chip c-warn"><span class="dot"></span>Назначен</span></td>
                    <td class="rt mono strong">27 400 ₽</td>
                    <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                  <tr><td><span class="cbx"></span></td><td class="mono strong">№ 123</td><td><span class="chip c-default">Монтаж</span></td>
                    <td><div class="strong">Ольга Лапшина</div><div class="t-tiny mut clip">Тула, Первомайская 3, кв. 78</div></td>
                    <td><span class="usr"><span class="ava xs">ПК</span><span class="nm" style="font-size:13px">Пётр Кузнецов</span></span></td>
                    <td class="mono t-lbl">24 авг<br><span class="t-tiny fnt">13:00</span></td>
                    <td><span class="chip c-success"><span class="dot"></span>Выполнен</span></td>
                    <td class="rt mono strong">31 900 ₽</td>
                    <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                </tbody>
              </table>
              <div class="pager" style="border-top:1px solid var(--line)">
                <span class="t-lbl mut">Выбран 1 из 24</span>
                <span class="pg"><span class="dis">‹</span><span class="on">1</span><span>2</span><span>3</span><span>4</span><span>›</span></span>
                <span class="row t-lbl mut" style="gap:8px">Строк на странице <span class="btn bord sm">8 $I_DOWN</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <span class="devcap">Выбор строк включён — над таблицей появляется групповое действие. Применённые фильтры остаются чипами: иначе непонятно, почему заказов шесть вместо двадцати четырёх.</span>
  </div>

  <!-- ══════ 768 ══════ -->
  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — колонка значков, четыре колонки таблицы</span>
    <div class="frame tb">
      <div class="app rail" style="min-height:940px">
$(rail orders)
        <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Заказы" "24 всего · 7 активных" '<span class="btn solid sm">'"$I_PLUS"' Заказ</span>')
          <div class="main" style="padding:14px 18px 18px;gap:12px">
            <div class="tabs" style="gap:16px"><span class="tab on">Активные</span><span class="tab">Новые</span><span class="tab">История</span><span class="tab">Все</span></div>
            <div class="tbar">
              <span class="inp faded md solo" style="flex:1;min-width:0"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Номер, клиент, адрес</span></span></span>
              <span class="btn faded sm">$I_FILT Фильтр <span class="chip c-primary" style="height:17px;padding:0 5px">2</span></span>
            </div>
            <div class="card flat" style="overflow:hidden">
              <table class="tbl">
                <thead><tr><th style="width:74px">Номер</th><th>Клиент и объект</th><th style="width:104px">Когда</th><th style="width:124px">Статус</th></tr></thead>
                <tbody>
                  <tr><td class="mono strong">№ 128</td><td><div class="strong">Дмитрий Лапшин</div><div class="t-tiny mut clip">Оборонная 12, кв. 34 · Пётр К.</div></td><td class="mono t-lbl">29 авг<br><span class="t-tiny fnt">14:00</span></td><td><span class="chip c-primary"><span class="dot"></span>В работе</span></td></tr>
                  <tr><td class="mono strong">№ 127</td><td><div class="strong">ООО «Тулаторг»</div><div class="t-tiny mut clip">пр. Ленина 108 · Артём М.</div></td><td class="mono t-lbl">29 авг<br><span class="t-tiny fnt">17:30</span></td><td><span class="chip c-warn"><span class="dot"></span>Назначен</span></td></tr>
                  <tr><td class="mono strong">№ 126</td><td><div class="strong">Алла Викторовна</div><div class="t-tiny mut clip">Щёкино, Пионерская 4</div></td><td class="mono t-lbl">30 авг<br><span class="t-tiny fnt">10:00</span></td><td><span class="chip c-default"><span class="dot"></span>Новый</span></td></tr>
                  <tr><td class="mono strong">№ 125</td><td><div class="strong">Владислав Гринёв</div><div class="t-tiny mut clip">Металлургов 22 · Иван С.</div></td><td class="mono t-lbl" style="color:var(--error-ink)">31 авг<br><span class="t-tiny">09:00</span></td><td><span class="chip c-danger"><span class="dot"></span>Просрочен</span></td></tr>
                  <tr><td class="mono strong">№ 124</td><td><div class="strong">Николай</div><div class="t-tiny mut clip">Новомосковск, Мира 7 · Иван С.</div></td><td class="mono t-lbl">2 сен<br><span class="t-tiny fnt">11:00</span></td><td><span class="chip c-warn"><span class="dot"></span>Назначен</span></td></tr>
                </tbody>
              </table>
              <div class="pager" style="border-top:1px solid var(--line)">
                <span class="t-lbl mut">5 из 24</span>
                <span class="pg"><span class="dis">‹</span><span class="on">1</span><span>2</span><span>3</span><span>›</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <span class="devcap">Сумма и действия строки уезжают в карточку заказа: колонка, сжатая до нечитаемого, хуже отсутствующей. Колонка разделов — полоса значков 72px, содержимому остаётся 696.</span>
  </div>

  <!-- ══════ 390 ══════ -->
  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — таблица становится списком карточек</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BURG" "Заказы" '<span class="iconbtn">'"$I_SEARCH"'</span><span class="btn solid sm icon">'"$I_PLUS"'</span>')
      <div style="padding:0 14px;background:var(--card);border-bottom:1px solid var(--line)">
        <div class="tabs" style="gap:18px;border:0"><span class="tab on">Активные</span><span class="tab">Новые</span><span class="tab">История</span></div>
      </div>
      <div class="mbody" style="gap:10px">
        <div class="row" style="gap:8px">
          <span class="btn faded sm">$I_FILT Фильтр <span class="chip c-primary" style="height:17px;padding:0 5px">2</span></span>
          <span class="chip c-primary lg">Этот месяц <span class="x">×</span></span>
        </div>
        <div class="card"><div class="mrow">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong">№ 128</span><span class="chip c-primary"><span class="dot"></span>В работе</span></div>
          <div class="strong" style="font-size:15px">Дмитрий Лапшин</div>
          <div class="t-tiny mut">Тула, Оборонная 12, кв. 34</div>
          <hr class="hr">
          <div class="row" style="justify-content:space-between;gap:10px">
            <span class="usr"><span class="ava xs">ПК</span><span class="t-tiny">Пётр К.</span></span>
            <span class="mono t-lbl mut">29 авг, 14:00</span>
            <span class="mono strong">34 900 ₽</span>
          </div>
        </div></div>
        <div class="card"><div class="mrow">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong">№ 127</span><span class="chip c-warn"><span class="dot"></span>Назначен</span></div>
          <div class="strong" style="font-size:15px">ООО «Тулаторг»</div>
          <div class="t-tiny mut">Тула, пр. Ленина 108, офис 312</div>
          <hr class="hr">
          <div class="row" style="justify-content:space-between;gap:10px">
            <span class="usr"><span class="ava xs" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="t-tiny">Артём М.</span></span>
            <span class="mono t-lbl mut">29 авг, 17:30</span>
            <span class="mono strong">8 400 ₽</span>
          </div>
        </div></div>
        <div class="card" style="border-color:var(--error-line)"><div class="mrow">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong">№ 125</span><span class="chip c-danger"><span class="dot"></span>Просрочен</span></div>
          <div class="strong" style="font-size:15px">Владислав Гринёв</div>
          <div class="t-tiny mut">Тула, Металлургов 22, кв. 108</div>
          <hr class="hr">
          <div class="row" style="justify-content:space-between;gap:10px">
            <span class="usr"><span class="ava xs" style="background:var(--ok-bg);color:var(--ok-ink)">ИС</span><span class="t-tiny">Иван С.</span></span>
            <span class="mono t-lbl" style="color:var(--error-ink)">31 авг, 09:00</span>
            <span class="mono strong">12 000 ₽</span>
          </div>
        </div></div>
        <span class="btn light sm" style="width:100%">Показать ещё 3</span>
      </div>
$(otab ord)
    </div>
    <span class="devcap">Строка таблицы на 390 не имеет ширины — становится карточкой. Фильтры уезжают в выдвижную панель снизу, применённые остаются чипами над списком.</span>
  </div>
</div>
EOF
