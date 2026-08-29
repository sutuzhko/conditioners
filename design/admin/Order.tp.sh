. ./_screens.sh
cat <<EOF
  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — деньги уезжают под наряд</span>
    <div class="frame"><div class="app rail" style="min-height:1000px">
$(rail orders)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Заказ № 128" "Дмитрий Лапшин · создан из заявки № 41" '<span class="btn solid sm">'"$I_CHECK"' Выполнен</span>')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="row" style="gap:8px"><span class="chip c-primary lg"><span class="dot"></span>В работе</span><span class="chip c-default lg">Монтаж</span><span class="chip c-default lg">29 авг, 14:00 · 3 ч</span></div>
          <div class="tabs" style="gap:16px"><span class="tab on">Наряд</span><span class="tab">Расход</span><span class="tab">Чеклист</span><span class="tab">Документы</span><span class="tab">История</span></div>
          <div class="card"><div class="hd"><span class="ttl">Объект</span><span class="btn light sm">На карте $I_CHEV</span></div>
            <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:12px">
              <div class="inp bordered col" style="grid-column:span 2"><span class="lab">Адрес</span><span class="val">Тула, ул. Оборонная, 12, кв. 34</span></div>
              <div class="inp bordered col"><span class="lab">Подъезд и домофон</span><span class="val mono">2 · 34К</span></div>
              <div class="inp bordered col"><span class="lab">Этаж</span><span class="val">5 из 9</span></div>
            </div>
          </div>
          <div class="card"><div class="hd"><span class="ttl">Оборудование</span><span class="btn flat sm">$I_PLUS Позиция</span></div>
            <div class="bd stack" style="gap:10px">
              <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px;padding:12px">
                <div class="strong">Сплит-система 09, инверторная</div>
                <div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip c-primary">Наше</span><span class="chip c-default">4,5 м</span><span class="chip c-default">1/4″ + 3/8″</span><span class="chip c-warn">Штроба 2 м</span></div>
              </div></div>
              <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:8px;padding:12px">
                <div class="strong">Ballu BSW-07HN1</div>
                <div class="row" style="gap:6px;flex-wrap:wrap"><span class="chip c-default">Клиента</span><span class="chip c-default">3 м</span><span class="chip c-default">1/4″</span></div>
              </div></div>
            </div>
          </div>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;align-items:start">
            <div class="card"><div class="hd"><span class="ttl">Деньги</span><span class="chip c-default">Скрыто от монтажника</span></div>
              <div class="bd stack" style="gap:10px">
                <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Сумма</span><span class="num" style="font-size:18px">34 900 ₽</span></div>
                <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Выплата</span><span class="mono strong">6 000 ₽</span></div>
                <div class="row" style="justify-content:space-between"><span class="t-lbl strong">Маржа</span><span class="num" style="font-size:16px;color:var(--ok-ink)">28 900 ₽</span></div>
              </div></div>
            <div class="card"><div class="hd"><span class="ttl">Монтажник</span></div>
              <div class="bd stack" style="gap:10px">
                <div class="inp flat" style="justify-content:space-between"><span class="row" style="gap:10px"><span class="ava">ПК</span><span class="body"><span class="lab">Назначен</span><span class="val">Пётр Кузнецов</span></span></span>$I_DOWN</div>
                <div class="inp flat col tall" style="min-height:64px"><span class="lab">Комментарий</span><span class="val" style="font-size:13px;margin-top:3px">Домофон 34К, звонить за 20 минут.</span></div>
              </div></div>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Липкая правая колонка не помещается — деньги и исполнитель уходят под наряд двумя карточками, пометка «скрыто от монтажника» остаётся.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — владелец смотрит наряд на ходу</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BACK" "Заказ № 128" '<span class="iconbtn">'"$I_MORE"'</span>')
      <div style="padding:0 14px;background:var(--card);border-bottom:1px solid var(--line)">
        <div class="tabs" style="gap:18px;border:0"><span class="tab on">Наряд</span><span class="tab">Чеклист</span><span class="tab">Документы</span></div>
      </div>
      <div class="mbody" style="gap:12px">
        <div class="row" style="gap:8px;flex-wrap:wrap"><span class="chip c-primary lg"><span class="dot"></span>В работе</span><span class="chip c-default lg">Монтаж</span></div>
        <div class="card"><div class="bd stack" style="gap:10px;padding:14px">
          <span class="cap" style="margin:0">Клиент и объект</span>
          <span class="strong" style="font-size:15px">Дмитрий Лапшин</span>
          <span class="t-lbl">Тула, ул. Оборонная, 12, кв. 34 · 5 этаж</span>
          <div class="row" style="gap:8px;margin-top:2px"><span class="btn flat" style="flex:1">Позвонить</span><span class="btn flat" style="flex:1">Маршрут</span></div>
        </div></div>
        <div class="card"><div class="bd stack" style="gap:10px;padding:14px">
          <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Сумма заказа</span><span class="num" style="font-size:20px">34 900 ₽</span></div>
          <hr class="hr">
          <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Выплата монтажнику</span><span class="mono strong">6 000 ₽</span></div>
          <div class="row" style="justify-content:space-between"><span class="t-lbl strong">Маржа</span><span class="num" style="font-size:16px;color:var(--ok-ink)">28 900 ₽</span></div>
        </div></div>
        <div class="card"><div class="hd" style="padding:12px 14px"><span class="ttl">Монтажник</span></div>
          <div class="bd row" style="gap:10px;padding:14px"><span class="ava">ПК</span><span class="stack" style="gap:1px"><span class="strong">Пётр Кузнецов</span><span class="t-tiny fnt">29 августа, 14:00 · 3 ч</span></span><span class="btn flat sm" style="margin-left:auto">Сменить</span></div>
        </div>
      </div>
      <div class="sticky-act"><span class="btn solid lg" style="width:100%">$I_CHECK Отметить выполненным</span></div>
    </div>
    <span class="devcap">Владельцу на телефоне нужны три вещи: где объект, сколько денег и кто поехал. Остальное — по вкладкам.</span>
  </div>
