. ./_tabs.sh
C="Данные|Заказы 3|Техника 2"
M="Аккаунт|Заказы 6|Выплаты и удержания|Заметки владельца"
h3() { printf '<div class="col"><span class="devlab">%s</span>' "$1"; }
mb() { printf '<div class="mbar"><span class="row" style="gap:10px"><span class="iconbtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span><span class="mtitle">%s</span></span>%s</div>' "$1" "$2"; }
cat <<EOF
<div class="board touch">
  <div>
    <span class="note">— Карточки клиента и монтажника —</span>
    <h2 style="font-family:var(--font-display);font-size:26px;font-weight:600;margin-top:8px;color:var(--ink)">Семь вкладок на трёх ширинах</h2>
    <p style="margin-top:8px;font-size:14px;color:var(--muted);max-width:1100px">У карточки клиента три вкладки, у карточки монтажника четыре — и здесь нарисованы все семь. Две последние монтажник не видит: раздел закрыт ролью на сервере, а не скрытием вкладки (CRM §6).</p>
  </div>

  <div class="tsec">
$(tsec "Клиент · вкладка 1" "Данные" "Телефон — ключ: по нормализованному номеру идут поиск и дедупликация, и второй карточки у человека быть не должно (ADR-105).")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$C" 1)
          <div class="bd20 grid" style="grid-template-columns:minmax(0,1fr) 330px;gap:14px;align-items:start">
            <div class="card"><div class="hd"><span class="ttl">Данные</span><span class="btn flat sm">Сохранить</span></div>
              <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:12px">
                <div class="inp flat col"><span class="lab">Имя</span><span class="val">Дмитрий Лапшин</span></div>
                <div class="inp flat col"><span class="lab">Телефон</span><span class="val mono">+7 (910) 155-24-68</span></div>
                <div class="inp flat col" style="grid-column:span 2"><span class="lab">Адрес</span><span class="val">Тула, ул. Оборонная, 12, кв. 34</span></div>
                <div class="inp flat col dis"><span class="lab">Нормализованный номер</span><span class="val mono">79101552468</span></div>
                <div class="inp flat col"><span class="lab">Источник</span><span class="val">Заявка с сайта</span></div>
                <div class="inp flat col tall" style="grid-column:span 2"><span class="lab">Заметка</span><span class="val" style="margin-top:4px;font-size:13.5px">Постоянный клиент, второй кондиционер. Не торговаться.</span></div>
              </div></div>
            <div class="stack" style="gap:12px">
              <div class="card"><div class="bd row" style="gap:12px"><span class="ava lg">ДЛ</span><span class="stack" style="gap:3px"><span class="strong" style="font-size:15px">Дмитрий Лапшин</span><span class="chip c-primary" style="align-self:flex-start">Постоянный</span></span></div></div>
              <div class="card"><div class="bd stack" style="gap:10px">
                <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Заказов</span><span class="num" style="font-size:18px">3</span></div>
                <div class="row" style="justify-content:space-between"><span class="t-lbl mut">На сумму</span><span class="num" style="font-size:18px">98 700 ₽</span></div>
                <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Первый заказ</span><span class="mono strong">3 июня 2023</span></div>
              </div>
              <div class="ft"><span class="btn solid" style="width:100%">$I_PLUS Новый заказ</span></div></div>
            </div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$C" 1 sm)
          <div class="bd16 stack" style="gap:12px">
            <div class="card"><div class="bd row" style="gap:12px"><span class="ava lg">ДЛ</span><span class="stack" style="gap:3px"><span class="strong">Дмитрий Лапшин</span><span class="t-tiny mut">3 заказа · 98 700 ₽</span></span><span class="btn solid sm" style="margin-left:auto">$I_PLUS Заказ</span></div></div>
            <div class="card"><div class="hd"><span class="ttl">Данные</span></div>
              <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:10px">
                <div class="inp flat col"><span class="lab">Имя</span><span class="val">Дмитрий Лапшин</span></div>
                <div class="inp flat col"><span class="lab">Телефон</span><span class="val mono">+7 (910) 155-24-68</span></div>
                <div class="inp flat col" style="grid-column:span 2"><span class="lab">Адрес</span><span class="val">Тула, Оборонная 12, кв. 34</span></div>
              </div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:620px">
$(mb "Дмитрий Лапшин" '<span class="iconbtn">'"$I_MORE"'</span>')
$(trow "$C" 1 xs)
          <div class="mbody">
            <div class="card"><div class="mrow" style="gap:10px"><div class="row" style="gap:12px"><span class="ava lg">ДЛ</span><span class="stack" style="gap:2px"><span class="strong">Дмитрий Лапшин</span><span class="chip c-primary" style="align-self:flex-start">Постоянный · 3 заказа</span></span></div>
              <a class="inp flat" style="justify-content:space-between;text-decoration:none"><span class="body"><span class="lab">Телефон</span><span class="val mono">+7 (910) 155-24-68</span></span><span class="btn flat sm">Позвонить</span></a>
              <div class="inp flat col"><span class="lab">Адрес</span><span class="val">Тула, Оборонная 12, кв. 34</span></div></div></div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
              <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Заказов</span><span class="v"><span class="n" style="font-size:22px">3</span></span></div></div>
              <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">На сумму</span><span class="v"><span class="n" style="font-size:22px">98 700 ₽</span></span></div></div>
            </div>
          </div>
          <div class="sticky-act"><span class="btn solid lg" style="width:100%">$I_PLUS Новый заказ клиенту</span></div>
        </div></div>
    </div>
    <span class="devcap">768 — сводка отдельной карточкой сверху, поля в две колонки. 390 — телефон превращается в кнопку звонка, показатели двумя плитками.</span>
  </div>

  <div class="tsec">
$(tsec "Клиент · вкладка 2" "Заказы" "История клиента. Гарантия считается отсюда: заказ трёхлетней давности при гарантии три года — истёкшая, и это видно без расчётов в уме.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$C" 2)
          <div class="bd20"><div class="card"><div class="bd" style="padding:0"><table class="tbl">
            <thead><tr><th style="width:76px">Номер</th><th>Работа</th><th style="width:130px">Когда</th><th style="width:150px">Монтажник</th><th class="rt" style="width:110px">Сумма</th><th style="width:130px">Статус</th><th style="width:130px">Гарантия</th></tr></thead>
            <tbody>
              <tr><td class="mono strong">№ 128</td><td><div class="strong">Монтаж 09 инвертор</div><div class="t-tiny mut">Оборонная 12, кв. 34</div></td><td class="mono t-lbl">29 авг 2026</td><td><span class="usr"><span class="ava xs">ПК</span><span class="nm" style="font-size:13px">Пётр К.</span></span></td><td class="rt mono strong">34 900 ₽</td><td><span class="chip c-primary"><span class="dot"></span>В работе</span></td><td class="mut t-lbl">с закрытия</td></tr>
              <tr><td class="mono strong">№ 96</td><td><div class="strong">ТО и чистка</div><div class="t-tiny mut">Оборонная 12, кв. 34</div></td><td class="mono t-lbl">12 мая 2026</td><td><span class="usr"><span class="ava xs">ПК</span><span class="nm" style="font-size:13px">Пётр К.</span></span></td><td class="rt mono strong">3 200 ₽</td><td><span class="chip c-success"><span class="dot"></span>Выполнен</span></td><td><span class="chip c-success">до 12.05.29</span></td></tr>
              <tr><td class="mono strong">№ 41</td><td><div class="strong">Монтаж 07</div><div class="t-tiny mut">Оборонная 12, кв. 34</div></td><td class="mono t-lbl">3 июн 2023</td><td><span class="usr"><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">ОВ</span><span class="nm" style="font-size:13px">Олег В.</span></span></td><td class="rt mono strong">60 600 ₽</td><td><span class="chip c-success"><span class="dot"></span>Выполнен</span></td><td><span class="chip c-danger">истекла</span></td></tr>
            </tbody></table></div></div></div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$C" 2 sm)
          <div class="bd16"><div class="card"><div class="bd" style="padding:0"><table class="tbl">
            <thead><tr><th style="width:70px">Номер</th><th>Работа</th><th class="rt" style="width:100px">Сумма</th><th style="width:120px">Гарантия</th></tr></thead>
            <tbody>
              <tr><td class="mono strong">№ 128</td><td><div class="strong">Монтаж 09 инвертор</div><div class="t-tiny mut">29 авг 2026 · Пётр К.</div></td><td class="rt mono strong">34 900 ₽</td><td class="mut t-lbl">с закрытия</td></tr>
              <tr><td class="mono strong">№ 96</td><td><div class="strong">ТО и чистка</div><div class="t-tiny mut">12 мая 2026 · Пётр К.</div></td><td class="rt mono strong">3 200 ₽</td><td><span class="chip c-success">до 12.05.29</span></td></tr>
              <tr><td class="mono strong">№ 41</td><td><div class="strong">Монтаж 07</div><div class="t-tiny mut">3 июн 2023 · Олег В.</div></td><td class="rt mono strong">60 600 ₽</td><td><span class="chip c-danger">истекла</span></td></tr>
            </tbody></table></div></div></div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:620px">
$(mb "Дмитрий Лапшин" '')
$(trow "$C" 2 xs)
          <div class="mbody">
            <div class="card"><div class="mrow" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 128</span><span class="chip c-primary"><span class="dot"></span>В работе</span></div><span class="strong">Монтаж 09 инвертор</span><span class="t-tiny mut">29 августа 2026 · Пётр К. · 34 900 ₽</span></div></div>
            <div class="card"><div class="mrow" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 96</span><span class="chip c-success">до 12.05.29</span></div><span class="strong">ТО и чистка</span><span class="t-tiny mut">12 мая 2026 · Пётр К. · 3 200 ₽</span></div></div>
            <div class="card"><div class="mrow" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 41</span><span class="chip c-danger">гарантия истекла</span></div><span class="strong">Монтаж 07</span><span class="t-tiny mut">3 июня 2023 · Олег В. · 60 600 ₽</span></div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">768 — дата и монтажник уходят в подпись, статус уступает место гарантии. 390 — карточки, гарантия чипом справа сверху: за ней и открывают историю.</span>
  </div>


  <div class="tsec">
$(tsec "Клиент · вкладка 3" "Техника" "То, чего сейчас взять неоткуда (CRM §3.2). Запись появляется сама после закрытого монтажа — руками её не заводят. Гарантия хранится датой, а не сроком: сроки в настройках меняются, обещание конкретному человеку — нет.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$C" 3)
          <div class="bd20 grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start">
            <div class="card"><div class="hd"><span class="ttl">Кондиционер в спальне</span><span class="chip c-success">Гарантия до 12.05.29</span></div>
              <div class="bd grid" style="grid-template-columns:150px minmax(0,1fr);gap:14px">
                <div style="height:112px;border-radius:var(--r-nav);background:linear-gradient(135deg,var(--accent-bg),var(--bg-soft));border:1px solid var(--line)"></div>
                <div class="stack" style="gap:8px">
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Модель</span><span class="strong">Hisense AS-09HR4</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Поставлен</span><span class="mono strong">12 мая 2026</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Из наряда</span><span class="mono strong">№ 96</span></div>
                  <div class="alert a-warn" style="padding:8px 10px"><span class="ai">$I_BELL</span><div><div class="ad">ТО через год от монтажа — 12 мая 2027</div></div></div>
                </div>
              </div></div>
            <div class="card"><div class="hd"><span class="ttl">Кондиционер в зале</span><span class="chip c-danger">Гарантия истекла</span></div>
              <div class="bd grid" style="grid-template-columns:150px minmax(0,1fr);gap:14px">
                <div style="height:112px;border-radius:var(--r-nav);background:var(--bg-soft);border:1px dashed var(--line-ui);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px;text-align:center;padding:8px">Фото установки<br>не сохранилось</div>
                <div class="stack" style="gap:8px">
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Модель</span><span class="strong">Ballu BSWI-07HN8</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Поставлен</span><span class="mono strong">3 июня 2023</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Из наряда</span><span class="mono strong">№ 41</span></div>
                  <span class="btn flat sm" style="align-self:flex-start">$I_PLUS Записать на платное ТО</span>
                </div>
              </div></div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$C" 3 sm)
          <div class="bd16 stack" style="gap:12px">
            <div class="card"><div class="bd row" style="gap:12px;align-items:flex-start">
              <div style="width:96px;height:76px;border-radius:var(--r-nav);background:linear-gradient(135deg,var(--accent-bg),var(--bg-soft));border:1px solid var(--line);flex-shrink:0"></div>
              <div class="stack" style="gap:5px;flex:1;min-width:0">
                <div class="row" style="justify-content:space-between"><span class="strong">Hisense AS-09HR4</span><span class="chip c-success">до 12.05.29</span></div>
                <span class="t-tiny mut">Спальня · поставлен 12 мая 2026 · наряд № 96</span>
                <span class="t-tiny" style="color:var(--warn-ink)">ТО через год — 12 мая 2027</span>
              </div>
            </div></div>
            <div class="card"><div class="bd row" style="gap:12px;align-items:flex-start">
              <div style="width:96px;height:76px;border-radius:var(--r-nav);background:var(--bg-soft);border:1px dashed var(--line-ui);flex-shrink:0"></div>
              <div class="stack" style="gap:5px;flex:1;min-width:0">
                <div class="row" style="justify-content:space-between"><span class="strong">Ballu BSWI-07HN8</span><span class="chip c-danger">истекла</span></div>
                <span class="t-tiny mut">Зал · поставлен 3 июня 2023 · наряд № 41</span>
                <span class="btn flat sm" style="align-self:flex-start">Записать на платное ТО</span>
              </div>
            </div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:620px">
$(mb "Дмитрий Лапшин" '')
$(trow "$C" 3 xs)
          <div class="mbody">
            <div class="card"><div class="mrow" style="gap:8px">
              <div style="height:132px;border-radius:var(--r-nav);background:linear-gradient(135deg,var(--accent-bg),var(--bg-soft));border:1px solid var(--line)"></div>
              <div class="row" style="justify-content:space-between"><span class="strong">Hisense AS-09HR4</span><span class="chip c-success">до 12.05.29</span></div>
              <span class="t-tiny mut">Спальня · 12 мая 2026 · наряд № 96</span>
              <div class="alert a-warn" style="padding:8px 10px"><span class="ai">$I_BELL</span><div><div class="ad">ТО 12 мая 2027</div></div></div>
            </div></div>
            <div class="card"><div class="mrow" style="gap:8px">
              <div class="row" style="justify-content:space-between"><span class="strong">Ballu BSWI-07HN8</span><span class="chip c-danger">гарантия истекла</span></div>
              <span class="t-tiny mut">Зал · 3 июня 2023 · наряд № 41</span>
              <span class="btn flat sm" style="align-self:flex-start">Записать на платное ТО</span>
            </div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">1440 — две карточки в ряд, фото слева от характеристик. 768 — фото ужимается до 96px и уходит в строку. 390 — фото во всю ширину сверху: на телефоне его открывают, чтобы вспомнить, как стоит блок, и мелкое оно бесполезно. Напоминание о ТО остаётся на всех ширинах: это повод позвонить через год.</span>
  </div>

  <div class="tsec">
$(tsec "Монтажник · вкладка 1" "Аккаунт" "Управление доступом (CRM §3.6): имя, логин, телефон, новый пароль, отключение, удаление. Опасные действия отделены от обычных полей и живут в своей зоне внизу.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$M" 1)
          <div class="bd20 grid" style="grid-template-columns:minmax(0,1fr) 330px;gap:14px;align-items:start">
            <div class="stack" style="gap:12px">
              <div class="card"><div class="hd"><span class="ttl">Аккаунт</span><span class="btn flat sm">Сохранить</span></div>
                <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:12px">
                  <div class="inp bordered col"><span class="lab">Имя</span><span class="val">Артём Морозов</span></div>
                  <div class="inp bordered col"><span class="lab">Телефон</span><span class="val mono">+7 (920) 771-08-15</span></div>
                  <div class="inp bordered col"><span class="lab">Логин</span><span class="val mono">morozov</span></div>
                  <div class="inp bordered col"><span class="lab">Новый пароль</span><span class="val ph">Оставьте пустым, чтобы не менять</span></div>
                </div></div>
              <div class="card"><div class="hd"><span class="ttl">Доступ</span></div>
                <div class="bd stack" style="gap:12px">
                  <div class="row" style="gap:12px"><span class="sw on"></span><span class="stack" style="gap:2px"><span class="strong">Активен</span><span class="t-tiny mut">Видит свои наряды и может их закрывать</span></span></div>
                  <div class="row" style="gap:12px"><span class="sw"></span><span class="stack" style="gap:2px"><span class="strong">Получает уведомления о новых нарядах</span><span class="t-tiny mut">Telegram, если привязан</span></span></div>
                </div></div>
              <div class="card" style="border-color:var(--error-line)"><div class="hd"><span class="ttl" style="color:var(--error-ink)">Опасная зона</span></div>
                <div class="bd stack" style="gap:12px">
                  <div class="row" style="justify-content:space-between;gap:14px"><span class="stack" style="gap:2px"><span class="strong">Отключить</span><span class="t-tiny mut">Перестаёт входить, наряды и история остаются</span></span><span class="btn bord sm">Отключить</span></div>
                  <div class="row" style="justify-content:space-between;gap:14px"><span class="stack" style="gap:2px"><span class="strong">Удалить</span><span class="t-tiny mut">Нельзя: за человеком закреплены 38 нарядов. Сначала отключите</span></span><span class="btn danger sm dis">Удалить</span></div>
                </div></div>
            </div>
            <div class="stack" style="gap:12px">
              <div class="card"><div class="bd row" style="gap:12px"><span class="ava lg" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="stack" style="gap:3px"><span class="strong" style="font-size:15px">Артём Морозов</span><span class="chip c-success" style="align-self:flex-start"><span class="dot"></span>Активен</span></span></div></div>
              <div class="alert a-warn"><span class="ai">$I_WARN</span><div><div class="at">Пароль не показывается</div><div class="ad">Хранится хешем Argon2id, прочитать его нельзя даже владельцу. Забытый — только новый.</div></div></div>
              <div class="alert a-danger"><span class="ai">$I_WARN</span><div><div class="at">Вкладку видит только владелец</div><div class="ad">Проверка роли в обработчике маршрута, а не скрытие кнопки (CRM §6).</div></div></div>
            </div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$M" 1 sm)
          <div class="bd16 stack" style="gap:12px">
            <div class="card"><div class="bd row" style="gap:12px"><span class="ava lg" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="stack" style="gap:3px"><span class="strong">Артём Морозов</span><span class="t-tiny mut">morozov · активен</span></span><span class="sw on" style="margin-left:auto"></span></div></div>
            <div class="card"><div class="hd"><span class="ttl">Аккаунт</span><span class="btn flat sm">Сохранить</span></div>
              <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:10px">
                <div class="inp bordered col"><span class="lab">Имя</span><span class="val">Артём Морозов</span></div>
                <div class="inp bordered col"><span class="lab">Телефон</span><span class="val mono">+7 (920) 771-08-15</span></div>
                <div class="inp bordered col"><span class="lab">Логин</span><span class="val mono">morozov</span></div>
                <div class="inp bordered col"><span class="lab">Новый пароль</span><span class="val ph">Не меняется</span></div>
              </div></div>
            <div class="card" style="border-color:var(--error-line)"><div class="bd row" style="justify-content:space-between;gap:12px"><span class="stack" style="gap:2px"><span class="strong" style="color:var(--error-ink)">Опасная зона</span><span class="t-tiny mut">Удаление закрыто: 38 нарядов</span></span><span class="btn bord sm">Отключить</span></div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Артём Морозов" '')
$(trow "$M" 1 xs)
          <div class="mbody">
            <div class="card"><div class="mrow" style="gap:10px">
              <div class="row" style="gap:12px"><span class="ava lg" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="stack" style="gap:2px"><span class="strong">Артём Морозов</span><span class="chip c-success" style="align-self:flex-start">Активен</span></span></div>
              <div class="inp bordered col"><span class="lab">Логин</span><span class="val mono">morozov</span></div>
              <div class="inp bordered col"><span class="lab">Телефон</span><span class="val mono">+7 (920) 771-08-15</span></div>
              <div class="inp bordered col"><span class="lab">Новый пароль</span><span class="val ph">Оставьте пустым</span></div>
            </div></div>
            <div class="card" style="border-color:var(--error-line)"><div class="mrow" style="gap:10px">
              <span class="strong" style="color:var(--error-ink)">Опасная зона</span>
              <span class="t-tiny mut">Удаление закрыто: за человеком 38 нарядов</span>
              <span class="btn bord sm" style="align-self:flex-start">Отключить доступ</span>
            </div></div>
          </div>
          <div class="sticky-act"><span class="btn solid lg" style="width:100%">Сохранить</span></div>
        </div></div>
    </div>
    <span class="devcap">Опасная зона отделена рамкой на всех трёх ширинах и всегда стоит последней: до неё доскроллят осознанно. «Удалить» отключена с объяснением прямо в подписи — отключённая кнопка без причины хуже отсутствующей.</span>
  </div>

  <div class="tsec">
$(tsec "Монтажник · вкладка 2" "Заказы" "Все наряды человека — по ним считаются и выплаты, и загрузка. Просроченный виден сразу: подсветка строки, а не только чип.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$M" 2)
          <div class="bd20">
            <div class="row" style="gap:10px;margin-bottom:12px">
              <span class="btn bord sm">$I_FILT Статус: любой $I_CHEV</span>
              <span class="btn bord sm">Август 2026 $I_CHEV</span>
              <span class="t-lbl mut" style="margin-left:auto">6 нарядов · 39 000 ₽ начислено</span>
            </div>
            <div class="card"><div class="bd" style="padding:0"><table class="tbl">
              <thead><tr><th style="width:80px">Номер</th><th>Работа</th><th style="width:200px">Адрес</th><th style="width:120px">Когда</th><th class="rt" style="width:120px">Выплата</th><th style="width:150px">Статус</th></tr></thead>
              <tbody>
                <tr><td class="mono strong">№ 127</td><td class="strong">ТО и чистка</td><td class="t-lbl">Первомайская 3, кв. 12</td><td class="mono t-lbl">29 авг</td><td class="rt mono strong">3 000 ₽</td><td><span class="chip c-success"><span class="dot"></span>Выполнен</span></td></tr>
                <tr><td class="mono strong">№ 124</td><td class="strong">Монтаж 12 инвертор</td><td class="t-lbl">Ложевая 22, кв. 5</td><td class="mono t-lbl">26 авг</td><td class="rt mono strong">6 000 ₽</td><td><span class="chip c-success"><span class="dot"></span>Выполнен</span></td></tr>
                <tr class="rowbad"><td class="mono strong">№ 119</td><td class="strong">Монтаж 12</td><td class="t-lbl">Кутузова 44, офис 3</td><td class="mono t-lbl">21 авг</td><td class="rt mono strong">6 000 ₽</td><td><span class="chip c-danger"><span class="dot"></span>Просрочен 2 дня</span></td></tr>
                <tr><td class="mono strong">№ 131</td><td class="strong">Замер</td><td class="t-lbl">Оборонная 12, кв. 34</td><td class="mono t-lbl">30 авг</td><td class="rt mono strong">1 000 ₽</td><td><span class="chip c-primary"><span class="dot"></span>Назначен</span></td></tr>
              </tbody></table></div></div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$M" 2 sm)
          <div class="bd16">
            <div class="row" style="gap:8px;margin-bottom:10px"><span class="btn bord sm">$I_FILT Статус $I_CHEV</span><span class="t-lbl mut" style="margin-left:auto">6 нарядов · 39 000 ₽</span></div>
            <div class="card"><div class="bd" style="padding:0"><table class="tbl">
              <thead><tr><th style="width:74px">Номер</th><th>Работа</th><th class="rt" style="width:100px">Выплата</th><th style="width:130px">Статус</th></tr></thead>
              <tbody>
                <tr><td class="mono strong">№ 127</td><td><div class="strong">ТО и чистка</div><div class="t-tiny mut">Первомайская 3 · 29 авг</div></td><td class="rt mono strong">3 000 ₽</td><td><span class="chip c-success"><span class="dot"></span>Выполнен</span></td></tr>
                <tr class="rowbad"><td class="mono strong">№ 119</td><td><div class="strong">Монтаж 12</div><div class="t-tiny mut">Кутузова 44 · 21 авг</div></td><td class="rt mono strong">6 000 ₽</td><td><span class="chip c-danger"><span class="dot"></span>Просрочен</span></td></tr>
                <tr><td class="mono strong">№ 131</td><td><div class="strong">Замер</div><div class="t-tiny mut">Оборонная 12 · 30 авг</div></td><td class="rt mono strong">1 000 ₽</td><td><span class="chip c-primary"><span class="dot"></span>Назначен</span></td></tr>
              </tbody></table></div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Артём Морозов" '')
$(trow "$M" 2 xs)
          <div class="mbody">
            <div class="card"><div class="mrow" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 127</span><span class="chip c-success">Выполнен</span></div><span class="strong">ТО и чистка</span><span class="t-tiny mut">Первомайская 3, кв. 12 · 29 августа · 3 000 ₽</span></div></div>
            <div class="card" style="border-color:var(--error-line)"><div class="mrow rowbad" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 119</span><span class="chip c-danger">Просрочен 2 дня</span></div><span class="strong">Монтаж 12</span><span class="t-tiny mut">Кутузова 44, офис 3 · 21 августа · 6 000 ₽</span></div></div>
            <div class="card"><div class="mrow" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="mono strong">№ 131</span><span class="chip c-primary">Назначен</span></div><span class="strong">Замер</span><span class="t-tiny mut">Оборонная 12, кв. 34 · 30 августа · 1 000 ₽</span></div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">768 — адрес и дата уходят в подпись работы. 390 — карточки; просроченный наряд помечен дважды, рамкой карточки и подсветкой, потому что это единственное, ради чего владелец открывает вкладку с телефона.</span>
  </div>

  <div class="tsec">
$(tsec "Монтажник · вкладка 3" "Выплаты и удержания" "Слово «штраф» здесь запрещено, и не из вежливости: штрафов как вида взыскания в ТК РФ нет, а удержания ограничены статьёй 137 (CRM §9). Удержание всегда несёт основание и ссылку на наряд — без них оно выглядит произволом и разрушает доверие быстрее, чем экономит деньги.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$M" 3)
          <div class="bd20">
            <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px">
              <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Выполнено за месяц</span><span class="v"><span class="n" style="font-size:22px">6</span></span></div></div>
              <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Начислено</span><span class="v"><span class="n" style="font-size:22px">39 000 ₽</span></span></div></div>
              <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Удержания</span><span class="v"><span class="n" style="font-size:22px;color:var(--error-ink)">3 000 ₽</span></span></div></div>
              <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">К выплате</span><span class="v"><span class="n" style="font-size:22px;color:var(--ok-ink)">36 000 ₽</span></span></div></div>
            </div>
            <div class="card"><div class="bd" style="padding:0"><table class="tbl">
              <thead><tr><th style="width:120px">Когда</th><th style="width:140px">Вид</th><th>Основание</th><th class="rt" style="width:130px">Сумма</th></tr></thead>
              <tbody>
                <tr><td class="mono t-lbl">29 авг</td><td><span class="chip c-success">Начисление</span></td><td class="t-lbl">Наряд № 127 · ТО и чистка</td><td class="rt mono strong">3 000 ₽</td></tr>
                <tr><td class="mono t-lbl">26 авг</td><td><span class="chip c-success">Начисление</span></td><td class="t-lbl">Наряд № 124 · Монтаж</td><td class="rt mono strong">6 000 ₽</td></tr>
                <tr class="rowbad"><td class="mono t-lbl">21 авг</td><td><span class="chip c-danger">Удержание</span></td><td class="t-lbl">Наряд № 119 · оставил мусор на лестничной клетке, клиент пожаловался</td><td class="rt mono strong" style="color:var(--error-ink)">−3 000 ₽</td></tr>
              </tbody></table></div></div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$M" 3 sm)
          <div class="bd16">
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
              <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Начислено</span><span class="v"><span class="n" style="font-size:21px">39 000 ₽</span></span></div></div>
              <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">К выплате</span><span class="v"><span class="n" style="font-size:21px;color:var(--ok-ink)">36 000 ₽</span><span class="trend t-down">−3 000</span></span></div></div>
            </div>
            <div class="card"><div class="bd" style="padding:0"><table class="tbl">
              <thead><tr><th style="width:100px">Когда</th><th>Основание</th><th class="rt" style="width:110px">Сумма</th></tr></thead>
              <tbody>
                <tr><td class="mono t-lbl">29 авг</td><td><div class="row" style="gap:8px"><span class="chip c-success">Начисление</span></div><div class="t-tiny mut">Наряд № 127 · ТО</div></td><td class="rt mono strong">3 000 ₽</td></tr>
                <tr class="rowbad"><td class="mono t-lbl">21 авг</td><td><div class="row" style="gap:8px"><span class="chip c-danger">Удержание</span></div><div class="t-tiny mut">Наряд № 119 · оставил мусор</div></td><td class="rt mono strong" style="color:var(--error-ink)">−3 000 ₽</td></tr>
              </tbody></table></div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:620px">
$(mb "Артём Морозов" '')
$(trow "$M" 3 xs)
          <div class="mbody">
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
              <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Начислено</span><span class="v"><span class="n" style="font-size:20px">39 000 ₽</span></span></div></div>
              <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">К выплате</span><span class="v"><span class="n" style="font-size:20px;color:var(--ok-ink)">36 000 ₽</span></span></div></div>
            </div>
            <div class="card"><div class="bd" style="padding:0">
              <div class="mrow" style="gap:5px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="chip c-success">Начисление</span><span class="mono strong">3 000 ₽</span></div><span class="t-lbl">Наряд № 127 · ТО и чистка</span><span class="mono t-tiny fnt">29 августа</span></div>
              <div class="mrow" style="gap:5px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="chip c-success">Начисление</span><span class="mono strong">6 000 ₽</span></div><span class="t-lbl">Наряд № 124 · Монтаж</span><span class="mono t-tiny fnt">26 августа</span></div>
              <div class="mrow" style="gap:5px"><div class="row" style="justify-content:space-between"><span class="chip c-danger">Удержание</span><span class="mono strong" style="color:var(--error-ink)">−3 000 ₽</span></div><span class="t-lbl">Наряд № 119 · оставил мусор на лестничной клетке</span><span class="mono t-tiny fnt">21 августа</span></div>
            </div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">768 — четыре плитки становятся двумя: «выполнено» и «удержания» уходят в подпись. 390 — движения карточками, основание удержания целиком.</span>
  </div>

  <div class="tsec">
$(tsec "Монтажник · вкладка 4" "Заметки владельца" "Монтажник не видит ни вкладки, ни её содержимого: раздел закрыт ролью на сервере. Скрытая кнопка — подсказка интерфейса, а не защита.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$M" 4)
          <div class="bd20 grid" style="grid-template-columns:minmax(0,1fr) 330px;gap:14px;align-items:start">
            <div class="stack" style="gap:10px">
              <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:6px"><span class="row" style="justify-content:space-between"><span class="mono t-tiny fnt">21 августа · Сергей Демидов</span><span class="iconbtn">$I_MORE</span></span><span class="t-lbl">Работает быстро, но за собой убирает не всегда. Проверять фото «после».</span></div></div>
              <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:6px"><span class="row" style="justify-content:space-between"><span class="mono t-tiny fnt">14 июня · Сергей Демидов</span><span class="iconbtn">$I_MORE</span></span><span class="t-lbl">Просил больше заказов по Щёкино — живёт рядом, экономит дорогу.</span></div></div>
              <div class="inp bordered col tall" style="min-height:88px"><span class="lab">Новая заметка</span><span class="val ph" style="margin-top:4px">Что важно помнить об этом человеке</span></div>
              <span class="btn flat" style="align-self:flex-start">Добавить заметку</span>
            </div>
            <div class="alert a-danger"><span class="ai">$I_WARN</span><div><div class="at">Закрыто ролью</div><div class="ad">Вкладка отсутствует в разметке для монтажника, а не скрыта стилями. Проверка живёт в обработчике маршрута.</div></div></div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$M" 4 sm)
          <div class="bd16 stack" style="gap:10px">
            <div class="alert a-danger"><span class="ai">$I_WARN</span><div><div class="at">Монтажник этой вкладки не видит</div></div></div>
            <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:6px;padding:14px"><span class="mono t-tiny fnt">21 августа</span><span class="t-lbl">Работает быстро, но за собой убирает не всегда. Проверять фото «после».</span></div></div>
            <div class="card flat" style="border-color:var(--line)"><div class="bd stack" style="gap:6px;padding:14px"><span class="mono t-tiny fnt">14 июня</span><span class="t-lbl">Просил больше заказов по Щёкино — живёт рядом.</span></div></div>
            <div class="inp bordered col tall" style="min-height:72px"><span class="lab">Новая заметка</span><span class="val ph" style="margin-top:4px">Что важно помнить</span></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:620px">
$(mb "Артём Морозов" '')
$(trow "$M" 4 xs)
          <div class="mbody">
            <div class="alert a-danger"><span class="ai">$I_WARN</span><div><div class="at">Закрыто от монтажника</div></div></div>
            <div class="card"><div class="mrow" style="gap:6px"><span class="mono t-tiny fnt">21 августа</span><span class="t-lbl">Работает быстро, но за собой убирает не всегда. Проверять фото «после».</span></div></div>
            <div class="card"><div class="mrow" style="gap:6px"><span class="mono t-tiny fnt">14 июня</span><span class="t-lbl">Просил больше заказов по Щёкино — живёт рядом, экономит дорогу.</span></div></div>
          </div>
          <div class="sticky-act"><span class="btn flat lg" style="width:100%">$I_PLUS Добавить заметку</span></div>
        </div></div>
    </div>
    <span class="devcap">768 — предупреждение о роли поднимается наверх, поле новой заметки внизу. 390 — заметки карточками, добавление действием внизу экрана.</span>
  </div>
</div>
EOF
