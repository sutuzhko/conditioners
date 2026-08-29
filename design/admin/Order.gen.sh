. ./_parts.sh
cat <<EOF
<div class="page" style="padding:0"><div class="app" style="width:1440px;min-height:1120px">
$(aside orders)
  <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Заказ № 128" "Создан 27 августа из заявки № 41 · Дмитрий Лапшин · +7 (910) 155-24-68" '<span class="btn bord sm">Печать документов</span><span class="btn solid sm">'"$I_CHECK"' Отметить выполненным</span>')
    <div class="main">
      <div class="row" style="gap:10px">
        <span class="chip c-primary lg"><span class="dot"></span>В работе</span>
        <span class="chip c-default lg">Монтаж</span>
        <span class="chip c-default lg">Тула, Оборонная 12</span>
        <span class="btn light sm" style="margin-left:auto">$I_MORE</span>
      </div>

      <div class="tabs"><span class="tab on">Наряд</span><span class="tab">Расход <span class="chip c-warn" style="height:17px;padding:0 5px;margin-left:4px">1 минус</span></span><span class="tab">Чеклист выезда <span class="chip c-warn" style="height:18px;padding:0 6px;margin-left:4px">4 из 9</span></span><span class="tab">Документы и фото</span><span class="tab">История</span></div>

      <div class="grid" style="grid-template-columns:minmax(0,1fr) 340px;gap:var(--gap-4);align-items:start">
        <div class="stack" style="gap:var(--gap-4)">

          <div class="card">
            <div class="hd"><span class="ttl">Объект</span><span class="btn light sm">Открыть на карте $I_CHEV</span></div>
            <div class="bd grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
              <div class="inp bordered col" style="grid-column:span 2"><span class="lab">Адрес</span><span class="val">Тула, ул. Оборонная, 12, кв. 34</span></div>
              <div class="inp bordered col"><span class="lab">Этаж</span><span class="val">5 из 9</span></div>
              <div class="inp bordered col"><span class="lab">Подъезд и домофон</span><span class="val mono">2 · 34К</span></div>
              <div class="inp bordered col"><span class="lab">Телефон на объекте</span><span class="val mono">+7 (910) 155-24-68</span></div>
              <div class="inp bordered" style="justify-content:space-between"><span class="body"><span class="lab">Высотные работы</span><span class="val">Не требуются</span></span><span class="cbx" aria-hidden="true"></span></div>
            </div>
          </div>

          <!-- Оборудование — список позиций, а не одно поле (CRM §3.3) -->
          <div class="card">
            <div class="hd"><span class="ttl">Оборудование</span><span class="btn flat sm">$I_PLUS Позиция</span></div>
            <div class="bd" style="padding:0">
              <table class="tbl">
                <thead><tr><th>Тип и модель</th><th style="width:130px">Чьё</th><th style="width:110px">Трасса</th><th style="width:110px">Диаметр</th><th style="width:120px">Штробление</th><th style="width:44px"></th></tr></thead>
                <tbody>
                  <tr>
                    <td><div class="strong">Кондиционер · Сплит-система 09, инверторная</div><div class="t-tiny mut">из каталога · 34 900 ₽ под ключ</div></td>
                    <td><span class="chip c-primary">Наше</span></td>
                    <td class="mono">4,5 м</td><td class="mono">1/4″ + 3/8″</td>
                    <td><span class="chip c-warn">Есть · 2 м</span></td>
                    <td><span class="iconbtn">$I_MORE</span></td>
                  </tr>
                  <tr>
                    <td><div class="strong">Кондиционер · Ballu BSW-07HN1</div><div class="t-tiny mut">оборудование клиента · только работы</div></td>
                    <td><span class="chip c-default">Клиента</span></td>
                    <td class="mono">3 м</td><td class="mono">1/4″</td>
                    <td><span class="chip c-default">Нет</span></td>
                    <td><span class="iconbtn">$I_MORE</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="hd"><span class="ttl">Итог работ</span><span class="chip c-warn">Заполняет монтажник</span></div>
            <div class="bd stack" style="gap:12px">
              <div class="inp flat col tall"><span class="lab">Дополнительные работы и материалы по факту</span><span class="val ph" style="margin-top:4px">Пока не заполнено — появится, когда монтажник закроет выезд</span></div>
              <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
                <div class="inp bordered col"><span class="lab">Доп. трасса</span><span class="val ph mono">— м</span></div>
                <div class="inp bordered col"><span class="lab">Доп. сумма</span><span class="val ph mono">— ₽</span></div>
                <div class="inp bordered col"><span class="lab">Дата отчёта</span><span class="val ph mono">—</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Правая колонка липнет: деньги и исполнитель нужны на всех вкладках -->
        <div class="stack" style="gap:var(--gap-4);position:sticky;top:76px">
          <div class="card">
            <div class="hd"><span class="ttl">Когда и кто</span></div>
            <div class="bd stack" style="gap:12px">
              <div class="inp flat col"><span class="lab">Дата и время</span><span class="val mono">29 августа, 14:00 · 3 ч</span></div>
              <div class="inp flat" style="justify-content:space-between"><span class="row" style="gap:10px"><span class="ava">ПК</span><span class="stack" style="gap:1px"><span class="lab">Монтажник</span><span class="val">Пётр Кузнецов</span></span></span>$I_DOWN</div>
              <div class="inp flat col tall" style="min-height:70px"><span class="lab">Комментарий монтажнику</span><span class="val" style="margin-top:4px;font-size:13.5px">Домофон 34К, звонить за 20 минут. На объекте собака.</span></div>
            </div>
          </div>

          <div class="card">
            <div class="hd"><span class="ttl">Деньги</span><span class="chip c-default">Скрыто от монтажника</span></div>
            <div class="bd stack" style="gap:12px">
              <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Сумма заказа</span><span class="num" style="font-size:20px">34 900 ₽</span></div>
              <div class="inp flat col"><span class="lab">Способ оплаты</span><span class="val">Клиент платит компании</span></div>
              <hr class="hr">
              <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Выплата монтажнику</span><span class="mono strong">6 000 ₽</span></div>
              <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Удержание</span><span class="mut">нет</span></div>
              <div class="row" style="justify-content:space-between"><span class="t-lbl" style="color:var(--ink);font-weight:600">Маржа заказа</span><span class="num" style="font-size:16px;color:var(--ok-ink)">28 900 ₽</span></div>
            </div>
          </div>

          <div class="card">
            <div class="hd"><span class="ttl">Заметка владельца</span><span class="chip c-danger">Не видит монтажник</span></div>
            <div class="bd"><div class="inp flat col tall" style="min-height:64px"><span class="val" style="font-size:13.5px">Постоянный клиент, второй кондиционер. Не торговаться.</span></div></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</div>
EOF
