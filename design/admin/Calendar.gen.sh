. ./_parts.sh
# ev <top> <height> <bg> <line> <ink> <время> <название> <кто>
ev() { printf '<div class="ev" style="top:%spx;height:%spx;background:%s;border-left-color:%s;color:%s"><b>%s</b><span class="t">%s · %s</span></div>' "$1" "$2" "$3" "$4" "$5" "$7" "$6" "$8"; }
cat <<EOF
<div class="page" style="padding:0"><div class="app" style="width:1440px;min-height:940px">
$(aside crm)
  <div style="display:flex;flex-direction:column;min-width:0">
$(chead "25–31 августа 2026" "Календарь работ · 4 монтажника, рабочее окно 09–19" '<span class="seg"><span>День</span><span class="on">Неделя</span><span>Месяц</span></span><span class="btn solid sm">'"$I_PLUS"' Запись</span>')
    <div class="main">
      <div class="row" style="gap:10px">
        <span class="row" style="gap:2px">
          <span class="iconbtn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span>
          <span class="iconbtn">$I_CHEV</span>
        </span>
        <span class="btn bord sm">Сегодня</span>
        <span class="inp faded md solo" style="width:220px;margin-left:auto"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Поиск по записям</span></span></span>
      </div>

      <div class="cal">
        <!-- Слои — это люди, а не календари (ADR-123): у каждого свой цвет и инициалы -->
        <div class="card"><div class="bd" style="padding:12px">
          <div class="cap" style="margin-bottom:6px">Показывать</div>
          <div class="layer"><span class="cbx on" style="background:var(--brand);border-color:var(--brand)">$I_CHECK</span>Пётр К.<span class="t-tiny fnt" style="margin-left:auto">32 ч</span></div>
          <div class="layer"><span class="cbx on" style="background:var(--info-ink);border-color:var(--info-ink)">$I_CHECK</span>Артём М.<span class="t-tiny" style="margin-left:auto;color:var(--warn-ink)">44 ч</span></div>
          <div class="layer"><span class="cbx on" style="background:var(--ok-ink);border-color:var(--ok-ink)">$I_CHECK</span>Иван С.<span class="t-tiny fnt" style="margin-left:auto">28 ч</span></div>
          <div class="layer" style="opacity:.55"><span class="cbx"></span>Олег В.<span class="t-tiny fnt" style="margin-left:auto">отпуск</span></div>
          <hr class="hr" style="margin:10px 0">
          <div class="cap" style="margin-bottom:6px">Виды записей</div>
          <div class="layer"><span class="cbx on" style="background:var(--brand);border-color:var(--brand)">$I_CHECK</span>Наряды</div>
          <div class="layer"><span class="cbx on" style="background:var(--warn-ink);border-color:var(--warn-ink)">$I_CHECK</span>Заявки без времени</div>
          <div class="layer"><span class="cbx on" style="background:var(--muted);border-color:var(--muted)">$I_CHECK</span>Дела и отлучки</div>
          <hr class="hr" style="margin:10px 0">
          <div class="row" style="justify-content:space-between;padding:0 8px">
            <span class="t-lbl mut">Рабочее окно</span><span class="t-lbl mono strong">09–19</span>
          </div>
          <div class="row" style="gap:8px;padding:6px 8px 0">
            <span class="chip c-warn" style="height:22px">Переработка отмечается</span>
          </div>
        </div></div>

        <div class="card flat" style="overflow:hidden">
          <div class="dayhd">
            <div></div>
            <div class="dh"><div class="dw">пн</div><div class="dn">25</div></div>
            <div class="dh"><div class="dw">вт</div><div class="dn">26</div></div>
            <div class="dh"><div class="dw">ср</div><div class="dn">27</div></div>
            <div class="dh"><div class="dw">чт</div><div class="dn">28</div></div>
            <div class="dh today"><div class="dw">пт</div><div class="dn">29</div></div>
            <div class="dh"><div class="dw">сб</div><div class="dn">30</div></div>
            <div class="dh"><div class="dw">вс</div><div class="dn">31</div></div>
          </div>

          <!-- Полоса «весь день»: заявка живёт здесь, пока ей не назначили время -->
          <div class="allday">
            <div class="glab">весь день</div>
            <div class="cell"></div>
            <div class="cell"><span class="chip c-warn" style="width:100%;justify-content:flex-start">Заявка № 39</span></div>
            <div class="cell"></div>
            <div class="cell"></div>
            <div class="cell"><span class="chip c-warn" style="width:100%;justify-content:flex-start">Заявка № 41</span></div>
            <div class="cell" style="grid-column:span 2"><span class="chip c-default" style="width:100%;justify-content:flex-start">Олег В. — отпуск</span></div>
          </div>

          <div class="hours" style="height:624px">
            <div class="hgut">
              <i style="top:0">08:00</i><i style="top:52px">09:00</i><i style="top:104px">10:00</i><i style="top:156px">11:00</i>
              <i style="top:208px">12:00</i><i style="top:260px">13:00</i><i style="top:312px">14:00</i><i style="top:364px">15:00</i>
              <i style="top:416px">16:00</i><i style="top:468px">17:00</i><i style="top:520px">18:00</i><i style="top:572px">19:00</i>
            </div>
            <div class="hcol">
              $(ev 52 150 "var(--accent-bg)" "var(--brand)" "var(--on-accent)" "09:00" "Монтаж 07, тихая" "Пётр К.")
              $(ev 260 98 "var(--info-bg)" "var(--info-ink)" "var(--info-ink)" "13:00" "ТО, офис" "Артём М.")
            </div>
            <div class="hcol">
              $(ev 104 202 "var(--ok-bg)" "var(--ok-ink)" "var(--ok-ink)" "10:00" "Монтаж 12, два блока" "Иван С.")
            </div>
            <div class="hcol">
              $(ev 52 98 "var(--accent-bg)" "var(--brand)" "var(--on-accent)" "09:00" "Замер" "Пётр К.")
              $(ev 208 150 "var(--info-bg)" "var(--info-ink)" "var(--info-ink)" "12:00" "Ремонт: течёт" "Артём М.")
              $(ev 416 98 "var(--ok-bg)" "var(--ok-ink)" "var(--ok-ink)" "16:00" "Монтаж 09" "Иван С.")
            </div>
            <div class="hcol">
              $(ev 156 202 "var(--accent-bg)" "var(--brand)" "var(--on-accent)" "11:00" "Монтаж мульти-сплит" "Пётр К.")
            </div>
            <div class="hcol" style="background:var(--stripe-b)">
              $(ev 312 150 "var(--accent-bg)" "var(--brand)" "var(--on-accent)" "14:00" "Монтаж 09 инвертор" "Пётр К.")
              $(ev 494 52 "var(--info-bg)" "var(--info-ink)" "var(--info-ink)" "17:30" "ТО и чистка" "Артём М.")
              $(ev 572 52 "var(--warn-bg)" "var(--warn-ink)" "var(--warn-ink)" "19:00" "Переработка" "Артём М.")
            </div>
            <div class="hcol">
              $(ev 104 150 "var(--ok-bg)" "var(--ok-ink)" "var(--ok-ink)" "10:00" "Монтаж 07" "Иван С.")
            </div>
            <div class="hcol"></div>
            <div class="now" style="top:364px"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</div>
EOF
