. ./_screens.sh
SHOT='<span style="width:52px;height:38px;border-radius:9px;background:linear-gradient(135deg,#eef6f8,#e8f4f7);display:flex;align-items:center;justify-content:center;color:var(--line-strong);flex-shrink:0">'"$I_CAT"'</span>'
cat <<EOF
<div class="board touch">
  <div class="col">
    <span class="devlab">1440 · десктоп — витрина, скидка и порядок вывода</span>
    <div class="page" style="padding:0"><div class="app" style="width:1440px;min-height:900px">
$(aside catalog)
      <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Каталог" "8 моделей · 6 видимых на сайте · 1 со скидкой" '<span class="btn bord sm">Характеристики</span><span class="btn solid">'"$I_PLUS"' Модель</span>')
        <div class="main">
          <div class="tbar">
            <div class="row" style="gap:8px"><span class="btn faded sm">$I_FILT Фильтр</span><span class="btn faded sm">$I_SORT Порядок вывода</span><span class="chip c-primary lg">Видимые <span class="x">×</span></span></div>
            <span class="inp faded md solo" style="width:260px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Название или мощность</span></span></span>
          </div>
          <div class="card flat" style="overflow:hidden">
            <table class="tbl">
              <thead><tr><th style="width:44px"></th><th>Модель</th><th style="width:110px">Площадь</th><th class="rt" style="width:140px">Цена</th><th style="width:170px">Скидка</th><th style="width:130px">На витрине</th><th style="width:130px">Видимость</th><th style="width:126px">Действия</th></tr></thead>
              <tbody>
                <tr><td>$SHOT</td><td><div class="strong">Сплит-система 09, инверторная</div><div class="t-tiny mut">2.6 кВт · 26 дБ · самая ходовая</div></td><td class="mono t-lbl">до 27 м²</td>
                  <td class="rt"><div class="mono strong">34 900 ₽</div><div class="t-tiny fnt" style="text-decoration:line-through">38 500 ₽</div></td>
                  <td><span class="chip c-danger">−9% до 10 сен</span></td>
                  <td><span class="chip c-primary">Избранное</span></td>
                  <td><span class="row" style="gap:8px"><span class="sw on"><i></i></span><span class="t-lbl">Видна</span></span></td>
                  <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td>$SHOT</td><td><div class="strong">Сплит-система 07, тихая серия</div><div class="t-tiny mut">2.0 кВт · 19 дБ · для спальни</div></td><td class="mono t-lbl">до 20 м²</td>
                  <td class="rt mono strong">31 900 ₽</td><td class="mut t-lbl">нет</td>
                  <td><span class="chip c-primary">Избранное</span></td>
                  <td><span class="row" style="gap:8px"><span class="sw on"><i></i></span><span class="t-lbl">Видна</span></span></td>
                  <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td>$SHOT</td><td><div class="strong">Сплит-система 09, базовая</div><div class="t-tiny mut">2.6 кВт · 26 дБ · дешевле всех</div></td><td class="mono t-lbl">до 25 м²</td>
                  <td class="rt mono strong">27 400 ₽</td><td class="mut t-lbl">нет</td>
                  <td><span class="chip c-primary">Избранное</span></td>
                  <td><span class="row" style="gap:8px"><span class="sw on"><i></i></span><span class="t-lbl">Видна</span></span></td>
                  <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td>$SHOT</td><td><div class="strong">Сплит-система 12, инверторная</div><div class="t-tiny mut">3.5 кВт · 24 дБ · на гостиную</div></td><td class="mono t-lbl">до 35 м²</td>
                  <td class="rt mono strong">46 900 ₽</td><td class="mut t-lbl">нет</td>
                  <td class="mut t-lbl">—</td>
                  <td><span class="row" style="gap:8px"><span class="sw on"><i></i></span><span class="t-lbl">Видна</span></span></td>
                  <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr style="opacity:.62"><td>$SHOT</td><td><div class="strong">Мульти-сплит на два блока</div><div class="t-tiny mut">черновик · нет фотографий</div></td><td class="mono t-lbl">до 50 м²</td>
                  <td class="rt mut">не задана</td><td class="mut t-lbl">нет</td><td class="mut t-lbl">—</td>
                  <td><span class="row" style="gap:8px"><span class="sw"><i></i></span><span class="t-lbl mut">Скрыта</span></span></td>
                  <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
              </tbody>
            </table>
            <div class="pager" style="border-top:1px solid var(--line)"><span class="t-lbl mut">5 из 8</span><span class="pg"><span class="dis">‹</span><span class="on">1</span><span>›</span></span><span class="row t-lbl mut" style="gap:8px">Строк на странице <span class="btn bord sm">8 $I_DOWN</span></span></div>
          </div>
          <div class="alert a-warn"><span class="ai">$I_WARN</span><div><div class="at">Перечёркивается только реально действовавшая цена</div><div class="ad">Скидка задаётся конечной ценой и периодом, процент вычисляется. Поднять цену на неделю, чтобы потом «снизить», нельзя — сайт разоблачает ровно этот приём (инвариант 14, ADR-011).</div></div></div>
        </div>
      </div>
    </div></div>
    <span class="devcap">«На витрине» и «Видимость» — разные вещи: первое выносит модель на главную, второе прячет её со всего сайта (ADR-109).</span>
  </div>

  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — сетка карточек вместо таблицы</span>
    <div class="frame tb"><div class="app rail" style="min-height:900px">
$(rail catalog)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Каталог" "8 моделей · 6 видимых" '<span class="btn solid sm">'"$I_PLUS"' Модель</span>')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="tbar"><span class="inp faded md solo" style="flex:1;min-width:0"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Название или мощность</span></span></span><span class="btn faded sm">$I_FILT Фильтр</span></div>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
            <div class="card"><div class="bd stack" style="gap:10px;padding:14px">
              <div class="row" style="gap:10px"><span style="width:64px;height:48px;border-radius:10px;background:linear-gradient(135deg,#eef6f8,#e8f4f7);display:flex;align-items:center;justify-content:center;color:var(--line-strong);flex-shrink:0">$I_CAT</span>
                <span class="stack" style="gap:2px;min-width:0"><span class="strong clip">Сплит-система 09, инверторная</span><span class="t-tiny mut">до 27 м² · 2.6 кВт</span></span></div>
              <div class="row" style="gap:8px;align-items:baseline"><span class="mono strong" style="font-size:16px">34 900 ₽</span><span class="t-tiny fnt" style="text-decoration:line-through">38 500 ₽</span><span class="chip c-danger">−9%</span></div>
              <div class="row" style="justify-content:space-between"><span class="chip c-primary">Избранное</span><span class="sw on"><i></i></span></div>
            </div></div>
            <div class="card"><div class="bd stack" style="gap:10px;padding:14px">
              <div class="row" style="gap:10px"><span style="width:64px;height:48px;border-radius:10px;background:linear-gradient(135deg,#eef6f8,#e8f4f7);display:flex;align-items:center;justify-content:center;color:var(--line-strong);flex-shrink:0">$I_CAT</span>
                <span class="stack" style="gap:2px;min-width:0"><span class="strong clip">Сплит-система 07, тихая</span><span class="t-tiny mut">до 20 м² · 2.0 кВт</span></span></div>
              <div class="row" style="gap:8px;align-items:baseline"><span class="mono strong" style="font-size:16px">31 900 ₽</span></div>
              <div class="row" style="justify-content:space-between"><span class="chip c-primary">Избранное</span><span class="sw on"><i></i></span></div>
            </div></div>
            <div class="card"><div class="bd stack" style="gap:10px;padding:14px">
              <div class="row" style="gap:10px"><span style="width:64px;height:48px;border-radius:10px;background:linear-gradient(135deg,#eef6f8,#e8f4f7);display:flex;align-items:center;justify-content:center;color:var(--line-strong);flex-shrink:0">$I_CAT</span>
                <span class="stack" style="gap:2px;min-width:0"><span class="strong clip">Сплит-система 09, базовая</span><span class="t-tiny mut">до 25 м² · 2.6 кВт</span></span></div>
              <div class="row" style="gap:8px;align-items:baseline"><span class="mono strong" style="font-size:16px">27 400 ₽</span></div>
              <div class="row" style="justify-content:space-between"><span class="chip c-primary">Избранное</span><span class="sw on"><i></i></span></div>
            </div></div>
            <div class="card" style="opacity:.62"><div class="bd stack" style="gap:10px;padding:14px">
              <div class="row" style="gap:10px"><span style="width:64px;height:48px;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint);flex-shrink:0">$I_CAT</span>
                <span class="stack" style="gap:2px;min-width:0"><span class="strong clip">Мульти-сплит на два блока</span><span class="t-tiny mut">черновик · нет фотографий</span></span></div>
              <div class="row" style="gap:8px;align-items:baseline"><span class="mut t-lbl">Цена не задана</span></div>
              <div class="row" style="justify-content:space-between"><span class="chip c-default">Скрыта</span><span class="sw"><i></i></span></div>
            </div></div>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Восемь колонок в 696px не помещаются честно — таблица становится сеткой карточек с фотографией, ценой и двумя переключателями.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — правка цены и скидки</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BACK" "Сплит-система 09" '<span class="btn solid sm">Сохранить</span>')
      <div class="mbody" style="gap:12px">
        <div class="row" style="gap:8px"><span class="chip c-primary lg">Избранное</span><span class="chip c-success lg">Видна на сайте</span></div>
        <div class="card"><div class="bd stack" style="gap:12px;padding:14px">
          <span class="cap" style="margin:0">Цена и скидка</span>
          <div class="inp flat col"><span class="lab">Базовая цена</span><span class="val mono">38 500 ₽</span></div>
          <div class="inp flat col foc"><span class="lab">Цена со скидкой</span><span class="val mono">34 900 ₽</span></div>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
            <div class="inp flat col"><span class="lab">Скидка до</span><span class="val mono">10.09.2026</span></div>
            <div class="inp flat col" style="background:var(--sale-bg)"><span class="lab" style="color:var(--sale-ink)">Процент</span><span class="val mono" style="color:var(--sale-ink)">−9%</span></div>
          </div>
          <span class="hint">Процент вычисляется из двух цен, а не вводится: владелец мыслит ценой на витрине, а не долей.</span>
        </div></div>
        <div class="card"><div class="hd" style="padding:12px 14px"><span class="ttl">Характеристики</span><span class="btn flat sm">$I_PLUS Строка</span></div>
          <div class="bd stack" style="gap:10px;padding:14px">
            <div class="inp flat" style="justify-content:space-between"><span class="body"><span class="lab">Мощность</span><span class="val">2.6 кВт</span></span><span class="iconbtn">$I_TRASH</span></div>
            <div class="inp flat" style="justify-content:space-between"><span class="body"><span class="lab">Уровень шума</span><span class="val">26 дБ</span></span><span class="iconbtn">$I_TRASH</span></div>
            <div class="inp flat" style="justify-content:space-between"><span class="body"><span class="lab">Wi-Fi управление</span><span class="val">Есть</span></span><span class="iconbtn">$I_TRASH</span></div>
            <span class="hint">Набор произвольный. Новая строка добавит строку и в таблицу сравнения на сайте — фиксированного списка нет ни в коде, ни в базе (инвариант 6).</span>
          </div>
        </div>
      </div>
      <div class="sticky-act"><span class="btn solid lg" style="width:100%">Сохранить и обновить сайт</span></div>
    </div>
    <span class="devcap">Владелец правит цену с телефона — на объекте, в машине, где угодно. Ради этого раздел и должен работать на 390.</span>
  </div>
</div>
EOF
