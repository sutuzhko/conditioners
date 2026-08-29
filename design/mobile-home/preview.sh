#!/bin/sh
# Плоский предпросмотр артборда: снимает обёртку x-dc/helmet и подставляет холлы
name="$1"; theme="${2:-light}"
{
  printf '<!doctype html><html><head><meta charset="utf-8"><title>%s</title>\n' "$name"
  printf '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@600;700;800&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">\n<style>\n'
  cat _tokens.css; cat _base.css; [ -f "$name.css" ] && cat "$name.css"
  printf '</style></head><body>\n'
  sed "s/{{theme}}/$theme/g" "$name.body.html"
  printf '\n</body></html>\n'
} > "preview-$name.html"
echo "preview-$name.html"
