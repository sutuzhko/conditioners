. ./_parts.sh
tabbar() {
  a="$1"; on() { [ "$1" = "$a" ] && printf ' on'; }
  cat <<EOF
<div class="tabbar">
  <a class="tb$(on ov)">$I_ORD Обзор</a>
  <a class="tb$(on cal)">$I_CAL Календарь</a>
  <a class="tb$(on ord)">$I_ORD Заказы</a>
  <a class="tb$(on lead)">$I_LEAD Заявки</a>
  <a class="tb$(on more)"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg> Ещё</a>
</div>
EOF
}
cat <<EOF
<div class="board touch">

  <div>
    <span class="devlab">390 · владелец — обзор</span>
    <div class="dev" style="min-height:844px">
      <div class="mbar">
        <span class="row" style="gap:10px"><span class="mark" style="width:28px;height:28px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M3 8c2.5-2 4.5 2 7 0s4.5 2 7 0"/><path d="M3 13c2.5-2 4.5 2 7 0s4.5 2 7 0"/><path d="M3 18c2.5-2 4.5 2 7 0s4.5 2 7 0"/></svg></span><span class="mtitle">Обзор</span></span>
        <span class="row" style="gap:6px"><span class="iconbtn">$I_SEARCH</span><span class="iconbtn">$I_BELL<span class="badge">4</span></span><span class="ava" style="width:30px;height:30px">СД</span></span>
      </div>
      <div class="mbody">
        <!-- две колонки по 168: цифра остаётся крупной, подпись в две строки -->
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
          <div class="card"><div class="stat" style="padding:12px;gap:5px"><span class="ic" style="width:28px;height:28px">$I_LEAD</span><span class="num n" style="font-size:24px">3</span><span class="l t-tiny">Новые обращения</span></div></div>
          <div class="card"><div class="stat" style="padding:12px;gap:5px"><span class="ic" style="width:28px;height:28px">$I_ORD</span><span class="num n" style="font-size:24px">7</span><span class="l t-tiny">Активные заказы</span></div></div>
        </div>
        <div class="card"><div class="bd row" style="padding:12px;gap:12px">
          <span class="ic" style="width:28px;height:28px;border-radius:9px;background:var(--error-bg);color:var(--error-ink);display:flex;align-items:center;justify-content:center;flex-shrink:0">$I_WARN</span>
          <span class="stack" style="gap:1px;min-width:0"><span style="font-size:13.5px;font-weight:600;color:var(--ink)">3 позиции ниже порога</span><span class="t-tiny fnt clip">Медная труба, кронштейны, фреон</span></span>
          <span class="btn flat sm" style="margin-left:auto">Склад</span>
        </div></div>
        <div class="card">
          <div class="hd" style="padding:12px 14px"><span class="ttl">Сегодня и завтра</span><span class="chip c-default">5</span></div>
          <div class="bd" style="padding:0">
            <div class="orow" style="border-bottom:1px solid var(--line-soft)">
              <div class="row" style="justify-content:space-between;gap:10px">
                <span class="mono strong t-lbl">сегодня, 14:00 · 3 ч</span>
                <span class="chip c-primary"><span class="dot"></span>В работе</span>
              </div>
              <div class="strong">Монтаж 09 инвертор</div>
              <div class="t-tiny mut">Тула, Оборонная 12, кв. 34 · 5 этаж</div>
              <div class="row" style="gap:8px"><span class="ava" style="width:24px;height:24px;font-size:9.5px">ПК</span><span class="t-tiny">Пётр Кузнецов</span></div>
            </div>
            <div class="orow" style="border-bottom:1px solid var(--line-soft)">
              <div class="row" style="justify-content:space-between;gap:10px">
                <span class="mono strong t-lbl">сегодня, 17:30 · 1 ч</span>
                <span class="chip c-warn"><span class="dot"></span>Назначен</span>
              </div>
              <div class="strong">ТО и чистка</div>
              <div class="t-tiny mut">Тула, пр. Ленина 108, офис 312</div>
              <div class="row" style="gap:8px"><span class="ava" style="width:24px;height:24px;font-size:9.5px">АМ</span><span class="t-tiny">Артём Морозов</span></div>
            </div>
            <div class="orow">
              <div class="row" style="justify-content:space-between;gap:10px">
                <span class="mono strong t-lbl">завтра, 10:00 · 4 ч</span>
                <span class="chip c-warn"><span class="dot"></span>Назначен</span>
              </div>
              <div class="strong">Монтаж 12 инвертор, два блока</div>
              <div class="t-tiny mut">Щёкино, Пионерская 4 · высотные работы</div>
            </div>
          </div>
          <div class="ft" style="padding:10px 14px"><a class="btn light sm" style="width:100%">Открыть календарь $I_CHEV</a></div>
        </div>
      </div>
$(tabbar ov)
    </div>
    <span class="devcap">Плитки в две колонки: пять в ряд на 390 дают цифру 12px. Первые две — те, по которым владелец решает, открывать ли ноутбук.</span>
  </div>

  <div>
    <span class="devlab">390 · владелец — заказы</span>
    <div class="dev" style="min-height:844px">
      <div class="mbar">
        <span class="row" style="gap:10px"><span class="iconbtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span><span class="mtitle">Заказы</span></span>
        <span class="row" style="gap:6px"><span class="iconbtn">$I_SEARCH</span><span class="btn solid sm">$I_PLUS</span></span>
      </div>
      <div style="padding:0 14px;background:var(--card);border-bottom:1px solid var(--line)">
        <div class="tabs" style="gap:18px;border:0"><span class="tab on">Активные</span><span class="tab">Новые</span><span class="tab">История</span><span class="tab">Все</span></div>
      </div>
      <div class="mbody" style="gap:10px">
        <div class="row" style="gap:8px">
          <span class="btn bord sm">$I_FILT Фильтры <span class="chip c-primary" style="height:16px;padding:0 5px">2</span></span>
          <span class="chip c-default lg">Этот месяц ×</span>
        </div>
        <!-- таблица становится списком карточек: на 390 у строки нет ширины -->
        <div class="card"><div class="orow">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong">№ 128</span><span class="chip c-primary"><span class="dot"></span>В работе</span></div>
          <div class="strong">Дмитрий Лапшин</div>
          <div class="t-tiny mut">Тула, Оборонная 12, кв. 34</div>
          <hr class="hr">
          <div class="row" style="justify-content:space-between;gap:10px">
            <span class="row" style="gap:8px"><span class="ava" style="width:24px;height:24px;font-size:9.5px">ПК</span><span class="t-tiny">Пётр К.</span></span>
            <span class="mono t-lbl mut">29 авг, 14:00</span>
            <span class="mono strong">34 900 ₽</span>
          </div>
        </div></div>
        <div class="card"><div class="orow">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong">№ 127</span><span class="chip c-warn"><span class="dot"></span>Назначен</span></div>
          <div class="strong">ООО «Тулаторг»</div>
          <div class="t-tiny mut">Тула, пр. Ленина 108, офис 312</div>
          <hr class="hr">
          <div class="row" style="justify-content:space-between;gap:10px">
            <span class="row" style="gap:8px"><span class="ava" style="width:24px;height:24px;font-size:9.5px">АМ</span><span class="t-tiny">Артём М.</span></span>
            <span class="mono t-lbl mut">29 авг, 17:30</span>
            <span class="mono strong">8 400 ₽</span>
          </div>
        </div></div>
        <div class="card" style="border-color:var(--error-line)"><div class="orow">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong">№ 125</span><span class="chip c-danger"><span class="dot"></span>Просрочен</span></div>
          <div class="strong">Владислав Гринёв</div>
          <div class="t-tiny mut">Тула, Металлургов 22, кв. 108</div>
          <hr class="hr">
          <div class="row" style="justify-content:space-between;gap:10px">
            <span class="row" style="gap:8px"><span class="ava" style="width:24px;height:24px;font-size:9.5px">ИС</span><span class="t-tiny">Иван С.</span></span>
            <span class="mono t-lbl" style="color:var(--error-ink)">31 авг, 09:00</span>
            <span class="mono strong">12 000 ₽</span>
          </div>
        </div></div>
        <span class="btn light sm" style="width:100%">Показать ещё 4</span>
      </div>
$(tabbar ord)
    </div>
    <span class="devcap">Фильтры уезжают в выдвижную панель снизу, а применённые остаются чипами над списком — иначе непонятно, почему заказов три вместо двадцати четырёх.</span>
  </div>

  <div>
    <span class="devlab">390 · владелец — заявка с сайта</span>
    <div class="dev" style="min-height:844px">
      <div class="mbar">
        <span class="row" style="gap:10px"><span class="iconbtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span><span class="mtitle">Заявка № 41</span></span>
        <span class="iconbtn">$I_MORE</span>
      </div>
      <div class="mbody" style="gap:12px">
        <div class="row" style="gap:8px"><span class="chip c-warn lg"><span class="dot"></span>Новая</span><span class="chip c-default lg">Консультация</span><span class="t-tiny fnt" style="margin-left:auto">2 часа назад</span></div>
        <div class="card"><div class="bd stack" style="gap:12px;padding:14px">
          <div class="inp flat col"><span class="lab">Имя</span><span class="val">Алла Викторовна</span></div>
          <a class="inp flat" style="justify-content:space-between;text-decoration:none"><span class="stack" style="gap:1px"><span class="lab">Телефон</span><span class="val mono">+7 (910) 155-24-68</span></span><span class="btn flat sm">Позвонить</span></a>
          <div class="inp flat col"><span class="lab">Адрес</span><span class="val">Щёкино, Пионерская 4</span></div>
          <div class="inp flat col tall" style="min-height:72px"><span class="lab">Комментарий</span><span class="val" style="margin-top:4px;font-size:13.5px">Нужен кондиционер в гостиную 32 м², высокий этаж. Когда сможете приехать на замер?</span></div>
        </div></div>
        <div class="card"><div class="hd" style="padding:12px 14px"><span class="ttl">Фото места установки</span><span class="chip c-default">2</span></div>
          <div class="bd row" style="gap:8px;padding:14px">
            <span style="flex:1;aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
            <span style="flex:1;aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
          </div>
        </div>
        <div class="card"><div class="bd stack" style="gap:10px;padding:14px">
          <span class="cap" style="margin:0">Что дальше</span>
          <span class="btn solid" style="width:100%">$I_PLUS Создать заказ</span>
          <span class="btn flat" style="width:100%">В клиенты</span>
          <span class="btn light" style="width:100%">Закрыть без заказа</span>
        </div></div>
      </div>
$(tabbar lead)
    </div>
    <span class="devcap">«Создать заказ» заводит клиента по телефону или находит существующего, переводит заявку в работу и открывает черновик наряда с подставленным адресом (CRM §3.4).</span>
  </div>
</div>
EOF
