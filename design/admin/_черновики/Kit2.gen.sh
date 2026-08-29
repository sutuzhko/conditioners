. ./_parts.sh
cat <<EOF

  <!-- ═══ ТАБЛИЦА ═══ -->
  <div class="sec">
    <div class="sh">Таблица</div>
    <div class="sd">Композиция эталона: над таблицей — поиск, фильтры и главное действие; шапка липкая и набрана капителью; строка подсвечивается при наведении; действия строки собраны в одну кнопку; снизу — счёт и страницы. Выбор строк галочками включается там, где есть групповое действие.</div>
    <div class="card flat" style="border-radius:var(--r-md);overflow:hidden">
      <div class="hd" style="padding:var(--pad-card)">
        <div class="tbar grow">
          <span class="inp bordered md solo" style="width:280px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Номер, клиент, адрес</span></span></span>
          <span class="btn bord">Статус $I_DOWN</span>
          <span class="btn bord">Период $I_DOWN</span>
          <span class="btn light sm">Сбросить</span>
        </div>
        <span class="btn solid">$I_PLUS Новый заказ</span>
      </div>
      <table class="tbl">
        <thead><tr>
          <th style="width:38px"><span class="cbx"></span></th>
          <th style="width:78px">Номер</th><th>Клиент и объект</th><th style="width:150px">Монтажник</th>
          <th style="width:134px">Дата</th><th style="width:120px">Статус</th><th class="rt" style="width:110px">Сумма</th><th style="width:44px"></th>
        </tr></thead>
        <tbody>
          <tr style="background:var(--accent-bg)">
            <td><span class="cbx on">$I_CHECK</span></td>
            <td class="mono strong">№ 128</td>
            <td><div class="strong">Дмитрий Лапшин</div><div class="t-tiny mut clip">Тула, Оборонная 12, кв. 34</div></td>
            <td><span class="row" style="gap:8px"><span class="ava" style="width:26px;height:26px;font-size:10px">ПК</span>Пётр К.</span></td>
            <td class="mono">29 авг, 14:00</td>
            <td><span class="chip c-primary"><span class="dot"></span>В работе</span></td>
            <td class="rt mono strong">34 900 ₽</td>
            <td><span class="iconbtn">$I_MORE</span></td>
          </tr>
          <tr>
            <td><span class="cbx"></span></td>
            <td class="mono strong">№ 127</td>
            <td><div class="strong">ООО «Тулаторг»</div><div class="t-tiny mut clip">Тула, пр. Ленина 108, офис 312</div></td>
            <td><span class="row" style="gap:8px"><span class="ava" style="width:26px;height:26px;font-size:10px">АМ</span>Артём М.</span></td>
            <td class="mono">29 авг, 17:30</td>
            <td><span class="chip c-warn"><span class="dot"></span>Назначен</span></td>
            <td class="rt mono strong">8 400 ₽</td>
            <td><span class="iconbtn">$I_MORE</span></td>
          </tr>
          <tr>
            <td><span class="cbx"></span></td>
            <td class="mono strong">№ 126</td>
            <td><div class="strong">Алла Викторовна</div><div class="t-tiny mut clip">Щёкино, Пионерская 4 · высотные работы</div></td>
            <td><span class="mut">не назначен</span></td>
            <td class="mono">30 авг, 10:00</td>
            <td><span class="chip c-default"><span class="dot"></span>Новый</span></td>
            <td class="rt mono strong">52 300 ₽</td>
            <td><span class="iconbtn">$I_MORE</span></td>
          </tr>
        </tbody>
      </table>
      <div class="pager" style="border-top:1px solid var(--line-soft)">
        <span class="t-lbl mut">Выбрана 1 из 24</span>
        <span class="pg"><span>‹</span><span class="on">1</span><span>2</span><span>3</span><span>›</span></span>
        <span class="row t-lbl mut" style="gap:8px">Строк на странице <span class="btn bord sm">8 $I_DOWN</span></span>
      </div>
    </div>
  </div>

  <!-- ═══ КАРТОЧКИ, ВКЛАДКИ, ПРОГРЕСС ═══ -->
  <div class="sec">
    <div class="sh">Карточки, вкладки, показатели</div>
    <div class="sd">Карточка разделена на три пояса линией — так у эталона; подвал несёт действие, шапка — заголовок и один управляющий элемент. Вкладки подчёркиванием, без рамок.</div>
    <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:16px">
      <div class="card"><div class="stat"><span class="ic">$I_ORD</span><span class="num n">7</span><span class="l">Активные заказы</span><span class="t-tiny fnt">2 сегодня, 5 на неделе</span></div></div>
      <div class="card"><div class="stat"><span class="ic" style="background:var(--warn-bg);color:var(--warn-ink)">$I_WARN</span><span class="num n">3</span><span class="l">Пора заказать</span><span class="t-tiny" style="color:var(--warn-ink)">ниже порога</span></div></div>
      <div class="card"><div class="stat"><span class="ic" style="background:var(--ok-bg);color:var(--ok-ink)">$I_CHECK</span><span class="num n">18</span><span class="l">Выполнено за месяц</span><span class="t-tiny fnt">против 14 в июле</span></div></div>
      <div class="card"><div class="hd"><span class="ttl">Загрузка недели</span></div><div class="bd stack" style="gap:10px">
        <span class="row" style="justify-content:space-between"><span class="t-lbl mut">Пётр К.</span><span class="t-lbl mono strong">32 / 40 ч</span></span>
        <span class="bar"><i style="width:80%"></i></span>
        <span class="row" style="justify-content:space-between"><span class="t-lbl mut">Артём М.</span><span class="t-lbl mono strong">44 / 40 ч</span></span>
        <span class="bar"><i style="width:100%;background:var(--warn-ink)"></i></span>
      </div></div>
    </div>
    <div class="tabs" style="margin-top:22px"><span class="tab on">Наряд</span><span class="tab">Чеклист выезда</span><span class="tab">Документы и фото</span><span class="tab">История</span></div>
  </div>

  <!-- ═══ ОКНА И ОБРАТНАЯ СВЯЗЬ ═══ -->
  <div class="sec">
    <div class="sh">Окна, пустоты и обратная связь</div>
    <div class="sd">Окно — та же трёхпоясная карточка, поднятая над затемнением. Пустое состояние всегда предлагает действие, а не сообщает об отсутствии. Скелетон повторяет форму данных, которые заменяет.</div>
    <div class="grid" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;align-items:start">
      <div>
        <span class="cap">модальное окно</span>
        <div style="padding:20px;border-radius:var(--r-md);background:var(--overlay)">
          <div class="card" style="box-shadow:var(--sh-lg)">
            <div class="hd"><span class="ttl">Переместить между зонами</span><span class="iconbtn"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m7 7 10 10M17 7 7 17"/></svg></span></div>
            <div class="bd stack" style="gap:12px">
              <div class="inp flat col"><span class="lab">Позиция</span><span class="val">Медная труба 1/4″</span></div>
              <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
                <div class="inp flat col"><span class="lab">Откуда</span><span class="val">Склад</span></div>
                <div class="inp flat col"><span class="lab">Куда</span><span class="val">Машина · Пётр К.</span></div>
              </div>
              <div class="inp flat col"><span class="lab">Сколько</span><span class="val mono">30 м</span></div>
            </div>
            <div class="ft row" style="gap:10px;justify-content:flex-end"><span class="btn light">Отмена</span><span class="btn solid">Переместить</span></div>
          </div>
        </div>
      </div>
      <div>
        <span class="cap">пустое состояние</span>
        <div class="card" style="height:270px;display:flex;align-items:center;justify-content:center;text-align:center">
          <div class="stack" style="gap:12px;align-items:center;padding:24px">
            <span style="width:48px;height:48px;border-radius:14px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_ORD</span>
            <span style="font-size:15px;font-weight:700;color:var(--ink)">Заказов пока нет</span>
            <span class="t-lbl mut" style="max-width:230px">Заведите первый вручную или создайте из заявки с сайта — адрес и комментарий подставятся сами.</span>
            <span class="btn flat sm">$I_PLUS Новый заказ</span>
          </div>
        </div>
      </div>
      <div>
        <span class="cap">загрузка и уведомление</span>
        <div class="card"><div class="bd stack" style="gap:14px">
          <div class="row" style="gap:12px"><span class="sk" style="width:32px;height:32px;border-radius:var(--r-pill)"></span><span class="stack" style="gap:6px;flex:1"><span class="sk" style="width:60%;height:11px"></span><span class="sk" style="width:40%;height:9px"></span></span></div>
          <div class="row" style="gap:12px"><span class="sk" style="width:32px;height:32px;border-radius:var(--r-pill)"></span><span class="stack" style="gap:6px;flex:1"><span class="sk" style="width:75%;height:11px"></span><span class="sk" style="width:35%;height:9px"></span></span></div>
        </div></div>
        <div class="card" style="margin-top:14px;box-shadow:var(--sh-md)"><div class="bd row" style="gap:12px">
          <span style="width:28px;height:28px;border-radius:9px;background:var(--ok-bg);color:var(--ok-ink);display:flex;align-items:center;justify-content:center;flex-shrink:0">$I_CHECK</span>
          <span class="stack" style="gap:2px;min-width:0"><span style="font-size:13.5px;font-weight:600;color:var(--ink)">Заказ № 128 сохранён</span><span class="t-tiny fnt">Монтажник получит уведомление</span></span>
          <span class="btn light sm" style="margin-left:auto">Отменить</span>
        </div></div>
      </div>
    </div>
  </div>
</div>
EOF
