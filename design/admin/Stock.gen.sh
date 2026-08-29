. ./_parts.sh
cat <<EOF
<div class="page" style="padding:0"><div class="app" style="width:1440px;min-height:900px">
$(aside stock)
  <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Склад" "Остаток — сумма движений. Ниже порога подсвечено: это и есть список «пора заказывать»" '<span class="btn bord sm">Журнал</span><span class="btn bord sm">Переместить</span><span class="btn solid sm">'"$I_PLUS"' Приход</span>')
    <div class="main">
      <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--gap-4)">
        <div class="card"><div class="stat" style="gap:6px"><span class="row" style="justify-content:space-between"><span class="l">Позиций в справочнике</span></span><span class="num n">42</span></div></div>
        <div class="card" style="border-color:var(--error-line)"><div class="stat" style="gap:6px"><span class="l">Ниже порога</span><span class="num n" style="color:var(--error-ink)">3</span></div></div>
        <div class="card"><div class="stat" style="gap:6px"><span class="l">Подходят к порогу</span><span class="num n" style="color:var(--warn-ink)">5</span></div></div>
        <div class="card"><div class="stat" style="gap:6px"><span class="l">Зон хранения</span><span class="num n">4</span></div></div>
      </div>

      <div class="card flat" style="overflow:hidden">
        <div class="hd" style="padding:var(--pad-card)">
          <div class="tbar grow">
            <span class="inp bordered md solo" style="width:260px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Название или группа</span></span></span>
            <span class="btn bord">Группа $I_DOWN</span>
            <span class="btn flat sm">Только ниже порога <span class="chip c-danger" style="height:18px;padding:0 6px">3</span></span>
          </div>
          <span class="t-lbl mut">Строки — позиции, колонки — зоны</span>
        </div>
        <table class="tbl">
          <thead><tr>
            <th style="width:300px">Позиция</th>
            <th style="width:90px">Ед.</th>
            <th class="rt" style="width:120px">Склад</th>
            <th class="rt" style="width:150px">Машина · Пётр К.</th>
            <th class="rt" style="width:150px">Машина · Артём М.</th>
            <th class="rt" style="width:150px">Машина · Иван С.</th>
            <th class="rt" style="width:120px">Итого</th>
            <th class="rt" style="width:130px">Порог</th>
            <th style="width:44px"></th>
          </tr></thead>
          <tbody>
            <tr class="rowbad">
              <td><div class="strong">Медная труба 1/4″ отожжённая</div><div class="t-tiny mut">Медная труба · стенка 0,7</div></td>
              <td class="mut">метр</td>
              <td class="rt mono">4</td><td class="rt mono">6</td><td class="rt mono">2</td><td class="rt mono fnt">0</td>
              <td class="rt"><span class="chip c-danger">12</span></td>
              <td class="rt mono mut">40</td>
              <td><span class="iconbtn">$I_MORE</span></td>
            </tr>
            <tr class="rowbad">
              <td><div class="strong">Кронштейны наружного блока 450</div><div class="t-tiny mut">Кронштейны · ставятся парой</div></td>
              <td class="mut">пара</td>
              <td class="rt mono">1</td><td class="rt mono">1</td><td class="rt mono fnt">0</td><td class="rt mono fnt">0</td>
              <td class="rt"><span class="chip c-danger">2</span></td>
              <td class="rt mono mut">5</td>
              <td><span class="iconbtn">$I_MORE</span></td>
            </tr>
            <tr class="rowwarn">
              <td><div class="strong">Фреон R32</div><div class="t-tiny mut">Фреон · баллон 9,5 кг</div></td>
              <td class="mut">кг</td>
              <td class="rt mono">5,4</td><td class="rt mono fnt">0</td><td class="rt mono fnt">0</td><td class="rt mono fnt">0</td>
              <td class="rt"><span class="chip c-warn">5,4</span></td>
              <td class="rt mono mut">6</td>
              <td><span class="iconbtn">$I_MORE</span></td>
            </tr>
            <tr>
              <td><div class="strong">Медная труба 3/8″ отожжённая</div><div class="t-tiny mut">Медная труба · стенка 0,8</div></td>
              <td class="mut">метр</td>
              <td class="rt mono">85</td><td class="rt mono">14</td><td class="rt mono">10</td><td class="rt mono">6</td>
              <td class="rt"><span class="chip c-success">115</span></td>
              <td class="rt mono mut">40</td>
              <td><span class="iconbtn">$I_MORE</span></td>
            </tr>
            <tr>
              <td><div class="strong">Теплоизоляция 9 мм</div><div class="t-tiny mut">Теплоизоляция трубок · по диаметру</div></td>
              <td class="mut">метр</td>
              <td class="rt mono">120</td><td class="rt mono">20</td><td class="rt mono">18</td><td class="rt mono">12</td>
              <td class="rt"><span class="chip c-success">170</span></td>
              <td class="rt mono mut">60</td>
              <td><span class="iconbtn">$I_MORE</span></td>
            </tr>
            <tr>
              <td><div class="strong">Межблочный кабель 4×1,5</div><div class="t-tiny mut">Кабель · бухта 100 м</div></td>
              <td class="mut">метр</td>
              <td class="rt mono">240</td><td class="rt mono">30</td><td class="rt mono">25</td><td class="rt mono">15</td>
              <td class="rt"><span class="chip c-success">310</span></td>
              <td class="rt mono mut">80</td>
              <td><span class="iconbtn">$I_MORE</span></td>
            </tr>
            <tr>
              <td><div class="strong">Сплит-система 09, инверторная</div><div class="t-tiny mut">Техника · штучный учёт, серийные номера</div></td>
              <td class="mut">шт</td>
              <td class="rt mono">6</td><td class="rt mono">1</td><td class="rt mono fnt">0</td><td class="rt mono fnt">0</td>
              <td class="rt"><span class="chip c-success">7</span></td>
              <td class="rt mono mut">2</td>
              <td><span class="iconbtn">$I_MORE</span></td>
            </tr>
          </tbody>
        </table>
        <div class="pager" style="border-top:1px solid var(--line-soft)">
          <span class="t-lbl mut">7 из 42 позиций</span>
          <span class="pg"><span>‹</span><span class="on">1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>›</span></span>
          <span class="row t-lbl mut" style="gap:8px">Строк на странице <span class="btn bord sm">8 $I_DOWN</span></span>
        </div>
      </div>

      <div class="row" style="gap:10px;padding:12px 14px;border-radius:var(--r-sm);background:var(--accent-bg)">
        <span style="color:var(--accent-text);flex-shrink:0">$I_WARN</span>
        <span class="t-lbl" style="color:var(--accent-text)">Перетаскивание между зонами остаётся ускорителем для мыши. Та же операция доступна кнопкой «Переместить» с обычной формой — на телефоне в машине перетаскивание по таблице с горизонтальной прокруткой не работает, а с клавиатуры не работает вовсе (CRM §11.3).</span>
      </div>
    </div>
  </div>
</div>
</div>
EOF
