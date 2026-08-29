#!/bin/sh
# wrap.sh <Имя> "<подпись десктопа>" "<пояснение десктопа>"
# Собирает доску: десктоп из <Имя>.gen.sh + планшет и телефон из <Имя>.tp.sh
n="$1"; lab="$2"; cap="$3"
{
  printf '<div class="board touch">\n<div class="col">\n  <span class="devlab">%s</span>\n' "$lab"
  sh "$n.gen.sh"
  printf '  <span class="devcap">%s</span>\n</div>\n' "$cap"
  sh "$n.tp.sh"
  printf '</div>\n'
} > "$n.body.html"
echo "$n.body.html собран"
