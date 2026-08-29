. ./_screens.sh
# ряд вкладок: "имя1|имя2|…" <активная, с 1> [класс размера]
trow() {
  IFS='|'; i=1
  printf '<div class="tabsrow %s">' "$3"
  for t in $1; do
    if [ "$i" = "$2" ]; then printf '<span class="tab on">%s</span>' "$t"; else printf '<span class="tab">%s</span>' "$t"; fi
    i=$((i+1))
  done
  printf '</div>'; unset IFS
}
# заголовок секции вкладки
tsec() { printf '<div class="ttl2"><span class="tnum">%s</span><span class="tname">%s</span></div>\n<p class="tdesc">%s</p>' "$1" "$2" "$3"; }
