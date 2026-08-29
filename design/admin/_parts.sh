. ./_icons.sh
I_SET='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.1 14.6a1.5 1.5 0 0 0 .3 1.7l.1.1a1.9 1.9 0 1 1-2.7 2.7l-.1-.1a1.5 1.5 0 0 0-1.7-.3 1.5 1.5 0 0 0-.9 1.4v.2a1.9 1.9 0 1 1-3.8 0v-.1a1.5 1.5 0 0 0-1-1.4 1.5 1.5 0 0 0-1.7.3l-.1.1a1.9 1.9 0 1 1-2.7-2.7l.1-.1a1.5 1.5 0 0 0 .3-1.7 1.5 1.5 0 0 0-1.4-.9h-.2a1.9 1.9 0 1 1 0-3.8h.1a1.5 1.5 0 0 0 1.4-1 1.5 1.5 0 0 0-.3-1.7l-.1-.1a1.9 1.9 0 1 1 2.7-2.7l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4v-.2a1.9 1.9 0 1 1 3.8 0v.1a1.5 1.5 0 0 0 .9 1.4 1.5 1.5 0 0 0 1.7-.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.5 1.5 0 0 0-.3 1.7v.1a1.5 1.5 0 0 0 1.4.9h.2a1.9 1.9 0 1 1 0 3.8h-.1a1.5 1.5 0 0 0-1.4.9z"/></svg>'
I_HOME='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/></svg>'
I_OUT='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="m15 8 4 4-4 4M19 12H9"/></svg>'
I_PANEL='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/></svg>'
I_SORT='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h14M4 12h9M4 17h5"/></svg>'
I_COLS='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 5v14M16 5v14"/></svg>'
I_EYE='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/></svg>'
I_EDIT='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5z"/></svg>'
I_TRASH='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13"/></svg>'
I_REFRESH='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 11a8 8 0 1 0-.6 4"/><path d="M20 5v6h-6"/></svg>'

# ═══ Колонка разделов ═══ верх — кто вошёл, низ прибит (BUGS §1837)
aside() {
  a="$1"
  on() { [ "$1" = "$a" ] && printf ' on'; }
  cat <<EOF
<aside class="aside">
  <div class="who">
    <span class="ava lg">СД</span>
    <span class="stack" style="gap:1px;min-width:0">
      <span class="nm clip">Сергей Демидов</span>
      <span class="rl">Владелец</span>
    </span>
    <span style="margin-left:auto;color:var(--faint)">$I_DOWN</span>
  </div>
  <nav class="nav" aria-label="Разделы панели">
    <a class="nv$(on overview)">$I_HOME Обзор</a>
    <a class="nv$(on crm)">$I_CAL Календарь работ</a>
    <a class="nv$(on orders)">$I_ORD Заказы <span class="cnt">7</span></a>
    <a class="nv$(on leads)">$I_LEAD Заявки <span class="cnt">3</span></a>
    <a class="nv$(on clients)">$I_CLI Клиенты</a>
    <a class="nv$(on team)">$I_TEAM Монтажники</a>
    <a class="nv$(on stock)">$I_STOCK Склад</a>
    <div class="navgrp">Сайт</div>
    <a class="nv$(on catalog)">$I_CAT Каталог</a>
    <a class="nv$(on knowledge)">$I_BOOK База знаний</a>
    <a class="nv$(on reviews)">$I_STAR Отзывы <span class="cnt">2</span></a>
  </nav>
  <div class="asfoot">
    <nav aria-label="Настройки и профиль" style="display:flex;flex-direction:column;gap:3px">
      <a class="nv$(on settings)">$I_SET Настройки</a>
      <a class="nv$(on profile)">$I_USER Профиль</a>
      <a class="nv">$I_OUT Выйти</a>
    </nav>
  </div>
</aside>
EOF
}
# ═══ Верхняя строка контента ═══
chead() {
  ttl="$1"; sub="$2"; act="$3"
  cat <<EOF
<div class="chead">
  <div class="row" style="gap:14px;min-width:0">
    <span class="iconbtn">$I_PANEL</span>
    <div class="stack" style="gap:0;min-width:0">
      <h1 class="h1">$ttl</h1>
      <div class="sub">$sub</div>
    </div>
  </div>
  <div class="row" style="gap:8px">
    <span class="iconbtn">$I_SEARCH</span>
    <span class="iconbtn" style="position:relative">$I_BELL<span class="bdg">4</span></span>
    <span class="iconbtn">$I_MOON</span>
    $act
  </div>
</div>
EOF
}

# navbar <раздел> [подраздел] — совместимость: рисует шапку нового вида
navbar() {
  if [ -n "$2" ]; then t="$2"; s="<span style=\"color:var(--faint)\">$1</span>"; else t="$1"; s=""; fi
  chead "$t" "$s" '<span class="btn solid sm">'"$I_PLUS"' Создать</span>'
}
