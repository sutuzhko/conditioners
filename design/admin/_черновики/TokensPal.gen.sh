. ./_icons.sh
sw() { printf '<div class="chipc"><span class="sw2" style="background:%s"></span><span class="meta"><span class="nm2">%s</span><span class="hx2">%s</span><span class="use">%s</span></span></div>' "$2" "$1" "$2" "$3"; }
cat <<EOF
  <div class="sec">
    <div class="sh">Поверхности</div>
    <div class="sd">На чём всё лежит. Панель — белый скруглённый контейнер на светло-сером поле; карточки внутри отличаются от него только границей, а не заливкой: иначе получается три оттенка серого друг на друге.</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <span class="cap">светлая</span>
        <div class="ramp">
$(sw '--bg' '#ffffff' 'фон панели и карточек')
$(sw '--bg-soft' '#f8fafc' 'поле под панелью, заливка поля ввода')
$(sw '--stripe-a' '#edf2f6' 'наведение на поле')
$(sw '--stripe-b' '#f5f8fa' 'чётная строка таблицы')
$(sw '--panel' '#0f172a' 'тёмная врезка')
        </div>
      </div>
      <div>
        <span class="cap">тёмная</span>
        <div class="dkwrap"><div class="ramp">
$(sw '--bg' '#0b1220' 'поле под панелью')
$(sw '--card' '#121d31' 'панель и карточки')
$(sw '--bg-soft' '#0e1729' 'заливка поля ввода')
$(sw '--stripe-b' '#121d31' 'чётная строка')
$(sw '--field' '#0b1424' 'фон поля')
        </div></div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sh">Чернила и линии</div>
    <div class="sd">Пять уровней текста от заголовка до плейсхолдера — ниже опускаться некуда, каждый следующий не прошёл бы AA. Линий четыре, и они делают разное: <span class="mono">--line</span> разделяет, <span class="mono">--line-strong</span> обводит карточку, <span class="mono">--line-ui</span> служит границей контрола и потому обязан держать 3:1.</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <span class="cap">светлая · чернила</span>
        <div class="ramp">
$(sw '--ink' '#0f172a' 'заголовки, цифры')
$(sw '--ink2' '#334155' 'основной в панели')
$(sw '--body' '#475569' 'текст на сайте')
$(sw '--muted' '#556173' 'подписи полей')
$(sw '--faint' '#5b6a7d' 'плейсхолдер, прочерк')
        </div>
        <span class="cap" style="margin-top:16px">светлая · линии</span>
        <div class="ramp">
$(sw '--line-soft' '#eef2f6' 'разделитель строк')
$(sw '--line' '#e2e8f0' 'разделитель и рамка')
$(sw '--line-strong' '#cbd5e1' 'рамка карточки')
$(sw '--line-ui' '#7e8fa6' 'граница контрола · 3,30:1')
        </div>
      </div>
      <div>
        <span class="cap">тёмная · чернила</span>
        <div class="dkwrap"><div class="ramp">
$(sw '--ink' '#eaf1f8' 'заголовки, цифры')
$(sw '--ink2' '#c9d5e2' 'основной в панели')
$(sw '--body' '#a8b6c6' 'текст на сайте')
$(sw '--muted' '#8598ac' 'подписи полей')
$(sw '--faint' '#7e92a7' 'плейсхолдер, прочерк')
        </div>
        <span class="cap" style="margin-top:16px;color:#8598ac">тёмная · линии</span>
        <div class="ramp">
$(sw '--line-soft' '#182338' 'разделитель строк')
$(sw '--line' '#1e2b41' 'разделитель и рамка')
$(sw '--line-strong' '#2c3d59' 'рамка карточки')
$(sw '--line-ui' '#566d95' 'граница контрола · 3,22:1')
        </div></div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sh">Фирменный акцент</div>
    <div class="sd">Четыре константы одинаковы в обеих темах — это бренд, он не перекрашивается. Производные от него разводятся по темам: на белом нужен тёмный акцент, на почти чёрном — светлый.</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <span class="cap">константы бренда · обе темы</span>
        <div class="ramp">
$(sw '--brand' '#0e7490' 'главная кнопка, активный слой')
$(sw '--brand-hover' '#155e75' 'наведение на главную кнопку')
$(sw '--brand-mark' '#0891b2' 'знак бренда, серия графика')
$(sw '--brand-mark-dark' '#22d3ee' 'знак в тёмной теме')
        </div>
      </div>
      <div>
        <span class="cap">производные · светлая</span>
        <div class="ramp">
$(sw '--accent-ink' '#0891b2' 'обводка фокуса')
$(sw '--accent-text' '#0e7490' 'акцентный текст, ссылки')
$(sw '--accent-bg' '#ecfeff' 'подложка flat-кнопки и чипа')
$(sw '--accent-line' '#a5f3fc' 'граница акцентной плашки')
        </div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sh">Шесть семантических красок</div>
    <div class="sd">Закрытый набор. У каждой три ступени: <span class="mono">-ink</span> для текста и значка, <span class="mono">-bg</span> для подложки чипа, <span class="mono">-line</span> для его границы. Седьмая не заводится — вместо неё уточняется подпись.</div>
    <div class="grid" style="grid-template-columns:1fr 1fr;gap:20px">
      <div>
        <span class="cap">светлая</span>
        <div class="ramp">
$(sw '--ok-ink' '#15803d' 'выполнен, доставлено, в наличии')
$(sw '--warn-ink' '#b45309' 'назначен, на исходе, новая заявка')
$(sw '--error-ink' '#be123c' 'отказ, просрочен, ниже порога')
$(sw '--info-ink' '#4338ca' 'очередь, второй монтажник')
$(sw '--star' '#d97706' 'звёзды рейтинга')
$(sw '--sale-ink' '#be123c' 'скидка на витрине')
        </div>
      </div>
      <div>
        <span class="cap">тёмная</span>
        <div class="dkwrap"><div class="ramp">
$(sw '--ok-ink' '#4ade80' 'выполнен, доставлено, в наличии')
$(sw '--warn-ink' '#fbbf24' 'назначен, на исходе, новая заявка')
$(sw '--error-ink' '#fb7185' 'отказ, просрочен, ниже порога')
$(sw '--info-ink' '#a5b4fc' 'очередь, второй монтажник')
$(sw '--star' '#fbbf24' 'звёзды рейтинга')
$(sw '--sale-ink' '#fb7185' 'скидка на витрине')
        </div></div>
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sh">Серии графиков</div>
    <div class="sd">Отдельная пара: цвет метки данных должен быть насыщеннее, чем цвет текста. Фирменный <span class="mono">--brand</span> (#0E7490) как метка проваливает проверку насыщенности — читается серым. Пара ниже прошла все шесть проверок валидатора: полоса светлоты, порог насыщенности, различимость при дальтонизме (ΔE 20,0 дейтан · 28,8 тритан), нормальное зрение (ΔE 26,1) и контраст к поверхности.</div>
    <div class="row" style="gap:24px;align-items:flex-start;flex-wrap:wrap">
      <div class="ramp" style="width:400px">
$(sw '--s1' '#0891b2' 'первая серия · светлая')
$(sw '--s2' '#b45309' 'вторая серия · светлая')
      </div>
      <div class="dkwrap" style="width:400px"><div class="ramp">
$(sw '--s1' '#22d3ee' 'первая серия · тёмная')
$(sw '--s2' '#fbbf24' 'вторая серия · тёмная')
      </div></div>
      <div class="alert a-warn" style="flex:1;min-width:320px">
        <span class="ai">$I_WARN</span>
        <div><div class="at">В тёмной теме пара выходит за полосу светлоты</div>
        <div class="ad">Валидатор помечает это как несоответствие: обе метки светлее верхней границы. Контраст к поверхности при этом проходит. Опознание там не держится на цвете — у графика есть легенда и прямые подписи концов линий, и это именно та подстраховка, которую правило требует взамен.</div></div>
      </div>
    </div>
  </div>
EOF
