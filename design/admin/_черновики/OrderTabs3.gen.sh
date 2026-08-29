. ./_tabs.sh
T="Наряд|Расход|Чеклист|Документы|История"
cat <<EOF

  <!-- ══ 3. ЧЕКЛИСТ ══ -->
  <div class="tsec">
$(tsec "Вкладка 3" "Чеклист выезда" "«Что взять с собой». Собирается из наряда: тип работ даёт инструмент, позиция — свою трассу, штробление — штроборез, оплата наличными — строку «принять N ₽». Склад отвечает, есть ли нужное, прямо здесь — чтобы нехватка выяснилась до выезда.")
    <div class="row3">
      <div class="col"><span class="devlab">1440</span>
        <div class="frame dk">
$(trow "$T" 3)
          <div class="bd20 grid" style="grid-template-columns:minmax(0,1fr) 330px;gap:14px;align-items:start">
            <div class="card"><div class="hd"><span class="row" style="gap:12px"><span class="ttl">Собрано 4 из 9</span><span class="bar" style="width:130px"><i style="width:44%"></i></span></span><div class="row" style="gap:8px"><span class="btn light sm">Пересобрать</span><span class="btn flat sm">$I_PLUS Свой пункт</span></div></div>
              <div class="bd" style="padding:0"><table class="tbl">
                <thead><tr><th style="width:42px"></th><th>Что взять</th><th style="width:140px">Откуда пункт</th><th style="width:126px">На складе</th></tr></thead>
                <tbody>
                  <tr><td><span class="cbx on">$I_CHECK</span></td><td class="strong" style="color:var(--muted);text-decoration:line-through">Труба 1/4″ — 5 м</td><td><span class="chip c-default">трасса поз. 1</span></td><td><span class="chip c-danger">12 м</span></td></tr>
                  <tr><td><span class="cbx on">$I_CHECK</span></td><td class="strong" style="color:var(--muted);text-decoration:line-through">Труба 3/8″ — 5 м</td><td><span class="chip c-default">трасса поз. 1</span></td><td><span class="chip c-success">115 м</span></td></tr>
                  <tr><td><span class="cbx on">$I_CHECK</span></td><td class="strong" style="color:var(--muted);text-decoration:line-through">Теплоизоляция 9 мм — 10 м</td><td><span class="chip c-default">по трассам</span></td><td><span class="chip c-success">170 м</span></td></tr>
                  <tr><td><span class="cbx on">$I_CHECK</span></td><td class="strong" style="color:var(--muted);text-decoration:line-through">Кабель 4×1,5 — 6 м</td><td><span class="chip c-default">тип работ</span></td><td><span class="chip c-success">310 м</span></td></tr>
                  <tr><td><span class="cbx"></span></td><td class="strong">Кронштейны 450 — 1 пара</td><td><span class="chip c-default">наружный блок</span></td><td><span class="chip c-danger">2 пары</span></td></tr>
                  <tr><td><span class="cbx"></span></td><td class="strong">Штроборез и пылесос</td><td><span class="chip c-warn">штробление</span></td><td class="mut t-lbl">инструмент</td></tr>
                  <tr><td><span class="cbx"></span></td><td class="strong">Вакуумный насос</td><td><span class="chip c-default">тип работ</span></td><td class="mut t-lbl">инструмент</td></tr>
                  <tr><td><span class="cbx"></span></td><td class="strong">Перфоратор, бур 45</td><td><span class="chip c-default">тип работ</span></td><td class="mut t-lbl">инструмент</td></tr>
                  <tr><td><span class="cbx"></span></td><td class="strong">Плёнка и мусорные мешки</td><td><span class="chip c-primary">свой пункт</span></td><td class="mut t-lbl">расходник</td></tr>
                </tbody></table></div></div>
            <div class="stack" style="gap:12px">
              <div class="card"><div class="hd"><span class="ttl">Откуда взялись пункты</span></div>
                <div class="bd stack" style="gap:8px">
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Тип работ «Монтаж»</span><span class="chip c-default">4</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Позиция 1 · трасса 4,5 м</span><span class="chip c-default">2</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Позиция 2 · трасса 3 м</span><span class="chip c-default">1</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Штробление 2 м</span><span class="chip c-warn">1</span></div>
                  <div class="row" style="justify-content:space-between"><span class="t-lbl mut">Добавил монтажник</span><span class="chip c-primary">1</span></div>
                </div>
                <div class="ft"><span class="hint">«Пересобрать» соберёт список заново из наряда. Свои пункты сохраняются — иначе их перестанут добавлять.</span></div></div>
              <div class="alert a-warn"><span class="ai">$I_WARN</span><div><div class="at">Кронштейнов не хватает</div><div class="ad">Нужна 1 пара, на складе 2 и обе ниже порога.</div></div></div>
            </div>
          </div>
        </div></div>
      <div class="col"><span class="devlab">768</span>
        <div class="frame tb">
$(trow "$T" 3 sm)
          <div class="bd16 stack" style="gap:12px">
            <div class="card"><div class="hd"><span class="row" style="gap:10px"><span class="ttl">Собрано 4 из 9</span><span class="bar" style="width:100px"><i style="width:44%"></i></span></span><span class="btn light sm">Пересобрать</span></div>
              <div class="bd" style="padding:0"><table class="tbl">
                <thead><tr><th style="width:42px"></th><th>Что взять</th><th style="width:120px">На складе</th></tr></thead>
                <tbody>
                  <tr><td><span class="cbx on">$I_CHECK</span></td><td><div class="strong" style="color:var(--muted);text-decoration:line-through">Труба 1/4″ — 5 м</div><div class="t-tiny mut">трасса поз. 1</div></td><td><span class="chip c-danger">12 м</span></td></tr>
                  <tr><td><span class="cbx on">$I_CHECK</span></td><td><div class="strong" style="color:var(--muted);text-decoration:line-through">Труба 3/8″ — 5 м</div><div class="t-tiny mut">трасса поз. 1</div></td><td><span class="chip c-success">115 м</span></td></tr>
                  <tr><td><span class="cbx"></span></td><td><div class="strong">Кронштейны 450 — 1 пара</div><div class="t-tiny mut">наружный блок</div></td><td><span class="chip c-danger">2 пары</span></td></tr>
                  <tr><td><span class="cbx"></span></td><td><div class="strong">Штроборез и пылесос</div><div class="t-tiny" style="color:var(--warn-ink)">штробление 2 м</div></td><td class="mut t-lbl">инструмент</td></tr>
                  <tr><td><span class="cbx"></span></td><td><div class="strong">Плёнка и мусорные мешки</div><div class="t-tiny" style="color:var(--accent-text)">свой пункт</div></td><td class="mut t-lbl">расходник</td></tr>
                </tbody></table></div>
              <div class="ft"><span class="btn flat sm" style="width:100%">$I_PLUS Свой пункт</span></div></div>
          </div>
        </div></div>
      <div class="col"><span class="devlab">390 · монтажник</span>
        <div class="frame ph" style="min-height:700px">
          <div class="mbar"><span class="row" style="gap:10px"><span class="iconbtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span><span class="mtitle">Чеклист</span></span><span class="chip c-warn lg">4 из 9</span></div>
$(trow "$T" 3 xs)
          <div class="mbody" style="gap:0;padding:0">
            <div style="padding:14px 14px 10px"><span class="bar"><i style="width:44%"></i></span></div>
            <div class="card" style="margin:0 14px 12px;overflow:hidden"><div class="bd" style="padding:0">
              <div class="chk done"><span class="box">$I_CHECK</span><span class="txt">Труба 1/4″ — 5 м</span></div>
              <div class="chk done"><span class="box">$I_CHECK</span><span class="txt">Труба 3/8″ — 5 м</span></div>
              <div class="chk done"><span class="box">$I_CHECK</span><span class="txt">Теплоизоляция 9 мм</span></div>
              <div class="chk done"><span class="box">$I_CHECK</span><span class="txt">Кабель 4×1,5 — 6 м</span></div>
              <div class="chk"><span class="box"></span><span class="txt">Кронштейны 450</span><span class="chip c-danger" style="margin-left:auto">2 пары</span></div>
              <div class="chk"><span class="box"></span><span class="txt">Штроборез и пылесос</span><span class="chip c-warn" style="margin-left:auto">штроба</span></div>
              <div class="chk" style="border-bottom:none"><span class="box"></span><span class="txt">Вакуумный насос</span></div>
            </div></div>
            <div style="padding:0 14px"><span class="btn light" style="width:100%">$I_PLUS Добавить свой пункт</span></div>
          </div>
          <div class="sticky-act"><div class="row" style="gap:8px"><span class="btn bord" style="flex:1">Пересобрать</span><span class="btn solid" style="flex:1.6">Всё собрано</span></div></div>
        </div></div>
    </div>
    <span class="devcap">768 — колонка «Откуда пункт» уходит в подпись под названием, правая колонка исчезает. 390 — строка 56px и галочка 24px: чеклист отмечают в машине и в перчатках.</span>
  </div>

  <!-- ══ 4. ДОКУМЕНТЫ ══ -->
  <div class="tsec">
$(tsec "Вкладка 4" "Документы и фото" "Договор, гарантийный талон, акт, счёт, замерный лист; фото места установки (до выезда) и выполненных работ (загружает монтажник). Снимки клиента уходят закрытым маршрутом со сверкой сессии, а не публичным адресом (ADR-171).")
    <div class="row3">
      <div class="col"><span class="devlab">1440</span>
        <div class="frame dk">
$(trow "$T" 4)
          <div class="bd20 stack" style="gap:14px">
            <div class="card"><div class="hd"><span class="ttl">Документы</span><span class="btn flat sm">$I_PLUS Загрузить</span></div>
              <div class="bd" style="padding:0"><table class="tbl">
                <thead><tr><th>Документ</th><th style="width:130px">Тип</th><th style="width:120px">Загружен</th><th style="width:96px">Размер</th><th style="width:126px">Действия</th></tr></thead>
                <tbody>
                  <tr><td><span class="row" style="gap:10px"><span style="width:30px;height:30px;border-radius:8px;background:var(--accent-bg);color:var(--on-accent);display:flex;align-items:center;justify-content:center">$I_BOOK</span><span class="strong">Договор № 128 от 27.08.2026</span></span></td><td><span class="chip c-primary">Договор</span></td><td class="mono t-lbl">27 авг</td><td class="mono t-lbl">248 КБ</td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                  <tr><td><span class="row" style="gap:10px"><span style="width:30px;height:30px;border-radius:8px;background:var(--accent-bg);color:var(--on-accent);display:flex;align-items:center;justify-content:center">$I_BOOK</span><span class="strong">Замерный лист</span></span></td><td><span class="chip c-default">Замер</span></td><td class="mono t-lbl">27 авг</td><td class="mono t-lbl">96 КБ</td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-edit">$I_EDIT</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                  <tr style="opacity:.62"><td><span class="row" style="gap:10px"><span style="width:30px;height:30px;border-radius:8px;background:var(--bg-soft);color:var(--faint);display:flex;align-items:center;justify-content:center">$I_BOOK</span><span class="strong">Акт выполненных работ</span></span></td><td><span class="chip c-default">Акт</span></td><td class="mut t-lbl">при закрытии</td><td class="mut t-lbl">—</td><td><span class="btn light sm">Собрать</span></td></tr>
                </tbody></table></div></div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:14px">
              <div class="card"><div class="hd"><span class="ttl">Фото места установки</span><span class="chip c-default">до выезда · 2</span></div>
                <div class="bd grid" style="grid-template-columns:1fr 1fr 1fr;gap:10px">
                  <span style="aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
                  <span style="aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
                  <span style="aspect-ratio:4/3;border-radius:10px;border:1.5px dashed var(--line-ui);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_PLUS</span>
                </div></div>
              <div class="card"><div class="hd"><span class="ttl">Фото выполненных работ</span><span class="chip c-warn">нужно 2 · есть 1</span></div>
                <div class="bd grid" style="grid-template-columns:1fr 1fr 1fr;gap:10px">
                  <span style="aspect-ratio:4/3;border-radius:10px;background:var(--stripe-a);display:flex;align-items:center;justify-content:center;color:var(--muted)">$I_CAT</span>
                  <span style="aspect-ratio:4/3;border-radius:10px;border:1.5px dashed var(--line-ui);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_PLUS</span>
                  <span style="aspect-ratio:4/3;border-radius:10px;border:1.5px dashed var(--line-ui);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_PLUS</span>
                </div></div>
            </div>
          </div>
        </div></div>
      <div class="col"><span class="devlab">768</span>
        <div class="frame tb">
$(trow "$T" 4 sm)
          <div class="bd16 stack" style="gap:12px">
            <div class="card"><div class="hd"><span class="ttl">Документы</span><span class="btn flat sm">$I_PLUS</span></div>
              <div class="bd" style="padding:0"><table class="tbl">
                <thead><tr><th>Документ</th><th style="width:110px">Загружен</th><th style="width:100px">Действия</th></tr></thead>
                <tbody>
                  <tr><td><div class="strong">Договор № 128</div><div class="t-tiny mut">Договор · 248 КБ</div></td><td class="mono t-lbl">27 авг</td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                  <tr><td><div class="strong">Замерный лист</div><div class="t-tiny mut">Замер · 96 КБ</div></td><td class="mono t-lbl">27 авг</td><td><span class="acts"><span class="actbtn a-view">$I_EYE</span><span class="actbtn a-del">$I_TRASH</span></span></td></tr>
                </tbody></table></div></div>
            <div class="card"><div class="hd"><span class="ttl">Фото места установки</span><span class="chip c-default">2</span></div>
              <div class="bd grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
                <span style="aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
                <span style="aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
                <span style="aspect-ratio:4/3;border-radius:10px;border:1.5px dashed var(--line-ui);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_PLUS</span>
              </div></div>
            <div class="card"><div class="hd"><span class="ttl">Фото выполненных работ</span><span class="chip c-warn">1 из 2</span></div>
              <div class="bd grid" style="grid-template-columns:repeat(3,1fr);gap:10px">
                <span style="aspect-ratio:4/3;border-radius:10px;background:var(--stripe-a);display:flex;align-items:center;justify-content:center;color:var(--muted)">$I_CAT</span>
                <span style="aspect-ratio:4/3;border-radius:10px;border:1.5px dashed var(--line-ui);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_PLUS</span>
                <span style="aspect-ratio:4/3;border-radius:10px;border:1.5px dashed var(--line-ui);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_PLUS</span>
              </div></div>
          </div>
        </div></div>
      <div class="col"><span class="devlab">390 · монтажник</span>
        <div class="frame ph" style="min-height:700px">
          <div class="mbar"><span class="row" style="gap:10px"><span class="iconbtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span><span class="mtitle">Фото</span></span><span class="chip c-warn lg">нужно 2</span></div>
$(trow "$T" 4 xs)
          <div class="mbody">
            <div class="card"><div class="hd" style="padding:12px 14px"><span class="ttl">Место установки</span><span class="chip c-default">до выезда</span></div>
              <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:8px;padding:14px">
                <span style="aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
                <span style="aspect-ratio:4/3;border-radius:10px;background:var(--bg-soft);display:flex;align-items:center;justify-content:center;color:var(--faint)">$I_CAT</span>
              </div></div>
            <div class="card"><div class="hd" style="padding:12px 14px"><span class="ttl">Выполненные работы</span><span class="chip c-warn">1 из 2</span></div>
              <div class="bd grid" style="grid-template-columns:1fr 1fr;gap:8px;padding:14px">
                <span style="aspect-ratio:4/3;border-radius:10px;background:var(--stripe-a);display:flex;align-items:center;justify-content:center;color:var(--muted)">$I_CAT</span>
                <span style="aspect-ratio:4/3;border-radius:10px;border:1.5px dashed var(--line-ui);display:flex;flex-direction:column;gap:4px;align-items:center;justify-content:center;color:var(--faint)"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8h3l1.5-2h7L17 8h3a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19H4a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 4 8z"/><circle cx="12" cy="13" r="3.4"/></svg><span class="t-tiny">Снять</span></span>
              </div></div>
            <span class="hint">Документы монтажник смотрит, но не загружает: договор и акт собирает владелец.</span>
          </div>
          <div class="sticky-act"><span class="btn solid lg" style="width:100%">Сохранить фото</span></div>
        </div></div>
    </div>
    <span class="devcap">768 — таблица документов теряет «Тип» и «Размер», они уходят в подпись; фотоблоки друг под другом. 390 — по два снимка в ряд, съёмка камерой прямо из карточки, документы только на чтение.</span>
  </div>

  <!-- ══ 5. ИСТОРИЯ ══ -->
  <div class="tsec">
$(tsec "Вкладка 5" "История" "Кто и когда менял статус, кого назначили, когда заполнили итог. Записи не правятся и не удаляются: это журнал, а не заметки.")
    <div class="row3">
      <div class="col"><span class="devlab">1440</span>
        <div class="frame dk">
$(trow "$T" 5)
          <div class="bd20"><div class="card"><div class="bd" style="padding:0"><table class="tbl">
            <thead><tr><th style="width:160px">Когда</th><th style="width:200px">Кто</th><th>Что произошло</th></tr></thead>
            <tbody>
              <tr><td class="mono t-lbl">29 авг, 17:22</td><td><span class="usr"><span class="ava xs">ПК</span><span class="nm" style="font-size:13px">Пётр Кузнецов</span></span></td><td class="t-lbl">Расход сохранён: 4 позиции, списание уводит зону в минус на 1 пару кронштейнов</td></tr>
              <tr><td class="mono t-lbl">29 авг, 14:06</td><td><span class="usr"><span class="ava xs">ПК</span><span class="nm" style="font-size:13px">Пётр Кузнецов</span></span></td><td><span class="row" style="gap:8px"><span class="chip c-primary"><span class="dot"></span>В работе</span><span class="t-lbl mut">статус сменён на объекте</span></span></td></tr>
              <tr><td class="mono t-lbl">29 авг, 13:48</td><td><span class="usr"><span class="ava xs">ПК</span><span class="nm" style="font-size:13px">Пётр Кузнецов</span></span></td><td class="t-lbl">Чеклист: отмечено 4 пункта из 9</td></tr>
              <tr><td class="mono t-lbl">28 авг, 10:22</td><td><span class="usr"><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">СД</span><span class="nm" style="font-size:13px">Сергей Демидов</span></span></td><td class="t-lbl">Комментарий монтажнику: «Домофон 34К, звонить за 20 минут»</td></tr>
              <tr><td class="mono t-lbl">27 авг, 16:40</td><td><span class="usr"><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">СД</span><span class="nm" style="font-size:13px">Сергей Демидов</span></span></td><td><span class="row" style="gap:8px"><span class="chip c-warn"><span class="dot"></span>Назначен</span><span class="t-lbl mut">Пётр Кузнецов, 29 августа 14:00</span></span></td></tr>
              <tr><td class="mono t-lbl">27 авг, 16:28</td><td><span class="usr"><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">СД</span><span class="nm" style="font-size:13px">Сергей Демидов</span></span></td><td><span class="row" style="gap:8px"><span class="chip c-default"><span class="dot"></span>Новый</span><span class="t-lbl mut">создан из заявки № 41</span></span></td></tr>
            </tbody></table></div></div></div>
        </div></div>
      <div class="col"><span class="devlab">768</span>
        <div class="frame tb">
$(trow "$T" 5 sm)
          <div class="bd16"><div class="card"><div class="bd" style="padding:0"><table class="tbl">
            <thead><tr><th style="width:140px">Когда</th><th>Что произошло</th></tr></thead>
            <tbody>
              <tr><td class="mono t-lbl">29 авг, 17:22</td><td><div class="t-lbl">Расход сохранён: 4 позиции</div><div class="t-tiny mut">Пётр Кузнецов</div></td></tr>
              <tr><td class="mono t-lbl">29 авг, 14:06</td><td><div class="row" style="gap:8px"><span class="chip c-primary"><span class="dot"></span>В работе</span></div><div class="t-tiny mut">Пётр Кузнецов · на объекте</div></td></tr>
              <tr><td class="mono t-lbl">28 авг, 10:22</td><td><div class="t-lbl">Комментарий монтажнику</div><div class="t-tiny mut">Сергей Демидов</div></td></tr>
              <tr><td class="mono t-lbl">27 авг, 16:40</td><td><div class="row" style="gap:8px"><span class="chip c-warn"><span class="dot"></span>Назначен</span></div><div class="t-tiny mut">Сергей Демидов · Пётр К., 29 авг 14:00</div></td></tr>
            </tbody></table></div></div></div>
        </div></div>
      <div class="col"><span class="devlab">390</span>
        <div class="frame ph" style="min-height:700px">
          <div class="mbar"><span class="row" style="gap:10px"><span class="iconbtn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m15 6-6 6 6 6"/></svg></span><span class="mtitle">История</span></span></div>
$(trow "$T" 5 xs)
          <div class="mbody">
            <div class="card"><div class="bd" style="padding:0">
              <div class="mrow" style="gap:5px;border-bottom:1px solid var(--line)"><span class="mono t-tiny fnt">29 августа, 17:22</span><span class="t-lbl">Расход сохранён: 4 позиции</span><span class="usr"><span class="ava xs">ПК</span><span class="t-tiny">Пётр Кузнецов</span></span></div>
              <div class="mrow" style="gap:5px;border-bottom:1px solid var(--line)"><span class="mono t-tiny fnt">29 августа, 14:06</span><span class="chip c-primary" style="align-self:flex-start"><span class="dot"></span>В работе</span><span class="usr"><span class="ava xs">ПК</span><span class="t-tiny">Пётр Кузнецов</span></span></div>
              <div class="mrow" style="gap:5px;border-bottom:1px solid var(--line)"><span class="mono t-tiny fnt">28 августа, 10:22</span><span class="t-lbl">Комментарий монтажнику</span><span class="usr"><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">СД</span><span class="t-tiny">Сергей Демидов</span></span></div>
              <div class="mrow" style="gap:5px"><span class="mono t-tiny fnt">27 августа, 16:40</span><span class="chip c-warn" style="align-self:flex-start"><span class="dot"></span>Назначен</span><span class="usr"><span class="ava xs" style="background:var(--bg-soft);color:var(--muted)">СД</span><span class="t-tiny">Сергей Демидов</span></span></div>
            </div></div>
          </div>
        </div></div>
    </div>
    <span class="devcap">768 — колонка «Кто» уходит в подпись под событием. 390 — лента карточками, время моноширинным сверху.</span>
  </div>
</div>
EOF
