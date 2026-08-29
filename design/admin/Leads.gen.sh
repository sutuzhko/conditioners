. ./_screens.sh
cat <<EOF
<div class="board touch">
  <div class="col">
    <span class="devlab">1440 · десктоп — очередь слева, карточка обращения справа</span>
    <div class="page" style="padding:0"><div class="app" style="width:1440px;min-height:900px">
$(aside leads)
      <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Заявки" "3 новых · одна ждёт больше суток" '<span class="btn bord sm">Экспорт</span>')
        <div class="main">
          <div class="alert a-warn"><span class="ai">$I_WARN</span><div><div class="at">Обращение № 39 ждёт больше суток</div><div class="ad">Пришло вчера в 11:20 и не взято в работу. Чем дольше молчим, тем выше шанс, что человек уже позвонил конкуренту.</div></div></div>
          <div class="grid" style="grid-template-columns:minmax(0,1fr) 420px;gap:16px;align-items:start">
            <div class="stack" style="gap:12px">
              <div class="tbar">
                <div class="row" style="gap:8px"><span class="btn faded sm">$I_FILT Фильтр</span><span class="chip c-warn lg">Новые <span class="x">×</span></span></div>
                <span class="inp faded md solo" style="width:240px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Имя, телефон, адрес</span></span></span>
              </div>
              <div class="card flat" style="overflow:hidden">
                <table class="tbl">
                  <thead><tr><th style="width:66px">№</th><th>Кто и что</th><th style="width:130px">Тема</th><th style="width:118px">Когда</th><th style="width:126px">Статус</th></tr></thead>
                  <tbody>
                    <tr style="background:var(--accent-bg)"><td class="mono strong">41</td><td><div class="strong">Алла Викторовна</div><div class="t-tiny mut clip">Щёкино, Пионерская 4 · гостиная 32 м²</div></td><td><span class="chip c-default">Консультация</span></td><td class="mono t-lbl">2 часа назад</td><td><span class="chip c-warn"><span class="dot"></span>Новая</span></td></tr>
                    <tr><td class="mono strong">40</td><td><div class="strong">Максим Ильин</div><div class="t-tiny mut clip">Тула, Кирова 18 · нужен замер</div></td><td><span class="chip c-default">Замер</span></td><td class="mono t-lbl">5 часов назад</td><td><span class="chip c-warn"><span class="dot"></span>Новая</span></td></tr>
                    <tr><td class="mono strong">39</td><td><div class="strong">Без имени</div><div class="t-tiny mut clip">Телефон оставлен, комментария нет</div></td><td><span class="chip c-default">Не указана</span></td><td class="mono t-lbl" style="color:var(--warn-ink)">вчера, 11:20</td><td><span class="chip c-warn"><span class="dot"></span>Новая</span></td></tr>
                    <tr><td class="mono strong">38</td><td><div class="strong">Дмитрий Лапшин</div><div class="t-tiny mut clip">Оборонная 12 · заказ № 128 создан</div></td><td><span class="chip c-default">Монтаж</span></td><td class="mono t-lbl">27 авг</td><td><span class="chip c-success"><span class="dot"></span>Закрыта</span></td></tr>
                    <tr><td class="mono strong">37</td><td><div class="strong">ООО «Тулаторг»</div><div class="t-tiny mut clip">пр. Ленина 108 · ТО по договору</div></td><td><span class="chip c-default">Сервис</span></td><td class="mono t-lbl">26 авг</td><td><span class="chip c-primary"><span class="dot"></span>В работе</span></td></tr>
                  </tbody>
                </table>
                <div class="pager" style="border-top:1px solid var(--line)"><span class="t-lbl mut">5 из 41</span><span class="pg"><span class="dis">‹</span><span class="on">1</span><span>2</span><span>›</span></span></div>
              </div>
            </div>
            <div class="card" style="position:sticky;top:20px">
              <div class="hd"><span class="row" style="gap:10px"><span class="ttl">Обращение № 41</span><span class="chip c-warn"><span class="dot"></span>Новая</span></span><span class="iconbtn">$I_MORE</span></div>
              <div class="bd stack" style="gap:12px">
                <div class="inp flat col"><span class="lab">Имя</span><span class="val">Алла Викторовна</span></div>
                <div class="inp flat" style="justify-content:space-between"><span class="body"><span class="lab">Телефон</span><span class="val mono">+7 (910) 155-24-68</span></span><span class="btn flat sm">Позвонить</span></div>
                <div class="inp flat col"><span class="lab">Адрес</span><span class="val">Щёкино, Пионерская 4</span></div>
                <div class="inp flat col tall"><span class="lab">Комментарий</span><span class="val" style="font-size:13.5px;margin-top:4px">Нужен кондиционер в гостиную 32 м², высокий этаж. Когда сможете приехать на замер?</span></div>
                <div>
                  <span class="cap" style="margin-bottom:6px">Фото места установки</span>
                  <div class="row" style="gap:8px">
                    <span style="flex:1;aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
                    <span style="flex:1;aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
                  </div>
                </div>
              </div>
              <div class="ft stack" style="gap:8px">
                <span class="btn solid" style="width:100%">$I_PLUS Создать заказ</span>
                <div class="row" style="gap:8px"><span class="btn flat" style="flex:1">В клиенты</span><span class="btn light" style="flex:1">Закрыть</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">«Создать заказ» заводит клиента по телефону или находит существующего, переводит заявку в работу и открывает черновик наряда с подставленным адресом (CRM §3.4).</span>
  </div>

  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — список, карточка открывается окном</span>
    <div class="frame tb"><div class="app rail" style="min-height:900px">
$(rail leads)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Заявки" "3 новых · одна ждёт больше суток" '')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="alert a-warn"><span class="ai">$I_WARN</span><div><div class="at">Обращение № 39 ждёт больше суток</div></div></div>
          <div class="tbar">
            <span class="inp faded md solo" style="flex:1;min-width:0"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Имя, телефон, адрес</span></span></span>
            <span class="btn faded sm">$I_FILT Фильтр</span>
          </div>
          <div class="card flat" style="overflow:hidden">
            <table class="tbl">
              <thead><tr><th style="width:56px">№</th><th>Кто и что</th><th style="width:112px">Когда</th><th style="width:118px">Статус</th></tr></thead>
              <tbody>
                <tr><td class="mono strong">41</td><td><div class="strong">Алла Викторовна</div><div class="t-tiny mut clip">Щёкино, Пионерская 4 · гостиная 32 м²</div></td><td class="mono t-lbl">2 часа</td><td><span class="chip c-warn"><span class="dot"></span>Новая</span></td></tr>
                <tr><td class="mono strong">40</td><td><div class="strong">Максим Ильин</div><div class="t-tiny mut clip">Тула, Кирова 18 · нужен замер</div></td><td class="mono t-lbl">5 часов</td><td><span class="chip c-warn"><span class="dot"></span>Новая</span></td></tr>
                <tr><td class="mono strong">39</td><td><div class="strong">Без имени</div><div class="t-tiny mut clip">Телефон оставлен, комментария нет</div></td><td class="mono t-lbl" style="color:var(--warn-ink)">вчера</td><td><span class="chip c-warn"><span class="dot"></span>Новая</span></td></tr>
                <tr><td class="mono strong">38</td><td><div class="strong">Дмитрий Лапшин</div><div class="t-tiny mut clip">заказ № 128 создан</div></td><td class="mono t-lbl">27 авг</td><td><span class="chip c-success"><span class="dot"></span>Закрыта</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Двух колонок не хватает: карточка обращения открывается модальным окном поверх списка, а не сжимает его до нечитаемого.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — карточка обращения целиком</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BACK" "Заявка № 41" '<span class="iconbtn">'"$I_MORE"'</span>')
      <div class="mbody" style="gap:12px">
        <div class="row" style="gap:8px"><span class="chip c-warn lg"><span class="dot"></span>Новая</span><span class="chip c-default lg">Консультация</span><span class="t-tiny fnt" style="margin-left:auto">2 часа назад</span></div>
        <div class="card"><div class="bd stack" style="gap:12px;padding:14px">
          <div class="inp flat col"><span class="lab">Имя</span><span class="val">Алла Викторовна</span></div>
          <a class="inp flat" style="justify-content:space-between;text-decoration:none"><span class="body"><span class="lab">Телефон</span><span class="val mono">+7 (910) 155-24-68</span></span><span class="btn flat sm">Позвонить</span></a>
          <div class="inp flat col"><span class="lab">Адрес</span><span class="val">Щёкино, Пионерская 4</span></div>
          <div class="inp flat col tall"><span class="lab">Комментарий</span><span class="val" style="font-size:13.5px;margin-top:4px">Нужен кондиционер в гостиную 32 м², высокий этаж. Когда сможете приехать на замер?</span></div>
        </div></div>
        <div class="card"><div class="hd" style="padding:12px 14px"><span class="ttl">Фото места установки</span><span class="chip c-default">2</span></div>
          <div class="bd row" style="gap:8px;padding:14px">
            <span style="flex:1;aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
            <span style="flex:1;aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
          </div>
        </div>
      </div>
      <div class="sticky-act">
        <span class="btn solid lg" style="width:100%">$I_PLUS Создать заказ</span>
        <div class="row" style="gap:8px"><span class="btn flat" style="flex:1">В клиенты</span><span class="btn light" style="flex:1">Закрыть</span></div>
      </div>
    </div>
    <span class="devcap">Действие прижато к низу: решение по заявке принимают на ходу, а не после прокрутки.</span>
  </div>
</div>
EOF
