. ./_screens.sh
ST5='<span class="row" style="gap:2px">'"$(for i in 1 2 3 4 5; do printf '<svg width="13" height="13" viewBox="0 0 24 24" fill="var(--star)"><path d="m12 2 3 6.6 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.8z"/></svg>'; done)"'</span>'
ST3='<span class="row" style="gap:2px">'"$(for i in 1 2 3; do printf '<svg width="13" height="13" viewBox="0 0 24 24" fill="var(--star)"><path d="m12 2 3 6.6 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.8z"/></svg>'; done)$(for i in 1 2; do printf '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--line-ui)" stroke-width="1.6"><path d="m12 2 3 6.6 7 .8-5.2 4.8 1.4 7L12 17.8 5.8 21.2l1.4-7L2 9.4l7-.8z"/></svg>'; done)"'</span>'
cat <<EOF
<div class="board touch">
  <div class="col">
    <span class="devlab">1440 · десктоп — очередь модерации</span>
    <div class="page" style="padding:0"><div class="app" style="width:1440px;min-height:900px">
$(aside reviews)
      <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Отзывы" "2 ждут решения · 14 опубликованы" '')
        <div class="main">
          <div class="tabs"><span class="tab on">На модерации <span class="chip c-warn" style="height:18px;padding:0 6px;margin-left:5px">2</span></span><span class="tab">Опубликованы</span><span class="tab">Снятые</span><span class="tab">Все</span></div>
          <div class="alert a-primary"><span class="ai">$I_WARN</span><div><div class="at">Текст отзыва неизменяем</div><div class="ad">Модератор меняет только статус: редактируемый отзыв — это не отзыв (инвариант 7). Ни в базе, ни в интерфейсе поля правки текста нет.</div></div></div>
          <div class="stack" style="gap:12px">
            <div class="card"><div class="bd" style="padding:18px">
              <div class="row" style="justify-content:space-between;gap:16px;align-items:flex-start">
                <div class="stack" style="gap:10px;min-width:0;flex:1">
                  <div class="row" style="gap:12px">$ST3<span class="chip c-warn"><span class="dot"></span>На модерации</span><span class="t-tiny fnt">пришёл 28 августа в 19:42</span></div>
                  <p style="font-size:14.5px;line-height:1.55;color:var(--ink2);max-width:680px">«Работу сделали, но мусор оставили на лестничной клетке — пришлось выносить самому. В остальном нормально, кондиционер работает.»</p>
                  <div class="row" style="gap:10px"><span class="usr"><span class="ava xs">Н</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Николай</span><span class="ds">+7 (900) 321-88-05 · заказ № 124</span></span></span></div>
                </div>
                <div class="row" style="gap:8px;flex-shrink:0">
                  <span style="width:88px;height:66px;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
                  <div class="stack" style="gap:8px">
                    <span class="btn solid sm">$I_CHECK Опубликовать</span>
                    <span class="btn bord sm">Снять</span>
                    <span class="btn light sm">В архив</span>
                  </div>
                </div>
              </div>
            </div></div>
            <div class="card"><div class="bd" style="padding:18px">
              <div class="row" style="justify-content:space-between;gap:16px;align-items:flex-start">
                <div class="stack" style="gap:10px;min-width:0;flex:1">
                  <div class="row" style="gap:12px">$ST5<span class="chip c-warn"><span class="dot"></span>На модерации</span><span class="t-tiny fnt">пришёл 29 августа в 08:15</span></div>
                  <p style="font-size:14.5px;line-height:1.55;color:var(--ink2);max-width:680px">«Штробили бетон под трассу. Боялся, что разнесут полстены — вышло аккуратно, штробу зашпаклевали ровно, обои не тронули.»</p>
                  <div class="row" style="gap:10px"><span class="usr"><span class="ava xs">ВГ</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Владислав Гринёв</span><span class="ds">+7 (953) 190-42-11 · заказ № 125</span></span></span></div>
                </div>
                <div class="row" style="gap:8px;flex-shrink:0">
                  <span style="width:88px;height:66px;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
                  <div class="stack" style="gap:8px">
                    <span class="btn solid sm">$I_CHECK Опубликовать</span>
                    <span class="btn bord sm">Снять</span>
                    <span class="btn light sm">В архив</span>
                  </div>
                </div>
              </div>
            </div></div>
          </div>
          <div class="alert a-danger"><span class="ai">$I_WARN</span><div><div class="at">Выдуманных отзывов и рейтингов не бывает</div><div class="ad">Ни в тексте, ни в разметке Review и AggregateRating. Стартуем с пустым разделом — это обман в разметке и нарушение ФЗ «О рекламе» (инвариант 10).</div></div></div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Фото к отзыву открывается в полный размер по нажатию: на превью 88×66 не разглядеть, что именно показал клиент.</span>
  </div>

  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — действия под текстом</span>
    <div class="frame tb"><div class="app rail" style="min-height:900px">
$(rail reviews)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Отзывы" "2 ждут решения" '')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="tabs" style="gap:16px"><span class="tab on">На модерации <span class="chip c-warn" style="height:17px;padding:0 5px;margin-left:4px">2</span></span><span class="tab">Опубликованы</span><span class="tab">Снятые</span></div>
          <div class="card"><div class="bd stack" style="gap:12px;padding:16px">
            <div class="row" style="gap:12px">$ST3<span class="chip c-warn"><span class="dot"></span>На модерации</span><span class="t-tiny fnt" style="margin-left:auto">28 авг, 19:42</span></div>
            <p style="font-size:14px;line-height:1.55;color:var(--ink2)">«Работу сделали, но мусор оставили на лестничной клетке — пришлось выносить самому. В остальном нормально, кондиционер работает.»</p>
            <div class="row" style="gap:12px"><span class="usr"><span class="ava xs">Н</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Николай</span><span class="ds">заказ № 124</span></span></span>
              <span style="width:64px;height:48px;border-radius:9px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint);margin-left:auto">$I_CAT</span></div>
            <hr class="hr">
            <div class="row" style="gap:8px"><span class="btn solid sm" style="flex:1">$I_CHECK Опубликовать</span><span class="btn bord sm" style="flex:1">Снять</span><span class="btn light sm">В архив</span></div>
          </div></div>
          <div class="card"><div class="bd stack" style="gap:12px;padding:16px">
            <div class="row" style="gap:12px">$ST5<span class="chip c-warn"><span class="dot"></span>На модерации</span><span class="t-tiny fnt" style="margin-left:auto">29 авг, 08:15</span></div>
            <p style="font-size:14px;line-height:1.55;color:var(--ink2)">«Штробили бетон под трассу. Боялся, что разнесут полстены — вышло аккуратно, штробу зашпаклевали ровно.»</p>
            <div class="row" style="gap:12px"><span class="usr"><span class="ava xs">ВГ</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Владислав Гринёв</span><span class="ds">заказ № 125</span></span></span></div>
            <hr class="hr">
            <div class="row" style="gap:8px"><span class="btn solid sm" style="flex:1">$I_CHECK Опубликовать</span><span class="btn bord sm" style="flex:1">Снять</span><span class="btn light sm">В архив</span></div>
          </div></div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Кнопки уезжают под текст: справа от абзаца им не хватает ширины, и «Опубликовать» сжимается до «Опубли…».</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — решение в один тап</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BURG" "Отзывы" '<span class="chip c-warn lg">2</span>')
      <div style="padding:0 14px;background:var(--card);border-bottom:1px solid var(--line)">
        <div class="tabs" style="gap:18px;border:0"><span class="tab on">Модерация</span><span class="tab">Опубликованы</span><span class="tab">Снятые</span></div>
      </div>
      <div class="mbody" style="gap:12px">
        <div class="card"><div class="mrow" style="gap:10px">
          <div class="row" style="gap:10px">$ST3<span class="t-tiny fnt" style="margin-left:auto">28 авг</span></div>
          <p style="font-size:14px;line-height:1.55;color:var(--ink2)">«Работу сделали, но мусор оставили на лестничной клетке — пришлось выносить самому. В остальном нормально.»</p>
          <div class="row" style="gap:10px"><span class="usr"><span class="ava xs">Н</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Николай</span><span class="ds">заказ № 124</span></span></span>
            <span style="width:56px;height:42px;border-radius:9px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint);margin-left:auto">$I_CAT</span></div>
          <hr class="hr">
          <div class="row" style="gap:8px"><span class="btn solid" style="flex:1.4">$I_CHECK Опубликовать</span><span class="btn bord" style="flex:1">Снять</span></div>
        </div></div>
        <div class="card"><div class="mrow" style="gap:10px">
          <div class="row" style="gap:10px">$ST5<span class="t-tiny fnt" style="margin-left:auto">29 авг</span></div>
          <p style="font-size:14px;line-height:1.55;color:var(--ink2)">«Штробили бетон под трассу. Боялся, что разнесут полстены — вышло аккуратно, штробу зашпаклевали ровно.»</p>
          <div class="row" style="gap:10px"><span class="usr"><span class="ava xs">ВГ</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Владислав Гринёв</span><span class="ds">заказ № 125</span></span></span></div>
          <hr class="hr">
          <div class="row" style="gap:8px"><span class="btn solid" style="flex:1.4">$I_CHECK Опубликовать</span><span class="btn bord" style="flex:1">Снять</span></div>
        </div></div>
      </div>
$(otab more)
    </div>
    <span class="devcap">Модерация — то, что делают между делом: два действия крупными кнопками, «В архив» уезжает в меню карточки.</span>
  </div>
</div>
EOF
