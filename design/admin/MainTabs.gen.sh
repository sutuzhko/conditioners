. ./_tabs.sh
S="Обзор|Работа|Деньги"
h3() { printf '<div class="col"><span class="devlab">%s</span>' "$1"; }
mb() { printf '<div class="mbar"><span class="row" style="gap:10px"><span class="ava">СД</span><span class="mtitle">%s</span></span>%s</div>' "$1" "$2"; }
st() { printf '<div class="card"><div class="stat"><span class="l t-lbl">%s</span><span class="v"><span class="n">%s</span>%s</span><span class="c t-tiny">%s</span></div></div>' "$1" "$2" "$3" "$4"; }
cat <<EOF
<div class="board touch">
  <div>
    <span class="note">— Обзор —</span>
    <h2 style="font-family:var(--font-display);font-size:26px;font-weight:600;margin-top:8px;color:var(--ink)">Три сегмента на трёх ширинах</h2>
    <p style="margin-top:8px;font-size:14px;color:var(--muted);max-width:1100px">Обзор переключается не вкладками, а сегментами: разделы не равноправны — «Обзор» это ответ на «как дела», остальные два раскрывают его. На 390 сегменты остаются сегментами, но каждый показывает свои две плитки, а не восемь.</p>
  </div>

  <div class="tsec">
$(tsec "Обзор · сегмент 1" "Обзор" "Первый экран владельца утром. Четыре числа, которые решают, куда бежать: новые заявки, работы на сегодня, выручка месяца, отзывы на модерации.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
          <div class="bd20">
            <div class="row" style="justify-content:space-between;margin-bottom:14px"><div class="seg">$(printf '<span class="sg on">Обзор</span><span class="sg">Работа</span><span class="sg">Деньги</span>')</div><span class="btn bord sm">Август 2026 $I_CHEV</span></div>
            <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px">
$(st "Новые заявки" "12" '<span class="trend t-up">+4</span>' "за сегодня")
$(st "Работ на сегодня" "5" '' "две в Пролетарском")
$(st "Выручка месяца" "486 200 ₽" '<span class="trend t-up">+18%</span>' "к июлю")
$(st "Отзывы на модерации" "7" '' "ждут решения")
            </div>
            <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:14px">
              <div class="card"><div class="hd"><span class="ttl">Заявки и заказы по неделям</span><span class="btn light sm">Подробно</span></div><div class="bd"><img src="chart-lines.svg" role="img" aria-label="Заявки и заказы по неделям: заявок 12, выполненных нарядов 38" style="display:block;width:100%"></div></div>
              <div class="card"><div class="hd"><span class="ttl">Ближайшие работы</span></div><div class="bd" style="padding:0">
                <div class="mrow" style="gap:4px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="strong">09:00 · Монтаж 09</span><span class="chip c-primary">Пётр К.</span></div><span class="t-tiny mut">Оборонная 12, кв. 34</span></div>
                <div class="mrow" style="gap:4px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="strong">12:30 · ТО и чистка</span><span class="chip c-primary">Артём М.</span></div><span class="t-tiny mut">Пролетарская 8, офис 2</span></div>
                <div class="mrow" style="gap:4px"><div class="row" style="justify-content:space-between"><span class="strong">15:00 · Замер</span><span class="chip c-warn">Не назначен</span></div><span class="t-tiny mut">Кутузова 44</span></div>
              </div></div>
            </div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
          <div class="bd16">
            <div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="seg sm">$(printf '<span class="sg on">Обзор</span><span class="sg">Работа</span><span class="sg">Деньги</span>')</div><span class="btn bord sm">Август $I_CHEV</span></div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
$(st "Новые заявки" "12" '<span class="trend t-up">+4</span>' "за сегодня")
$(st "Работ на сегодня" "5" '' "две в Пролетарском")
$(st "Выручка месяца" "486 200 ₽" '<span class="trend t-up">+18%</span>' "к июлю")
$(st "Отзывы" "7" '' "на модерации")
            </div>
            <div class="card"><div class="hd"><span class="ttl">Заявки и заказы</span></div><div class="bd"><img src="chart-lines.svg" role="img" aria-label="Заявки и заказы по неделям: заявок 12, выполненных нарядов 38" style="display:block;width:100%"></div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Обзор" '<span class="iconbtn">'"$I_BELL"'<span class="bdg">7</span></span>')
          <div class="mbody">
            <div class="seg xs">$(printf '<span class="sg on">Обзор</span><span class="sg">Работа</span><span class="sg">Деньги</span>')</div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
$(st "Новые заявки" "12" '<span class="trend t-up">+4</span>' "сегодня")
$(st "Работ сегодня" "5" '' "две рядом")
            </div>
            <div class="card"><div class="hd"><span class="ttl">Ближайшие работы</span></div><div class="bd" style="padding:0">
              <div class="mrow" style="gap:4px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="strong">09:00 · Монтаж 09</span><span class="chip c-primary">Пётр К.</span></div><span class="t-tiny mut">Оборонная 12, кв. 34</span></div>
              <div class="mrow" style="gap:4px"><div class="row" style="justify-content:space-between"><span class="strong">12:30 · ТО и чистка</span><span class="chip c-primary">Артём М.</span></div><span class="t-tiny mut">Пролетарская 8, офис 2</span></div>
            </div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">1440 — четыре плитки в ряд и график с расписанием рядом. 768 — плитки 2×2, график во всю ширину, расписание уходит под него. 390 — две плитки вместо четырёх: выручка и отзывы живут в своих сегментах, а не громоздятся на первом экране.</span>
  </div>

  <div class="tsec">
$(tsec "Обзор · сегмент 2" "Работа" "Загрузка бригад и что стоит. Отвечает на вопрос «успеваем ли» — не «сколько заработали».")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
          <div class="bd20">
            <div class="row" style="justify-content:space-between;margin-bottom:14px"><div class="seg">$(printf '<span class="sg">Обзор</span><span class="sg on">Работа</span><span class="sg">Деньги</span>')</div><span class="btn bord sm">Август 2026 $I_CHEV</span></div>
            <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px">
$(st "Выполнено за месяц" "38" '<span class="trend t-up">+6</span>' "к июлю")
$(st "В работе" "9" '' "из них 2 просрочены")
$(st "Средний срок" "2,4 дня" '<span class="trend t-down">−0,3</span>' "от заявки до монтажа")
$(st "Занятость бригад" "78%" '' "рабочие часы")
            </div>
            <div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px">
              <div class="card"><div class="hd"><span class="ttl">Работы по монтажникам</span></div><div class="bd"><img src="chart-bars.svg" role="img" aria-label="Выручка по неделям августа, всего 486 200 рублей" style="display:block;width:100%"></div></div>
              <div class="card"><div class="hd"><span class="ttl">Требуют внимания</span><span class="chip c-danger">2</span></div><div class="bd" style="padding:0">
                <div class="mrow rowbad" style="gap:4px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="strong">№ 119 · Монтаж 12</span><span class="chip c-danger">Просрочен 2 дня</span></div><span class="t-tiny mut">Ждёт материал: труба 1/4″</span></div>
                <div class="mrow rowbad" style="gap:4px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="strong">№ 122 · Замер</span><span class="chip c-danger">Не назначен</span></div><span class="t-tiny mut">Заявка от 26 августа</span></div>
                <div class="mrow" style="gap:4px"><div class="row" style="justify-content:space-between"><span class="strong">№ 126 · ТО</span><span class="chip c-warn">Перенесён клиентом</span></div><span class="t-tiny mut">Новая дата не выбрана</span></div>
              </div></div>
            </div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
          <div class="bd16">
            <div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="seg sm">$(printf '<span class="sg">Обзор</span><span class="sg on">Работа</span><span class="sg">Деньги</span>')</div><span class="btn bord sm">Август $I_CHEV</span></div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
$(st "Выполнено" "38" '<span class="trend t-up">+6</span>' "к июлю")
$(st "В работе" "9" '' "2 просрочены")
$(st "Средний срок" "2,4 дня" '<span class="trend t-down">−0,3</span>' "до монтажа")
$(st "Занятость" "78%" '' "рабочие часы")
            </div>
            <div class="card"><div class="hd"><span class="ttl">Требуют внимания</span><span class="chip c-danger">2</span></div><div class="bd" style="padding:0">
              <div class="mrow rowbad" style="gap:4px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="strong">№ 119 · Монтаж 12</span><span class="chip c-danger">Просрочен 2 дня</span></div><span class="t-tiny mut">Ждёт материал: труба 1/4″</span></div>
              <div class="mrow rowbad" style="gap:4px"><div class="row" style="justify-content:space-between"><span class="strong">№ 122 · Замер</span><span class="chip c-danger">Не назначен</span></div><span class="t-tiny mut">Заявка от 26 августа</span></div>
            </div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Обзор" '')
          <div class="mbody">
            <div class="seg xs">$(printf '<span class="sg">Обзор</span><span class="sg on">Работа</span><span class="sg">Деньги</span>')</div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
$(st "Выполнено" "38" '<span class="trend t-up">+6</span>' "за август")
$(st "В работе" "9" '' "2 просрочены")
            </div>
            <div class="card"><div class="hd"><span class="ttl">Требуют внимания</span><span class="chip c-danger">2</span></div><div class="bd" style="padding:0">
              <div class="mrow rowbad" style="gap:4px;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between"><span class="strong">№ 119</span><span class="chip c-danger">Просрочен</span></div><span class="t-tiny mut">Ждёт трубу 1/4″</span></div>
              <div class="mrow rowbad" style="gap:4px"><div class="row" style="justify-content:space-between"><span class="strong">№ 122</span><span class="chip c-danger">Не назначен</span></div><span class="t-tiny mut">Заявка от 26 августа</span></div>
            </div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">График по монтажникам с 390 уходит совсем: шесть столбцов на 358px нечитаемы, а список «требуют внимания» отвечает на тот же вопрос точнее.</span>
  </div>

  <div class="tsec">
$(tsec "Обзор · сегмент 3" "Деньги" "Выручка, средний чек и структура. Числа отсюда не расходятся с тем, что видно в заказах: это тот же источник, а не отдельный отчёт.")
    <div class="row3">
$(h3 1440)
        <div class="frame dk">
          <div class="bd20">
            <div class="row" style="justify-content:space-between;margin-bottom:14px"><div class="seg">$(printf '<span class="sg">Обзор</span><span class="sg">Работа</span><span class="sg on">Деньги</span>')</div><span class="btn bord sm">Август 2026 $I_CHEV</span></div>
            <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:14px">
$(st "Выручка" "486 200 ₽" '<span class="trend t-up">+18%</span>' "к июлю")
$(st "Средний чек" "12 800 ₽" '<span class="trend t-up">+900 ₽</span>' "к июлю")
$(st "Расход материалов" "94 100 ₽" '' "19% выручки")
$(st "К выплате бригадам" "132 000 ₽" '' "за 38 работ")
            </div>
            <div class="grid" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:14px">
              <div class="card"><div class="hd"><span class="ttl">Выручка по неделям</span><span class="btn light sm">Выгрузить</span></div><div class="bd"><img src="chart-bars.svg" role="img" aria-label="Выручка по неделям августа, всего 486 200 рублей" style="display:block;width:100%"></div></div>
              <div class="card"><div class="hd"><span class="ttl">Из чего сложилась</span></div><div class="bd" style="padding:0"><table class="tbl">
                <tbody>
                  <tr><td class="strong">Монтаж</td><td class="rt mono strong">311 400 ₽</td><td class="rt t-lbl mut">64%</td></tr>
                  <tr><td class="strong">Оборудование</td><td class="rt mono strong">118 700 ₽</td><td class="rt t-lbl mut">24%</td></tr>
                  <tr><td class="strong">ТО и сервис</td><td class="rt mono strong">56 100 ₽</td><td class="rt t-lbl mut">12%</td></tr>
                </tbody></table></div></div>
            </div>
          </div>
        </div></div>
$(h3 768)
        <div class="frame tb">
          <div class="bd16">
            <div class="row" style="justify-content:space-between;margin-bottom:12px"><div class="seg sm">$(printf '<span class="sg">Обзор</span><span class="sg">Работа</span><span class="sg on">Деньги</span>')</div><span class="btn bord sm">Август $I_CHEV</span></div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
$(st "Выручка" "486 200 ₽" '<span class="trend t-up">+18%</span>' "к июлю")
$(st "Средний чек" "12 800 ₽" '<span class="trend t-up">+900 ₽</span>' "к июлю")
$(st "Материалы" "94 100 ₽" '' "19% выручки")
$(st "К выплате" "132 000 ₽" '' "за 38 работ")
            </div>
            <div class="card"><div class="hd"><span class="ttl">Выручка по неделям</span></div><div class="bd"><img src="chart-bars.svg" role="img" aria-label="Выручка по неделям августа, всего 486 200 рублей" style="display:block;width:100%"></div></div>
          </div>
        </div></div>
$(h3 390)
        <div class="frame ph" style="min-height:640px">
$(mb "Обзор" '')
          <div class="mbody">
            <div class="seg xs">$(printf '<span class="sg">Обзор</span><span class="sg">Работа</span><span class="sg on">Деньги</span>')</div>
            <div class="card"><div class="stat"><span class="l t-lbl">Выручка за август</span><span class="v"><span class="n" style="font-size:30px">486 200 ₽</span><span class="trend t-up">+18%</span></span><span class="c t-tiny">к июлю</span></div></div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
$(st "Средний чек" "12 800 ₽" '' "+900 ₽")
$(st "Материалы" "94 100 ₽" '' "19%")
            </div>
            <div class="card"><div class="hd"><span class="ttl">Из чего сложилась</span></div><div class="bd" style="padding:0"><table class="tbl">
              <tbody>
                <tr><td class="strong">Монтаж</td><td class="rt mono strong">311 400 ₽</td><td class="rt t-lbl mut">64%</td></tr>
                <tr><td class="strong">Оборудование</td><td class="rt mono strong">118 700 ₽</td><td class="rt t-lbl mut">24%</td></tr>
                <tr><td class="strong">ТО и сервис</td><td class="rt mono strong">56 100 ₽</td><td class="rt t-lbl mut">12%</td></tr>
              </tbody></table></div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">390 — главное число получает собственную широкую плитку и кегль 30px, остальные два ужимаются в пару. Структура выручки остаётся таблицей: три строки помещаются и на 358px.</span>
  </div>
</div>
EOF
