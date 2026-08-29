. ./_tabs.sh
T="Наряд|Расход|Чеклист|Документы|История"
cat <<EOF

  <!-- ══ 2. РАСХОД ══ -->
  <div class="tsec">
$(tsec "Вкладка 2 · новая" "Расход материалов" "Этого в панели нет вовсе, а без него не считается ни склад, ни маржа. План подставляется из наряда, факт вписывает монтажник, закрытие списывает по факту. Уход в минус помечается, а не запрещается (CRM §11.6).")
    <div class="row3">
      <div class="col"><span class="devlab">1440</span>
        <div class="frame dk">
$(trow "$T" 2)
          <div class="bd20 grid" style="grid-template-columns:minmax(0,1fr) 330px;gap:14px;align-items:start">
            <div class="stack" style="gap:12px">
              <div class="card"><div class="hd"><span class="ttl">Материалы</span><div class="row" style="gap:8px"><span class="btn light sm">Пересобрать план</span><span class="btn flat sm">$I_PLUS Позиция</span></div></div>
                <div class="bd" style="padding:0"><table class="tbl">
                  <thead><tr><th>Позиция</th><th style="width:64px">Ед.</th><th class="rt" style="width:76px">План</th><th class="rt" style="width:104px">Факт</th><th class="rt" style="width:96px">Отклонение</th><th style="width:132px">Списать из зоны</th><th class="rt" style="width:96px">Закупка</th></tr></thead>
                  <tbody>
                    <tr><td><div class="strong">Медная труба 1/4″</div><div class="t-tiny mut">из трассы поз. 1 и 2</div></td><td class="mut">метр</td><td class="rt mono">7,5</td><td class="rt"><span class="inp bordered sm solo" style="width:72px"><span class="body"><span class="val mono">9</span></span></span></td><td class="rt"><span class="chip c-warn">+1,5</span></td><td><span class="row" style="gap:6px"><span class="ava xs">ПК</span><span class="t-lbl">Машина</span></span></td><td class="rt mono">1 350 ₽</td></tr>
                    <tr><td><div class="strong">Медная труба 3/8″</div><div class="t-tiny mut">из трассы поз. 1</div></td><td class="mut">метр</td><td class="rt mono">4,5</td><td class="rt"><span class="inp bordered sm solo" style="width:72px"><span class="body"><span class="val mono">4,5</span></span></span></td><td class="rt mut">—</td><td><span class="row" style="gap:6px"><span class="ava xs">ПК</span><span class="t-lbl">Машина</span></span></td><td class="rt mono">1 080 ₽</td></tr>
                    <tr class="rowbad"><td><div class="strong">Кронштейны 450</div><div class="t-tiny" style="color:var(--error-ink)">в машине была 1 пара</div></td><td class="mut">пара</td><td class="rt mono">1</td><td class="rt"><span class="inp bordered sm solo err" style="width:72px"><span class="body"><span class="val mono">2</span></span></span></td><td class="rt"><span class="chip c-danger">+1</span></td><td><span class="row" style="gap:6px"><span class="ava xs">ПК</span><span class="t-lbl">Машина</span></span></td><td class="rt mono">1 400 ₽</td></tr>
                    <tr><td><div class="strong">Короб ПВХ 60×60</div><div class="t-tiny mut">добавил монтажник</div></td><td class="mut">метр</td><td class="rt mut">—</td><td class="rt"><span class="inp bordered sm solo" style="width:72px"><span class="body"><span class="val mono">2</span></span></span></td><td class="rt"><span class="chip c-primary">сверх плана</span></td><td><span class="row" style="gap:6px"><span class="ava xs">ПК</span><span class="t-lbl">Машина</span></span></td><td class="rt mono">520 ₽</td></tr>
                  </tbody></table></div></div>
              <div class="alert a-danger"><span class="ai">$I_WARN</span><div><div class="at">Списание уводит зону в минус — разрешено и помечено</div><div class="ad">Запрет означал бы, что монтажник впишет неправду, лишь бы закрыть наряд. Минус — сигнал «склад разошёлся с реальностью, нужна инвентаризация».</div></div></div>
            </div>
            <div class="stack" style="gap:12px">
              <div class="card"><div class="hd"><span class="ttl">Себестоимость</span><span class="chip c-default">Скрыто</span></div>
                <div class="bd stack" style="gap:8px">
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Техника закупкой</span><span class="mono strong">18 400 ₽</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Материалы по факту</span><span class="mono strong">4 350 ₽</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Выплата монтажнику</span><span class="mono strong">6 000 ₽</span></div>
                  <hr class="hr">
                  <div class="row" style="justify-content:space-between"><span class="t-lbl strong">Себестоимость</span><span class="num" style="font-size:17px">28 750 ₽</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl strong">Маржа</span><span class="num" style="font-size:19px;color:var(--ok-ink)">6 150 ₽</span></div>
                </div></div>
              <div class="card"><div class="hd"><span class="ttl">Когда списывается</span></div>
                <div class="bd stack" style="gap:8px">
                  <label class="opt"><span class="rdo on"></span><span class="txt">При закрытии наряда</span></label>
                  <label class="opt"><span class="rdo"></span><span class="txt">Сразу при сохранении</span></label>
                </div>
                <div class="ft"><span class="btn solid" style="width:100%">Списать со склада</span></div></div>
            </div>
          </div>
        </div></div>
      <div class="col"><span class="devlab">768</span>
        <div class="frame tb">
$(trow "$T" 2 sm)
          <div class="bd16 stack" style="gap:12px">
            <div class="card"><div class="hd"><span class="ttl">Материалы</span><span class="btn flat sm">$I_PLUS</span></div>
              <div class="bd" style="padding:0"><table class="tbl">
                <thead><tr><th>Позиция</th><th class="rt" style="width:64px">План</th><th class="rt" style="width:96px">Факт</th><th class="rt" style="width:92px">Отклонение</th></tr></thead>
                <tbody>
                  <tr><td><div class="strong">Медная труба 1/4″</div><div class="t-tiny mut">метр · из машины Петра К.</div></td><td class="rt mono">7,5</td><td class="rt"><span class="inp bordered sm solo" style="width:70px"><span class="body"><span class="val mono">9</span></span></span></td><td class="rt"><span class="chip c-warn">+1,5</span></td></tr>
                  <tr><td><div class="strong">Медная труба 3/8″</div><div class="t-tiny mut">метр · из машины Петра К.</div></td><td class="rt mono">4,5</td><td class="rt"><span class="inp bordered sm solo" style="width:70px"><span class="body"><span class="val mono">4,5</span></span></span></td><td class="rt mut">—</td></tr>
                  <tr class="rowbad"><td><div class="strong">Кронштейны 450</div><div class="t-tiny" style="color:var(--error-ink)">пара · в машине была 1</div></td><td class="rt mono">1</td><td class="rt"><span class="inp bordered sm solo err" style="width:70px"><span class="body"><span class="val mono">2</span></span></span></td><td class="rt"><span class="chip c-danger">+1</span></td></tr>
                </tbody></table></div></div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;align-items:start">
              <div class="card"><div class="hd"><span class="ttl">Себестоимость</span></div><div class="bd stack" style="gap:6px">
                <span class="row" style="justify-content:space-between"><span class="t-lbl mut">Материалы</span><span class="mono strong">4 350 ₽</span></span>
                <span class="row" style="justify-content:space-between"><span class="t-lbl strong">Маржа</span><span class="mono strong" style="color:var(--ok-ink)">6 150 ₽</span></span></div></div>
              <div class="card"><div class="bd"><span class="btn solid" style="width:100%">Списать со склада</span></div></div>
            </div>
          </div>
        </div></div>
      <div class="col"><span class="devlab">390 · монтажник</span>
        <div class="frame ph" style="min-height:700px">
          <div class="mbar"><span class="row" style="gap:10px"><span class="iconbtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span><span class="mtitle">Расход</span></span><span class="chip c-warn lg">4 позиции</span></div>
$(trow "$T" 2 xs)
          <div class="mbody">
            <div class="alert a-primary"><span class="ai">$I_WARN</span><div><div class="at">План собран из наряда</div><div class="ad">Впишите, сколько ушло на самом деле</div></div></div>
            <div class="card"><div class="mrow" style="gap:8px"><span class="row" style="justify-content:space-between"><span class="strong">Медная труба 1/4″</span><span class="t-tiny fnt">метр</span></span>
              <div class="row" style="gap:10px"><span class="inp bordered col" style="flex:1"><span class="lab">План</span><span class="val mono mut">7,5</span></span><span class="inp bordered col foc" style="flex:1"><span class="lab">Факт</span><span class="val mono">9</span></span></div>
              <span class="chip c-warn" style="align-self:flex-start">Больше плана на 1,5 м</span></div></div>
            <div class="card" style="border-color:var(--error-line)"><div class="mrow" style="gap:8px"><span class="row" style="justify-content:space-between"><span class="strong">Кронштейны 450</span><span class="t-tiny fnt">пара</span></span>
              <div class="row" style="gap:10px"><span class="inp bordered col" style="flex:1"><span class="lab">План</span><span class="val mono mut">1</span></span><span class="inp bordered col err" style="flex:1"><span class="lab">Факт</span><span class="val mono">2</span></span></div>
              <span class="hint bad">$I_WARN В машине была 1 пара. Склад уйдёт в минус — это нормально, важнее записать правду.</span></div></div>
            <span class="btn light" style="width:100%">$I_PLUS Добавить свою позицию</span>
          </div>
          <div class="sticky-act"><span class="btn solid lg" style="width:100%">$I_CHECK Сохранить расход</span><span class="t-tiny fnt" style="text-align:center">Списание уйдёт на склад при закрытии</span></div>
        </div></div>
    </div>
    <span class="devcap">768 — колонки «Списать из зоны» и «Закупка» уходят в подпись строки, себестоимость сжимается до двух чисел. 390 — версия монтажника: план, факт, своя позиция; закупочных цен и маржи он не видит (CRM §6).</span>
  </div>
EOF
