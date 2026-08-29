. ./_parts.sh
# ── свёрнутая колонка значков для планшета
rail() {
  a="$1"; on() { [ "$1" = "$a" ] && printf ' on'; }
  # 🔴 Значок без подписи — это не «лаконично», это безымянная ссылка. У каждой
  # стоит aria-label и подсказка по наведению, у активной — aria-current="page",
  # у счётчика — своё имя: «7» без слова читалка объявляет как «семь ссылка».
  nvi() { printf '<a class="nv%s" aria-label="%s"%s title="%s">%s' \
            "$(on "$1")" "$2" "$([ "$1" = "$a" ] && printf ' aria-current="page"')" "$2" "$3"
          [ -n "$4" ] && printf '<span class="cnt" aria-label="%s">%s</span>' "$5" "$4"
          printf '</a>'; }
  cat <<EOF
<aside class="aside rail">
  <div class="who"><span class="ava lg">СД</span></div>
  <nav class="nav" aria-label="Разделы панели">
    $(nvi overview "Обзор" "$I_HOME")
    $(nvi crm "Календарь работ" "$I_CAL")
    $(nvi orders "Заказы" "$I_ORD" 7 "7 заказов требуют внимания")
    $(nvi leads "Заявки" "$I_LEAD" 3 "3 новые заявки")
    $(nvi clients "Клиенты" "$I_CLI")
    $(nvi team "Монтажники" "$I_TEAM")
    $(nvi stock "Склад" "$I_STOCK")
    <div class="navgrp" aria-hidden="true">САЙТ</div>
    $(nvi catalog "Каталог" "$I_CAT")
    $(nvi knowledge "База знаний" "$I_BOOK")
    $(nvi reviews "Отзывы" "$I_STAR" 2 "2 отзыва на модерации")
  </nav>
  <div class="asfoot">
    <nav aria-label="Настройки и профиль" style="display:flex;flex-direction:column;gap:3px">
      $(nvi settings "Настройки" "$I_SET")
      $(nvi profile "Профиль" "$I_USER")
    </nav>
  </div>
</aside>
EOF
}
# ── шапка планшета: заголовок и одно действие
theadT() { cat <<EOF
<div class="chead" style="padding:16px 18px 0">
  <div class="stack" style="gap:0;min-width:0"><h1 class="h1" style="font-size:20px">$1</h1><div class="sub">$2</div></div>
  <div class="row" style="gap:6px"><span class="iconbtn">$I_SEARCH</span><span class="iconbtn" style="position:relative">$I_BELL<span class="bdg">4</span></span>$3</div>
</div>
EOF
}
# ── шапка телефона: назад, заголовок, действие
mbar() { cat <<EOF
<div class="mbar">
  <span class="row" style="gap:10px;min-width:0">$1<span class="mtitle clip">$2</span></span>
  <span class="row" style="gap:6px">$3</span>
</div>
EOF
}
BACK='<span class="iconbtn"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span>'
BURG='<span class="iconbtn"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></span>'
# ── нижняя панель вкладок владельца
otab() {
  a="$1"; on() { [ "$1" = "$a" ] && printf ' on'; }
  cat <<EOF
<div class="tabbar">
  <a class="tb$(on ov)">$I_HOME Обзор</a>
  <a class="tb$(on cal)">$I_CAL Календарь</a>
  <a class="tb$(on ord)">$I_ORD Заказы</a>
  <a class="tb$(on lead)">$I_LEAD Заявки</a>
  <a class="tb$(on more)">$I_SET Ещё</a>
</div>
EOF
}
