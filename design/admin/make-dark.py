"""Доска тёмной темы. Разметка не дублируется, а берётся из готовых кадров
светлых досок: иначе при первой же правке светлая и тёмная разъедутся, и
тёмная станет врать. Запускается из Dark.gen.sh."""
import re, sys

SRC = [('Main', 'Обзор', 'Плитки показателей, графики и расписание. Смотреть надо не на палитру — она токенная и посчитана, — а на то, что карточка отделилась от фона, а линия графика не слилась с сеткой.'),
       ('Orders', 'Заказы', 'Таблица с зеброй и подсвеченной строкой срыва. В тёмной теме зебра слабее, а подсветка сильнее: на светлом фоне тинт заметен сам по себе, на тёмном его приходится добирать.'),
       ('Order', 'Карточка заказа', 'Две колонки, чипы шести красок и деньги. Все шесть остаются различимыми: в тёмной теме краски уходят на светлую сторону палитры, а не просто гаснут.'),
       ('Calendar', 'Календарь работ', 'Единственный экран с чужим эталоном (Apple Calendar). Ночная зона сетки в тёмной теме темнее фона карточки, а не светлее: подпись под сеткой обязана оставаться правдой в обеих темах.')]

out = ['<div class="board" data-theme="dark">', '''  <div>
    <span class="note">— Тёмная тема —</span>
    <h2 style="font-family:var(--font-display);font-size:26px;font-weight:600;margin-top:8px;color:var(--ink)">Четыре экрана на трёх ширинах</h2>
    <p style="margin-top:8px;font-size:14px;color:var(--muted);max-width:1100px">Те же кадры, что на странице «Экраны», под <span class="mono">data-theme="dark"</span>. Собираются из тех же исходников скриптом <span class="mono">make-dark.py</span> — разметка не скопирована, поэтому правка светлой темы приезжает сюда сама и разойтись они не могут.</p>
  </div>''']

for name, title, why in SRC:
    s = open(f'{name}.body.html', encoding='utf-8').read()
    m = re.match(r'\s*<div class="board[^"]*">(.*)</div>\s*$', s, re.S)
    # Order собран без обёртки .board — берём файл как есть
    body = m.group(1) if m else s
    # заголовок светлой доски убираем: он про светлую и мешает читать
    body = re.sub(r'^\s*<div>\s*<span class="note">.*?</div>\s*(?=<div class="col")', '', body, count=1, flags=re.S)
    out.append(f'''  <div class="tsec">
    <div class="ttl2"><span class="tnum">Тёмная тема</span><span class="tname">{title}</span></div>
    <p class="tdesc">{why}</p>
    <div class="board" style="padding:0;background:transparent">{body}</div>
  </div>''')

out.append('</div>')
open('Dark.body.html', 'w', encoding='utf-8').write('\n'.join(out))
print(f'экранов перенесено: {len(out)-3}', file=sys.stderr)
