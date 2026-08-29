. ./_screens.sh
cat <<EOF
<div class="board touch">
  <div class="col">
    <span class="devlab">1440 · десктоп — статьи и их состояние</span>
    <div class="page" style="padding:0"><div class="app" style="width:1440px;min-height:880px">
$(aside knowledge)
      <div style="display:flex;flex-direction:column;min-width:0">
$(chead "База знаний" "12 статей · 9 опубликованы · 3 черновика" '<span class="btn solid">'"$I_PLUS"' Статья</span>')
        <div class="main">
          <div class="tbar">
            <div class="row" style="gap:8px"><span class="btn faded sm">$I_FILT Рубрика</span><span class="btn faded sm">$I_SORT По дате</span></div>
            <span class="inp faded md solo" style="width:280px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Заголовок или текст</span></span></span>
          </div>
          <div class="card flat" style="overflow:hidden">
            <table class="tbl">
              <thead><tr><th>Статья</th><th style="width:150px">Рубрика</th><th style="width:120px">Дата</th><th style="width:110px">Чтение</th><th style="width:140px">Состояние</th><th style="width:126px">Действия</th></tr></thead>
              <tbody>
                <tr><td><div class="strong">Можно ли включать кондиционер на обогрев зимой</div><div class="t-tiny mut clip">/knowledge/obogrev-zimoy · 4 380 знаков</div></td><td><span class="chip c-default">Эксплуатация</span></td><td class="mono t-lbl">20 авг</td><td class="mono t-lbl">4 мин</td><td><span class="chip c-success"><span class="dot"></span>Опубликована</span></td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td><div class="strong">Как считать мощность по площади и не переплатить</div><div class="t-tiny mut clip">/knowledge/moshchnost-po-ploshchadi · 6 120 знаков</div></td><td><span class="chip c-default">Выбор</span></td><td class="mono t-lbl">14 авг</td><td class="mono t-lbl">6 мин</td><td><span class="chip c-success"><span class="dot"></span>Опубликована</span></td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td><div class="strong">Как обманывают при установке: семь приёмов</div><div class="t-tiny mut clip">/knowledge/kak-obmanyvayut · 8 940 знаков</div></td><td><span class="chip c-default">Честно о цене</span></td><td class="mono t-lbl">2 авг</td><td class="mono t-lbl">9 мин</td><td><span class="chip c-success"><span class="dot"></span>Опубликована</span></td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr style="opacity:.66"><td><div class="strong">Чистка кондиционера своими руками</div><div class="t-tiny mut clip">черновик · обложка не выбрана</div></td><td><span class="chip c-default">Эксплуатация</span></td><td class="mono t-lbl">вчера</td><td class="mono t-lbl">3 мин</td><td><span class="chip c-default"><span class="dot"></span>Черновик</span></td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
              </tbody>
            </table>
            <div class="pager" style="border-top:1px solid var(--line)"><span class="t-lbl mut">4 из 12</span><span class="pg"><span class="dis">‹</span><span class="on">1</span><span>2</span><span>›</span></span></div>
          </div>
          <div class="alert a-warn"><span class="ai">$I_WARN</span><div><div class="at">Тексты только оригинальные</div><div class="ad">Скопированная у конкурента статья не просто не даст трафика — она утянет вниз весь домен.</div></div></div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Адрес статьи виден в подписи: слаг задаёт владелец, и на него завязаны разосланные ссылки.</span>
  </div>

  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — редактор статьи</span>
    <div class="frame tb"><div class="app rail" style="min-height:880px">
$(rail knowledge)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Обогрев зимой" "Эксплуатация · опубликована 20 августа" '<span class="btn solid sm">Сохранить</span>')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="tabs" style="gap:16px"><span class="tab on">Текст</span><span class="tab">Обложка</span><span class="tab">SEO</span></div>
          <div class="inp bordered col"><span class="lab">Заголовок</span><span class="val">Можно ли включать кондиционер на обогрев зимой</span></div>
          <div class="inp bordered col"><span class="lab">Адрес</span><span class="val mono">/knowledge/obogrev-zimoy</span></div>
          <div class="inp bordered col tall" style="min-height:240px"><span class="lab">Текст</span><span class="val" style="font-size:13.5px;margin-top:6px;line-height:1.6">## Что решает<br>Можно, если у модели есть зимний комплект и заявленный диапазон обогрева. Без них компрессор запускается на густом масле и живёт недолго.<br><br>## Как проверить</span></div>
          <span class="hint">Свой мини-формат вместо визуального редактора: владелец правит текст в обычном поле и не может сломать вёрстку вставкой из Word.</span>
        </div>
      </div>
    </div></div>
    <span class="devcap">Редактор занимает всю ширину: длинная строка здесь не вредит — это исходник, а не читаемый текст.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — список статей</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BURG" "База знаний" '<span class="iconbtn">'"$I_SEARCH"'</span><span class="btn solid sm icon">'"$I_PLUS"'</span>')
      <div class="mbody" style="gap:10px">
        <div class="row" style="gap:8px"><span class="chip c-primary lg">Все</span><span class="chip c-default lg">Опубликованы</span><span class="chip c-default lg">Черновики</span></div>
        <div class="card"><div class="mrow" style="gap:6px">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="chip c-default">Эксплуатация</span><span class="chip c-success"><span class="dot"></span>Опубликована</span></div>
          <div class="strong" style="font-size:15px">Можно ли включать кондиционер на обогрев зимой</div>
          <div class="mono t-tiny fnt">20 августа · 4 мин чтения</div>
        </div></div>
        <div class="card"><div class="mrow" style="gap:6px">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="chip c-default">Выбор</span><span class="chip c-success"><span class="dot"></span>Опубликована</span></div>
          <div class="strong" style="font-size:15px">Как считать мощность по площади и не переплатить</div>
          <div class="mono t-tiny fnt">14 августа · 6 мин чтения</div>
        </div></div>
        <div class="card" style="opacity:.7"><div class="mrow" style="gap:6px">
          <div class="row" style="justify-content:space-between;gap:10px"><span class="chip c-default">Эксплуатация</span><span class="chip c-default"><span class="dot"></span>Черновик</span></div>
          <div class="strong" style="font-size:15px">Чистка кондиционера своими руками</div>
          <div class="mono t-tiny fnt">вчера · обложка не выбрана</div>
        </div></div>
      </div>
$(otab more)
    </div>
    <span class="devcap">С телефона статьи читают и проверяют, а не пишут: список и состояние, редактор — по нажатию.</span>
  </div>
</div>
EOF
