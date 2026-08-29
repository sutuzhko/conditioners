. ./_parts.sh
BARS=$(cat chart-bars.svg)
LINES=$(cat chart-lines.svg)
cat <<EOF
<div class="page" style="padding:0">
<div class="app" style="width:1384px;min-height:1100px">
$(aside overview)
  <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Доброе утро, Сергей" "Среда, 29 августа · 3 выезда сегодня" '<span class="btn solid">'"$I_PLUS"' Новый заказ</span>')
    <div class="main">

      <!-- переключение среза + период + выгрузка, как в шаблоне эталона -->
      <div class="row" style="justify-content:space-between;gap:16px;flex-wrap:wrap">
        <span class="seg"><span class="on">Обзор</span><span>Работа</span><span>Деньги</span></span>
        <div class="row" style="gap:8px">
          <span class="iconbtn">$I_REFRESH</span>
          <span class="btn bord sm">$I_CAL Этот месяц $I_DOWN</span>
          <span class="btn solid sm">Выгрузить</span>
        </div>
      </div>

      <!-- Четыре показателя: подпись сверху, крупное число, изменение чипом справа -->
      <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:16px">
        <div class="card"><div class="stat">
          <span class="l">Новые обращения</span>
          <span class="v"><span class="n">3</span><span class="trend t-down">$I_WARN 1 сутки</span></span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="l">Активные заказы</span>
          <span class="v"><span class="n">7</span><span class="trend t-up">↑ 2</span></span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="l">Выручка за месяц</span>
          <span class="v"><span class="n">690 тыс ₽</span><span class="trend t-up">↑ 9,2%</span></span>
        </div></div>
        <div class="card"><div class="stat">
          <span class="l">Остаётся за месяц</span>
          <span class="v"><span class="n">532 тыс ₽</span><span class="trend t-flat">= 77%</span></span>
        </div></div>
      </div>

      <!-- Два графика. Слева один ряд — легенды нет, название её и есть.
           Справа два ряда в одной единице: одна ось, легенда и подписи концов. -->
      <div class="grid" style="grid-template-columns:repeat(2,minmax(0,1fr));gap:16px">
        <div class="card">
          <div class="hd">
            <div class="stack" style="gap:2px"><span class="ttl">Заказы по неделям</span><span class="t-tiny fnt">выполненные наряды, 12 недель</span></div>
            <span class="btn bord sm">12 недель $I_DOWN</span>
          </div>
          <div class="bd" style="padding:8px 16px 12px">$BARS</div>
        </div>
        <div class="card">
          <div class="hd">
            <div class="stack" style="gap:2px"><span class="ttl">Выручка и выплаты</span><span class="t-tiny fnt">тысяч рублей, обе величины в одной шкале</span></div>
            <span class="legend"><span><i style="background:var(--s1)"></i>Выручка</span><span><i style="background:var(--s2)"></i>Выплаты монтажникам</span></span>
          </div>
          <div class="bd" style="padding:8px 16px 12px">$LINES</div>
        </div>
      </div>

      <!-- Таблица: слева пилюли-фильтры, справа поиск; действия строки — три круглых -->
      <div class="stack" style="gap:14px">
        <div class="row" style="gap:10px">
          <span class="ttl" style="font-size:17px">Ближайшие дела</span>
          <span class="chip c-default">5</span>
        </div>
        <div class="tbar">
          <div class="row" style="gap:8px">
            <span class="btn faded sm">$I_FILT Фильтр</span>
            <span class="btn faded sm">$I_SORT Сортировка</span>
            <span class="btn faded sm">$I_COLS Колонки</span>
          </div>
          <span class="inp faded md solo" style="width:280px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Поиск по нарядам</span></span></span>
        </div>
        <div class="card flat" style="overflow:hidden">
          <table class="tbl">
            <thead><tr>
              <th style="width:116px">Когда</th><th>Работа и объект</th><th style="width:180px">Монтажник</th>
              <th style="width:140px">Статус</th><th class="rt" style="width:118px">Сумма</th><th style="width:126px">Действия</th>
            </tr></thead>
            <tbody>
              <tr>
                <td><div class="strong mono">сегодня</div><div class="t-tiny fnt mono" style="white-space:nowrap">14:00 · 3 ч</div></td>
                <td><div class="strong">Монтаж 09 инвертор</div><div class="t-tiny mut clip">Тула, Оборонная 12, кв. 34 · 5 этаж</div></td>
                <td><span class="usr"><span class="ava xs">ПК</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Пётр Кузнецов</span><span class="ds">32 ч на неделе</span></span></span></td>
                <td><span class="chip c-primary"><span class="dot"></span>В работе</span></td>
                <td class="rt mono strong">34 900 ₽</td>
                <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td>
              </tr>
              <tr>
                <td><div class="strong mono">сегодня</div><div class="t-tiny fnt mono" style="white-space:nowrap">17:30 · 1 ч</div></td>
                <td><div class="strong">ТО и чистка</div><div class="t-tiny mut clip">Тула, пр. Ленина 108, офис 312</div></td>
                <td><span class="usr"><span class="ava xs" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Артём Морозов</span><span class="ds">44 ч · переработка</span></span></span></td>
                <td><span class="chip c-warn"><span class="dot"></span>Назначен</span></td>
                <td class="rt mono strong">8 400 ₽</td>
                <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td>
              </tr>
              <tr>
                <td><div class="strong mono">завтра</div><div class="t-tiny fnt mono" style="white-space:nowrap">10:00 · 4 ч</div></td>
                <td><div class="strong">Монтаж 12 инвертор, два блока</div><div class="t-tiny mut clip">Щёкино, Пионерская 4 · высотные работы</div></td>
                <td><span class="usr"><span class="ava xs">ПК</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Пётр Кузнецов</span><span class="ds">32 ч на неделе</span></span></span></td>
                <td><span class="chip c-warn"><span class="dot"></span>Назначен</span></td>
                <td class="rt mono strong">52 300 ₽</td>
                <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td>
              </tr>
              <tr>
                <td><div class="strong mono">завтра</div><div class="t-tiny fnt mono">весь день</div></td>
                <td><div class="strong">Замер по заявке № 41</div><div class="t-tiny mut clip">Новомосковск · время не назначено</div></td>
                <td><span class="mut t-lbl">не назначен</span></td>
                <td><span class="chip c-default"><span class="dot"></span>Новый</span></td>
                <td class="rt mut">—</td>
                <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td>
              </tr>
              <tr>
                <td><div class="strong mono" style="color:var(--error-ink)">пт, 31</div><div class="t-tiny fnt mono" style="white-space:nowrap">09:00 · 6 ч</div></td>
                <td><div class="strong">Ремонт: не холодит</div><div class="t-tiny mut clip">Тула, Металлургов 22, кв. 108</div></td>
                <td><span class="usr"><span class="ava xs" style="background:var(--ok-bg);color:var(--ok-ink)">ИС</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Иван Соколов</span><span class="ds">28 ч на неделе</span></span></span></td>
                <td><span class="chip c-danger"><span class="dot"></span>Просрочен</span></td>
                <td class="rt mono strong">12 000 ₽</td>
                <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td>
              </tr>
            </tbody>
          </table>
          <div class="pager" style="border-top:1px solid var(--line)">
            <span class="t-lbl mut">5 из 24</span>
            <span class="pg"><span class="dis">‹</span><span class="on">1</span><span>2</span><span>3</span><span>›</span></span>
            <span class="row t-lbl mut" style="gap:8px">Строк на странице <span class="btn bord sm">8 $I_DOWN</span></span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</div>
EOF
