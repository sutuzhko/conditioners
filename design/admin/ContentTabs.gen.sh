. ./_tabs.sh
R="На модерации 7|Опубликованные|Отклонённые|Все"
A="Текст|SEO|Публикация"
h3() { printf '<div class="col"><span class="devlab">%s</span>' "$1"; }
mb() { printf '<div class="mbar"><span class="row" style="gap:10px"><span class="iconbtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span><span class="mtitle">%s</span></span>%s</div>' "$1" "$2"; }
star() { printf '<span class="stars">'; i=1; while [ $i -le 5 ]; do if [ $i -le "$1" ]; then printf '<span class="s on">★</span>'; else printf '<span class="s">★</span>'; fi; i=$((i+1)); done; printf '</span>'; }
cat <<EOF
<div class="board touch">
  <div>
    <span class="note">— Отзывы и статья —</span>
    <h2 style="font-family:var(--font-display);font-size:26px;font-weight:600;margin-top:8px;color:var(--ink)">Семь вкладок на трёх ширинах</h2>
    <p style="margin-top:8px;font-size:14px;color:var(--muted);max-width:1100px">Текст отзыва нигде не редактируется — ни на одной вкладке нет поля ввода поверх него: модератор меняет только статус (инвариант 7). Поэтому действие тут всегда пара кнопок, а не форма.</p>
  </div>

  <div class="tsec">
$(tsec "Отзывы · вкладка 1" "На модерации" "Очередь, ради которой заходят. Текст целиком, без «показать ещё»: решение принимают по нему, а не по первой строке.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$R" 1)
          <div class="bd20 stack" style="gap:12px">
            <div class="card"><div class="bd stack" style="gap:10px">
              <div class="row" style="gap:12px;align-items:flex-start">
                <span class="ava lg">ЕС</span>
                <span class="stack" style="gap:4px;flex:1;min-width:0">
                  <span class="row" style="gap:10px"><span class="strong" style="font-size:15px">Екатерина С.</span>$(star 5)<span class="chip c-warn">На модерации</span></span>
                  <span class="mono t-tiny fnt">29 августа 2026, 10:12 · заказ № 124 · Пролетарский район</span>
                </span>
                <span class="row" style="gap:8px"><span class="btn bord sm">Отклонить</span><span class="btn solid sm">$I_CHECK Опубликовать</span></span>
              </div>
              <p style="font-size:14.5px;line-height:1.6;color:var(--ink)">Приехали в назначенный день, без переносов. Смету назвали до начала работ и она не выросла ни на рубль. Мусор увезли с собой, стену за собой протёрли. Отдельное спасибо за то, что объяснили, как чистить фильтры самому.</p>
            </div></div>
            <div class="card"><div class="bd stack" style="gap:10px">
              <div class="row" style="gap:12px;align-items:flex-start">
                <span class="ava lg">ВМ</span>
                <span class="stack" style="gap:4px;flex:1;min-width:0">
                  <span class="row" style="gap:10px"><span class="strong" style="font-size:15px">Владимир М.</span>$(star 3)<span class="chip c-warn">На модерации</span></span>
                  <span class="mono t-tiny fnt">28 августа 2026, 19:40 · заказ № 121 · Зареченский район</span>
                </span>
                <span class="row" style="gap:8px"><span class="btn bord sm">Отклонить</span><span class="btn solid sm">$I_CHECK Опубликовать</span></span>
              </div>
              <p style="font-size:14.5px;line-height:1.6;color:var(--ink)">Работу сделали нормально, но приехали на два часа позже, чем договаривались, и никто не позвонил предупредить. Пришлось отпрашиваться с работы второй раз.</p>
              <div class="alert a-warn"><span class="ai">$I_WARN</span><div><div class="at">Тройка — это тоже отзыв</div><div class="ad">Отклонять его за оценку нельзя: причина отказа выбирается из списка и видна владельцу.</div></div></div>
            </div></div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$R" 1 sm)
          <div class="bd16 stack" style="gap:12px">
            <div class="card"><div class="bd stack" style="gap:10px">
              <div class="row" style="gap:10px"><span class="ava">ЕС</span><span class="stack" style="gap:3px;flex:1;min-width:0"><span class="strong">Екатерина С.</span><span class="mono t-tiny fnt">29 авг · заказ № 124</span></span>$(star 5)</div>
              <p style="font-size:14px;line-height:1.6;color:var(--ink)">Приехали в назначенный день, без переносов. Смету назвали до начала работ и она не выросла ни на рубль. Мусор увезли с собой.</p>
              <div class="row" style="gap:8px"><span class="btn bord sm" style="flex:1">Отклонить</span><span class="btn solid sm" style="flex:1">$I_CHECK Опубликовать</span></div>
            </div></div>
            <div class="card"><div class="bd stack" style="gap:10px">
              <div class="row" style="gap:10px"><span class="ava">ВМ</span><span class="stack" style="gap:3px;flex:1;min-width:0"><span class="strong">Владимир М.</span><span class="mono t-tiny fnt">28 авг · заказ № 121</span></span>$(star 3)</div>
              <p style="font-size:14px;line-height:1.6;color:var(--ink)">Работу сделали нормально, но приехали на два часа позже и никто не позвонил предупредить.</p>
              <div class="row" style="gap:8px"><span class="btn bord sm" style="flex:1">Отклонить</span><span class="btn solid sm" style="flex:1">$I_CHECK Опубликовать</span></div>
            </div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Отзывы" '<span class="chip c-warn">7</span>')
$(trow "$R" 1 xs)
          <div class="mbody">
            <div class="card"><div class="mrow" style="gap:10px">
              <div class="row" style="gap:10px"><span class="ava">ЕС</span><span class="stack" style="gap:2px;flex:1;min-width:0"><span class="strong">Екатерина С.</span>$(star 5)</span></div>
              <p style="font-size:14px;line-height:1.6;color:var(--ink)">Приехали в назначенный день, без переносов. Смету назвали до начала работ и она не выросла ни на рубль.</p>
              <span class="mono t-tiny fnt">29 августа · заказ № 124</span>
              <div class="row" style="gap:8px"><span class="btn bord sm" style="flex:1">Отклонить</span><span class="btn solid sm" style="flex:1">Опубликовать</span></div>
            </div></div>
            <div class="card"><div class="mrow" style="gap:10px">
              <div class="row" style="gap:10px"><span class="ava">ВМ</span><span class="stack" style="gap:2px;flex:1;min-width:0"><span class="strong">Владимир М.</span>$(star 3)</span></div>
              <p style="font-size:14px;line-height:1.6;color:var(--ink)">Работу сделали нормально, но приехали на два часа позже и никто не позвонил предупредить.</p>
              <span class="mono t-tiny fnt">28 августа · заказ № 121</span>
              <div class="row" style="gap:8px"><span class="btn bord sm" style="flex:1">Отклонить</span><span class="btn solid sm" style="flex:1">Опубликовать</span></div>
            </div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">1440 — действия справа в шапке отзыва. 768 и 390 — уходят вниз в ряд по половине ширины: на узком две кнопки в строке дают тап-зону 44px без переноса.</span>
  </div>

  <div class="tsec">
$(tsec "Отзывы · вкладка 2" "Опубликованные" "Снять с публикации можно, отредактировать — нет. Кнопка одна, и она про статус.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$R" 2)
          <div class="bd20"><div class="card"><div class="bd" style="padding:0"><table class="tbl">
            <thead><tr><th style="width:190px">Автор</th><th style="width:110px">Оценка</th><th>Отзыв</th><th style="width:130px">Опубликован</th><th style="width:140px">Действие</th></tr></thead>
            <tbody>
              <tr><td><span class="usr"><span class="ava xs">ИГ</span><span class="nm">Ирина Г.</span></span></td><td>$(star 5)</td><td class="t-lbl">Второй кондиционер у них ставим, всё как в первый раз — точно и без сюрпризов…</td><td class="mono t-lbl">14 авг 2026</td><td><span class="btn flat sm">Снять</span></td></tr>
              <tr><td><span class="usr"><span class="ava xs">АП</span><span class="nm">Алексей П.</span></span></td><td>$(star 4)</td><td class="t-lbl">Поставили быстро, цена совпала со сметой. Единственное — приехали к концу окна…</td><td class="mono t-lbl">2 авг 2026</td><td><span class="btn flat sm">Снять</span></td></tr>
              <tr><td><span class="usr"><span class="ava xs">МК</span><span class="nm">Марина К.</span></span></td><td>$(star 5)</td><td class="t-lbl">Сделали в жару за один день, когда все отказывались браться раньше сентября…</td><td class="mono t-lbl">21 июл 2026</td><td><span class="btn flat sm">Снять</span></td></tr>
            </tbody></table></div></div></div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$R" 2 sm)
          <div class="bd16"><div class="card"><div class="bd" style="padding:0"><table class="tbl">
            <thead><tr><th style="width:150px">Автор</th><th>Отзыв</th><th style="width:90px">Действие</th></tr></thead>
            <tbody>
              <tr><td><span class="usr"><span class="ava xs">ИГ</span><span class="nm">Ирина Г.</span></span><div>$(star 5)</div></td><td class="t-lbl">Второй кондиционер у них ставим, всё точно и без сюрпризов…<div class="mono t-tiny fnt">14 авг 2026</div></td><td><span class="btn flat sm">Снять</span></td></tr>
              <tr><td><span class="usr"><span class="ava xs">АП</span><span class="nm">Алексей П.</span></span><div>$(star 4)</div></td><td class="t-lbl">Поставили быстро, цена совпала со сметой…<div class="mono t-tiny fnt">2 авг 2026</div></td><td><span class="btn flat sm">Снять</span></td></tr>
            </tbody></table></div></div></div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Отзывы" '')
$(trow "$R" 2 xs)
          <div class="mbody">
            <div class="card"><div class="mrow" style="gap:8px"><div class="row" style="gap:10px"><span class="ava">ИГ</span><span class="stack" style="gap:2px;flex:1;min-width:0"><span class="strong">Ирина Г.</span>$(star 5)</span><span class="chip c-success">На сайте</span></div><p style="font-size:14px;line-height:1.6;color:var(--ink)">Второй кондиционер у них ставим, всё как в первый раз — точно и без сюрпризов.</p><div class="row" style="justify-content:space-between"><span class="mono t-tiny fnt">14 августа</span><span class="btn flat sm">Снять</span></div></div></div>
            <div class="card"><div class="mrow" style="gap:8px"><div class="row" style="gap:10px"><span class="ava">АП</span><span class="stack" style="gap:2px;flex:1;min-width:0"><span class="strong">Алексей П.</span>$(star 4)</span><span class="chip c-success">На сайте</span></div><p style="font-size:14px;line-height:1.6;color:var(--ink)">Поставили быстро, цена совпала со сметой.</p><div class="row" style="justify-content:space-between"><span class="mono t-tiny fnt">2 августа</span><span class="btn flat sm">Снять</span></div></div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">768 — оценка переезжает под имя, дата в подпись отзыва. 390 — таблица разбирается в карточки, статус чипом справа.</span>
  </div>

  <div class="tsec">
$(tsec "Отзывы · вкладка 3" "Отклонённые" "Причина отказа хранится и видна: без неё через месяц не понять, почему отзыв не на сайте, и решение выглядит произволом.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$R" 3)
          <div class="bd20"><div class="card"><div class="bd" style="padding:0"><table class="tbl">
            <thead><tr><th style="width:190px">Автор</th><th>Отзыв</th><th style="width:210px">Причина отказа</th><th style="width:150px">Кто и когда</th><th style="width:120px">Действие</th></tr></thead>
            <tbody>
              <tr><td><span class="usr"><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">—</span><span class="nm">Аноним</span></span></td><td class="t-lbl">Текст рекламы стороннего магазина со ссылкой…</td><td><span class="chip c-danger">Спам</span></td><td class="t-lbl">Сергей Д.<div class="mono t-tiny fnt">27 авг 2026</div></td><td><span class="btn flat sm">Вернуть</span></td></tr>
              <tr><td><span class="usr"><span class="ava xs">НН</span><span class="nm">Н. Николаев</span></span></td><td class="t-lbl">Отзыв о работе другой компании, заказа у нас не было…</td><td><span class="chip c-warn">Не наш заказ</span></td><td class="t-lbl">Сергей Д.<div class="mono t-tiny fnt">19 авг 2026</div></td><td><span class="btn flat sm">Вернуть</span></td></tr>
            </tbody></table></div></div></div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$R" 3 sm)
          <div class="bd16"><div class="card"><div class="bd" style="padding:0"><table class="tbl">
            <thead><tr><th>Отзыв</th><th style="width:160px">Причина</th><th style="width:90px">Действие</th></tr></thead>
            <tbody>
              <tr><td><span class="strong">Аноним</span><div class="t-lbl">Реклама стороннего магазина…</div></td><td><span class="chip c-danger">Спам</span><div class="mono t-tiny fnt">27 авг</div></td><td><span class="btn flat sm">Вернуть</span></td></tr>
              <tr><td><span class="strong">Н. Николаев</span><div class="t-lbl">Отзыв о работе другой компании…</div></td><td><span class="chip c-warn">Не наш заказ</span><div class="mono t-tiny fnt">19 авг</div></td><td><span class="btn flat sm">Вернуть</span></td></tr>
            </tbody></table></div></div></div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Отзывы" '')
$(trow "$R" 3 xs)
          <div class="mbody">
            <div class="card"><div class="mrow" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="strong">Аноним</span><span class="chip c-danger">Спам</span></div><p style="font-size:14px;line-height:1.6;color:var(--muted)">Текст рекламы стороннего магазина со ссылкой.</p><div class="row" style="justify-content:space-between"><span class="mono t-tiny fnt">Сергей Д. · 27 авг</span><span class="btn flat sm">Вернуть</span></div></div></div>
            <div class="card"><div class="mrow" style="gap:8px"><div class="row" style="justify-content:space-between"><span class="strong">Н. Николаев</span><span class="chip c-warn">Не наш заказ</span></div><p style="font-size:14px;line-height:1.6;color:var(--muted)">Отзыв о работе другой компании, заказа у нас не было.</p><div class="row" style="justify-content:space-between"><span class="mono t-tiny fnt">Сергей Д. · 19 авг</span><span class="btn flat sm">Вернуть</span></div></div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">768 — автор уходит в первую строку ячейки отзыва, кто отклонил — в подпись причины. 390 — причина чипом в шапке карточки.</span>
  </div>

  <div class="tsec">
$(tsec "Отзывы · вкладка 4" "Все" "Один список со сквозным фильтром по статусу. Нужна, когда ищут конкретный отзыв и не помнят, где он лежит.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$R" 4)
          <div class="bd20">
            <div class="row" style="gap:10px;margin-bottom:12px">
              <span class="inp flat solo" style="max-width:300px"><span class="ico">$I_SEARCH</span><span class="val ph">Автор, текст или номер заказа</span></span>
              <span class="btn bord sm">$I_FILT Статус: любой $I_CHEV</span>
              <span class="btn bord sm">Оценка: любая $I_CHEV</span>
              <span class="btn light sm" style="margin-left:auto">Сбросить</span>
            </div>
            <div class="card"><div class="bd" style="padding:0"><table class="tbl">
              <thead><tr><th style="width:180px">Автор</th><th style="width:100px">Оценка</th><th>Отзыв</th><th style="width:150px">Статус</th><th style="width:120px">Дата</th></tr></thead>
              <tbody>
                <tr><td><span class="usr"><span class="ava xs">ЕС</span><span class="nm">Екатерина С.</span></span></td><td>$(star 5)</td><td class="t-lbl">Приехали в назначенный день, без переносов…</td><td><span class="chip c-warn"><span class="dot"></span>На модерации</span></td><td class="mono t-lbl">29 авг</td></tr>
                <tr><td><span class="usr"><span class="ava xs">ИГ</span><span class="nm">Ирина Г.</span></span></td><td>$(star 5)</td><td class="t-lbl">Второй кондиционер у них ставим…</td><td><span class="chip c-success"><span class="dot"></span>На сайте</span></td><td class="mono t-lbl">14 авг</td></tr>
                <tr><td><span class="usr"><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">—</span><span class="nm">Аноним</span></span></td><td class="mut">—</td><td class="t-lbl">Реклама стороннего магазина…</td><td><span class="chip c-danger"><span class="dot"></span>Отклонён</span></td><td class="mono t-lbl">27 авг</td></tr>
              </tbody></table></div></div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$R" 4 sm)
          <div class="bd16">
            <div class="row" style="gap:8px;margin-bottom:10px"><span class="inp flat solo" style="flex:1"><span class="ico">$I_SEARCH</span><span class="val ph">Поиск по отзывам</span></span><span class="btn bord sm">$I_FILT</span></div>
            <div class="card"><div class="bd" style="padding:0"><table class="tbl">
              <thead><tr><th style="width:140px">Автор</th><th>Отзыв</th><th style="width:130px">Статус</th></tr></thead>
              <tbody>
                <tr><td><span class="strong">Екатерина С.</span><div>$(star 5)</div></td><td class="t-lbl">Приехали в назначенный день…<div class="mono t-tiny fnt">29 авг</div></td><td><span class="chip c-warn"><span class="dot"></span>Модерация</span></td></tr>
                <tr><td><span class="strong">Ирина Г.</span><div>$(star 5)</div></td><td class="t-lbl">Второй кондиционер у них ставим…<div class="mono t-tiny fnt">14 авг</div></td><td><span class="chip c-success"><span class="dot"></span>На сайте</span></td></tr>
              </tbody></table></div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Отзывы" '<span class="iconbtn">'"$I_SEARCH"'</span>')
$(trow "$R" 4 xs)
          <div class="mbody">
            <div class="row" style="gap:8px"><span class="btn bord sm">$I_FILT Статус $I_CHEV</span><span class="btn bord sm">Оценка $I_CHEV</span></div>
            <div class="card"><div class="mrow" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="strong">Екатерина С.</span><span class="chip c-warn">Модерация</span></div>$(star 5)<p style="font-size:14px;line-height:1.6;color:var(--muted)">Приехали в назначенный день, без переносов.</p><span class="mono t-tiny fnt">29 августа</span></div></div>
            <div class="card"><div class="mrow" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="strong">Ирина Г.</span><span class="chip c-success">На сайте</span></div>$(star 5)<p style="font-size:14px;line-height:1.6;color:var(--muted)">Второй кондиционер у них ставим.</p><span class="mono t-tiny fnt">14 августа</span></div></div>
            <div class="card"><div class="mrow" style="gap:6px"><div class="row" style="justify-content:space-between"><span class="strong">Аноним</span><span class="chip c-danger">Отклонён</span></div><p style="font-size:14px;line-height:1.6;color:var(--muted)">Реклама стороннего магазина.</p><span class="mono t-tiny fnt">27 августа</span></div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">1440 — четыре фильтра в строку. 768 — поиск во всю ширину плюс кнопка фильтров. 390 — поиск уезжает в шапку иконкой, фильтры двумя капсулами.</span>
  </div>

  <div class="tsec">
$(tsec "Статья · вкладка 1" "Текст" "Редактор во всю доступную ширину: колонка набора ограничена 68ch, потому что читают её потом на сайте, а не здесь.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$A" 1)
          <div class="bd20 grid" style="grid-template-columns:minmax(0,1fr) 300px;gap:14px;align-items:start">
            <div class="card"><div class="hd" style="gap:6px"><span class="btn light sm">H2</span><span class="btn light sm">H3</span><span class="btn light sm" style="font-weight:700">Ж</span><span class="btn light sm" style="font-style:italic">К</span><span class="btn light sm">Список</span><span class="btn light sm">Ссылка</span><span class="btn light sm">Картинка</span><span class="btn light sm">Таблица</span></div>
              <div class="bd stack" style="gap:12px">
                <div class="inp flat col"><span class="lab">Заголовок статьи</span><span class="val" style="font-family:var(--font-display);font-size:19px;font-weight:600">Почему монтаж стоит 6 000 ₽, а не 3 000 ₽</span></div>
                <div style="max-width:68ch;font-size:15px;line-height:1.7;color:var(--ink)">
                  <p style="margin-bottom:12px">Объявление «установка кондиционера 3 000 ₽» — не цена работы, а цена входа в квартиру. Дальше начинается смета, о которой не говорили по телефону.</p>
                  <p style="font-family:var(--font-display);font-size:17px;font-weight:600;margin:16px 0 8px">Что входит в наши 6 000 ₽</p>
                  <p style="margin-bottom:12px">Штробление, трасса до трёх метров, вакуумирование магистрали, кронштейны, пуско-наладка и вывоз мусора. Ничего из этого не считается отдельно.</p>
                </div>
              </div></div>
            <div class="stack" style="gap:12px">
              <div class="card"><div class="hd"><span class="ttl">Состояние</span></div><div class="bd stack" style="gap:10px">
                <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Статус</span><span class="chip c-warn">Черновик</span></div>
                <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Знаков</span><span class="mono strong">4 812</span></div>
                <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Сохранено</span><span class="mono strong">14:02</span></div>
              </div><div class="ft"><span class="btn solid" style="width:100%">Опубликовать</span></div></div>
              <div class="card"><div class="hd"><span class="ttl">Обложка</span></div><div class="bd"><div style="height:110px;border-radius:var(--r-nav);background:var(--bg-soft);border:1px dashed var(--line-ui);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px">Перетащите или выберите</div></div></div>
            </div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$A" 1 sm)
          <div class="bd16 stack" style="gap:12px">
            <div class="card"><div class="hd" style="gap:6px"><span class="btn light sm">H2</span><span class="btn light sm">H3</span><span class="btn light sm" style="font-weight:700">Ж</span><span class="btn light sm" style="font-style:italic">К</span><span class="btn light sm">Список</span><span class="btn light sm">Ссылка</span><span class="chip c-warn" style="margin-left:auto">Черновик</span></div>
              <div class="bd stack" style="gap:12px">
                <div class="inp flat col"><span class="lab">Заголовок</span><span class="val" style="font-family:var(--font-display);font-size:17px;font-weight:600">Почему монтаж стоит 6 000 ₽, а не 3 000 ₽</span></div>
                <div style="font-size:14.5px;line-height:1.7;color:var(--ink)">
                  <p style="margin-bottom:10px">Объявление «установка кондиционера 3 000 ₽» — не цена работы, а цена входа в квартиру.</p>
                  <p style="font-family:var(--font-display);font-size:16px;font-weight:600;margin:14px 0 8px">Что входит в наши 6 000 ₽</p>
                  <p>Штробление, трасса до трёх метров, вакуумирование, кронштейны и вывоз мусора.</p>
                </div>
              </div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Статья" '<span class="chip c-warn">Черновик</span>')
$(trow "$A" 1 xs)
          <div class="mbody">
            <div class="card"><div class="mrow" style="gap:10px">
              <div class="inp flat col"><span class="lab">Заголовок</span><span class="val" style="font-family:var(--font-display);font-size:16px;font-weight:600">Почему монтаж стоит 6 000 ₽</span></div>
              <div class="row" style="gap:6px;overflow-x:auto"><span class="btn light sm">H2</span><span class="btn light sm">H3</span><span class="btn light sm" style="font-weight:700">Ж</span><span class="btn light sm" style="font-style:italic">К</span><span class="btn light sm">Список</span></div>
              <div style="font-size:14.5px;line-height:1.7;color:var(--ink)"><p>Объявление «установка кондиционера 3 000 ₽» — не цена работы, а цена входа в квартиру. Дальше начинается смета, о которой не говорили по телефону.</p></div>
            </div></div>
          </div>
          <div class="sticky-act"><span class="btn solid lg" style="width:100%">Сохранить черновик</span></div>
        </div></div>
    </div>
    <span class="devcap">768 — боковая колонка уходит: статус переезжает в панель инструментов, обложка на вкладку «Публикация». 390 — панель инструментов горизонтально прокручивается, сохранение прибито внизу.</span>
  </div>

  <div class="tsec">
$(tsec "Статья · вкладка 2" "SEO" "Живое превью выдачи. Длину меряет счётчик, а не глазомер: обрезанный в поиске заголовок стоит кликов.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$A" 2)
          <div class="bd20 grid" style="grid-template-columns:minmax(0,1fr) 380px;gap:14px;align-items:start">
            <div class="card"><div class="hd"><span class="ttl">Мета-данные</span></div><div class="bd stack" style="gap:12px">
              <div class="inp bordered col"><span class="lab">Title <span class="mut mono">58 / 60</span></span><span class="val">Монтаж кондиционера в Туле: почему 6 000 ₽, а не 3 000 ₽</span></div>
              <div class="inp bordered col tall"><span class="lab">Description <span class="mut mono">147 / 160</span></span><span class="val" style="margin-top:4px;font-size:13.5px;line-height:1.5">Разбираем смету монтажа по пунктам: что входит в работу, за что доплачивают отдельно и почему объявления за 3 000 ₽ заканчиваются другой суммой.</span></div>
              <div class="inp bordered col"><span class="lab">Слаг <span class="mut mono">адрес статьи</span></span><span class="val mono">/knowledge/pochemu-montazh-6000</span></div>
              <div class="inp bordered col err"><span class="lab">Каноникал</span><span class="val ph">Не задан</span><span class="hint err">Обязателен: без него дубль в выдаче считается конкурентом самой страницы</span></div>
            </div></div>
            <div class="card"><div class="hd"><span class="ttl">Как увидят в поиске</span></div><div class="bd">
              <div style="padding:12px;border:1px solid var(--line);border-radius:var(--r-nav);background:var(--bg)">
                <div class="mono t-tiny" style="color:var(--ok-ink)">tulaklimat.ru › knowledge › pochemu-montazh-6000</div>
                <div style="font-family:var(--font-display);font-size:16px;color:var(--accent-text);margin-top:4px">Монтаж кондиционера в Туле: почему 6 000 ₽, а не 3 000 ₽</div>
                <div style="font-size:13px;line-height:1.5;color:var(--muted);margin-top:4px">Разбираем смету монтажа по пунктам: что входит в работу, за что доплачивают отдельно и почему объявления за 3 000 ₽…</div>
              </div>
              <div class="alert a-warn" style="margin-top:12px"><span class="ai">$I_WARN</span><div><div class="at">Числа обязаны совпасть</div><div class="ad">6 000 ₽ в описании — то же число, что в тексте и в разметке. Расхождение — ручные санкции (инвариант 9).</div></div></div>
            </div></div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$A" 2 sm)
          <div class="bd16 stack" style="gap:12px">
            <div class="card"><div class="hd"><span class="ttl">Как увидят в поиске</span></div><div class="bd"><div style="padding:12px;border:1px solid var(--line);border-radius:var(--r-nav);background:var(--bg)">
              <div class="mono t-tiny" style="color:var(--ok-ink)">tulaklimat.ru › knowledge › pochemu-montazh-6000</div>
              <div style="font-family:var(--font-display);font-size:15px;color:var(--accent-text);margin-top:4px">Монтаж кондиционера в Туле: почему 6 000 ₽, а не 3 000 ₽</div>
              <div style="font-size:13px;line-height:1.5;color:var(--muted);margin-top:4px">Разбираем смету монтажа по пунктам: что входит в работу и за что доплачивают отдельно…</div>
            </div></div></div>
            <div class="card"><div class="bd stack" style="gap:10px">
              <div class="inp bordered col"><span class="lab">Title <span class="mut mono">58 / 60</span></span><span class="val">Монтаж кондиционера в Туле: почему 6 000 ₽…</span></div>
              <div class="inp bordered col tall"><span class="lab">Description <span class="mut mono">147 / 160</span></span><span class="val" style="margin-top:4px;font-size:13px;line-height:1.5">Разбираем смету монтажа по пунктам: что входит в работу.</span></div>
              <div class="inp bordered col err"><span class="lab">Каноникал</span><span class="val ph">Не задан</span><span class="hint err">Обязателен</span></div>
            </div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Статья" '')
$(trow "$A" 2 xs)
          <div class="mbody">
            <div class="card"><div class="mrow"><div style="padding:10px;border:1px solid var(--line);border-radius:var(--r-nav);background:var(--bg)">
              <div class="mono t-tiny" style="color:var(--ok-ink)">tulaklimat.ru › knowledge › …</div>
              <div style="font-family:var(--font-display);font-size:14.5px;color:var(--accent-text);margin-top:4px;line-height:1.35">Монтаж кондиционера в Туле: почему 6 000 ₽, а не 3 000 ₽</div>
              <div style="font-size:12.5px;line-height:1.5;color:var(--muted);margin-top:4px">Разбираем смету монтажа по пунктам…</div>
            </div></div></div>
            <div class="card"><div class="mrow" style="gap:10px">
              <div class="inp bordered col"><span class="lab">Title <span class="mut mono">58 / 60</span></span><span class="val" style="font-size:14px">Монтаж кондиционера в Туле…</span></div>
              <div class="inp bordered col err"><span class="lab">Каноникал</span><span class="val ph">Не задан</span><span class="hint err">Обязателен</span></div>
            </div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">768 и 390 — превью выдачи поднимается над полями: правят title, глядя на него, а не наоборот. Счётчик длины остаётся в подписи поля на всех ширинах.</span>
  </div>

  <div class="tsec">
$(tsec "Статья · вкладка 3" "Публикация" "Дата, автор, обложка и связанные материалы. Отсюда же снимают с сайта.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
$(trow "$A" 3)
          <div class="bd20 grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start">
            <div class="card"><div class="hd"><span class="ttl">Публикация</span></div><div class="bd stack" style="gap:12px">
              <div class="row" style="gap:12px"><span class="sw on"></span><span class="stack" style="gap:2px"><span class="strong">Опубликовать на сайте</span><span class="t-tiny mut">Появится в разделе «База знаний» и в карте сайта</span></span></div>
              <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
                <div class="inp bordered col"><span class="lab">Дата публикации</span><span class="val mono">29.08.2026</span></div>
                <div class="inp bordered col"><span class="lab">Автор</span><span class="val">Сергей Демидов</span></div>
              </div>
              <div class="inp bordered col"><span class="lab">Раздел</span><span class="val">Как обманывают при установке $I_CHEV</span></div>
              <div class="row" style="gap:12px"><span class="sw"></span><span class="stack" style="gap:2px"><span class="strong">Закрепить в разделе</span><span class="t-tiny mut">Первой в списке, независимо от даты</span></span></div>
            </div></div>
            <div class="stack" style="gap:12px">
              <div class="card"><div class="hd"><span class="ttl">Обложка</span><span class="btn flat sm">Заменить</span></div><div class="bd"><div style="height:130px;border-radius:var(--r-nav);background:linear-gradient(135deg,var(--accent-bg),var(--bg-soft));border:1px solid var(--line)"></div><div class="inp flat col" style="margin-top:10px"><span class="lab">Alt-текст</span><span class="val">Монтажник вакуумирует магистраль перед пуском</span></div></div></div>
              <div class="card"><div class="hd"><span class="ttl">Связанные статьи</span></div><div class="bd stack" style="gap:8px">
                <div class="row" style="gap:8px"><span class="chip c-default">Как обманывают при установке</span><span class="chip c-default">Что входит в смету</span></div>
                <span class="btn flat sm" style="align-self:flex-start">$I_PLUS Добавить</span>
              </div></div>
            </div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
$(trow "$A" 3 sm)
          <div class="bd16 stack" style="gap:12px">
            <div class="card"><div class="bd stack" style="gap:12px">
              <div class="row" style="gap:12px"><span class="sw on"></span><span class="stack" style="gap:2px"><span class="strong">Опубликовать на сайте</span><span class="t-tiny mut">Появится в «Базе знаний»</span></span></div>
              <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
                <div class="inp bordered col"><span class="lab">Дата</span><span class="val mono">29.08.2026</span></div>
                <div class="inp bordered col"><span class="lab">Автор</span><span class="val">Сергей Демидов</span></div>
              </div>
              <div class="inp bordered col"><span class="lab">Раздел</span><span class="val">Как обманывают при установке $I_CHEV</span></div>
            </div></div>
            <div class="card"><div class="hd"><span class="ttl">Обложка</span><span class="btn flat sm">Заменить</span></div><div class="bd"><div style="height:110px;border-radius:var(--r-nav);background:linear-gradient(135deg,var(--accent-bg),var(--bg-soft));border:1px solid var(--line)"></div></div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Статья" '')
$(trow "$A" 3 xs)
          <div class="mbody">
            <div class="card"><div class="mrow" style="gap:12px">
              <div class="row" style="gap:12px"><span class="sw on"></span><span class="stack" style="gap:2px"><span class="strong">Опубликовать</span><span class="t-tiny mut">Появится в «Базе знаний»</span></span></div>
              <div class="inp bordered col"><span class="lab">Дата</span><span class="val mono">29.08.2026</span></div>
              <div class="inp bordered col"><span class="lab">Раздел</span><span class="val">Как обманывают $I_CHEV</span></div>
            </div></div>
            <div class="card"><div class="mrow"><div style="height:100px;border-radius:var(--r-nav);background:linear-gradient(135deg,var(--accent-bg),var(--bg-soft));border:1px solid var(--line)"></div><span class="btn flat sm" style="align-self:flex-start">Заменить обложку</span></div></div>
          </div>
          <div class="sticky-act"><span class="btn solid lg" style="width:100%">Опубликовать статью</span></div>
        </div></div>
    </div>
    <span class="devcap">768 — две колонки становятся одной, связанные статьи уходят под обложку. 390 — переключатель первым: это главное действие вкладки, и оно же дублируется прибитой кнопкой.</span>
  </div>
</div>
EOF
