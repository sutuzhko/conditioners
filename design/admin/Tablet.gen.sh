. ./_parts.sh
# свёрнутая колонка значков: подпись уходит, счётчик остаётся точкой-числом
rail() {
  a="$1"; on() { [ "$1" = "$a" ] && printf ' on'; }
  cat <<EOF
<aside class="aside rail">
  <div class="brand"><span class="mark"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M3 8c2.5-2 4.5 2 7 0s4.5 2 7 0"/><path d="M3 13c2.5-2 4.5 2 7 0s4.5 2 7 0"/><path d="M3 18c2.5-2 4.5 2 7 0s4.5 2 7 0"/></svg></span></div>
  <nav class="nav">
    <a class="nv$(on overview)" title="Обзор">$I_ORD</a>
    <div class="navgrp">РАБ</div>
    <a class="nv$(on crm)">$I_CAL</a>
    <a class="nv$(on orders)">$I_ORD<span class="cnt">7</span></a>
    <a class="nv$(on leads)">$I_LEAD<span class="cnt">3</span></a>
    <a class="nv$(on clients)">$I_CLI</a>
    <a class="nv$(on team)">$I_TEAM</a>
    <a class="nv$(on stock)">$I_STOCK</a>
    <div class="navgrp">САЙТ</div>
    <a class="nv$(on company)">$I_COMP</a>
    <a class="nv$(on catalog)">$I_CAT</a>
    <a class="nv$(on reviews)">$I_STAR<span class="cnt">2</span></a>
    <a class="nv$(on notif)">$I_BELL</a>
  </nav>
  <div class="asfoot"><span class="ava">СД</span></div>
</aside>
EOF
}
cat <<EOF
<div class="board">

  <div>
    <span class="devlab">768 · планшет — обзор</span>
    <div class="dev">
      <div class="app rail" style="min-height:900px">
$(rail overview)
        <div style="display:flex;flex-direction:column;min-width:0">
          <div class="navbar" style="padding:0 16px">
            <div class="crumbs"><span class="cur">Обзор</span></div>
            <div class="row" style="gap:8px">
              <span class="iconbtn">$I_SEARCH</span><span class="iconbtn">$I_MOON</span>
              <span class="iconbtn">$I_BELL<span class="badge">4</span></span>
            </div>
          </div>
          <div class="main" style="padding:16px;gap:14px">
            <div class="phd">
              <div><h1 class="h1" style="font-size:20px">Обзор</h1><div class="sub">Среда, 29 августа</div></div>
              <span class="btn solid sm">$I_PLUS Заказ</span>
            </div>
            <!-- пять плиток не помещаются в ряд: сетка 3 + 2, крупные первыми -->
            <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:12px">
              <div class="card"><div class="stat" style="padding:12px;gap:6px"><span class="ic" style="width:28px;height:28px">$I_LEAD</span><span class="num n" style="font-size:22px">3</span><span class="l t-tiny">Новые обращения</span></div></div>
              <div class="card"><div class="stat" style="padding:12px;gap:6px"><span class="ic" style="width:28px;height:28px">$I_ORD</span><span class="num n" style="font-size:22px">7</span><span class="l t-tiny">Активные заказы</span></div></div>
              <div class="card"><div class="stat" style="padding:12px;gap:6px"><span class="ic" style="width:28px;height:28px">$I_STAR</span><span class="num n" style="font-size:22px">2</span><span class="l t-tiny">Отзыва на модерации</span></div></div>
            </div>
            <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">
              <div class="card"><div class="stat" style="padding:12px;gap:4px;flex-direction:row;align-items:center"><span class="ic" style="width:28px;height:28px">$I_CLI</span><span class="num" style="font-size:20px">128</span><span class="l t-tiny">Клиентов</span></div></div>
              <div class="card"><div class="stat" style="padding:12px;gap:4px;flex-direction:row;align-items:center"><span class="ic" style="width:28px;height:28px">$I_TEAM</span><span class="num" style="font-size:20px">4</span><span class="l t-tiny">Монтажников на смене</span></div></div>
            </div>
            <div class="card">
              <div class="hd"><span class="ttl">Ближайшие дела</span><span class="btn light sm">Календарь $I_CHEV</span></div>
              <div class="bd" style="padding:0">
                <table class="tbl">
                  <tbody>
                    <tr><td style="width:96px" class="mono strong">сегодня<br><span class="fnt t-tiny">14:00</span></td>
                      <td><div class="strong">Монтаж 09 инвертор</div><div class="t-tiny mut clip">Оборонная 12, кв. 34 · Пётр К.</div></td>
                      <td class="rt" style="width:110px"><span class="chip c-primary"><span class="dot"></span>В работе</span></td></tr>
                    <tr><td class="mono strong">сегодня<br><span class="fnt t-tiny">17:30</span></td>
                      <td><div class="strong">ТО и чистка</div><div class="t-tiny mut clip">пр. Ленина 108 · Артём М.</div></td>
                      <td class="rt"><span class="chip c-warn"><span class="dot"></span>Назначен</span></td></tr>
                    <tr><td class="mono strong">завтра<br><span class="fnt t-tiny">10:00</span></td>
                      <td><div class="strong">Монтаж 12, два блока</div><div class="t-tiny mut clip">Щёкино, Пионерская 4 · Пётр К.</div></td>
                      <td class="rt"><span class="chip c-warn"><span class="dot"></span>Назначен</span></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;align-items:start">
              <div class="card"><div class="hd"><span class="ttl">Готовность</span></div><div class="bd row" style="gap:12px">
                <svg width="56" height="56" viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--line)" stroke-width="8"/><circle cx="36" cy="36" r="30" fill="none" stroke="var(--brand)" stroke-width="8" stroke-linecap="round" stroke-dasharray="188.5" stroke-dashoffset="34" transform="rotate(-90 36 36)"/><text x="36" y="42" text-anchor="middle" font-family="Onest, sans-serif" font-size="19" font-weight="800" fill="var(--ink)">82%</text></svg>
                <span class="t-tiny mut">Два поля компании пусты — на сайте заглушки</span></div></div>
              <div class="card"><div class="hd"><span class="ttl">Пора заказывать</span><span class="chip c-danger">3</span></div><div class="bd stack" style="gap:8px">
                <span class="row" style="justify-content:space-between"><span class="t-lbl">Медная труба 1/4″</span><span class="chip c-danger">12 м</span></span>
                <span class="row" style="justify-content:space-between"><span class="t-lbl">Кронштейны 450</span><span class="chip c-danger">2 пары</span></span>
              </div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <span class="t-tiny fnt" style="display:block;margin-top:10px">С 900 колонка разделов сворачивается в полосу значков 72px: содержимому остаётся 696 вместо 504</span>
  </div>

  <div>
    <span class="devlab">768 · планшет — заказы</span>
    <div class="dev">
      <div class="app rail" style="min-height:900px">
$(rail orders)
        <div style="display:flex;flex-direction:column;min-width:0">
          <div class="navbar" style="padding:0 16px">
            <div class="crumbs"><span class="cur">Заказы</span></div>
            <div class="row" style="gap:8px"><span class="iconbtn">$I_SEARCH</span><span class="iconbtn">$I_MOON</span><span class="iconbtn">$I_BELL<span class="badge">4</span></span></div>
          </div>
          <div class="main" style="padding:16px;gap:14px">
            <div class="phd"><div><h1 class="h1" style="font-size:20px">Заказы</h1><div class="sub">24 всего · 7 активных</div></div><span class="btn solid sm">$I_PLUS Заказ</span></div>
            <div class="tabs" style="gap:16px"><span class="tab on">Активные</span><span class="tab">Новые</span><span class="tab">История</span><span class="tab">Отказы</span></div>
            <div class="tbar">
              <span class="inp bordered md solo grow"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Номер, клиент, адрес</span></span></span>
              <span class="btn bord">$I_FILT Фильтры <span class="chip c-primary" style="height:18px;padding:0 6px">2</span></span>
            </div>
            <!-- на планшете таблица теряет колонки «сумма» и «действия»:
                 они уезжают в карточку заказа, а не жмутся до нечитаемого -->
            <div class="card flat" style="overflow:hidden">
              <table class="tbl">
                <thead><tr><th style="width:70px">Номер</th><th>Клиент и объект</th><th style="width:120px">Когда</th><th style="width:112px">Статус</th></tr></thead>
                <tbody>
                  <tr><td class="mono strong">№ 128</td><td><div class="strong">Дмитрий Лапшин</div><div class="t-tiny mut clip">Оборонная 12, кв. 34 · Пётр К.</div></td><td class="mono t-lbl">29 авг<br><span class="fnt t-tiny">14:00</span></td><td><span class="chip c-primary"><span class="dot"></span>В работе</span></td></tr>
                  <tr><td class="mono strong">№ 127</td><td><div class="strong">ООО «Тулаторг»</div><div class="t-tiny mut clip">пр. Ленина 108 · Артём М.</div></td><td class="mono t-lbl">29 авг<br><span class="fnt t-tiny">17:30</span></td><td><span class="chip c-warn"><span class="dot"></span>Назначен</span></td></tr>
                  <tr><td class="mono strong">№ 126</td><td><div class="strong">Алла Викторовна</div><div class="t-tiny mut clip">Щёкино, Пионерская 4</div></td><td class="mono t-lbl">30 авг<br><span class="fnt t-tiny">10:00</span></td><td><span class="chip c-default"><span class="dot"></span>Новый</span></td></tr>
                  <tr><td class="mono strong">№ 125</td><td><div class="strong">Владислав Гринёв</div><div class="t-tiny mut clip">Металлургов 22, кв. 108 · Иван С.</div></td><td class="mono t-lbl">31 авг<br><span class="fnt t-tiny">09:00</span></td><td><span class="chip c-danger"><span class="dot"></span>Просрочен</span></td></tr>
                  <tr><td class="mono strong">№ 124</td><td><div class="strong">Николай</div><div class="t-tiny mut clip">Новомосковск, Мира 7 · Иван С.</div></td><td class="mono t-lbl">2 сен<br><span class="fnt t-tiny">11:00</span></td><td><span class="chip c-warn"><span class="dot"></span>Назначен</span></td></tr>
                </tbody>
              </table>
              <div class="pager" style="border-top:1px solid var(--line-soft)">
                <span class="t-lbl mut">5 из 24</span>
                <span class="pg"><span>‹</span><span class="on">1</span><span>2</span><span>3</span><span>›</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <span class="t-tiny fnt" style="display:block;margin-top:10px">Сумма и действия строки уезжают в карточку заказа: колонка, сжатая до нечитаемого, хуже отсутствующей</span>
  </div>
</div>
EOF
