. ./_screens.sh
cat <<EOF
  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — карточка «Компания» внутри настроек</span>
    <div class="frame"><div class="app rail" style="min-height:900px">
$(rail settings)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Компания" "← Настройки · заполнено на 82%" '<span class="btn solid sm">Сохранить</span>')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="row" style="gap:10px"><span class="bar" style="flex:1"><i style="width:82%"></i></span><span class="mono strong t-lbl">82%</span></div>
          <div class="card"><div class="hd"><span class="ttl">Контакты и адрес</span><span class="chip c-success">заполнено</span></div>
            <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:12px">
              <div class="inp flat col" style="grid-column:span 2"><span class="lab">Название</span><span class="val">ТулаКлимат</span></div>
              <div class="inp flat col"><span class="lab">Телефон основной</span><span class="val mono">+7 (4872) 00-00-10</span></div>
              <div class="inp flat col"><span class="lab">Телефон второй</span><span class="val mono">+7 (900) 000-00-20</span></div>
              <div class="inp flat col" style="grid-column:span 2"><span class="lab">Адрес</span><span class="val">300041, Тула, проспект Ленина, 108, офис 312</span></div>
              <div class="inp flat col"><span class="lab">Часы работы</span><span class="val mono">Пн–Вс, 8:00–21:00</span></div>
              <div class="inp flat col"><span class="lab">Регион выезда</span><span class="val">Тула и область</span></div>
            </div>
          </div>
          <div class="card" style="border-color:var(--warn-line)"><div class="hd"><span class="ttl">Способы оплаты</span><span class="chip c-warn">не заполнено</span></div>
            <div class="bd stack" style="gap:12px">
              <div class="inp flat col err"><span class="lab">Как принимаем оплату</span><span class="val ph">наличные, карта, счёт для юрлиц…</span></div>
              <span class="hint bad">$I_WARN Пока пусто — на сайте вместо этого блока стоит заглушка</span>
            </div>
          </div>
          <div class="card"><div class="hd"><span class="ttl">Реквизиты</span><span class="chip c-success">заполнено</span></div>
            <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:12px">
              <div class="inp flat col" style="grid-column:span 2"><span class="lab">Наименование</span><span class="val">ИП Демонстрационный Стенд Демонстрационович</span></div>
              <div class="inp flat col"><span class="lab">ИНН</span><span class="val mono">710000000077</span></div>
              <div class="inp flat col"><span class="lab">ОГРНИП</span><span class="val mono">314710000000002</span></div>
            </div>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Внутри раздела — возврат «← Настройки» тем же приёмом, что «← Все заказы» в карточке наряда. Колонка разделов при этом не подменяется вторым уровнем навигации: она выглядит одинаково на всех страницах панели.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — три страницы конфигурации списком</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BURG" "Настройки" '')
      <div class="mbody" style="gap:12px">
        <div class="alert a-warn"><span class="ai">$I_WARN</span><div><div class="at">Два поля компании не заполнены</div><div class="ad">На сайте вместо них заглушки</div></div></div>
        <div class="card"><div class="bd" style="padding:0">
          <a class="item" style="height:auto;padding:14px;border-radius:0;border-bottom:1px solid var(--line)">
            <span style="width:38px;height:38px;border-radius:11px;background:var(--accent-bg);color:var(--on-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0">$I_COMP</span>
            <span class="stack" style="gap:2px;min-width:0"><span class="strong">Компания</span><span class="t-tiny mut clip">Контакты, адрес, часы, реквизиты</span></span>
            <span class="k row" style="gap:8px"><span class="chip c-warn">82%</span>$I_CHEV</span>
          </a>
          <a class="item" style="height:auto;padding:14px;border-radius:0;border-bottom:1px solid var(--line)">
            <span style="width:38px;height:38px;border-radius:11px;background:var(--accent-bg);color:var(--on-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0">$I_PRICE</span>
            <span class="stack" style="gap:2px;min-width:0"><span class="strong">Цены на монтаж</span><span class="t-tiny mut clip">Ставки, включённые метры, доплаты</span></span>
            <span class="k row" style="gap:8px"><span class="chip c-success">готово</span>$I_CHEV</span>
          </a>
          <a class="item" style="height:auto;padding:14px;border-radius:0">
            <span style="width:38px;height:38px;border-radius:11px;background:var(--accent-bg);color:var(--on-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0">$I_BELL</span>
            <span class="stack" style="gap:2px;min-width:0"><span class="strong">Уведомления</span><span class="t-tiny mut clip">Каналы, адресаты, журнал доставки</span></span>
            <span class="k row" style="gap:8px"><span class="chip c-danger">1 отказ</span>$I_CHEV</span>
          </a>
        </div></div>
        <span class="cap" style="margin:0">Остаётся в колонке разделов</span>
        <div class="card"><div class="bd" style="padding:0">
          <a class="item" style="height:auto;padding:12px 14px;border-radius:0;border-bottom:1px solid var(--line)"><span class="ico">$I_CAT</span><span class="stack" style="gap:0"><span>Каталог</span><span class="t-tiny fnt">правится при каждой смене цены</span></span><span class="k">$I_CHEV</span></a>
          <a class="item" style="height:auto;padding:12px 14px;border-radius:0;border-bottom:1px solid var(--line)"><span class="ico">$I_BOOK</span><span class="stack" style="gap:0"><span>База знаний</span><span class="t-tiny fnt">содержимое, а не настройка</span></span><span class="k">$I_CHEV</span></a>
          <a class="item" style="height:auto;padding:12px 14px;border-radius:0"><span class="ico">$I_STAR</span><span class="stack" style="gap:0"><span>Отзывы</span><span class="t-tiny fnt">очередь модерации, ежедневная работа</span></span><span class="k row" style="gap:8px"><span class="chip c-warn">2</span>$I_CHEV</span></a>
        </div></div>
      </div>
$(otab more)
    </div>
    <span class="devcap">На узком экране низа колонки нет — «Настройки» и «Профиль» просто идут последними в ленте. Здесь они собраны в «Ещё».</span>
  </div>
