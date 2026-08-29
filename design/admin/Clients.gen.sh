. ./_screens.sh
cat <<EOF
<div class="board touch">
  <div class="col">
    <span class="devlab">1440 · десктоп — база клиентов, телефон как ключ</span>
    <div class="page" style="padding:0"><div class="app" style="width:1440px;min-height:900px">
$(aside clients)
      <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Клиенты" "128 в базе · 4 заведены за месяц" '<span class="btn solid">'"$I_PLUS"' Новый клиент</span>')
        <div class="main">
          <div class="tbar">
            <div class="row" style="gap:8px"><span class="btn faded sm">$I_FILT Фильтр</span><span class="btn faded sm">$I_SORT По дате</span></div>
            <span class="inp faded md solo" style="width:320px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Имя, телефон или адрес</span></span></span>
          </div>
          <div class="alert a-primary"><span class="ai">$I_WARN</span><div><div class="at">Телефон — ключ</div><div class="ad">Поиск и дедупликация идут по нормализованному номеру: «+7 (910) 155-24-68», «8 910 155 24 68» и «9101552468» — один человек, и второй карточки у него не будет (ADR-105).</div></div></div>
          <div class="card flat" style="overflow:hidden">
            <table class="tbl">
              <thead><tr><th>Клиент</th><th style="width:190px">Телефон</th><th style="width:230px">Адрес</th><th class="rt" style="width:110px">Заказов</th><th class="rt" style="width:130px">Сумма</th><th style="width:130px">Последний</th><th style="width:126px">Действия</th></tr></thead>
              <tbody>
                <tr><td><span class="usr"><span class="ava">ДЛ</span><span class="stack" style="gap:0"><span class="nm">Дмитрий Лапшин</span><span class="ds">постоянный · 2 кондиционера</span></span></span></td><td class="mono">+7 (910) 155-24-68</td><td class="clip">Тула, Оборонная 12, кв. 34</td><td class="rt mono strong">3</td><td class="rt mono strong">98 700 ₽</td><td class="mono t-lbl">29 авг</td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td><span class="usr"><span class="ava" style="background:var(--info-bg);color:var(--info-ink)">ОТ</span><span class="stack" style="gap:0"><span class="nm">ООО «Тулаторг»</span><span class="ds">юрлицо · договор на ТО</span></span></span></td><td class="mono">+7 (4872) 55-10-04</td><td class="clip">Тула, пр. Ленина 108, офис 312</td><td class="rt mono strong">7</td><td class="rt mono strong">214 300 ₽</td><td class="mono t-lbl">29 авг</td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td><span class="usr"><span class="ava" style="background:var(--ok-bg);color:var(--ok-ink)">АВ</span><span class="stack" style="gap:0"><span class="nm">Алла Викторовна</span><span class="ds">заведена из заявки № 41</span></span></span></td><td class="mono">+7 (920) 700-11-02</td><td class="clip">Щёкино, Пионерская 4</td><td class="rt mono strong">1</td><td class="rt mono strong">52 300 ₽</td><td class="mono t-lbl">30 авг</td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td><span class="usr"><span class="ava">ВГ</span><span class="stack" style="gap:0"><span class="nm">Владислав Гринёв</span><span class="ds">гарантийный выезд</span></span></span></td><td class="mono">+7 (953) 190-42-11</td><td class="clip">Тула, Металлургов 22, кв. 108</td><td class="rt mono strong">2</td><td class="rt mono strong">44 200 ₽</td><td class="mono t-lbl">31 авг</td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td><span class="usr"><span class="ava" style="background:var(--bg-soft);color:var(--muted)">Н</span><span class="stack" style="gap:0"><span class="nm">Николай</span><span class="ds">фамилия не указана</span></span></span></td><td class="mono">+7 (900) 321-88-05</td><td class="clip">Новомосковск, Мира 7, кв. 12</td><td class="rt mono strong">1</td><td class="rt mono strong">27 400 ₽</td><td class="mono t-lbl">2 сен</td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
              </tbody>
            </table>
            <div class="pager" style="border-top:1px solid var(--line)"><span class="t-lbl mut">5 из 128</span><span class="pg"><span class="dis">‹</span><span class="on">1</span><span>2</span><span>3</span><span>…</span><span>26</span><span>›</span></span><span class="row t-lbl mut" style="gap:8px">Строк на странице <span class="btn bord sm">8 $I_DOWN</span></span></div>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Телефон набран моноширинным и выровнен — по нему ищут и сверяют. «Заказов» и «Сумма» правым краем в столбец: сравнение читается по цифрам.</span>
  </div>

  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — четыре колонки, телефон остаётся</span>
    <div class="frame tb"><div class="app rail" style="min-height:900px">
$(rail clients)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Клиенты" "128 в базе" '<span class="btn solid sm">'"$I_PLUS"' Клиент</span>')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="tbar"><span class="inp faded md solo" style="flex:1;min-width:0"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Имя, телефон или адрес</span></span></span><span class="btn faded sm">$I_FILT Фильтр</span></div>
          <div class="card flat" style="overflow:hidden">
            <table class="tbl">
              <thead><tr><th>Клиент</th><th style="width:168px">Телефон</th><th class="rt" style="width:94px">Заказов</th><th class="rt" style="width:120px">Сумма</th></tr></thead>
              <tbody>
                <tr><td><span class="usr"><span class="ava xs">ДЛ</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Дмитрий Лапшин</span><span class="ds clip">Оборонная 12, кв. 34</span></span></span></td><td class="mono t-lbl">+7 (910) 155-24-68</td><td class="rt mono strong">3</td><td class="rt mono strong">98 700 ₽</td></tr>
                <tr><td><span class="usr"><span class="ava xs" style="background:var(--info-bg);color:var(--info-ink)">ОТ</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">ООО «Тулаторг»</span><span class="ds clip">пр. Ленина 108, офис 312</span></span></span></td><td class="mono t-lbl">+7 (4872) 55-10-04</td><td class="rt mono strong">7</td><td class="rt mono strong">214 300 ₽</td></tr>
                <tr><td><span class="usr"><span class="ava xs" style="background:var(--ok-bg);color:var(--ok-ink)">АВ</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Алла Викторовна</span><span class="ds clip">Щёкино, Пионерская 4</span></span></span></td><td class="mono t-lbl">+7 (920) 700-11-02</td><td class="rt mono strong">1</td><td class="rt mono strong">52 300 ₽</td></tr>
                <tr><td><span class="usr"><span class="ava xs">ВГ</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Владислав Гринёв</span><span class="ds clip">Металлургов 22, кв. 108</span></span></span></td><td class="mono t-lbl">+7 (953) 190-42-11</td><td class="rt mono strong">2</td><td class="rt mono strong">44 200 ₽</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Адрес уходит в подпись под именем — колонка, сжатая до многоточия, не несёт ничего.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — карточка клиента с историей</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BACK" "Дмитрий Лапшин" '<span class="iconbtn">'"$I_MORE"'</span>')
      <div class="mbody" style="gap:12px">
        <div class="card"><div class="bd stack" style="gap:12px;padding:14px">
          <div class="row" style="gap:12px"><span class="ava lg">ДЛ</span><span class="stack" style="gap:2px"><span class="strong" style="font-size:15px">Дмитрий Лапшин</span><span class="chip c-primary" style="align-self:flex-start">Постоянный · 3 заказа</span></span></div>
          <a class="inp flat" style="justify-content:space-between;text-decoration:none"><span class="body"><span class="lab">Телефон</span><span class="val mono">+7 (910) 155-24-68</span></span><span class="btn flat sm">Позвонить</span></a>
          <div class="inp flat col"><span class="lab">Адрес</span><span class="val">Тула, Оборонная 12, кв. 34</span></div>
        </div></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
          <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Заказов</span><span class="v"><span class="n" style="font-size:22px">3</span></span></div></div>
          <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">На сумму</span><span class="v"><span class="n" style="font-size:22px">98 700 ₽</span></span></div></div>
        </div>
        <div class="card"><div class="hd" style="padding:12px 14px"><span class="ttl">История</span><span class="chip c-default">3</span></div>
          <div class="bd" style="padding:0">
            <div class="mrow" style="gap:6px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 128</span><span class="chip c-primary"><span class="dot"></span>В работе</span></div><div class="t-lbl">Монтаж 09 инвертор · 29 авг</div></div>
            <div class="mrow" style="gap:6px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 96</span><span class="chip c-success"><span class="dot"></span>Выполнен</span></div><div class="t-lbl">ТО и чистка · 12 мая</div></div>
            <div class="mrow" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 41</span><span class="chip c-success"><span class="dot"></span>Выполнен</span></div><div class="t-lbl">Монтаж 07 · 3 июня 2023</div></div>
          </div>
        </div>
      </div>
      <div class="sticky-act"><span class="btn solid lg" style="width:100%">$I_PLUS Новый заказ клиенту</span></div>
    </div>
    <span class="devcap">История заказов — то, ради чего карточку открывают на ходу: понять, звонит постоянный клиент или новый.</span>
  </div>
</div>
EOF
