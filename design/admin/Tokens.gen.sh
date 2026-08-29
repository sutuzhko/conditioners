. ./_icons.sh
# строка токена: <префикс> <фон-текста> — читает _tokens_rows.txt
trow() {
  grep "^$1|" _tokens_rows.txt | while IFS='|' read -r _ name hex label ratio ok; do
    cls=$([ "$ok" = "1" ] && echo pass || echo fail)
    mark=$([ "$ok" = "1" ] && echo "AA" || echo "ниже нормы")
    printf '<div class="tk"><span class="sw" style="background:%s"></span><span><span class="tn">%s</span> <span class="hx">%s</span><br><span class="hx">%s</span></span><span class="cr %s">%s:1</span><span class="hx %s">%s</span></div>' \
      "$hex" "$name" "$hex" "$label" "$cls" "$ratio" "$cls" "$mark"
  done
}
cat <<EOF
<div class="sheet">
  <div>
    <span class="note">— Токены —</span>
    <h2 style="font-size:26px;font-weight:800;margin-top:8px;font-family:var(--font-display)">Палитра, плотность и геометрия панели</h2>
    <p style="margin-top:8px;font-size:14px;color:var(--muted);max-width:880px">Цвета не выбраны заново: это действующие токены из <span class="mono">shared/styles/tokens.css</span> и <span class="mono">ui-tokens.css</span>. Контраст каждой пары посчитан по WCAG 2.1, а не оценён на глаз — норма 4,5:1 для текста и 3:1 для границ, которые служат границей компонента.</p>
  </div>

  <div class="sec">
    <div class="sh">Текст на карточке</div>
    <div class="sd">Пять уровней текста плюс шесть семантических красок. Обе темы проверены отдельно: значения светлой на тёмной не работают, и наоборот.</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:20px">
      <div class="half lt">
        <div class="halfh">Светлая · фон #FFFFFF</div>
        $(trow L)
      </div>
      <div class="half dk">
        <div class="halfh">Тёмная · фон #121D31</div>
        $(trow D)
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sh">Линии — и находка</div>
    <div class="sd">Разделители контраста не требуют: они декоративны. Но там, где линия <b>и есть</b> граница компонента — обводка поля, рамка невыбранного чекбокса, дорожка выключенного переключателя — WCAG 1.4.11 требует 3:1, и действующий <span class="mono">--line-strong</span> его не держит ни в одной теме.</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:20px">
      <div class="half lt"><div class="halfh">Светлая</div>$(trow LN-L)</div>
      <div class="half dk"><div class="halfh">Тёмная</div>$(trow LN-D)</div>
    </div>
    <div class="alert a-warn" style="margin-top:18px">
      <span class="ai">$I_WARN</span>
      <div><div class="at">Предлагается новый токен <span class="mono">--line-ui</span></div>
      <div class="ad">Значения подобраны расчётом: #7E8FA6 даёт 3,30:1 на белом и 3,15:1 на <span class="mono">--bg-soft</span>; #566D95 — 3,22:1 на карточке тёмной темы. На него переходят только границы-аффордансы. Декоративные разделители остаются на <span class="mono">--line</span>, рамки карточек — на <span class="mono">--line-strong</span>: карточку держит ещё и тень, линия там не единственный признак.</div></div>
    </div>
    <div class="alert a-primary" style="margin-top:10px">
      <span class="ai">$I_CHECK</span>
      <div><div class="at">Заливка вместо обводки — умолчание панели</div>
      <div class="ad">Поле по умолчанию идёт вариантом <span class="mono">flat</span>: границу несёт заливка <span class="mono">--bg-soft</span>, а не линия. Так устроен эталон, и это же снимает половину вопроса с контрастом границ.</div></div>
    </div>
  </div>

  <div class="sec">
    <div class="sh">Плотность и геометрия</div>
    <div class="sd">Панель плотнее сайта: там пол тап-зоны 44px, здесь мышь (DESIGN_BRIEF §9). На сенсорном экране высоты поднимаются до 44 и 52 правилом <span class="mono">.touch</span>.</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:24px">
      <div>
        <span class="cap">высоты контролов</span>
        <div class="scale">
          <div class="sbox"><span class="btn solid sm">sm</span><b>32</b></div>
          <div class="sbox"><span class="btn solid">md</span><b>40</b></div>
          <div class="sbox"><span class="btn solid lg">lg</span><b>48</b></div>
          <div class="sbox"><span class="btn solid" style="height:44px">сенсор md</span><b>44</b></div>
          <div class="sbox"><span class="btn solid" style="height:52px">сенсор lg</span><b>52</b></div>
        </div>
        <span class="cap" style="margin-top:20px">радиусы</span>
        <div class="scale">
          <div class="sbox"><span style="width:44px;height:44px;background:var(--accent-bg);border-radius:9px;display:block"></span><b>9</b></div>
          <div class="sbox"><span style="width:44px;height:44px;background:var(--accent-bg);border-radius:11px;display:block"></span><b>11</b></div>
          <div class="sbox"><span style="width:44px;height:44px;background:var(--accent-bg);border-radius:14px;display:block"></span><b>14</b></div>
          <div class="sbox"><span style="width:44px;height:44px;background:var(--accent-bg);border-radius:18px;display:block"></span><b>18</b></div>
          <div class="sbox"><span style="width:44px;height:44px;background:var(--accent-bg);border-radius:20px;display:block"></span><b>20</b></div>
          <div class="sbox"><span style="width:44px;height:44px;background:var(--accent-bg);border-radius:100px;display:block"></span><b>pill</b></div>
        </div>
      </div>
      <div>
        <span class="cap">шаг сетки — 4px</span>
        <div class="scale" style="align-items:flex-end">
          <div class="sbox"><span style="width:26px;height:4px;background:var(--brand);display:block"></span><b>4</b></div>
          <div class="sbox"><span style="width:26px;height:8px;background:var(--brand);display:block"></span><b>8</b></div>
          <div class="sbox"><span style="width:26px;height:12px;background:var(--brand);display:block"></span><b>12</b></div>
          <div class="sbox"><span style="width:26px;height:16px;background:var(--brand);display:block"></span><b>16</b></div>
          <div class="sbox"><span style="width:26px;height:24px;background:var(--brand);display:block"></span><b>24</b></div>
          <div class="sbox"><span style="width:26px;height:32px;background:var(--brand);display:block"></span><b>32</b></div>
        </div>
        <span class="cap" style="margin-top:20px">тени</span>
        <div class="scale">
          <div class="sbox"><span style="width:70px;height:44px;background:var(--card);border-radius:11px;box-shadow:var(--sh-sm);display:block"></span><b>small</b></div>
          <div class="sbox"><span style="width:70px;height:44px;background:var(--card);border-radius:11px;box-shadow:var(--sh-md);display:block"></span><b>medium</b></div>
          <div class="sbox"><span style="width:70px;height:44px;background:var(--card);border-radius:11px;box-shadow:var(--sh-lg);display:block"></span><b>large</b></div>
          <div class="sbox"><span style="width:70px;height:44px;background:var(--card);border-radius:11px;box-shadow:var(--ring-focus-ring);display:block"></span><b>фокус</b></div>
        </div>
        <span class="cap" style="margin-top:20px">кегли</span>
        <div class="stack" style="gap:5px">
          <span style="font-size:22px;font-weight:800;font-family:var(--font-display);color:var(--ink)">22 · заголовок страницы</span>
          <span style="font-size:15px;font-weight:700;font-family:var(--font-display);color:var(--ink)">15 · заголовок карточки</span>
          <span style="font-size:14px;color:var(--ink2)">14 · основной текст и контролы</span>
          <span style="font-size:13px;color:var(--muted)">13 · подписи и вторичное</span>
          <span style="font-size:12px;color:var(--faint)">12 · служебное, минимум панели</span>
          <span class="mono" style="font-size:11px;color:var(--faint)">11 · моно: капитель шапки таблицы, цифры</span>
        </div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sh">Шесть красок и что каждая значит</div>
    <div class="sd">Закрытый словарь. Седьмая не заводится — вместо неё уточняется подпись. Одно значение — одна краска везде: в списке, в карточке, в календаре, в уведомлении.</div>
    <div class="grid" style="grid-template-columns:repeat(6,minmax(0,1fr));gap:14px">
      <div class="stack" style="gap:8px"><span class="chip c-default lg" style="justify-content:center">Серая</span><span class="t-tiny mut">нейтральное: черновик, снято, не назначено</span></div>
      <div class="stack" style="gap:8px"><span class="chip c-primary lg" style="justify-content:center">Бирюзовая</span><span class="t-tiny mut">идёт сейчас: в работе, выбрано, активно</span></div>
      <div class="stack" style="gap:8px"><span class="chip c-success lg" style="justify-content:center">Зелёная</span><span class="t-tiny mut">завершено хорошо: выполнен, доставлено, в наличии</span></div>
      <div class="stack" style="gap:8px"><span class="chip c-warn lg" style="justify-content:center">Янтарная</span><span class="t-tiny mut">требует внимания: назначен, на исходе, новая заявка</span></div>
      <div class="stack" style="gap:8px"><span class="chip c-danger lg" style="justify-content:center">Красная</span><span class="t-tiny mut">сорвалось: отказ, просрочен, ниже порога</span></div>
      <div class="stack" style="gap:8px"><span class="chip c-info lg" style="justify-content:center">Индиго</span><span class="t-tiny mut">шестая различимая: очередь, второй монтажник в календаре</span></div>
    </div>
    <div class="alert a-primary" style="margin-top:18px">
      <span class="ai">$I_WARN</span>
      <div><div class="at">Цвет не единственный признак</div>
      <div class="ad">У каждого чипа есть точка и подпись словом. Статус читается без цвета — это условие, а не украшение: при нарушениях цветовосприятия янтарный и зелёный различаются плохо, а «Назначен» и «Выполнен» — это разные вещи.</div></div>
    </div>
  </div>
</div>
EOF
