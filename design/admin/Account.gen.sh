. ./_screens.sh
cat <<EOF
<div class="board touch">
  <div class="col">
    <span class="devlab">1440 · десктоп — профиль, есть у обеих ролей</span>
    <div class="page" style="padding:0"><div class="app" style="width:1440px;min-height:820px">
$(aside profile)
      <div style="display:flex;flex-direction:column;min-width:0">
$(chead "Профиль" "Личные данные, пароль и тема интерфейса" '<span class="btn solid">Сохранить</span>')
        <div class="main">
          <div class="grid" style="grid-template-columns:minmax(0,1fr) 380px;gap:16px;align-items:start">
            <div class="stack" style="gap:16px">
              <div class="card">
                <div class="hd"><span class="ttl">Личные данные</span></div>
                <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:12px">
                  <div class="inp flat col"><span class="lab">Имя</span><span class="val">Сергей Демидов</span></div>
                  <div class="inp flat col"><span class="lab">Телефон</span><span class="val mono">+7 (4872) 00-00-10</span></div>
                  <div class="inp flat col dis" style="grid-column:span 2"><span class="lab">Логин</span><span class="val mono">admin</span></div>
                </div>
                <div class="ft"><span class="hint">Логин меняет только владелец из раздела «Монтажники». Себе сменить его нельзя — это ключ входа.</span></div>
              </div>
              <div class="card">
                <div class="hd"><span class="ttl">Смена пароля</span><span class="chip c-default">Argon2id</span></div>
                <div class="bd stack" style="gap:12px">
                  <div class="inp flat col"><span class="lab">Текущий пароль</span><span class="val ph">••••••••</span></div>
                  <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
                    <div class="inp flat col foc"><span class="lab">Новый пароль</span><span class="val ph">не меньше 12 знаков</span></div>
                    <div class="inp flat col err"><span class="lab">Повторите новый</span><span class="val ph">••••••••</span></div>
                  </div>
                  <span class="hint bad">$I_WARN Пароли не совпадают</span>
                </div>
                <div class="ft"><span class="btn flat">Сменить пароль</span></div>
              </div>
            </div>
            <div class="stack" style="gap:16px">
              <div class="card">
                <div class="hd"><span class="ttl">Тема интерфейса</span></div>
                <div class="bd stack" style="gap:10px">
                  <label class="opt"><span class="rdo on"></span><span class="stack" style="gap:0"><span class="txt">Как в системе</span><span class="sub">следует настройке устройства</span></span></label>
                  <label class="opt"><span class="rdo"></span><span class="txt">Светлая</span></label>
                  <label class="opt"><span class="rdo"></span><span class="txt">Тёмная</span></label>
                </div>
              </div>
              <div class="card">
                <div class="hd"><span class="ttl">Вход</span></div>
                <div class="bd stack" style="gap:12px">
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Последний вход</span><span class="mono t-lbl strong">сегодня, 08:12</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Устройство</span><span class="t-lbl strong">macOS · Safari</span></div>
                  <hr class="hr">
                  <span class="btn danger" style="width:100%">Выйти на всех устройствах</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Ошибка стоит у своего поля, а не одной строкой сверху: в форме из четырёх полей человек иначе не поймёт, какое из них чинить.</span>
  </div>

  <div class="col" style="width:768px">
    <span class="devlab">768 · планшет — одна колонка, порядок тот же</span>
    <div class="frame tb"><div class="app rail" style="min-height:820px">
$(rail profile)
      <div style="display:flex;flex-direction:column;min-width:0">
$(theadT "Профиль" "Личные данные и тема" '<span class="btn solid sm">Сохранить</span>')
        <div class="main" style="padding:14px 18px 18px;gap:12px">
          <div class="card"><div class="hd"><span class="ttl">Личные данные</span></div>
            <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:12px">
              <div class="inp flat col"><span class="lab">Имя</span><span class="val">Сергей Демидов</span></div>
              <div class="inp flat col"><span class="lab">Телефон</span><span class="val mono">+7 (4872) 00-00-10</span></div>
              <div class="inp flat col dis" style="grid-column:span 2"><span class="lab">Логин</span><span class="val mono">admin</span></div>
            </div>
          </div>
          <div class="card"><div class="hd"><span class="ttl">Тема интерфейса</span></div>
            <div class="bd row" style="gap:10px"><span class="seg"><span class="on">Как в системе</span><span>Светлая</span><span>Тёмная</span></span></div>
          </div>
          <div class="card"><div class="hd"><span class="ttl">Смена пароля</span></div>
            <div class="bd stack" style="gap:12px">
              <div class="inp flat col"><span class="lab">Текущий пароль</span><span class="val ph">••••••••</span></div>
              <div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">
                <div class="inp flat col"><span class="lab">Новый пароль</span><span class="val ph">не меньше 12 знаков</span></div>
                <div class="inp flat col"><span class="lab">Повторите новый</span><span class="val ph">••••••••</span></div>
              </div>
            </div>
            <div class="ft"><span class="btn flat sm">Сменить пароль</span></div>
          </div>
        </div>
      </div>
    </div></div>
    <span class="devcap">Переключатели темы становятся сегментами: три радиокнопки в столбец на планшете занимают больше места, чем несут смысла.</span>
  </div>

  <div class="col" style="width:390px">
    <span class="devlab">390 · вход в панель</span>
    <div class="frame ph" style="min-height:844px;justify-content:center;background:var(--bg-soft)">
      <div style="padding:24px;display:flex;flex-direction:column;gap:18px">
        <div class="stack" style="gap:14px;align-items:center;text-align:center">
          <span class="mark" style="width:52px;height:52px;border-radius:16px"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M3 8c2.5-2 4.5 2 7 0s4.5 2 7 0"/><path d="M3 13c2.5-2 4.5 2 7 0s4.5 2 7 0"/><path d="M3 18c2.5-2 4.5 2 7 0s4.5 2 7 0"/></svg></span>
          <div class="stack" style="gap:4px"><span style="font-family:var(--font-display);font-size:20px;font-weight:600;color:var(--ink)">Панель ТулаКлимат</span><span class="t-lbl mut">Вход для владельца и монтажников</span></div>
        </div>
        <div class="card"><div class="bd stack" style="gap:12px;padding:18px">
          <div class="inp bordered col"><span class="lab">Логин</span><span class="val ph">имя пользователя</span></div>
          <div class="inp bordered" style="justify-content:space-between"><span class="body"><span class="lab">Пароль</span><span class="val ph">••••••••</span></span><span class="iconbtn">$I_EYE</span></div>
          <label class="opt"><span class="cbx on">$I_CHECK</span><span class="txt">Запомнить меня</span></label>
          <span class="btn solid lg" style="width:100%">Войти</span>
        </div></div>
        <span class="t-tiny fnt" style="text-align:center;line-height:1.5">Забыли пароль — его меняет владелец из раздела «Монтажники». Восстановления по почте нет: у панели нет публичной регистрации.</span>
      </div>
    </div>
    <span class="devcap">Поле пароля не мешает менеджерам паролей и вставке; кнопка показа пароля — отдельная цель 36px внутри поля.</span>
  </div>
</div>
EOF
