. ./_screens.sh
# tabrow "имя1|имя2|…" <индекс активной, с 1>
tabrow() {
  IFS='|'; i=1
  printf '<div class="tabsrow">'
  for t in $1; do
    if [ "$i" = "$2" ]; then printf '<span class="tab on">%s</span>' "$t"; else printf '<span class="tab">%s</span>' "$t"; fi
    i=$((i+1))
  done
  printf '</div>'
  unset IFS
}
cat <<EOF
<div class="board">
  <div>
    <span class="note">— Вкладки —</span>
    <h2 style="font-family:var(--font-display);font-size:26px;font-weight:600;margin-top:8px;color:var(--ink)">Что внутри каждой вкладки</h2>
    <p style="margin-top:8px;font-size:14px;color:var(--muted);max-width:960px">На экранах видна только активная вкладка. Здесь — содержимое остальных: список наряда разобран отдельной доской, тут пять остальных экранов с вкладками. Ширина 1440, поведение на 768 и 390 подписано.</p>
  </div>

  <!-- ═══ ЗАКАЗЫ ═══ -->
  <div>
    <div class="ptitle"><span class="pnum">Заказы</span><span class="pname">Пять вкладок списка</span></div>
    <p class="pdesc">Вкладка меняет фильтр по статусу и состав колонок: у истории появляется «Закрыт», у отказов — «Причина». Счётчик в подписи вкладки — из данных, а не константа.</p>
    <div class="panel">
$(tabrow "Активные 7|Новые 2|История|Отказы|Все 24" 1)
      <div class="body24" style="padding:16px 24px">
        <table class="tbl"><thead><tr><th style="width:78px">Номер</th><th>Клиент</th><th style="width:150px">Монтажник</th><th style="width:120px">Когда</th><th style="width:130px">Статус</th></tr></thead>
          <tbody>
            <tr><td class="mono strong">№ 128</td><td class="strong">Дмитрий Лапшин</td><td><span class="usr"><span class="ava xs">ПК</span><span class="nm" style="font-size:13px">Пётр К.</span></span></td><td class="mono t-lbl">29 авг, 14:00</td><td><span class="chip c-primary"><span class="dot"></span>В работе</span></td></tr>
            <tr><td class="mono strong">№ 127</td><td class="strong">ООО «Тулаторг»</td><td><span class="usr"><span class="ava xs" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="nm" style="font-size:13px">Артём М.</span></span></td><td class="mono t-lbl">29 авг, 17:30</td><td><span class="chip c-warn"><span class="dot"></span>Назначен</span></td></tr>
          </tbody></table>
      </div>
    </div>
    <div class="panel" style="margin-top:14px">
$(tabrow "Активные 7|Новые 2|История|Отказы|Все 24" 2)
      <div class="body24" style="padding:16px 24px">
        <div class="alert a-warn" style="margin-bottom:12px"><span class="ai">$I_WARN</span><div><div class="at">Заказ без исполнителя и времени</div><div class="ad">Пока не назначен монтажник, наряд не попадает в календарь и не виден монтажнику.</div></div></div>
        <table class="tbl"><thead><tr><th style="width:78px">Номер</th><th>Клиент</th><th style="width:150px">Откуда</th><th style="width:130px">Создан</th><th style="width:150px">Действие</th></tr></thead>
          <tbody>
            <tr><td class="mono strong">№ 126</td><td class="strong">Алла Викторовна</td><td><span class="chip c-default">из заявки № 41</span></td><td class="mono t-lbl">30 авг, 09:12</td><td><span class="btn flat sm">Назначить</span></td></tr>
            <tr><td class="mono strong">№ 129</td><td class="strong">Максим Ильин</td><td><span class="chip c-default">вручную</span></td><td class="mono t-lbl">30 авг, 11:40</td><td><span class="btn flat sm">Назначить</span></td></tr>
          </tbody></table>
      </div>
    </div>
    <div class="panel" style="margin-top:14px">
$(tabrow "Активные 7|Новые 2|История|Отказы|Все 24" 3)
      <div class="body24" style="padding:16px 24px">
        <div class="tbar" style="margin-bottom:12px"><div class="row" style="gap:8px"><span class="btn faded sm">$I_CAL Период</span><span class="chip c-primary lg">Август <span class="x">×</span></span></div><span class="t-lbl mut">18 закрыто · 612 тыс ₽ · маржа 77%</span></div>
        <table class="tbl"><thead><tr><th style="width:78px">Номер</th><th>Клиент</th><th style="width:130px">Закрыт</th><th class="rt" style="width:110px">Сумма</th><th class="rt" style="width:110px">Маржа</th><th style="width:120px">Отзыв</th></tr></thead>
          <tbody>
            <tr><td class="mono strong">№ 123</td><td class="strong">Ольга Лапшина</td><td class="mono t-lbl">24 авг</td><td class="rt mono strong">31 900 ₽</td><td class="rt mono" style="color:var(--ok-ink)">24 100 ₽</td><td><span class="chip c-success">5 звёзд</span></td></tr>
            <tr><td class="mono strong">№ 119</td><td class="strong">Николай</td><td class="mono t-lbl">21 авг</td><td class="rt mono strong">27 400 ₽</td><td class="rt mono" style="color:var(--ok-ink)">19 800 ₽</td><td><span class="chip c-warn">3 звезды</span></td></tr>
          </tbody></table>
        <span class="hint" style="margin-top:10px">Колонки «Маржа» и «Отзыв» есть только здесь: у активного заказа маржи ещё нет, отзыв приходит после закрытия.</span>
      </div>
    </div>
    <div class="panel" style="margin-top:14px">
$(tabrow "Активные 7|Новые 2|История|Отказы|Все 24" 4)
      <div class="body24" style="padding:16px 24px">
        <table class="tbl"><thead><tr><th style="width:78px">Номер</th><th>Клиент</th><th style="width:130px">Отказ</th><th style="width:340px">Причина</th><th style="width:130px">Действие</th></tr></thead>
          <tbody>
            <tr><td class="mono strong">№ 117</td><td class="strong">Без имени</td><td class="mono t-lbl">18 авг</td><td class="t-lbl">Нашёл дешевле, отказался на этапе замера</td><td><span class="btn light sm">Вернуть в работу</span></td></tr>
            <tr><td class="mono strong">№ 112</td><td class="strong">Сергей Панин</td><td class="mono t-lbl">9 авг</td><td class="t-lbl">Не выходит на связь третий раз</td><td><span class="btn light sm">Вернуть в работу</span></td></tr>
          </tbody></table>
        <span class="hint" style="margin-top:10px">Причина обязательна: без неё раздел отказов превращается в свалку, из которой не сделать выводов о воронке.</span>
      </div>
    </div>
    <span class="devcap">768 — вкладки прокручиваются лентой с затуханием, счётчики остаются. 390 — вкладки лентой, «Отказы» и «Все» уезжают за край и доступны прокруткой.</span>
  </div>

  <!-- ═══ СКЛАД ═══ -->
  <div>
    <div class="ptitle"><span class="pnum">Склад</span><span class="pname">Три вкладки</span></div>
    <p class="pdesc">Остаток — сумма движений, а не редактируемое поле. Поэтому журнал не приложение к разделу, а его вторая половина: без него вопрос «куда делись тридцать метров трассы» остаётся без ответа (CRM §11.5).</p>
    <div class="panel">
$(tabrow "Остатки по зонам|Журнал движений|Зоны хранения" 2)
      <div class="body24" style="padding:16px 24px">
        <div class="tbar" style="margin-bottom:12px">
          <div class="row" style="gap:8px"><span class="btn faded sm">$I_FILT Вид движения</span><span class="btn faded sm">$I_CAL Период</span><span class="chip c-primary lg">Август <span class="x">×</span></span></div>
          <span class="inp faded md solo" style="width:240px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Позиция или наряд</span></span></span>
        </div>
        <table class="tbl"><thead><tr><th style="width:130px">Когда</th><th style="width:140px">Вид</th><th>Позиция</th><th class="rt" style="width:100px">Сколько</th><th style="width:150px">Откуда</th><th style="width:150px">Куда</th><th style="width:130px">Основание</th></tr></thead>
          <tbody>
            <tr><td class="mono t-lbl">29 авг, 17:22</td><td><span class="chip c-danger">Списание</span></td><td class="strong">Кронштейны 450</td><td class="rt mono strong">−2 пары</td><td class="t-lbl">Машина · Пётр К.</td><td class="mut t-lbl">—</td><td><span class="chip c-default">наряд № 128</span></td></tr>
            <tr><td class="mono t-lbl">29 авг, 17:22</td><td><span class="chip c-danger">Списание</span></td><td class="strong">Медная труба 1/4″</td><td class="rt mono strong">−9 м</td><td class="t-lbl">Машина · Пётр К.</td><td class="mut t-lbl">—</td><td><span class="chip c-default">наряд № 128</span></td></tr>
            <tr><td class="mono t-lbl">28 авг, 09:05</td><td><span class="chip c-info">Перемещение</span></td><td class="strong">Медная труба 3/8″</td><td class="rt mono strong">30 м</td><td class="t-lbl">Склад</td><td class="t-lbl">Машина · Пётр К.</td><td class="mut t-lbl">—</td></tr>
            <tr><td class="mono t-lbl">26 авг, 14:30</td><td><span class="chip c-success">Приход</span></td><td class="strong">Теплоизоляция 9 мм</td><td class="rt mono strong">+200 м</td><td class="mut t-lbl">—</td><td class="t-lbl">Склад</td><td><span class="chip c-default">накладная 4471</span></td></tr>
            <tr class="rowwarn"><td class="mono t-lbl">25 авг, 11:00</td><td><span class="chip c-warn">Инвентаризация</span></td><td class="strong">Фреон R32</td><td class="rt mono strong">−1,2 кг</td><td class="t-lbl">Склад</td><td class="mut t-lbl">—</td><td class="t-lbl">Расхождение при пересчёте</td></tr>
          </tbody></table>
        <span class="hint" style="margin-top:10px">Правка остатка руками существует, но как движение «инвентаризация» с обязательной причиной, а не как тихое переписывание значения (CRM §11.5).</span>
      </div>
    </div>
    <div class="panel" style="margin-top:14px">
$(tabrow "Остатки по зонам|Журнал движений|Зоны хранения" 3)
      <div class="body24" style="padding:16px 24px">
        <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:14px">
          <div class="card"><div class="bd stack" style="gap:8px;padding:16px"><span class="row" style="justify-content:space-between"><span class="ttl" style="font-size:14px">Склад</span><span class="chip c-default">основная</span></span><span class="t-lbl mut">Тула, пр. Ленина 108, подсобное помещение</span><span class="row" style="justify-content:space-between;margin-top:4px"><span class="t-lbl mut">Позиций</span><span class="mono strong">38</span></span></div></div>
          <div class="card"><div class="bd stack" style="gap:8px;padding:16px"><span class="row" style="justify-content:space-between"><span class="ttl" style="font-size:14px">Машина · Пётр К.</span><span class="ava xs">ПК</span></span><span class="t-lbl mut">Личная зона монтажника</span><span class="row" style="justify-content:space-between;margin-top:4px"><span class="t-lbl mut">Позиций</span><span class="mono strong">14</span></span></div></div>
          <div class="card"><div class="bd stack" style="gap:8px;padding:16px"><span class="row" style="justify-content:space-between"><span class="ttl" style="font-size:14px">Машина · Артём М.</span><span class="ava xs" style="background:var(--info-bg);color:var(--info-ink)">АМ</span></span><span class="t-lbl mut">Личная зона монтажника</span><span class="row" style="justify-content:space-between;margin-top:4px"><span class="t-lbl mut">Позиций</span><span class="mono strong">11</span></span></div></div>
          <div class="card" style="border-style:dashed"><div class="bd stack" style="gap:8px;padding:16px;align-items:center;justify-content:center;min-height:118px"><span class="btn light sm">$I_PLUS Зона</span><span class="t-tiny fnt" style="text-align:center">Третья зона потребовала бы, чтобы кто-то отмечал «выдал»</span></div></div>
        </div>
      </div>
    </div>
    <span class="devcap">768 — журнал теряет колонки «Откуда» и «Куда», они уходят в подпись строки. 390 — движения карточками, зоны списком.</span>
  </div>
</div>
EOF
