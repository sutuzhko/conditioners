. ./_screens.sh
BARS=$(cat chart-bars.svg)
cat <<EOF
  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — показатели 2×2, один график</span>
    <div class="frame"><div class="app rail" style="min-height:1000px">
$(rail overview)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Доброе утро, Сергей" "Среда, 29 августа · 3 выезда" '<span class="btn solid sm">'"$I_PLUS"' Заказ</span>')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="row" style="justify-content:space-between;gap:12px">
            <span class="seg"><span class="on">Обзор</span><span>Работа</span><span>Деньги</span></span>
            <span class="btn bord sm">$I_CAL Этот месяц $I_DOWN</span>
          </div>
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
            <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Новые обращения</span><span class="v"><span class="n" style="font-size:23px">3</span><span class="trend t-down">$I_WARN 1 сутки</span></span></div></div>
            <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Активные заказы</span><span class="v"><span class="n" style="font-size:23px">7</span><span class="trend t-up">↑ 2</span></span></div></div>
            <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Выручка за месяц</span><span class="v"><span class="n" style="font-size:23px">690 тыс ₽</span><span class="trend t-up">↑ 9,2%</span></span></div></div>
            <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Маржа за месяц</span><span class="v"><span class="n" style="font-size:23px">532 тыс ₽</span><span class="trend t-flat">77%</span></span></div></div>
          </div>
          <div class="card">
            <div class="hd"><div class="stack" style="gap:2px"><span class="ttl">Заказы по неделям</span><span class="t-tiny fnt">выполненные наряды, 12 недель</span></div></div>
            <div class="bd" style="padding:8px 14px 10px">$BARS</div>
          </div>
          <div class="card">
            <div class="hd"><span class="ttl">Ближайшие дела</span><span class="btn light sm">Календарь $I_CHEV</span></div>
            <div class="bd" style="padding:0">
              <table class="tbl">
                <tbody>
                  <tr><td style="width:96px" class="mono strong">сегодня<br><span class="t-tiny fnt">14:00</span></td><td><div class="strong">Монтаж 09 инвертор</div><div class="t-tiny mut clip">Оборонная 12, кв. 34 · Пётр К.</div></td><td class="rt" style="width:118px"><span class="chip c-primary"><span class="dot"></span>В работе</span></td></tr>
                  <tr><td class="mono strong">сегодня<br><span class="t-tiny fnt">17:30</span></td><td><div class="strong">ТО и чистка</div><div class="t-tiny mut clip">пр. Ленина 108 · Артём М.</div></td><td class="rt"><span class="chip c-warn"><span class="dot"></span>Назначен</span></td></tr>
                  <tr><td class="mono strong" style="color:var(--error-ink)">пт, 31<br><span class="t-tiny">09:00</span></td><td><div class="strong">Ремонт: не холодит</div><div class="t-tiny mut clip">Металлургов 22 · Иван С.</div></td><td class="rt"><span class="chip c-danger"><span class="dot"></span>Просрочен</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Второй график уезжает: на 696px две линейные диаграммы рядом дают подписи осей в 8px. Остаётся тот, что отвечает на ежедневный вопрос — сколько работы.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — что горит прямо сейчас</span>
    <div class="frame ph" style="min-height:844px">
$(mbar '<span class="ava" style="width:32px;height:32px">СД</span>' "Обзор" '<span class="iconbtn">'"$I_SEARCH"'</span><span class="iconbtn" style="position:relative">'"$I_BELL"'<span class="bdg">4</span></span>')
      <div class="mbody" style="gap:12px">
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
          <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Новые обращения</span><span class="v"><span class="n" style="font-size:24px">3</span></span></div></div>
          <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Активные заказы</span><span class="v"><span class="n" style="font-size:24px">7</span></span></div></div>
        </div>
        <div class="alert a-warn"><span class="ai">$I_WARN</span><div><div class="at">Одно обращение ждёт больше суток</div><div class="ad">№ 39 · вчера в 11:20</div></div></div>
        <div class="alert a-danger"><span class="ai">$I_WARN</span><div><div class="at">3 позиции ниже порога</div><div class="ad">Медная труба, кронштейны, фреон</div></div></div>
        <div class="card"><div class="hd" style="padding:12px 14px"><span class="ttl">Сегодня и завтра</span><span class="chip c-default">5</span></div>
          <div class="bd" style="padding:0">
            <div class="mrow" style="gap:6px;border-bottom:1px solid var(--line)">
              <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong t-lbl">сегодня, 14:00</span><span class="chip c-primary"><span class="dot"></span>В работе</span></div>
              <div class="strong">Монтаж 09 инвертор</div><div class="t-tiny mut">Оборонная 12, кв. 34 · Пётр К.</div>
            </div>
            <div class="mrow" style="gap:6px;border-bottom:1px solid var(--line)">
              <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong t-lbl">сегодня, 17:30</span><span class="chip c-warn"><span class="dot"></span>Назначен</span></div>
              <div class="strong">ТО и чистка</div><div class="t-tiny mut">пр. Ленина 108 · Артём М.</div>
            </div>
            <div class="mrow" style="gap:6px">
              <div class="row" style="justify-content:space-between;gap:10px"><span class="mono strong t-lbl" style="color:var(--error-ink)">пт, 09:00</span><span class="chip c-danger"><span class="dot"></span>Просрочен</span></div>
              <div class="strong">Ремонт: не холодит</div><div class="t-tiny mut">Металлургов 22 · Иван С.</div>
            </div>
          </div>
          <div class="ft" style="padding:10px 14px"><span class="btn light sm" style="width:100%">Открыть календарь $I_CHEV</span></div>
        </div>
      </div>
$(otab ov)
    </div>
    <span class="devcap">Графиков нет: на 390 столбец в 6px не читается. Вместо них — две цифры и то, что требует решения сегодня.</span>
  </div>
