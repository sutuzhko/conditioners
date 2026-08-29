#!/bin/sh
# Собирает <Name>.dc.html из общего CSS и тела <Name>.body.html
name="$1"
{
  printf '<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n<helmet>\n'
  printf '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@600;700;800&family=Manrope:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap">\n'
  printf '  <style>\n'
  cat _tokens.css
  cat _base.css
  [ -f "$name.css" ] && cat "$name.css"
  printf '  </style>\n</helmet>\n'
  cat "$name.body.html"
  printf '\n</x-dc>\n'
  [ -f "$name.script.html" ] && cat "$name.script.html"
  printf '</body>\n</html>\n'
} > "$name.dc.html"
echo "$name.dc.html — $(wc -c < "$name.dc.html") байт"
