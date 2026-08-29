. ./_screens.sh
cat <<EOF
<div class="board touch">
  <div class="col">
    <span class="devlab">1440 · десктоп — команда с показателями</span>
    <div class="page" style="padding:0"><div class="app" style="width:1440px;min-height:900px">
$(aside team)
      <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Монтажники" "4 на смене из 5 · один в отпуске" '<span class="btn solid">'"$I_PLUS"' Добавить монтажника</span>')
        <div class="main">
          <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:16px">
            <div class="card"><div class="stat"><span class="l">Выполнено за месяц</span><span class="v"><span class="n">18</span><span class="trend t-up">↑ 4</span></span></div></div>
            <div class="card"><div class="stat"><span class="l">Выплачено за месяц</span><span class="v"><span class="n">158 тыс ₽</span></span></div></div>
            <div class="card"><div class="stat"><span class="l">Удержаний</span><span class="v"><span class="n">1</span><span class="trend t-down">3 000 ₽</span></span></div></div>
            <div class="card"><div class="stat"><span class="l">Средняя загрузка</span><span class="v"><span class="n">36 ч</span><span class="trend t-flat">из 40</span></span></div></div>
          </div>
          <div class="card flat" style="overflow:hidden">
            <div class="hd" style="padding:16px"><span class="ttl">Команда</span><span class="inp faded md solo" style="width:240px"><span class="ico">$I_SEARCH</span><span class="body"><span class="val ph clip">Имя или телефон</span></span></span></div>
            <table class="tbl">
              <thead><tr><th>Монтажник</th><th style="width:170px">Телефон</th><th style="width:170px">Загрузка недели</th><th class="rt" style="width:104px">Выполнено</th><th class="rt" style="width:126px">Заработал</th><th class="rt" style="width:104px">Удержания</th><th style="width:140px">Доступ</th><th style="width:126px">Действия</th></tr></thead>
              <tbody>
                <tr><td><span class="usr"><span class="ava">ПК</span><span class="stack" style="gap:0"><span class="nm">Пётр Кузнецов</span><span class="ds">с 14 марта 2024</span></span></span></td><td class="mono t-lbl">+7 (910) 400-11-23</td>
                  <td><div class="row" style="gap:8px"><span class="bar" style="flex:1"><i style="width:80%"></i></span><span class="mono t-tiny strong">32 ч</span></div></td>
                  <td class="rt mono strong">7</td><td class="rt mono strong">42 000 ₽</td><td class="rt mut">нет</td>
                  <td><span class="row" style="gap:8px"><span class="sw on"><i></i></span><span class="t-lbl">Активен</span></span></td>
                  <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td><span class="usr"><span class="ava" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="stack" style="gap:0"><span class="nm">Артём Морозов</span><span class="ds">с 2 июня 2025</span></span></span></td><td class="mono t-lbl">+7 (920) 118-77-40</td>
                  <td><div class="row" style="gap:8px"><span class="bar" style="flex:1"><i style="width:100%;background:var(--warn-ink)"></i></span><span class="mono t-tiny" style="color:var(--warn-ink);font-weight:700">44 ч</span></div></td>
                  <td class="rt mono strong">6</td><td class="rt mono strong">36 000 ₽</td><td class="rt"><span class="chip c-danger">3 000 ₽</span></td>
                  <td><span class="row" style="gap:8px"><span class="sw on"><i></i></span><span class="t-lbl">Активен</span></span></td>
                  <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr><td><span class="usr"><span class="ava" style="background:var(--ok-bg);color:var(--ok-ink)">ИС</span><span class="stack" style="gap:0"><span class="nm">Иван Соколов</span><span class="ds">с 9 апреля 2026</span></span></span></td><td class="mono t-lbl">+7 (953) 606-31-08</td>
                  <td><div class="row" style="gap:8px"><span class="bar" style="flex:1"><i style="width:70%"></i></span><span class="mono t-tiny strong">28 ч</span></div></td>
                  <td class="rt mono strong">5</td><td class="rt mono strong">30 000 ₽</td><td class="rt mut">нет</td>
                  <td><span class="row" style="gap:8px"><span class="sw on"><i></i></span><span class="t-lbl">Активен</span></span></td>
                  <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                <tr style="opacity:.62"><td><span class="usr"><span class="ava" style="background:var(--bg-soft);color:var(--muted)">ОВ</span><span class="stack" style="gap:0"><span class="nm">Олег Волков</span><span class="ds">отпуск до 8 сентября</span></span></span></td><td class="mono t-lbl">+7 (910) 774-52-90</td>
                  <td><span class="chip c-default">В отпуске</span></td>
                  <td class="rt mono strong">0</td><td class="rt mono strong">0 ₽</td><td class="rt mut">нет</td>
                  <td><span class="row" style="gap:8px"><span class="sw"><i></i></span><span class="t-lbl mut">Не работает</span></span></td>
                  <td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
              </tbody>
            </table>
          </div>
          <div class="alert a-danger"><span class="ai">$I_WARN</span><div><div class="at">Заметки владельца монтажник не видит</div><div class="ad">Они живут в карточке и закрыты сервером, а не скрытием кнопки: скрытая кнопка — подсказка интерфейса, а не защита (CRM §6).</div></div></div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Переключатель «Активен» прямо в списке: отключение закрывает вход, а выполненные заказы остаются в истории. Переработка Артёма отмечена и цветом, и подписью «44 ч» — не только полосой.</span>
  </div>

  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — показатели в две колонки</span>
    <div class="frame tb"><div class="app rail" style="min-height:900px">
$(rail team)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Монтажники" "4 на смене из 5" '<span class="btn solid sm">'"$I_PLUS"' Добавить</span>')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
            <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Выполнено за месяц</span><span class="v"><span class="n" style="font-size:23px">18</span><span class="trend t-up">↑ 4</span></span></div></div>
            <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Выплачено</span><span class="v"><span class="n" style="font-size:23px">158 тыс ₽</span></span></div></div>
          </div>
          <div class="card flat" style="overflow:hidden">
            <table class="tbl">
              <thead><tr><th>Монтажник</th><th style="width:130px">Загрузка</th><th class="rt" style="width:118px">Заработал</th><th style="width:112px">Доступ</th></tr></thead>
              <tbody>
                <tr><td><span class="usr"><span class="ava xs">ПК</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Пётр Кузнецов</span><span class="ds">7 заказов</span></span></span></td><td><div class="row" style="gap:6px"><span class="bar" style="flex:1"><i style="width:80%"></i></span><span class="mono t-tiny strong">32</span></div></td><td class="rt mono strong">42 000 ₽</td><td><span class="sw on"><i></i></span></td></tr>
                <tr><td><span class="usr"><span class="ava xs" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Артём Морозов</span><span class="ds">6 заказов · 1 удержание</span></span></span></td><td><div class="row" style="gap:6px"><span class="bar" style="flex:1"><i style="width:100%;background:var(--warn-ink)"></i></span><span class="mono t-tiny" style="color:var(--warn-ink);font-weight:700">44</span></div></td><td class="rt mono strong">36 000 ₽</td><td><span class="sw on"><i></i></span></td></tr>
                <tr><td><span class="usr"><span class="ava xs" style="background:var(--ok-bg);color:var(--ok-ink)">ИС</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Иван Соколов</span><span class="ds">5 заказов</span></span></span></td><td><div class="row" style="gap:6px"><span class="bar" style="flex:1"><i style="width:70%"></i></span><span class="mono t-tiny strong">28</span></div></td><td class="rt mono strong">30 000 ₽</td><td><span class="sw on"><i></i></span></td></tr>
                <tr style="opacity:.62"><td><span class="usr"><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">ОВ</span><span class="stack" style="gap:0"><span class="nm" style="font-size:13px">Олег Волков</span><span class="ds">отпуск до 8 сентября</span></span></span></td><td><span class="chip c-default">Отпуск</span></td><td class="rt mono strong">0 ₽</td><td><span class="sw"><i></i></span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Колонки «Выполнено» и «Удержания» уходят в карточку: на 768 их место занимает загрузка, по которой распределяют работу.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · телефон — карточка монтажника</span>
    <div class="frame ph" style="min-height:844px">
$(mbar "$BACK" "Артём Морозов" '<span class="iconbtn">'"$I_MORE"'</span>')
      <div class="mbody" style="gap:12px">
        <div class="card"><div class="bd stack" style="gap:12px;padding:14px">
          <div class="row" style="gap:12px"><span class="ava lg" style="background:var(--info-bg);color:var(--info-ink)">АМ</span><span class="stack" style="gap:3px"><span class="strong" style="font-size:15px">Артём Морозов</span><span class="t-tiny fnt">В команде с 2 июня 2025</span></span>
            <span class="row" style="gap:8px;margin-left:auto"><span class="sw on"><i></i></span></span></div>
          <a class="inp flat" style="justify-content:space-between;text-decoration:none"><span class="body"><span class="lab">Телефон</span><span class="val mono">+7 (920) 118-77-40</span></span><span class="btn flat sm">Позвонить</span></a>
        </div></div>
        <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px">
          <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Выполнено</span><span class="v"><span class="n" style="font-size:22px">6</span></span></div></div>
          <div class="card"><div class="stat" style="padding:14px"><span class="l t-lbl">Заработал</span><span class="v"><span class="n" style="font-size:22px">36 000 ₽</span></span></div></div>
        </div>
        <div class="card" style="border-color:var(--warn-line)"><div class="bd stack" style="gap:8px;padding:14px">
          <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Загрузка недели</span><span class="mono strong" style="color:var(--warn-ink)">44 из 40 ч</span></div>
          <span class="bar"><i style="width:100%;background:var(--warn-ink)"></i></span>
          <span class="t-tiny" style="color:var(--warn-ink)">Переработка 4 часа — рабочее окно 09–19</span>
        </div></div>
        <div class="card" style="border-color:var(--error-line)"><div class="hd" style="padding:12px 14px"><span class="ttl">Удержание</span><span class="chip c-danger">3 000 ₽</span></div>
          <div class="bd" style="padding:14px"><span class="t-lbl">Наряд № 119 — оставил мусор на лестничной клетке, клиент пожаловался.</span></div>
        </div>
        <div class="card" style="border-color:var(--error-line)"><div class="hd" style="padding:12px 14px"><span class="ttl">Заметка владельца</span><span class="chip c-danger">Не видит монтажник</span></div>
          <div class="bd" style="padding:14px"><span class="t-lbl">Работает быстро, но за собой убирает не всегда. Проверять фото «после».</span></div>
        </div>
      </div>
    </div>
    <span class="devcap">Удержание и заметка владельца помечены явно: монтажник этих блоков не видит, и в макете это подписано, а не подразумевается.</span>
  </div>
</div>
EOF
